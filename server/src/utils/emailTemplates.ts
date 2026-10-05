const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:3003').replace(/\/+$/, '');

export type EmailContext =
  | 'default'
  | 'partner'
  | 'authority'
  | 'security'
  | 'success'
  | 'warning'
  | 'notification'
  | 'device';

const CONTEXT_META: Record<
  EmailContext,
  { accent: string; headerFrom: string; headerTo: string; badge: string; badgeBg: string }
> = {
  default: { accent: '#f5a64b', headerFrom: '#1E3A2F', headerTo: '#2D5A42', badge: 'DocMaster', badgeBg: 'rgba(245,166,75,0.18)' },
  partner: { accent: '#1F7A8C', headerFrom: '#0E3F4F', headerTo: '#155F73', badge: 'Espace Partenaire', badgeBg: 'rgba(31,122,140,0.22)' },
  authority: { accent: '#6366f1', headerFrom: '#1e1b4b', headerTo: '#312e81', badge: 'Espace Autorité', badgeBg: 'rgba(99,102,241,0.22)' },
  security: { accent: '#f5a64b', headerFrom: '#1E3A2F', headerTo: '#2D5A42', badge: 'Sécurité du compte', badgeBg: 'rgba(245,166,75,0.18)' },
  success: { accent: '#2D6A4F', headerFrom: '#1E3A2F', headerTo: '#2D5A42', badge: 'Bonne nouvelle', badgeBg: 'rgba(45,106,79,0.18)' },
  warning: { accent: '#D97706', headerFrom: '#1E3A2F', headerTo: '#2D5A42', badge: 'Rappel important', badgeBg: 'rgba(217,119,6,0.16)' },
  notification: { accent: '#f5a64b', headerFrom: '#1E3A2F', headerTo: '#2D5A42', badge: 'Notification', badgeBg: 'rgba(245,166,75,0.18)' },
  device: { accent: '#f5a64b', headerFrom: '#1E3A2F', headerTo: '#2D5A42', badge: 'Transfert appareil', badgeBg: 'rgba(245,166,75,0.18)' },
};

export function getEmailLogoUrl(): string {
  return process.env.EMAIL_LOGO_URL || `${FRONTEND_URL}/assets/images/docmaster.png`;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function emailButton(
  href: string,
  label: string,
  variant: 'primary' | 'secondary' | 'partner' = 'primary'
): string {
  const styles =
    variant === 'partner'
      ? 'background-color:#1F7A8C;color:#ffffff;'
      : variant === 'secondary'
        ? 'background-color:#ffffff;color:#1E3A2F;border:1px solid #D9E4E7;'
        : 'background-color:#f5a64b;color:#ffffff;';

  return `<a href="${href}" style="display:inline-block;padding:14px 28px;margin:6px 4px;text-decoration:none;border-radius:12px;font-weight:700;font-size:14px;${styles}">${escapeHtml(label)}</a>`;
}

export function emailButtonsRow(buttonsHtml: string): string {
  return `<div style="text-align:center;margin:28px 0 8px;">${buttonsHtml}</div>`;
}

export function emailPinCode(pin: string): string {
  return `
    <div style="text-align:center;margin:28px 0;">
      <div style="display:inline-block;padding:18px 32px;border-radius:14px;background:#FAF7F2;border:2px dashed #f5a64b;">
        <span style="font-size:34px;font-weight:800;color:#1E3A2F;letter-spacing:8px;font-family:Consolas,Monaco,monospace;">${escapeHtml(pin)}</span>
      </div>
    </div>
  `;
}

export function emailPasswordBox(password: string): string {
  return `
    <div style="margin:22px 0;padding:18px 20px;border-radius:12px;background:#F8FAFC;border:1px solid #E2E8F0;text-align:center;">
      <p style="margin:0 0 8px;font-size:13px;color:#64748B;font-weight:600;">Mot de passe temporaire</p>
      <p style="margin:0;font-size:22px;font-weight:800;color:#1E293B;letter-spacing:3px;font-family:Consolas,Monaco,monospace;">${escapeHtml(password)}</p>
    </div>
  `;
}

export function emailInfoBox(contentHtml: string): string {
  return `
    <div style="margin:20px 0;padding:16px 18px;border-radius:12px;background:#FAF7F2;border-left:4px solid #f5a64b;">
      ${contentHtml}
    </div>
  `;
}

export function emailParagraph(text: string): string {
  return `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#334155;">${text}</p>`;
}

export function emailMuted(text: string): string {
  return `<p style="margin:14px 0 0;font-size:13px;line-height:1.55;color:#64748B;">${text}</p>`;
}

export interface EmailLayoutOptions {
  context?: EmailContext;
  preheader?: string;
  title: string;
  subtitle?: string;
  bodyHtml: string;
  actionsHtml?: string;
  footerNote?: string;
}

export function buildEmailLayout(options: EmailLayoutOptions): string {
  const ctx = options.context || 'default';
  const meta = CONTEXT_META[ctx];
  const year = new Date().getFullYear();
  const logoUrl = getEmailLogoUrl();
  const preheader = options.preheader ? escapeHtml(options.preheader) : escapeHtml(options.title);
  const subtitleBlock = options.subtitle
    ? `<p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.78);line-height:1.5;">${options.subtitle}</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${escapeHtml(options.title)}</title>
  <!--[if mso]><style>table,td{font-family:Arial,sans-serif!important;}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#F4EFE6;font-family:'Segoe UI',Roboto,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F4EFE6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #E5E0D8;box-shadow:0 8px 32px rgba(30,58,47,0.08);">
          <!-- Header -->
          <tr>
            <td style="padding:28px 32px 24px;background:linear-gradient(135deg,${meta.headerFrom} 0%,${meta.headerTo} 100%);">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <img src="${logoUrl}" alt="DocMaster" width="48" height="48" style="display:block;border-radius:12px;border:0;outline:none;" />
                  </td>
                  <td style="vertical-align:middle;padding-left:14px;">
                    <p style="margin:0;font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;">DocMaster</p>
                    <p style="margin:2px 0 0;font-size:11px;font-weight:700;color:${meta.accent};text-transform:uppercase;letter-spacing:0.08em;">${meta.badge}</p>
                  </td>
                </tr>
              </table>
              <div style="margin-top:22px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.12);">
                <h1 style="margin:0;font-size:22px;font-weight:800;color:#ffffff;line-height:1.3;">${escapeHtml(options.title)}</h1>
                ${subtitleBlock}
              </div>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 32px 8px;">
              ${options.bodyHtml}
              ${options.actionsHtml || ''}
              ${options.footerNote ? emailMuted(options.footerNote) : ''}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px 28px;background:#FAF7F2;border-top:1px solid #E5E0D8;">
              <p style="margin:0 0 8px;font-size:12px;color:#64748B;text-align:center;line-height:1.5;">
                Cet email vous a été envoyé par <strong style="color:#1E3A2F;">DocMaster</strong>.
                <br />Ne partagez jamais vos codes ou mots de passe.
              </p>
              <p style="margin:0;font-size:11px;color:#94A3B8;text-align:center;">
                &copy; ${year} DocMaster. Tous droits réservés.
                <br /><a href="${FRONTEND_URL}" style="color:#64748B;text-decoration:underline;">docmaster.net</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function partnerDualButtons(
  webHref: string,
  appHref: string,
  labels?: { web?: string; app?: string }
): string {
  const webLabel = labels?.web || 'Espace web';
  const appLabel = labels?.app || 'Ouvrir l\'application';
  const downloadUrl = process.env.PARTNER_APP_DOWNLOAD_URL || '';
  const downloadBlock = downloadUrl
    ? `<p style="text-align:center;margin:12px 0 0;"><a href="${downloadUrl}" style="color:#1F7A8C;font-size:13px;font-weight:600;text-decoration:underline;">Télécharger l'application mobile</a></p>`
    : '';

  return `
    ${emailButtonsRow(`${emailButton(webHref, webLabel, 'primary')}${emailButton(appHref, appLabel, 'partner')}`)}
    ${emailMuted(`Si l'application est déjà installée, utilisez « ${escapeHtml(appLabel)} ».`)}
    ${downloadBlock}
  `;
}
