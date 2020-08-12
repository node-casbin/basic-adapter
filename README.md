# Basic Adapter

Basic Adapter is a basic drives adapter for `Node-Casbin` supports `pg`, `sqlite3`, `mysql`, `mysql2`, `oracledb` and `mssql`. With this library, `Node-Casbin` can load policy from supported drives or save policy to it.

## Drives

we currently supports the following SQL drives:

- [x] pg
- [x] mysql
- [x] mysql2
- [x] sqlite3
- [ ] oracledb
- [ ] mssql

## Installation

```sh
npm i casbin-basic-adapter
```

## Simple Example

```ts
import casbin from 'casbin';
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

  const e = await casbin.newEnforcer('examples/rbac_model.conf', a);

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
