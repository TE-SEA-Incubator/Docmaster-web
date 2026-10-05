import { partnerDualButtons } from './emailTemplates.ts';

const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:3003').replace(/\/+$/, '');
const PARTNER_APP_SCHEME = process.env.PARTNER_APP_SCHEME || 'docmaster-partner';
const PARTNER_APP_DOWNLOAD_URL = process.env.PARTNER_APP_DOWNLOAD_URL || '';

function buildQuery(query?: Record<string, string>): string {
  if (!query || Object.keys(query).length === 0) return '';
  return `?${new URLSearchParams(query).toString()}`;
}

function buildWebUrl(path: string, query?: Record<string, string>): string {
  return `${FRONTEND_URL}/partenaire/${path}${buildQuery(query)}`;
}

function buildAppUrl(path: string, query?: Record<string, string>): string {
  return `${PARTNER_APP_SCHEME}://${path}${buildQuery(query)}`;
}

export interface PartnerLinkPair {
  web: string;
  app: string;
}

export const partnerLinks = {
  login(): PartnerLinkPair {
    return {
      web: buildWebUrl('connexion'),
      app: buildAppUrl('login'),
    };
  },

  resetPassword(token: string): PartnerLinkPair {
    return {
      web: buildWebUrl('reinitialisation', { token }),
      app: buildAppUrl('reset-password', { token }),
    };
  },

  forgotPassword(): PartnerLinkPair {
    return {
      web: buildWebUrl('mot-de-passe-oublie'),
      app: buildAppUrl('forgot-password'),
    };
  },

  changePassword(): PartnerLinkPair {
    return {
      web: buildWebUrl('changement-mot-de-passe'),
      app: buildAppUrl('change-password'),
    };
  },

  rendre(id: string): PartnerLinkPair {
    return {
      web: buildWebUrl('rendre', { id }),
      app: buildAppUrl('rendre', { id }),
    };
  },

  get downloadUrl(): string {
    return PARTNER_APP_DOWNLOAD_URL;
  },

  inviteSmsText(organisationName: string): string {
    const { web, app } = this.login();
    let text = `Bonjour, votre compte partenaire DocMaster "${organisationName}" a été créé avec succès. Vos identifiants de connexion vous ont été envoyés par email. Connexion : ${web}`;
    if (PARTNER_APP_DOWNLOAD_URL) {
      text += ` | App : ${PARTNER_APP_DOWNLOAD_URL}`;
    }
    return text;
  },

  resetSmsText(token: string): string {
    const { web, app } = this.resetPassword(token);
    return `DocMaster Partenaire — réinitialisez votre mot de passe. Web: ${web} | App: ${app}`;
  },
};

/** @deprecated Use partnerDualButtons from emailTemplates.ts */
export function partnerEmailButtons(links: PartnerLinkPair, options?: { webLabel?: string; appLabel?: string }) {
  return partnerDualButtons(links.web, links.app, {
    web: options?.webLabel,
    app: options?.appLabel,
  });
}
