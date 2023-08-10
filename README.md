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

## Getting Help

- [Node-Casbin](https://github.com/casbin/node-casbin)

## License

This project is under Apache 2.0 License. See the [LICENSE](LICENSE) file for the full license text.
