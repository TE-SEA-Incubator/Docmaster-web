import { query } from './src/database/db.ts';

async function checkTable() {
    try {
        const res = await query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'document_types'
        `);
        console.log('Columns in document_types:');
        console.table(res.rows);
        
        const data = await query('SELECT * FROM document_types LIMIT 1');
        console.log('Sample data:', data.rows);
    } catch (err) {
        console.error('Error checking table:', err);
    }
}

checkTable();
