# Basic Adapter

[![ci](https://github.com/node-casbin/basic-adapter/actions/workflows/ci.yml/badge.svg)](https://github.com/node-casbin/basic-adapter/actions/workflows/ci.yml)
[![NPM version][npm-image]][npm-url]
[![NPM download][download-image]][download-url]

[npm-image]: https://img.shields.io/npm/v/casbin-basic-adapter.svg
[npm-url]: https://npmjs.org/package/casbin-basic-adapter
[download-image]: https://img.shields.io/npm/dm/casbin-basic-adapter.svg
[download-url]: https://npmjs.org/package/casbin-basic-adapter

Basic Adapter is a basic driver adapter for `Node-Casbin` which supports `pg`, `sqlite3`, `mysql`, `mysql2`, and `mssql`. With this library, `Node-Casbin` can load policy from or save policy to supported persistence systems.

## Drives

We currently support the following SQL systems:

- [x] pg
- [x] mysql
- [x] mysql2
- [x] sqlite3
- [ ] oracledb
- [x] mssql

## Installation

```sh
npm i casbin-basic-adapter
```

## Simple Example

```ts
import { newEnforcer } from 'casbin';
import { Client } from 'pg';
import { BasicAdapter } from 'casbin-basic-adapter';

async function myFunction() {
  // Initialize a Basic adapter and use it in a Node-Casbin enforcer:
  // The adapter can not automatically create database.
  // But the adapter will automatically and use the table named "casbin_rule".
  const a = await BasicAdapter.newAdapter('pg',
    new Client({
      user: 'postgres',
      database: 'postgres',
      password: 'postgres',
    }));

  const e = await newEnforcer('examples/rbac_model.conf', a);

  // Check the permission.
  e.enforce('alice', 'data1', 'read');

  // Modify the policy.
  // await e.addPolicy(...);
  // await e.removePolicy(...);

  // Save the policy back to DB.
  await e.savePolicy();
```

## Custom Table Name Example

By default, each adapter creates its own table in the database. While this might seem convenient, it poses a significant drawback when multiple adapters need to share the same database: policies cannot be shared across adapters if they are stored in separate tables.

### Why Customization is Important

**Compliance with Naming Conventions:**
Many production databases follow strict naming conventions. By customizing the table name, you can ensure that your adapter’s tables comply with these conventions, which is essential for production environments.

**Shared Policies:**
When the same set of policies should be accessible by different adapters or services, having them in separate tables prevents a unified view. Customizing the table name allows you to consolidate policies into a single table that can be shared across adapters.

**Avoiding Duplication:**
If each adapter creates its own table by default, it can lead to unnecessary duplication of data. This not only wastes storage space but can also lead to inconsistent policy enforcement across different parts of your application.

**Simplified Management:**
With a single, customized table for all policies, managing, updating, and querying policy data becomes much easier. This is especially beneficial in environments where policies need to be audited or maintained centrally.

### How to Customize the Table Name

Most adapters offer a configuration option to set the table name explicitly. For example:

```ts
import { newEnforcer } from 'casbin';
import { ConnectionPool } from 'mssql';
import { BasicAdapter } from 'casbin-basic-adapter';

const tableName = 'dbo.policies'// instead of the default 'casbin_rule'

async function myFunction() {
  const a = await BasicAdapter.newAdapter('mssql',
    new ConnectionPool({
      server: 'localhost',
      port: 1433,
      user: 'usr',
      password: 'pwd',
      database: 'casbin',
      options: {
        encrypt: true,
        trustServerCertificate: true,
      },
    }),
    tableName
  );

  const e = await newEnforcer('examples/rbac_model.conf', a);

  // Check the permission.
  e.enforce('alice', 'data1', 'read');

  // Modify the policy.
  // await e.addPolicy(...);
  // await e.removePolicy(...);

  // Save the policy back to DB.
  await e.savePolicy();
```

By setting the `tableName` option, you ensure that all adapters point to the same table, enabling seamless policy sharing and compliance with any required naming conventions.

## Getting Help

- [Node-Casbin](https://github.com/casbin/node-casbin)

## License

This project is under Apache 2.0 License. See the [LICENSE](LICENSE) file for the full license text.
