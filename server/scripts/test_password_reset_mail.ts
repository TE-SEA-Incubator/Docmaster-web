import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { mailService } from '../src/services/mail.service.ts';

dotenv.config();

async function main() {
  console.log('--- 🔍 TEST CONFIGURATION SMTP & EMAIL ---');
  console.log('MAIL_HOST:', process.env.MAIL_HOST);
  console.log('MAIL_PORT:', process.env.MAIL_PORT);
  console.log('MAIL_USER:', process.env.MAIL_USER);
  console.log('MAIL_FROM:', process.env.MAIL_FROM);
  console.log('FRONTEND_URL:', process.env.FRONTEND_URL);

  const targetEmail = process.argv[2] || process.env.MAIL_USER;

  console.log(`\n1️⃣ Vérification de la connexion SMTP...`);
  const port = Number(process.env.MAIL_PORT) || 587;
  const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST || 'smtp.gmail.com',
    port: port,
    secure: port === 465,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  try {
    await transporter.verify();
    console.log('✅ Connexion SMTP validée avec succès !');
  } catch (error: any) {
    console.error('❌ Échec de la connexion SMTP:', error.message);
    process.exit(1);
  }

  if (targetEmail) {
    console.log(`\n2️⃣ Test d'envoi d'un email de réinitialisation vers: ${targetEmail}`);
    const dummyToken = 'test-token-' + Math.random().toString(36).substring(2, 15);
    try {
      await mailService.sendPasswordResetEmail(targetEmail, dummyToken);
      console.log('✅ Email de réinitialisation standard envoyé avec succès !');

      console.log(`\n3️⃣ Test d'envoi d'email de réinitialisation espace Partenaire...`);
      await mailService.sendPortalPasswordResetEmail(targetEmail, dummyToken, 'partenaire');
      console.log('✅ Email de réinitialisation Partenaire envoyé avec succès !');

      console.log(`\n4️⃣ Test d'envoi d'email de réinitialisation espace Autorité...`);
      await mailService.sendPortalPasswordResetEmail(targetEmail, dummyToken, 'autorite');
      console.log('✅ Email de réinitialisation Autorité envoyé avec succès !');

      console.log('\n🎉 TOUS LES TESTS D\'ENVOI ONT RÉUSSI !');
    } catch (error: any) {
      console.error('❌ Erreur lors de l\'envoi de l\'email:', error.message);
    }
  } else {
    console.log('\nℹ️ Aucun email cible spécifié. Vous pouvez passer une adresse en argument :');
    console.log('   npx tsx scripts/test_password_reset_mail.ts votre-email@example.com');
  }
}

main().catch(console.error);
