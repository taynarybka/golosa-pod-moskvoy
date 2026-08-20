declare module "cloudflare:workers" {
  export const env: {
    DB: D1Database;
  };
}

interface Fetcher {
  fetch(request: Request): Promise<Response>;
}

interface D1ResultMeta {
  changes: number;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<{ meta: D1ResultMeta }>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}
