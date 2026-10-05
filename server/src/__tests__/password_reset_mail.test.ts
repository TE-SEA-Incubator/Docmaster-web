import { describe, it, expect, vi, beforeEach } from 'vitest';
import nodemailer from 'nodemailer';
import { MailService } from '../services/mail.service.ts';

describe('Password Reset Mail Service', () => {
  let mailService: MailService;
  let sendMailMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    sendMailMock = vi.fn().mockResolvedValue({ messageId: 'test-id' });

    vi.spyOn(nodemailer, 'createTransport').mockReturnValue({
      verify: vi.fn().mockResolvedValue(true),
      sendMail: sendMailMock,
    } as any);

    mailService = new MailService();
  });

  it('devrait formater et envoyer un email de réinitialisation pour un utilisateur standard', async () => {
    const testEmail = 'user@example.com';
    const testToken = 'sample-reset-token-12345';

    await mailService.sendPasswordResetEmail(testEmail, testToken);

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const sentArgs = sendMailMock.mock.calls[0][0];

    expect(sentArgs.to).toBe(testEmail);
    expect(sentArgs.subject).toContain('Réinitialisation de votre mot de passe');
    expect(sentArgs.html).toContain('reset-password?token=sample-reset-token-12345');
    expect(sentArgs.html).toContain('Réinitialiser mon mot de passe');
  });

  it('devrait formater et envoyer un email de réinitialisation pour un partenaire', async () => {
    const testEmail = 'partner@example.com';
    const testToken = 'partner-token-xyz';

    await mailService.sendPortalPasswordResetEmail(testEmail, testToken, 'partenaire');

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const sentArgs = sendMailMock.mock.calls[0][0];

    expect(sentArgs.to).toBe(testEmail);
    expect(sentArgs.subject).toContain('Réinitialisation');
    expect(sentArgs.html).toContain('espace partenaire');
    expect(sentArgs.html).toContain(testToken);
  });

  it('devrait formater et envoyer un email de réinitialisation pour une autorité', async () => {
    const testEmail = 'authority@example.com';
    const testToken = 'authority-token-abc';

    await mailService.sendPortalPasswordResetEmail(testEmail, testToken, 'autorite');

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const sentArgs = sendMailMock.mock.calls[0][0];

    expect(sentArgs.to).toBe(testEmail);
    expect(sentArgs.subject).toContain('Réinitialisation');
    expect(sentArgs.html).toContain('espace autorité');
    expect(sentArgs.html).toContain('/autorite/reinitialisation?token=authority-token-abc');
  });
});
