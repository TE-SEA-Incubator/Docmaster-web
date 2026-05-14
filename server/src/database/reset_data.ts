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

async function resetData() {
    console.log('\n🧹 DocMaster - Resetting User Data (Preserving Admin)...');
    console.log('-----------------------------------------');

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Identify all tables to truncate (everything except users, plans, doc_types, settings, and migrations)
        const { rows } = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name NOT IN (
                'users', 
                'plans', 
                'document_types', 
                'app_settings', 
                'feature_definitions',
                '_migrations'
            )
        `);

        const tablesToTruncate = rows.map(r => `"${r.table_name}"`);
        
        if (tablesToTruncate.length > 0) {
            console.log(`🗑️ Truncating user-data tables: ${tablesToTruncate.join(', ')}`);
            await client.query(`TRUNCATE TABLE ${tablesToTruncate.join(', ')} RESTART IDENTITY CASCADE`);
        }

        // 2. Delete non-admin users
        console.log('👤 Removing non-admin users...');
        const deleteUsersResult = await client.query(`
            DELETE FROM users 
            WHERE role != 'ADMIN' OR role IS NULL
        `);
        console.log(`✅ Removed ${deleteUsersResult.rowCount} users.`);

        // 3. Reset admin points and balance if needed (optional)
        console.log('🔄 Resetting admin stats...');
        await client.query(`
            UPDATE users 
            SET points = 0, wallet_balance = 0 
            WHERE role = 'ADMIN'
        `);

        await client.query('COMMIT');
        console.log('-----------------------------------------');
        console.log('✨ Reset complete! Database is now clean (Admin preserved).');
        console.log('-----------------------------------------\n');

    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('\n❌ Error during reset:');
        console.error(error.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

resetData();
