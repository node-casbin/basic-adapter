import type { Adapter, Model } from 'casbin';
import type { CasbinRule } from './casbin-rule';
import type * as pg from 'pg';
// import type * as sqlite3 from 'sqlite3';
// import type * as mysql from 'mysql';
// import type * as mysql2 from 'mysql2';
// import type * as oracledb from 'oracledb';
// import type * as mssql from 'mssql';

import { Helper } from 'casbin';
import * as Knex from 'knex';

type SupportedDrive = 'pg';
// | 'sqlite3'
// | 'mysql'
// | 'mysql2'
// | 'oracledb'
// | 'mssql'

type Config = Knex.Config;
type Instance = pg.Client;

const CasbinRuleTable = 'casbin_rule';

export class UniversalAdapter implements Adapter {
  private knex: Knex;
  private config: Config;
  private client: Instance;

  constructor(drive: SupportedDrive, client: Instance) {
    this.config = { client: drive };
    this.knex = Knex(this.config);
    this.client = client;
  }

  static async newAdapter(
    drive: SupportedDrive,
    client: Instance
  ): Promise<UniversalAdapter> {
    const a = new UniversalAdapter(drive, client);
    await a.client.connect();
    await a.createTable();

    return a;
  }

  async loadPolicy(model: Model): Promise<void> {
    const result = await this.client.query<CasbinRule>(
      this.knex.select().from(CasbinRuleTable).toQuery()
    );
    for (const line of result.rows) {
      this.loadPolicyLine(line, model);
    }
  }

  async savePolicy(model: Model): Promise<boolean> {
    await this.client.query(this.knex.del().from(CasbinRuleTable).toQuery());

    let astMap = model.model.get('p')!;
    const processes: Array<Promise<unknown>> = [];

    for (const [ptype, ast] of astMap) {
      for (const rule of ast.policy) {
        const line = this.savePolicyLine(ptype, rule);
        const p = this.client.query<CasbinRule>(
          this.knex.insert(line).into(CasbinRuleTable).toQuery()
        );
        processes.push(p);
      }
    }

    astMap = model.model.get('g')!;
    for (const [ptype, ast] of astMap) {
      for (const rule of ast.policy) {
        const line = this.savePolicyLine(ptype, rule);
        const p = this.client.query<CasbinRule>(
          this.knex.insert(line).into(CasbinRuleTable).toQuery()
        );
        processes.push(p);
      }
    }

    await Promise.all(processes);

    return true;
  }

  async addPolicy(sec: string, ptype: string, rule: string[]): Promise<void> {
    const line = this.savePolicyLine(ptype, rule);
    await this.client.query<CasbinRule>(
      this.knex.insert(line).into(CasbinRuleTable).toQuery()
    );
  }

  async addPolicies(
    sec: string,
    ptype: string,
    rules: string[][]
  ): Promise<void> {
    const processes: Array<Promise<unknown>> = [];
    for (const rule of rules) {
      const line = this.savePolicyLine(ptype, rule);
      const p = this.client.query<CasbinRule>(
        this.knex.insert(line).into(CasbinRuleTable).toQuery()
      );
      processes.push(p);
    }

    await Promise.all(processes);
  }

  async removePolicy(
    sec: string,
    ptype: string,
    rule: string[]
  ): Promise<void> {
    const line = this.savePolicyLine(ptype, rule);
    await this.client.query<CasbinRule>(
      this.knex.del().where(line).from(CasbinRuleTable).toQuery()
    );
  }

  async removePolicies(
    sec: string,
    ptype: string,
    rules: string[][]
  ): Promise<void> {
    const processes: Array<Promise<unknown>> = [];
    for (const rule of rules) {
      const line = this.savePolicyLine(ptype, rule);
      const p = this.client.query<CasbinRule>(
        this.knex.del().where(line).from(CasbinRuleTable).toQuery()
      );
      processes.push(p);
    }

    await Promise.all(processes);
  }

  async removeFilteredPolicy(
    sec: string,
    ptype: string,
    fieldIndex: number,
    ...fieldValues: string[]
  ): Promise<void> {
    const line: Omit<CasbinRule, 'id'> = { ptype };

    const idx = fieldIndex + fieldValues.length;
    if (fieldIndex <= 0 && 0 < idx) {
      line.v0 = fieldValues[0 - fieldIndex];
    }
    if (fieldIndex <= 1 && 1 < idx) {
      line.v1 = fieldValues[1 - fieldIndex];
    }
    if (fieldIndex <= 2 && 2 < idx) {
      line.v2 = fieldValues[2 - fieldIndex];
    }
    if (fieldIndex <= 3 && 3 < idx) {
      line.v3 = fieldValues[3 - fieldIndex];
    }
    if (fieldIndex <= 4 && 4 < idx) {
      line.v4 = fieldValues[4 - fieldIndex];
    }
    if (fieldIndex <= 5 && 5 < idx) {
      line.v5 = fieldValues[5 - fieldIndex];
    }

    await this.client.query<CasbinRule>(
      this.knex.del().where(line).from(CasbinRuleTable).toQuery()
    );
  }

  private loadPolicyLine(line: CasbinRule, model: Model): void {
    const result =
      line.ptype +
      ', ' +
      [line.v0, line.v1, line.v2, line.v3, line.v4, line.v5]
        .filter((n) => n)
        .join(', ');
    Helper.loadPolicyLine(result, model);
  }

  private savePolicyLine(
    ptype: string,
    rule: string[]
  ): Omit<CasbinRule, 'id'> {
    const line: Omit<CasbinRule, 'id'> = { ptype };

    if (rule.length > 0) {
      line.v0 = rule[0];
    }
    if (rule.length > 1) {
      line.v1 = rule[1];
    }
    if (rule.length > 2) {
      line.v2 = rule[2];
    }
    if (rule.length > 3) {
      line.v3 = rule[3];
    }
    if (rule.length > 4) {
      line.v4 = rule[4];
    }
    if (rule.length > 5) {
      line.v5 = rule[5];
    }

    return line;
  }

  private async createTable(): Promise<void> {
    const createTableSQL = this.knex.schema
      .createTableIfNotExists(CasbinRuleTable, (table) => {
        table.increments();
        table.string('ptype').notNullable();
        for (const i of ['v0', 'v1', 'v2', 'v3', 'v4', 'v5']) {
          table.string(i);
        }
      })
      .toQuery();

    await this.client.query(createTableSQL);
  }
}
