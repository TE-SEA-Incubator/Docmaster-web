import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { TIMING } from '../config/timing.ts';
import { partnerLinks } from '../utils/partnerLinks.ts';
import {
  buildEmailLayout,
  emailButton,
  emailButtonsRow,
  emailInfoBox,
  emailMuted,
  emailParagraph,
  emailPasswordBox,
  emailPinCode,
  partnerDualButtons,
  escapeHtml,
} from '../utils/emailTemplates.ts';

dotenv.config();

export class MailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    const port = Number(process.env.MAIL_PORT) || 587;
    this.transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST || 'smtp.gmail.com',
      port: port,
      secure: port === 465,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    this.verifyConnection().catch((err) => console.error('❌ SMTP verify connection failed:', err));
  }

  async verifyConnection(): Promise<void> {
    try {
      await this.transporter.verify();
      console.log('✅ SMTP connection established successfully');
    } catch (error) {
      console.error('❌ SMTP connection failed:', error);
    }
  }

  private fromEmail(): string {
    return process.env.MAIL_FROM || process.env.MAIL_USER || 'assistance@dm.cm';
  }

  private async sendMail(
    to: string,
    subject: string,
    html: string,
    options?: { throwOnFail?: boolean; logLabel?: string }
  ): Promise<void> {
    const fromEmail = this.fromEmail();
    const mailOptions = { from: fromEmail, to, subject, html };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`📧 ${options?.logLabel || 'Email'} envoyé à : ${to}`);
    } catch (error: any) {
      console.error(`❌ Erreur envoi email à ${to}:`, error.message);
      if (error.message.includes('550')) {
        try {
          await this.transporter.sendMail({ ...mailOptions, from: fromEmail });
          console.log(`📧 ${options?.logLabel || 'Email'} envoyé (fallback) à : ${to}`);
          return;
        } catch (e: any) {
          console.error('❌ Échec définitif (fallback):', e.message);
        }
      }
      if (options?.throwOnFail !== false) {
        throw new Error(`Impossible d'envoyer l'email à ${to}`);
      }
    }
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3003'}/reset-password?token=${token}`;

    const html = buildEmailLayout({
      context: 'security',
      preheader: 'Réinitialisez votre mot de passe DocMaster',
      title: 'Réinitialisation de mot de passe',
      subtitle: 'Sécurisez l\'accès à votre compte',
      bodyHtml: `
        ${emailParagraph('Bonjour,')}
        ${emailParagraph('Vous avez demandé la réinitialisation de votre mot de passe DocMaster. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.')}
      `,
      actionsHtml: emailButtonsRow(emailButton(resetUrl, 'Réinitialiser mon mot de passe')),
      footerNote: 'Ce lien expire dans 24 heures. Si vous n\'êtes pas à l\'origine de cette demande, ignorez cet email.',
    });

    await this.sendMail(to, 'Réinitialisation de votre mot de passe | DocMaster', html, {
      logLabel: 'Email de réinitialisation',
    });
  }

  async sendPortalPasswordResetEmail(to: string, token: string, portal: 'autorite' | 'partenaire'): Promise<void> {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3003';
    const resetUrl = `${baseUrl}/${portal}/reinitialisation?token=${token}`;
    const portalLabel = portal === 'autorite' ? 'espace autorité' : 'espace partenaire';
    const context = portal === 'partenaire' ? 'partner' : 'authority';

    const actionsHtml =
      portal === 'partenaire'
        ? partnerDualButtons(
            partnerLinks.resetPassword(token).web,
            partnerLinks.resetPassword(token).app,
            { web: 'Réinitialiser (web)', app: 'Réinitialiser (app)' }
          )
        : emailButtonsRow(emailButton(resetUrl, 'Réinitialiser mon mot de passe'));

    const html = buildEmailLayout({
      context,
      preheader: `Réinitialisation mot de passe — ${portalLabel}`,
      title: 'Réinitialisation de mot de passe',
      subtitle: portalLabel,
      bodyHtml: `
        ${emailParagraph('Bonjour,')}
        ${emailParagraph(`Vous avez demandé la réinitialisation du mot de passe de votre <strong>${portalLabel}</strong> DocMaster.`)}
      `,
      actionsHtml,
      footerNote: 'Ce lien expire dans 24 heures. Si vous n\'êtes pas à l\'origine de cette demande, ignorez cet email.',
    });

    await this.sendMail(to, 'Réinitialisation de votre mot de passe | DocMaster', html, {
      logLabel: `Email de réinitialisation (${portal})`,
    });
  }

  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    const safeName = escapeHtml(name);
    const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:3003'}/dashboard`;

    const html = buildEmailLayout({
      context: 'default',
      preheader: `Bienvenue sur DocMaster, ${name}`,
      title: `Bienvenue, ${safeName} !`,
      subtitle: 'Votre compte est prêt',
      bodyHtml: `
        ${emailParagraph('Nous sommes ravis de vous compter parmi nos utilisateurs.')}
        ${emailParagraph('DocMaster vous aide à <strong>sécuriser</strong>, <strong>retrouver</strong> et <strong>gérer</strong> vos documents importants en toute simplicité.')}
        ${emailInfoBox(`
          <p style="margin:0;font-size:14px;color:#334155;line-height:1.6;">
            ✓ Déclarez vos documents perdus ou trouvés<br />
            ✓ Recevez des alertes en cas de correspondance<br />
            ✓ Gagnez des récompenses en aidant la communauté
          </p>
        `)}
      `,
      actionsHtml: emailButtonsRow(emailButton(dashboardUrl, 'Accéder à mon tableau de bord')),
    });

    await this.sendMail(to, 'Bienvenue sur DocMaster !', html, { logLabel: 'Email de bienvenue' });
  }

  async sendVerificationEmail(to: string, pin: string): Promise<void> {
    const html = buildEmailLayout({
      context: 'security',
      preheader: 'Votre code de vérification DocMaster',
      title: 'Vérification de votre compte',
      subtitle: 'Entrez ce code pour finaliser votre inscription',
      bodyHtml: `
        ${emailParagraph('Bonjour,')}
        ${emailParagraph('Merci de vous être inscrit sur DocMaster. Utilisez le code ci-dessous pour activer votre compte :')}
        ${emailPinCode(pin)}
      `,
      footerNote: `Ce code expire dans ${TIMING.emailVerificationTtlMinutes} minutes. Si vous n'avez pas créé de compte, ignorez cet email.`,
    });

    await this.sendMail(to, 'Code de vérification | DocMaster', html, { logLabel: 'Code de vérification' });
  }

  async sendExpirationReminderEmail(
    to: string,
    userName: string,
    docType: string,
    daysLeft: number,
    expiresAt?: Date
  ): Promise<void> {
    const dateStr = expiresAt ? new Date(expiresAt).toLocaleDateString('fr-FR') : 'bientôt';
    const docsUrl = `${process.env.FRONTEND_URL || 'https://docmaster.net'}/mes-documents`;
    const daysLabel = `${daysLeft} jour${daysLeft > 1 ? 's' : ''}`;
    const safeName = escapeHtml(userName);
    const safeDocType = escapeHtml(docType);

    const html = buildEmailLayout({
      context: 'warning',
      preheader: `Votre ${docType} expire dans ${daysLabel}`,
      title: 'Document bientôt expiré',
      subtitle: safeDocType,
      bodyHtml: `
        ${emailParagraph(`Bonjour <strong>${safeName}</strong>,`)}
        ${emailParagraph(`Votre document <strong>${safeDocType}</strong> expire dans <strong>${daysLabel}</strong> (le ${dateStr}).`)}
        ${emailParagraph('Pensez à le renouveler auprès de l\'autorité compétente pour éviter tout désagrément.')}
        ${emailInfoBox(`<p style="margin:0;font-size:13px;color:#64748B;">Si votre document est déjà renouvelé, mettez à jour sa date d'expiration dans votre coffre-fort DocMaster.</p>`)}
      `,
      actionsHtml: emailButtonsRow(emailButton(docsUrl, 'Voir mes documents')),
    });

    await this.sendMail(
      to,
      `Rappel : Votre ${docType} expire dans ${daysLabel}`,
      html,
      { throwOnFail: false, logLabel: 'Rappel d\'expiration' }
    );
  }

  async sendNotificationEmail(to: string, userName: string, title: string, message: string): Promise<void> {
    const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:3003'}/dashboard`;
    const safeName = escapeHtml(userName);
    const safeTitle = escapeHtml(title);
    const safeMessage = escapeHtml(message);

    const html = buildEmailLayout({
      context: 'notification',
      preheader: title,
      title: safeTitle,
      subtitle: 'Nouvelle activité sur votre compte',
      bodyHtml: `
        ${emailParagraph(`Bonjour <strong>${safeName}</strong>,`)}
        ${emailParagraph(safeMessage)}
        ${emailParagraph('Connectez-vous à votre tableau de bord pour plus de détails.')}
      `,
      actionsHtml: emailButtonsRow(emailButton(dashboardUrl, 'Voir mon tableau de bord')),
    });

    await this.sendMail(to, `${title} | DocMaster`, html, {
      throwOnFail: false,
      logLabel: 'Email de notification',
    });
  }

  async sendMatchNotificationEmail(
    to: string,
    userName: string,
    docType: string,
    matchType: 'LOST_SIDE' | 'FOUND_SIDE'
  ): Promise<void> {
    const isLostSide = matchType === 'LOST_SIDE';
    const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:3003'}/dashboard`;
    const safeName = escapeHtml(userName);
    const safeDocType = escapeHtml(docType);
    const subject = isLostSide
      ? `Bonne nouvelle ! Votre ${docType} a été retrouvé`
      : `Correspondance trouvée pour le document : ${docType}`;

    const html = buildEmailLayout({
      context: 'success',
      preheader: isLostSide ? 'Votre document a été retrouvé' : 'Propriétaire identifié',
      title: isLostSide ? 'Document retrouvé !' : 'Propriétaire identifié !',
      subtitle: safeDocType,
      bodyHtml: `
        ${emailParagraph(`Bonjour <strong>${safeName}</strong>,`)}
        ${emailParagraph(
          isLostSide
            ? `Bonne nouvelle ! Quelqu'un a signalé avoir trouvé votre <strong>${safeDocType}</strong>.`
            : `Le propriétaire du document <strong>${safeDocType}</strong> que vous avez signalé a été identifié.`
        )}
        ${emailParagraph('Connectez-vous à DocMaster pour voir les prochaines étapes.')}
      `,
      actionsHtml: emailButtonsRow(
        emailButton(dashboardUrl, isLostSide ? 'Voir les détails et récupérer' : 'Voir les détails', 'primary')
      ),
      footerNote: 'Merci d\'utiliser DocMaster pour la sécurité de vos documents.',
    });

    await this.sendMail(to, subject, html, { throwOnFail: false, logLabel: 'Notification de match' });
  }

  async sendAuthorityInviteEmail(to: string, name: string, tempPassword: string, loginUrl: string): Promise<void> {
    const safeName = escapeHtml(name);
    const html = buildEmailLayout({
      context: 'authority',
      preheader: 'Votre accès autorité DocMaster est prêt',
      title: 'Nomination Autorité',
      subtitle: `Bonjour ${safeName}`,
      bodyHtml: `
        ${emailParagraph(`Vous avez été nommé(e) <strong>autorité DocMaster</strong>. Vous pouvez désormais certifier les déclarations de documents.`)}
        ${emailPasswordBox(tempPassword)}
        ${emailMuted('À votre première connexion, vous devrez changer ce mot de passe.')}
      `,
      actionsHtml: emailButtonsRow(emailButton(loginUrl, 'Se connecter à l\'espace autorité', 'primary')),
      footerNote: 'Merci de contribuer à la sécurité des documents au Cameroun.',
    });

    await this.sendMail(to, 'Vous avez été nommé(e) autorité DocMaster', html, {
      logLabel: 'Email d\'invitation autorité',
    });
  }

  async sendPartnerInviteEmail(to: string, organisationName: string, tempPassword: string): Promise<void> {
    const loginLinks = partnerLinks.login();
    const safeOrg = escapeHtml(organisationName);

    const html = buildEmailLayout({
      context: 'partner',
      preheader: `Compte partenaire créé pour ${organisationName}`,
      title: 'Compte Partenaire',
      subtitle: safeOrg,
      bodyHtml: `
        ${emailParagraph('Bonjour,')}
        ${emailParagraph(`Un compte <strong>partenaire DocMaster</strong> a été créé pour <strong>${safeOrg}</strong>. Vous pouvez déclarer des documents trouvés en illimité et être récompensé.`)}
        ${emailPasswordBox(tempPassword)}
        ${emailMuted('À votre première connexion, vous devrez changer ce mot de passe.')}
      `,
      actionsHtml: partnerDualButtons(loginLinks.web, loginLinks.app, {
        web: 'Se connecter (web)',
        app: 'Ouvrir l\'application',
      }),
      footerNote: 'Merci de contribuer à la sécurité des documents.',
    });

    await this.sendMail(to, 'Votre compte partenaire DocMaster est prêt', html, {
      logLabel: 'Email d\'invitation partenaire',
    });
  }

  async sendDeviceTransferEmail(
    to: string,
    recipientName: string,
    deviceBrand: string,
    deviceModel: string,
    deviceCategory: string,
    acceptUrl: string
  ): Promise<void> {
    const safeName = escapeHtml(recipientName);
    const safeBrand = escapeHtml(deviceBrand);
    const safeModel = escapeHtml(deviceModel);
    const safeCategory = escapeHtml(deviceCategory);

    const html = buildEmailLayout({
      context: 'device',
      preheader: 'Un appareil vous a été transféré sur DocMaster',
      title: 'Transfert d\'appareil',
      subtitle: `${safeBrand} ${safeModel}`,
      bodyHtml: `
        ${emailParagraph(`Bonjour <strong>${safeName}</strong>,`)}
        ${emailParagraph('Un utilisateur DocMaster souhaite vous transférer la propriété de son appareil :')}
        ${emailInfoBox(`
          <p style="margin:0;font-size:16px;font-weight:700;color:#1E3A2F;">${safeBrand} ${safeModel}</p>
          <p style="margin:6px 0 0;font-size:13px;color:#64748B;">${safeCategory || 'Appareil mobile'}</p>
        `)}
        ${emailParagraph('En acceptant, vous deviendrez le nouveau propriétaire de cet appareil sur DocMaster.')}
      `,
      actionsHtml: emailButtonsRow(emailButton(acceptUrl, 'Voir et répondre')),
      footerNote: 'Ce lien expire dans 7 jours.',
    });

    await this.sendMail(to, 'Transfert d\'appareil | DocMaster', html, {
      throwOnFail: false,
      logLabel: 'Email transfert appareil',
    });
  }
}

export const mailService = new MailService();
