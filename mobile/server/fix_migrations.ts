import { query } from './src/database/db.ts';

async function fix() {
    try {
        await query("INSERT INTO _migrations (filename) VALUES ('08_password_reset_tokens.sql'), ('09_add_user_role.sql') ON CONFLICT DO NOTHING");
        console.log('✅ Migrations table fixed');
    } catch (err) {
        console.error('❌ Fix failed:', err);
    } finally {
        process.exit();
    }
}

fix();
