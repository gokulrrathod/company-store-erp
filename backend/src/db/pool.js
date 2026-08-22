import pg from 'pg';
import 'dotenv/config';
import { getCurrentUserName } from '../middleware/requestContext.js';

const rawPool = new pg.Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
});

// pg emits 'error' on idle clients (e.g. dropped connections); Node treats an
// unhandled EventEmitter 'error' as fatal and kills the process, so this must
// be handled even though it just logs.
rawPool.on('error', (err) => {
  console.error('Unexpected error on idle Postgres client', err);
});

// Every checked-out connection gets the current request's user name stamped
// into a session GUC before running anything else, so the audit_log trigger
// (which has no other way to know who made a change) can read it via
// current_setting('app.current_user_name', true). Transparent to every route
// - none of them need to know this happens.
async function stampUser(client) {
  await client.query(`SELECT set_config('app.current_user_name', $1, false)`, [getCurrentUserName() || '']);
}

export const pool = {
  async query(text, params) {
    const client = await rawPool.connect();
    try {
      await stampUser(client);
      return await client.query(text, params);
    } finally {
      client.release();
    }
  },
  async connect() {
    const client = await rawPool.connect();
    await stampUser(client);
    return client;
  },
};
