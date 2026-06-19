import pkg from 'pg';
const { Pool } = pkg;
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Migration database connection pool
 */
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '12345',
    database: process.env.DB_NAME || 'docmaster',
    port: Number(process.env.DB_PORT) || 5432,
});

/**
 * Robust migration system for DocMaster
 */
export async function initDatabase(): Promise<void> {
    const schemaDir = path.join(__dirname, 'shema');
    console.log('\n📦 DocMaster - Migration Manager (TS)');
    console.log('-----------------------------------------');

    let client;
    try {
        client = await pool.connect();
        
        // 1. Create migration monitoring table
        await client.query(`
            CREATE TABLE IF NOT EXISTS _migrations (
                id SERIAL PRIMARY KEY,
                filename VARCHAR(255) UNIQUE NOT NULL,
                applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 2. Fetch history
        const { rows } = await client.query<{ filename: string }>('SELECT filename FROM _migrations');
        const appliedMigrations = new Set(rows.map(r => r.filename));

        // 3. Read SQL files
        const files = await fs.readdir(schemaDir);
        const sqlFiles = files
            .filter(f => f.endsWith('.sql'))
            .sort((a, b) => a.localeCompare(b));

        console.log(`🔍 Checking ${sqlFiles.length} schema files...`);

        let appliedCount = 0;
        let skippedCount = 0;

        // 4. Sequential execution
        for (const file of sqlFiles) {
            if (appliedMigrations.has(file)) {
                skippedCount++;
                continue;
            }

            console.log(`🚀 Applying : ${file}`);
            const filePath = path.join(schemaDir, file);
            const sql = await fs.readFile(filePath, 'utf8');
            
            await client.query('BEGIN');
            try {
                await client.query(sql);
                await client.query('INSERT INTO _migrations (filename) VALUES ($1)', [file]);
                await client.query('COMMIT');
                
                console.log(`✅ Success : ${file}`);
                appliedCount++;
            } catch (err: any) {
                await client.query('ROLLBACK');
                console.error(`❌ Migration failed for ${file} :`);
                console.error(`   > ${err.message}`);
                throw err;
            }
        }

        console.log('-----------------------------------------');
        if (appliedCount === 0) {
            console.log(`✨ All up to date (${skippedCount} files checked).`);
        } else {
            console.log(`✨ Done ! ${appliedCount} new migration(s) applied.`);
            console.log(`⏩ ${skippedCount} existing files were skipped.`);
        }
        console.log('-----------------------------------------\n');

    } catch (error: any) {
        console.error('\n🛑 CRITICAL ERROR during migrations :');
        console.error(error.message);
        process.exit(1);
    } finally {
        if (client) client.release();
        await pool.end();
    }
}

// Auto-run if executed directly
const isDirectRun = process.argv[1]?.includes('init.ts') || process.argv[1]?.includes('init.js');
if (isDirectRun) {
    initDatabase();
}
