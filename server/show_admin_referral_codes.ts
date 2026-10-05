/**
 * Script pour afficher les codes de parrainage de tous les administrateurs
 */
import { pool } from './src/database/db.js';

async function showAdminReferralCodes() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   📋 CODES DE PARRAINAGE DES ADMINISTRATEURS');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    const result = await pool.query(`
      SELECT 
        id,
        nom,
        prenom,
        email,
        code_invitation,
        role,
        created_at,
        (SELECT COUNT(*) FROM users WHERE parrain_id = u.id) as filleuls_count
      FROM users u
      WHERE role = 'ADMIN'
      ORDER BY created_at ASC
    `);

    const admins = result.rows;

    if (admins.length === 0) {
      console.log('⚠️  Aucun administrateur trouvé dans la base de données.');
      return;
    }

    console.log(`Nombre d'administrateurs: ${admins.length}\n`);

    admins.forEach((admin, index) => {
      console.log(`${index + 1}. ${admin.prenom} ${admin.nom}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   Code de parrainage: ${admin.code_invitation || '❌ AUCUN CODE'}`);
      console.log(`   Nombre de filleuls: ${admin.filleuls_count}`);
      console.log(`   Créé le: ${new Date(admin.created_at).toLocaleDateString('fr-FR')}`);
      console.log('');
    });

    // Statistiques
    const withCode = admins.filter(a => a.code_invitation).length;
    const withoutCode = admins.length - withCode;
    const totalReferrals = admins.reduce((sum, a) => sum + parseInt(a.filleuls_count), 0);

    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 STATISTIQUES:');
    console.log(`   Admins avec code: ${withCode}/${admins.length}`);
    if (withoutCode > 0) {
      console.log(`   ⚠️  Admins SANS code: ${withoutCode}`);
      console.log(`\n   💡 Exécutez: npx tsx generate_missing_referral_codes.ts`);
    }
    console.log(`   Total filleuls parrainés: ${totalReferrals}`);
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error: any) {
    console.error('❌ Erreur:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Exécution du script
showAdminReferralCodes()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script échoué:', error);
    process.exit(1);
  });
