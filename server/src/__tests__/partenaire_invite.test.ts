import { describe, it, expect, vi, beforeEach } from 'vitest';
import { partnerLinks } from '../utils/partnerLinks.ts';

describe('Partner Invitation Notifications (Email & SMS)', () => {
  it('devrait formater le message SMS d\'invitation partenaire avec mention de l\'email et des identifiants', () => {
    const orgName = 'Boutique Alpha';
    const smsText = partnerLinks.inviteSmsText(orgName);

    expect(smsText).toContain('Boutique Alpha');
    expect(smsText).toContain('créé avec succès');
    expect(smsText).toContain('identifiants de connexion');
    expect(smsText).toContain('email');
    expect(smsText).toContain('/partenaire/connexion');
  });
});
