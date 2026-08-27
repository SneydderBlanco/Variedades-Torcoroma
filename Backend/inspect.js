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
    const res = await pool.query(`SELECT * FROM usuarios`);
    console.log(res.rows);
  } catch (error) {
    console.error("Error", error);
  } finally {
    pool.end();
  }
}
run();
