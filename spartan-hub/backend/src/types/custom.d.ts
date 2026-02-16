// Custom type definitions to resolve better-sqlite3 import issues

declare module 'better-sqlite3' {
  import { Database as DatabaseType, Options } from 'better-sqlite3';

  const BetterSqlite3: (filename: string, options?: Options) => DatabaseType;

  export = BetterSqlite3;
}

// Ensure this file is treated as a module
export {};