import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '12345',
    database: process.env.DB_NAME || 'docmaster',
    port: Number(process.env.DB_PORT) || 5432,
});

async function cleanDatabase() {
    console.log('\n🧹 DocMaster - Database Cleaning...');
    console.log('-----------------------------------------');

    const client = await pool.connect();
    try {
        // Obtenir toutes les tables (sauf les tables de migration et système)
        const { rows } = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name NOT IN ('_migrations')
        `);

        if (rows.length === 0) {
            console.log('✨ Aucune table à nettoyer.');
            return;
        }

        const tableNames = rows.map(r => `"${r.table_name}"`).join(', ');
        
        console.log(`🗑️ Nettoyage de : ${tableNames}`);
        
        // On utilise RESTART IDENTITY pour remettre les compteurs à zéro
        // et CASCADE pour gérer les clés étrangères
        await client.query(`TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE`);

        console.log('-----------------------------------------');
        console.log('✅ Base de données nettoyée avec succès !');
        console.log('-----------------------------------------\n');

    } catch (error: any) {
        console.error('\n❌ Erreur lors du nettoyage :');
        console.error(error.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

cleanDatabase();
