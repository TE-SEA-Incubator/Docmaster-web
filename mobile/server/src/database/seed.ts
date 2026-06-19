import pkg from 'pg';
const { Pool } = pkg;
import * as argon2 from 'argon2';
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

async function seedAdmin() {
    console.log('\n🌱 DocMaster - Database Seeding...');
    console.log('-----------------------------------------');

    const client = await pool.connect();
    try {
        const email = 'bouki.boukar@gmail.com';
        const emailprod = 'bouki.boukar@gmail.com';
        const password = 'password1234';
        
        // 1. Check if user already exists
        const { rows } = await client.query('SELECT id FROM users WHERE email = $1', [email]);
        
        if (rows.length > 0) {
            console.log(`⚠️ User ${email} already exists. Updating to ADMIN.`);
            await client.query('UPDATE users SET role = \'ADMIN\' WHERE email = $1', [email]);
        } else {
            console.log(`🚀 Creating ADMIN user: ${email}`);
            const hashedPassword = await argon2.hash(password);
            
            await client.query(`
                INSERT INTO users (nom, prenom, email, mot_de_passe, role, is_verified)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [
                'Admin',
                'Aboubakar',
                email,
                hashedPassword,
                'ADMIN',
                true
            ]);
            console.log('✅ Admin user created successfully!');
        }

        console.log('-----------------------------------------');
        console.log('✨ Seeding completed!');
        console.log('-----------------------------------------\n');

    } catch (error: any) {
        console.error('\n🛑 ERROR during seeding :');
        console.error(error.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

seedAdmin();
