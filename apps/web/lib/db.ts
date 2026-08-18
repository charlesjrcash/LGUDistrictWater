import { Pool } from "pg";

const globalForDb = globalThis as unknown as { bmwsPool?: Pool };

export const db =
  globalForDb.bmwsPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") globalForDb.bmwsPool = db;
