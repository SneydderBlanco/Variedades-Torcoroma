import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'torcoroma',
  password: 'admin',
  port: 5432,
});

async function run() {
  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log(res.rows.map(r => r.table_name).join(', '));
  } catch (error) {
    console.error("Error", error);
  } finally {
    pool.end();
  }
}
run();
