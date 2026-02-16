interface Database {
  prepare(sql: string): Statement | null;
  exec(sql: string): void;
  pragma(pragma: string): unknown;
  run(sql: string, ...params: unknown[]): { changes: number; lastInsertRowid: number };
  get(sql: string, ...params: unknown[]): Record<string, unknown> | undefined;
  all(sql: string, ...params: unknown[]): Record<string, unknown>[];
  close(): void;
}

interface Statement {
  run(...params: unknown[]): { changes: number; lastInsertRowid: number };
  get(...params: unknown[]): Record<string, unknown> | undefined;
  all(...params: unknown[]): Record<string, unknown>[];
  finalize(): void;
}

declare module 'better-sqlite3' {
  const Database: {
    new (filename: string, options?: { readonly?: boolean; timeout?: number; verbose?: boolean }): Database;
  };
  export = Database;
}