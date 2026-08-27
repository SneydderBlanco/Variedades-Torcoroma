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
    await pool.query(`
      CREATE TABLE IF NOT EXISTS configuracion_web (
        id INT PRIMARY KEY, 
        hero_img VARCHAR(255), 
        hero_subtitle VARCHAR(100), 
        hero_title VARCHAR(255), 
        hero_text TEXT, 
        promo_img VARCHAR(255), 
        promo_title VARCHAR(255), 
        promo_text TEXT
      );
      INSERT INTO configuracion_web (id, hero_subtitle, hero_title, hero_text, promo_title, promo_text) 
      VALUES (
        1, 
        'NUEVA COLECCIÓN', 
        'Eleva Tu Estilo.', 
        'Descubre los calzados más exclusivos de Torcoroma. Diseños vanguardistas, confort absoluto y calidad premium para cada paso que des.', 
        'Estilo y Confort sin Compromisos.', 
        'Encuentra tu talla ideal con nuestro sistema de inventario en vivo.'
      ) ON CONFLICT (id) DO NOTHING;
    `);
    console.log("Tabla creada correctamente");
  } catch (error) {
    console.error("Error", error);
  } finally {
    pool.end();
  }
}
run();
