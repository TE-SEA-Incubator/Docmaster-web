/**
 * Script to apply the partner withdrawal migration
 * Adds source_type column to withdrawals table
 */
import { getClient, pool } from './src/database/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyMigration() {
  const client = await getClient();
  
  try {
    console.log('🔄 Applying withdrawal migration...');
    
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'src/database/shema/67_add_source_type_to_withdrawals.sql'),
      'utf-8'
    );
    
    await client.query('BEGIN');
    await client.query(migrationSQL);
    await client.query('COMMIT');
    
    console.log('✅ Migration applied successfully!');
    console.log('   - Added source_type column to withdrawals');
    console.log('   - Created indexes for performance');
    console.log('   - Updated existing withdrawals to USER type');
    
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

applyMigration()
  .then(() => {
    console.log('\n✅ Done! Partner withdrawal system is ready.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
