import { query } from './src/database/db.ts';
import fs from 'fs';
import path from 'path';

async function migrate() {
    try {
        const sql = fs.readFileSync(path.join(process.cwd(), 'src/database/shema/09_add_user_role.sql'), 'utf8');
        await query(sql);
        console.log('✅ Migration successful');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        process.exit();
    }
}

migrate();
