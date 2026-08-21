import pg from 'pg';
import 'dotenv/config';

export const pool = new pg.Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
});

// pg emits 'error' on idle clients (e.g. dropped connections); Node treats an
// unhandled EventEmitter 'error' as fatal and kills the process, so this must
// be handled even though it just logs.
pool.on('error', (err) => {
  console.error('Unexpected error on idle Postgres client', err);
});
