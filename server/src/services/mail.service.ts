import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

export class MailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    const port = Number(process.env.MAIL_PORT) || 587;
    this.transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST || 'smtp.gmail.com',
      port: port,
      secure: port === 465, // true for 465, false for other ports
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    // Verify connection on startup
    this.verifyConnection();
  }

  /**
   * Verify SMTP connection
   */
  async verifyConnection(): Promise<void> {
    try {
      await this.transporter.verify();
      console.log('✅ SMTP connection established successfully');
    } catch (error) {
      console.error('❌ SMTP connection failed:', error);
    }
  }

  /**
   * Send a password reset email
   */
  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password.html?token=${token}`;
    const fromName = "DocMaster Support";
    const fromEmail = process.env.MAIL_FROM || process.env.MAIL_USER || 'assistance@dm.cm';
    
    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject: 'Réinitialisation de votre mot de passe | DocMaster',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e0d8; border-radius: 14px;">
          <h2 style="color: #f5a64b; text-align: center;">Réinitialisation de mot de passe</h2>
          <p>Bonjour,</p>
          <p>Vous avez demandé la réinitialisation de votre mot de passe DocMaster. Veuillez cliquer sur le bouton ci-dessous pour procéder :</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #f5a64b; color: white; padding: 14px 25px; text-decoration: none; border-radius: 10px; font-weight: bold; display: inline-block;">Réinitialiser mon mot de passe</a>
          </div>
          <p>Ce lien expirera dans 24 heures.</p>
          <p>Si vous n'avez pas demandé cette action, vous pouvez ignorer cet email en toute sécurité.</p>
          <hr style="border: 0; border-top: 1px solid #e5e0d8; margin: 20px 0;">
          <p style="font-size: 12px; color: #8e8e8e; text-align: center;">
            &copy; ${new Date().getFullYear()} DocMaster. Tous droits réservés.
          </p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`📧 Email de réinitialisation envoyé à : ${to}`);
    } catch (error: any) {
      console.error(`❌ Erreur lors de l'envoi de l'email à ${to}:`, error.message);
      // Fallback: try sending with just the email address if formatted from fails
      if (error.message.includes('550')) {
        console.log('🔄 Tentative d\'envoi avec l\'adresse email brute...');
        try {
          mailOptions.from = fromEmail;
          await this.transporter.sendMail(mailOptions);
          console.log(`📧 Email envoyé avec succès (fallback brut) à : ${to}`);
          return;
        } catch (e: any) {
          console.error('❌ Échec définitif de l\'envoi (fallback compris):', e.message);
        }
      }
      throw new Error('Impossible d\'envoyer l\'email de réinitialisation.');
    }
  }

  /**
   * Send a welcome email
   */
  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    const fromName = "DocMaster";
    const fromEmail = process.env.MAIL_FROM || process.env.MAIL_USER || 'assistance@dm.cm';

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject: 'Bienvenue sur DocMaster !',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e0d8; border-radius: 14px;">
          <h2 style="color: #f5a64b; text-align: center;">Bienvenue, ${name} !</h2>
          <p>Nous sommes ravis de vous compter parmi nos utilisateurs.</p>
          <p>DocMaster vous aide à sécuriser et retrouver vos documents importants en toute simplicité.</p>
          <p>Vous pouvez dès maintenant commencer à déclarer vos documents ou rechercher des objets perdus.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard.html" style="background-color: #f5a64b; color: white; padding: 14px 25px; text-decoration: none; border-radius: 10px; font-weight: bold; display: inline-block;">Accéder à mon tableau de bord</a>
          </div>
          <hr style="border: 0; border-top: 1px solid #e5e0d8; margin: 20px 0;">
          <p style="font-size: 12px; color: #8e8e8e; text-align: center;">
            &copy; ${new Date().getFullYear()} DocMaster. Tous droits réservés.
          </p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`📧 Email de bienvenue envoyé à : ${to}`);
    } catch (error: any) {
      console.error(`❌ Erreur lors de l'envoi de l'email de bienvenue à ${to}:`, error.message);
      // Fallback
      if (error.message.includes('550')) {
        try {
          mailOptions.from = fromEmail;
          await this.transporter.sendMail(mailOptions);
          console.log(`📧 Email de bienvenue envoyé avec succès (fallback) à : ${to}`);
        } catch (e) {}
      }
    }
  }

  /**
   * Send a verification email with a PIN code
   */
  async sendVerificationEmail(to: string, pin: string): Promise<void> {
    const fromName = "Vérification DocMaster";
    const fromEmail = process.env.MAIL_FROM || process.env.MAIL_USER || 'assistance@dm.cm';

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject: 'Code de vérification | DocMaster',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e0d8; border-radius: 14px;">
          <h2 style="color: #f5a64b; text-align: center;">Vérification de votre compte</h2>
          <p>Bonjour,</p>
          <p>Merci de vous être inscrit sur DocMaster. Pour finaliser la création de votre compte, veuillez utiliser le code de vérification suivant :</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; color: #f5a64b; letter-spacing: 5px; background-color: #faf8f5; padding: 15px 30px; border-radius: 10px; border: 1px dashed #f5a64b;">${pin}</span>
          </div>
          <p>Ce code expirera dans 10 minutes.</p>
          <p>Si vous n'avez pas tenté de créer un compte DocMaster, vous pouvez ignorer cet email.</p>
          <hr style="border: 0; border-top: 1px solid #e5e0d8; margin: 20px 0;">
          <p style="font-size: 12px; color: #8e8e8e; text-align: center;">
            &copy; ${new Date().getFullYear()} DocMaster. Tous droits réservés.
          </p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`📧 Code de vérification envoyé à : ${to}`);
    } catch (error: any) {
      console.error(`❌ Erreur lors de l'envoi de l'email de vérification à ${to}:`, error.message);
      // Fallback
      if (error.message.includes('550')) {
        try {
          mailOptions.from = fromEmail;
          await this.transporter.sendMail(mailOptions);
          console.log(`📧 Code de vérification envoyé avec succès (fallback) à : ${to}`);
          return;
        } catch (e: any) {
          console.error('❌ Échec définitif (fallback compris):', e.message);
        }
      }
      throw new Error('Impossible d\'envoyer l\'email de vérification.');
    }
  }
}
