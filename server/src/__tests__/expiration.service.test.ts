import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockDocRepo = vi.hoisted(() => ({
  findExpiringDocuments: vi.fn(),
  archiveExpiredDocuments: vi.fn(),
  markExpirationReminded: vi.fn(),
  createUserDocument: vi.fn(),
  findById: vi.fn(),
  deleteDocument: vi.fn(),
  updateDocument: vi.fn(),
  findCandidatesByFingerprint: vi.fn(),
  updateLostStatus: vi.fn(),
  findUserDocuments: vi.fn(),
}));

const mockNotifService = vi.hoisted(() => ({
  createNotification: vi.fn(),
  notifyAdmins: vi.fn(),
  notifyDocumentAdded: vi.fn(),
  notifyDocumentDeleted: vi.fn(),
  notifyDocumentUpdated: vi.fn(),
  getUserNotifications: vi.fn(),
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
}));

const mockMailSvc = vi.hoisted(() => ({
  sendExpirationReminderEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendWelcomeEmail: vi.fn(),
  sendVerificationEmail: vi.fn(),
  sendMatchNotificationEmail: vi.fn(),
}));

const mockUserRepo = vi.hoisted(() => ({
  findById: vi.fn(),
  findByEmail: vi.fn(),
  createUser: vi.fn(),
}));

vi.mock('../repositories/document.repository.ts', () => ({
  DocumentRepository: class { constructor() { return mockDocRepo; } },
}));

vi.mock('../services/notification.service.ts', () => ({
  NotificationService: class { constructor() { return mockNotifService; } },
}));

vi.mock('../services/mail.service.ts', () => ({
  MailService: class { constructor() { return mockMailSvc; } },
}));

vi.mock('../repositories/auth.repository.ts', () => ({
  UserRepository: class { constructor() { return mockUserRepo; } },
}));

import { ExpirationService } from '../services/expiration.service.ts';

describe('ExpirationService', () => {
  let service: ExpirationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ExpirationService();
  });

  describe('checkAndRemind', () => {
    const baseDoc = {
      id: 'doc-1',
      user_id: 'user-1',
      type_doc: 'CNI',
      date_expiration: new Date('2026-06-24'),
      validity_option: 'EXPIRING',
      is_archived: false,
      expiration_reminded: false,
    };

    it('should send notification and email for 7 days', async () => {
      mockDocRepo.findExpiringDocuments
        .mockResolvedValueOnce([baseDoc])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      mockUserRepo.findById.mockResolvedValue({
        id: 'user-1', nom: 'Doe', prenom: 'John', email: 'john@example.com',
      });

      await service.checkAndRemind();

      expect(mockDocRepo.findExpiringDocuments).toHaveBeenCalledWith(7);
      expect(mockDocRepo.findExpiringDocuments).toHaveBeenCalledWith(3);
      expect(mockDocRepo.findExpiringDocuments).toHaveBeenCalledWith(1);
      expect(mockNotifService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: 'user-1', type: 'DOC_EXPIRING' })
      );
      expect(mockMailSvc.sendExpirationReminderEmail).toHaveBeenCalled();
      expect(mockDocRepo.markExpirationReminded).toHaveBeenCalledWith('doc-1');
    });

    it('should use singular "jour" for 1 day', async () => {
      mockDocRepo.findExpiringDocuments
        .mockResolvedValueOnce([]).mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ ...baseDoc, id: 'doc-2' }]);

      mockUserRepo.findById.mockResolvedValue({
        id: 'user-1', nom: 'Doe', prenom: 'Jane', email: 'jane@example.com',
      });

      await service.checkAndRemind();

      expect(mockNotifService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Votre CNI expire dans 1 jour. Pensez à le renouveler.' })
      );
    });

    it('should skip if user not found', async () => {
      mockDocRepo.findExpiringDocuments
        .mockResolvedValueOnce([baseDoc]).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
      mockUserRepo.findById.mockResolvedValue(null);

      await service.checkAndRemind();

      expect(mockNotifService.createNotification).not.toHaveBeenCalled();
    });

    it('should continue if one doc fails', async () => {
      mockDocRepo.findExpiringDocuments
        .mockResolvedValueOnce([baseDoc, { ...baseDoc, id: 'doc-2' }])
        .mockResolvedValueOnce([]).mockResolvedValueOnce([]);
      mockUserRepo.findById
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce({ id: 'user-1', nom: 'D', prenom: 'J', email: 'j@j.com' });

      await service.checkAndRemind();

      expect(mockDocRepo.markExpirationReminded).toHaveBeenCalledTimes(1);
      expect(mockDocRepo.markExpirationReminded).toHaveBeenCalledWith('doc-2');
    });
  });

  describe('checkAndArchive', () => {
    it('should archive and notify admins', async () => {
      mockDocRepo.archiveExpiredDocuments.mockResolvedValue(5);
      await service.checkAndArchive();
      expect(mockNotifService.notifyAdmins).toHaveBeenCalledWith(
        'Documents archivés automatiquement',
        "5 document(s) ont été archivés car leur date d'expiration est dépassée."
      );
    });

    it('should skip admin notify if 0 archived', async () => {
      mockDocRepo.archiveExpiredDocuments.mockResolvedValue(0);
      await service.checkAndArchive();
      expect(mockNotifService.notifyAdmins).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockDocRepo.archiveExpiredDocuments.mockRejectedValue(new Error('fail'));
      await expect(service.checkAndArchive()).resolves.not.toThrow();
    });
  });
});
