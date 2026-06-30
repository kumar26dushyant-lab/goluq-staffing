import type Database from "better-sqlite3";

/**
 * A tiny D1-compatible shim over better-sqlite3 so the existing Cloudflare
 * Function handlers (which use env.DB.prepare().bind().run()/all()/first()) run
 * UNCHANGED on the Oracle VM. better-sqlite3 is synchronous; we wrap results in
 * promises to match D1's async surface.
 */
export class D1Stmt {
  constructor(
    private db: Database.Database,
    public readonly sql: string,
    public readonly binds: unknown[] = []
  ) {}

  bind(...vals: unknown[]): D1Stmt {
    return new D1Stmt(this.db, this.sql, vals);
  }

  async run() {
    const info = this.db.prepare(this.sql).run(...(this.binds as never[]));
    return {
      success: true,
      meta: { changes: info.changes, last_row_id: Number(info.lastInsertRowid) },
    };
  }

  async all<T = unknown>() {
    const results = this.db.prepare(this.sql).all(...(this.binds as never[])) as T[];
    return { results, success: true };
  }

  async first<T = unknown>(col?: string): Promise<T | null> {
    const row = this.db.prepare(this.sql).get(...(this.binds as never[])) as
      | Record<string, unknown>
      | undefined;
    if (col) return (row ? (row[col] as T) : null) ?? null;
    return (row as T) ?? null;
  }
}

export class D1 {
  constructor(private db: Database.Database) {}

  prepare(sql: string): D1Stmt {
    return new D1Stmt(this.db, sql);
  }

  async batch(stmts: D1Stmt[]) {
    const tx = this.db.transaction((list: D1Stmt[]) => {
      for (const s of list) this.db.prepare(s.sql).run(...(s.binds as never[]));
    });
    tx(stmts);
    return stmts.map(() => ({ success: true }));
  }

  async exec(sql: string) {
    this.db.exec(sql);
    return { count: 0, duration: 0 };
  }
}
