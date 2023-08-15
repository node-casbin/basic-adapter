// Copyright 2020 The Casbin Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import type { Adapter, Model } from 'casbin';
import type { CasbinRule } from './casbin-rule';
import type * as pg from 'pg';
import type * as mysql from 'mysql';
import type * as mysql2 from 'mysql2/promise';
import type * as sqlite3 from 'sqlite3';
import type * as mssql from 'mssql';
// import type * as oracledb from 'oracledb';

import { Helper } from 'casbin';
import * as Knex from 'knex';

export type Config = Knex.Knex.Config & {
  client: keyof Instance;
};
export type Instance = {
  pg: pg.Client;
  mysql: mysql.Connection;
  mysql2: Promise<mysql2.Connection>;
  sqlite3: sqlite3.Database;
  mssql: mssql.ConnectionPool;
};

const CasbinRuleTable = 'casbin_rule';

export class BasicAdapter<T extends keyof Instance> implements Adapter {
  private knex: Knex.Knex;
  private config: Config;
  private drive: T;
  private client: Instance[T];

  private constructor(drive: T, client: Instance[T]) {
    this.config = {
      client: drive,
      useNullAsDefault: drive === 'sqlite3',
      log: { warn: () => {} },
    };
    this.knex = Knex.knex(this.config);
    this.drive = drive;
    this.client = client;
  }

  static async newAdapter<T extends keyof Instance>(
    drive: T,
    client: Instance[T],
  ): Promise<BasicAdapter<T>> {
    const a = new BasicAdapter(drive, client);
    await a.connect();
    await a.createTable();

    return a;
  }

  async loadPolicy(model: Model): Promise<void> {
    const result = await this.query(
      this.knex.select().from(CasbinRuleTable).toQuery(),
    );

    for (const line of result) {
      this.loadPolicyLine(line, model);
    }
  }

  async savePolicy(model: Model): Promise<boolean> {
    await this.query(this.knex.del().from(CasbinRuleTable).toQuery());

    let astMap = model.model.get('p')!;
    const processes: Array<Promise<CasbinRule[]>> = [];

    for (const [ptype, ast] of astMap) {
      for (const rule of ast.policy) {
        const line = this.savePolicyLine(ptype, rule);
        const p = this.query(
          this.knex.insert(line).into(CasbinRuleTable).toQuery(),
        );
        processes.push(p);
      }
    }

    astMap = model.model.get('g')!;
    for (const [ptype, ast] of astMap) {
      for (const rule of ast.policy) {
        const line = this.savePolicyLine(ptype, rule);
        const p = this.query(
          this.knex.insert(line).into(CasbinRuleTable).toQuery(),
        );
        processes.push(p);
      }
    }

    await Promise.all(processes);

    return true;
  }

  async addPolicy(sec: string, ptype: string, rule: string[]): Promise<void> {
    const line = this.savePolicyLine(ptype, rule);
    await this.query(this.knex.insert(line).into(CasbinRuleTable).toQuery());
  }

  async addPolicies(
    sec: string,
    ptype: string,
    rules: string[][],
  ): Promise<void> {
    const processes: Array<Promise<unknown>> = [];
    for (const rule of rules) {
      const line = this.savePolicyLine(ptype, rule);
      const p = this.query(
        this.knex.insert(line).into(CasbinRuleTable).toQuery(),
      );
      processes.push(p);
    }

    await Promise.all(processes);
  }

  async removePolicy(
    sec: string,
    ptype: string,
    rule: string[],
  ): Promise<void> {
    const line = this.savePolicyLine(ptype, rule);
    await this.query(
      this.knex.del().where(line).from(CasbinRuleTable).toQuery(),
    );
  }

  async removePolicies(
    sec: string,
    ptype: string,
    rules: string[][],
  ): Promise<void> {
    const processes: Array<Promise<CasbinRule[]>> = [];
    for (const rule of rules) {
      const line = this.savePolicyLine(ptype, rule);
      const p = this.query(
        this.knex.del().where(line).from(CasbinRuleTable).toQuery(),
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

    await this.query(
      this.knex.del().where(line).from(CasbinRuleTable).toQuery(),
    );
  }

  async close(): Promise<void> {
    switch (this.drive) {
      case 'pg':
      case 'mysql': {
        await (<BasicAdapter<'pg' | 'mysql'>>this).client.end();

        break;
      }
      case 'mysql2': {
        await (await (<BasicAdapter<'mysql2'>>this).client).end();

        break;
      }
      case 'sqlite3': {
        await new Promise<void>((resolve, reject) => {
          (<BasicAdapter<'sqlite3'>>this).client.close((err) => {
            if (err) {
              reject(err);
            }

            resolve();
          });
        });

        break;
      }
      case 'mssql': {
        await (<BasicAdapter<'mssql'>>this).client.close();

        break;
      }
    }
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
    rule: string[],
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

    await this.query(createTableSQL);
  }

  private async connect() {
    switch (this.drive) {
      case 'pg': {
        await (<BasicAdapter<'pg'>>this).client.connect();

        break;
      }
      case 'mysql': {
        await new Promise<void>((resolve, reject) => {
          (<BasicAdapter<'mysql'>>this).client.connect((err) => {
            if (err) reject(err);
            resolve();
          });
        });

        break;
      }
      case 'mysql2': {
        await (<BasicAdapter<'mysql2'>>this).client;

        break;
      }
      case 'sqlite3': {
        // sqlite3 will connect automatically

        break;
      }
      case 'mssql': {
        await (<BasicAdapter<'mssql'>>this).client.connect();

        break;
      }
    }
  }

  private async query(sql: string): Promise<CasbinRule[]> {
    let result: CasbinRule[] | undefined;

    switch (this.drive) {
      case 'pg': {
        result = (
          await (<BasicAdapter<'pg'>>this).client.query<CasbinRule>(sql)
        ).rows;

        break;
      }
      case 'mysql': {
        result = await new Promise((resolve, reject) => {
          (<BasicAdapter<'mysql'>>this).client.query(sql, (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
          });
        });

        break;
      }
      case 'mysql2': {
        result = (
          await (await (<BasicAdapter<'mysql2'>>this).client).query(sql)
        )[0] as CasbinRule[];

        break;
      }
      case 'sqlite3': {
        result = await new Promise<CasbinRule[] | undefined>(
          (resolve, reject) => {
            (<BasicAdapter<'sqlite3'>>this).client.all(sql, (err, rows) => {
              if (err) reject(err);

              resolve(rows as CasbinRule[]);
            });
          },
        );

        break;
      }
      case 'mssql': {
        result = (await (<BasicAdapter<'mssql'>>this).client.query(sql))
          .recordset as unknown as CasbinRule[] | undefined;

        break;
      }
    }

    return result ?? [];
  }
}
