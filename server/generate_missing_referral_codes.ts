/**
 * Script pour générer des codes de parrainage pour tous les utilisateurs qui n'en ont pas
 * (Y compris les admins)
 */
import { pool } from './src/database/db.js';

/**
 * Génère un code de parrainage unique de 8 caractères
 */
async function generateUniqueReferralCode(): Promise<string> {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let isUnique = false;
  let code = '';

  while (!isUnique) {
    // Générer un code aléatoire de 8 caractères
    code = Array.from({ length: 8 })
      .map(() => characters[Math.floor(Math.random() * characters.length)])
      .join('');

    // Vérifier si le code existe déjà
    const result = await pool.query(
      'SELECT id FROM users WHERE code_invitation = $1',
      [code]
    );
    isUnique = result.rows.length === 0;
  }

  return code;
}

async function generateMissingReferralCodes() {
  console.log('🔄 Génération des codes de parrainage manquants...\n');

  try {
    // Récupérer tous les utilisateurs sans code de parrainage
    const result = await pool.query(`
      SELECT id, email, nom, prenom, role 
      FROM users 
      WHERE code_invitation IS NULL OR code_invitation = ''
      ORDER BY created_at ASC
    `);

    const usersWithoutCode = result.rows;

    if (usersWithoutCode.length === 0) {
      console.log('✅ Tous les utilisateurs ont déjà un code de parrainage !');
      return;
    }

    console.log(`📋 ${usersWithoutCode.length} utilisateur(s) sans code de parrainage trouvé(s):\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const user of usersWithoutCode) {
      try {
        const code = await generateUniqueReferralCode();
        
        await pool.query(
          'UPDATE users SET code_invitation = $1, updated_at = NOW() WHERE id = $2',
          [code, user.id]
        );

        const roleLabel = user.role || 'USER';
        console.log(`✅ ${user.prenom} ${user.nom} (${user.email}) [${roleLabel}] → ${code}`);
        successCount++;
      } catch (error: any) {
        console.error(`❌ Erreur pour ${user.email}: ${error.message}`);
        errorCount++;
      }
    }

    console.log(`\n📊 Résumé:`);
    console.log(`   ✅ Codes générés: ${successCount}`);
    if (errorCount > 0) {
      console.log(`   ❌ Erreurs: ${errorCount}`);
    }

    // Afficher quelques statistiques
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(code_invitation) as with_code,
        COUNT(*) - COUNT(code_invitation) as without_code
      FROM users
    `);

    const stats = statsResult.rows[0];
    console.log(`\n📈 Statistiques globales:`);
    console.log(`   Total utilisateurs: ${stats.total}`);
    console.log(`   Avec code: ${stats.with_code}`);
    console.log(`   Sans code: ${stats.without_code}`);

  } catch (error: any) {
    console.error('❌ Erreur lors de la génération des codes:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Exécution du script
generateMissingReferralCodes()
  .then(() => {
    console.log('\n✅ Script terminé avec succès !');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script échoué:', error);
    process.exit(1);
  });
