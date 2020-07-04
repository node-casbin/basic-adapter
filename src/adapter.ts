import type { Adapter, Model } from 'casbin';
import type { CasbinRule } from './casbinRule';
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
  private casbinRule: Knex.QueryBuilder<CasbinRule, unknown[]>;

  constructor(drive: SupportedDrive, client: Instance) {
    this.config.client = drive;
    this.knex = Knex(this.config);
    this.casbinRule = this.knex<CasbinRule>(CasbinRuleTable);
    this.client = client;
  }

  async loadPolicy(model: Model): Promise<void> {
    const result = await this.client.query<CasbinRule>(
      this.casbinRule.select().toSQL().sql
    );

    for (const line of result.rows) {
      this.loadPolicyLine(line, model);
    }
  }

  async savePolicy(model: Model): Promise<boolean> {
    await this.client.query(this.casbinRule.del<CasbinRule>().toSQL().sql);

    let astMap = model.model.get('p')!;
    const processes: Array<Promise<unknown>> = [];

    for (const [ptype, ast] of astMap) {
      for (const rule of ast.policy) {
        const line = this.savePolicyLine(ptype, rule);
        const p = this.client.query<CasbinRule>(
          this.casbinRule.insert(line).toSQL().sql
        );
        processes.push(p);
      }
    }

    astMap = model.model.get('g')!;
    for (const [ptype, ast] of astMap) {
      for (const rule of ast.policy) {
        const line = this.savePolicyLine(ptype, rule);
        const p = this.client.query<CasbinRule>(
          this.casbinRule.insert(line).toSQL().sql
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
      this.casbinRule.insert(line).toSQL().sql
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
        this.casbinRule.insert(line).toSQL().sql
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
      this.casbinRule.where(line).del().toSQL().sql
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
        this.casbinRule.where(line).del().toSQL().sql
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
      this.casbinRule.where(line).del().toSQL().sql
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
}
