import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockDocRepo = vi.hoisted(() => ({
  createUserDocument: vi.fn(),
  findUserDocuments: vi.fn(),
  findById: vi.fn(),
  deleteDocument: vi.fn(),
  updateDocument: vi.fn(),
  findCandidatesByFingerprint: vi.fn(),
  updateLostStatus: vi.fn(),
  findExpiringDocuments: vi.fn(),
  archiveExpiredDocuments: vi.fn(),
  markExpirationReminded: vi.fn(),
}));

const mockNotifSvc = vi.hoisted(() => ({
  notifyDocumentAdded: vi.fn(),
  notifyDocumentDeleted: vi.fn(),
  notifyDocumentUpdated: vi.fn(),
  createNotification: vi.fn(),
  notifyAdmins: vi.fn(),
  getUserNotifications: vi.fn(),
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
}));

const mockUserRepo = vi.hoisted(() => ({
  findById: vi.fn(), findByEmail: vi.fn(), createUser: vi.fn(),
}));

const mockSubSvc = vi.hoisted(() => ({ validateAction: vi.fn() }));

vi.mock('../repositories/document.repository.ts', () => ({
  DocumentRepository: class { constructor() { return mockDocRepo; } },
}));
vi.mock('../services/notification.service.ts', () => ({
  NotificationService: class { constructor() { return mockNotifSvc; } },
}));
vi.mock('../repositories/auth.repository.ts', () => ({
  UserRepository: class { constructor() { return mockUserRepo; } },
}));
vi.mock('../services/subscription.service.ts', () => ({
  subscriptionService: mockSubSvc,
}));
vi.mock('../utils/crypto.utils.ts', () => ({
  calculateDocumentFingerprint: vi.fn(() => 'mocked-fingerprint'),
}));
vi.mock('../utils/media.utils.ts', () => ({
  encodeMediaFields: vi.fn((data) => Promise.resolve(data)),
}));
vi.mock('../services/declaration.service.ts', () => ({
  DeclarationService: class { constructor() { return {}; } },
}));

import { DocumentService } from '../services/document.service.ts';

describe('DocumentService - validity and expiration', () => {
  let service: DocumentService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new DocumentService();
  });

  const base = {
    user_id: 'user-1', type_doc: 'CNI', numero_doc: '123',
    nom_sur_doc: 'John', date_delivrance: new Date('2026-01-01'),
    date_expiration: new Date('2026-12-31'),
  };

  it('should clear date_expiration when PERMANENT', async () => {
    mockSubSvc.validateAction.mockResolvedValue({ allowed: true });
    mockDocRepo.createUserDocument.mockImplementation((d) => Promise.resolve({ id: 'd1', ...d }));

    const r = await service.registerUserDocument({ ...base, validity_option: 'PERMANENT' });
    expect(r.date_expiration).toBeUndefined();
    expect(mockDocRepo.createUserDocument).toHaveBeenCalledWith(
      expect.objectContaining({ validity_option: 'PERMANENT', date_expiration: undefined })
    );
  });

  it('should validate EXPIRATION_MGMT when EXPIRING', async () => {
    mockSubSvc.validateAction.mockResolvedValue({ allowed: true });
    mockDocRepo.createUserDocument.mockImplementation((d) => Promise.resolve({ id: 'd2', ...d }));

    await service.registerUserDocument({ ...base, validity_option: 'EXPIRING' });
    expect(mockSubSvc.validateAction).toHaveBeenCalledWith('user-1', 'EXPIRATION_MGMT');
  });

  it('should reject EXPIRING when plan lacks permission', async () => {
    mockSubSvc.validateAction
      .mockResolvedValueOnce({ allowed: true })
      .mockResolvedValueOnce({ allowed: false, reason: 'Nope' });

    await expect(
      service.registerUserDocument({ ...base, validity_option: 'EXPIRING' })
    ).rejects.toThrow("Votre abonnement ne permet pas la gestion des dates d'expiration");
  });

  it('should default to EXPIRING when no validity_option', async () => {
    mockSubSvc.validateAction.mockResolvedValue({ allowed: true });
    mockDocRepo.createUserDocument.mockImplementation((d) => Promise.resolve({ id: 'd3', ...d }));

    const { date_expiration, ...rest } = base;
    const r = await service.registerUserDocument({ ...rest });
    expect(r.validity_option).toBe('EXPIRING');
  });

  it('should keep date_expiration when EXPIRING', async () => {
    mockSubSvc.validateAction.mockResolvedValue({ allowed: true });
    mockDocRepo.createUserDocument.mockImplementation((d) => Promise.resolve({ id: 'd4', ...d }));

    const expiry = new Date('2026-12-31');
    const r = await service.registerUserDocument({ ...base, date_expiration: expiry, validity_option: 'EXPIRING' });
    expect(r.date_expiration).toEqual(expiry);
  });

  it('should strip empty string date_expiration', async () => {
    mockSubSvc.validateAction.mockResolvedValue({ allowed: true });
    mockDocRepo.createUserDocument.mockImplementation((d) => Promise.resolve({ id: 'd5', ...d }));

    const r = await service.registerUserDocument({ ...base, validity_option: 'EXPIRING', date_expiration: '' as any });
    expect(r.date_expiration).toBeUndefined();
  });

  it('should reject if REGISTER_OBJECT limit reached', async () => {
    mockSubSvc.validateAction.mockResolvedValueOnce({ allowed: false, reason: 'Full' });

    await expect(service.registerUserDocument({ user_id: 'u1', type_doc: 'CNI', validity_option: 'EXPIRING' }))
      .rejects.toThrow('Full');
  });

  it('should compute fingerprint', async () => {
    mockSubSvc.validateAction.mockResolvedValue({ allowed: true });
    mockDocRepo.createUserDocument.mockImplementation((d) => Promise.resolve({ id: 'd6', ...d }));

    await service.registerUserDocument({ ...base, validity_option: 'EXPIRING' });
    expect(mockDocRepo.createUserDocument).toHaveBeenCalledWith(
      expect.objectContaining({ fingerprint: 'mocked-fingerprint' })
    );
  });

  it('should notify on document added', async () => {
    mockSubSvc.validateAction.mockResolvedValue({ allowed: true });
    mockDocRepo.createUserDocument.mockImplementation((d) => Promise.resolve({ id: 'd7', ...d }));

    await service.registerUserDocument({ user_id: 'u1', type_doc: 'CNI', validity_option: 'EXPIRING' });
    expect(mockNotifSvc.notifyDocumentAdded).toHaveBeenCalledWith('u1', 'CNI');
  });
});
