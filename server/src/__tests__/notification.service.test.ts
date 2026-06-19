import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSocket = vi.hoisted(() => ({ sendToUser: vi.fn() }));
const mockNotifRepo = vi.hoisted(() => ({
  create: vi.fn((data) => Promise.resolve({ ...data, id: 'n' })),
  findByUserId: vi.fn(), markAsRead: vi.fn(), markAllAsRead: vi.fn(),
}));
const mockSubSvc = vi.hoisted(() => ({ validateAction: vi.fn() }));
const mockUserRepo = vi.hoisted(() => ({
  findById: vi.fn(), findByEmail: vi.fn(), createUser: vi.fn(),
}));
const mockMailSvc = vi.hoisted(() => ({
  sendMatchNotificationEmail: vi.fn(), sendExpirationReminderEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(), sendWelcomeEmail: vi.fn(), sendVerificationEmail: vi.fn(),
}));
const mockSmsSvc = vi.hoisted(() => ({ sendSms: vi.fn() }));

vi.mock('../repositories/notification.repository.ts', () => ({
  NotificationRepository: class { constructor() { return mockNotifRepo; } },
}));
vi.mock('../services/subscription.service.ts', () => ({
  subscriptionService: mockSubSvc,
}));
vi.mock('../repositories/auth.repository.ts', () => ({
  UserRepository: class { constructor() { return mockUserRepo; } },
}));
vi.mock('../services/mail.service.ts', () => ({
  MailService: class { constructor() { return mockMailSvc; } },
}));
vi.mock('../services/sms.service.ts', () => ({
  SmsService: class { constructor() { return mockSmsSvc; } },
}));
vi.mock('../services/socket.service.ts', () => ({
  SocketService: { getInstance: vi.fn(() => mockSocket) },
}));

import { NotificationService } from '../services/notification.service.ts';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new NotificationService();
  });

  it('should create notification with in-app channel always enabled', async () => {
    const saved = { id: 'n1', user_id: 'u1', type: 'T', title: 'T', message: 'M', channels: { in_app: true, sms: false, email: false, push: false } };
    mockNotifRepo.create.mockResolvedValue(saved);
    mockSubSvc.validateAction.mockResolvedValue({ allowed: false });
    mockUserRepo.findById.mockResolvedValue(null);

    await service.createNotification({ user_id: 'u1', type: 'T', title: 'T', message: 'M' });

    expect(mockNotifRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ channels: expect.objectContaining({ in_app: true }) })
    );
  });

  it('should check subscription for SMS, Email, Push', async () => {
    mockSubSvc.validateAction
      .mockResolvedValueOnce({ allowed: true })
      .mockResolvedValueOnce({ allowed: true })
      .mockResolvedValueOnce({ allowed: false });
    mockNotifRepo.create.mockResolvedValue({ id: 'n2' });
    mockUserRepo.findById.mockResolvedValue(null);

    await service.createNotification({ user_id: 'u1', type: 'T', title: 'T', message: 'M' });

    expect(mockSubSvc.validateAction).toHaveBeenCalledWith('u1', 'ADD_ALERT', { alertType: 'sms' });
    expect(mockSubSvc.validateAction).toHaveBeenCalledWith('u1', 'ADD_ALERT', { alertType: 'email' });
    expect(mockSubSvc.validateAction).toHaveBeenCalledWith('u1', 'ADD_ALERT', { alertType: 'push' });
  });

  it('should send socket notification', async () => {
    const saved = { id: 'n3', user_id: 'u1', type: 'T', title: 'T', message: 'M', channels: { in_app: true } };
    mockNotifRepo.create.mockResolvedValue(saved);
    mockSubSvc.validateAction.mockResolvedValue({ allowed: false });
    mockUserRepo.findById.mockResolvedValue(null);

    await service.createNotification({ user_id: 'u1', type: 'T', title: 'T', message: 'M' });

    expect(mockSocket.sendToUser).toHaveBeenCalledWith('u1', 'NEW_NOTIFICATION', expect.any(Object));
  });

  it('should send SMS when allowed and user has phone', async () => {
    const saved = { id: 'n4', user_id: 'u1', type: 'T', title: 'T', message: 'Bonjour', channels: { in_app: true, sms: true, email: false, push: false } };
    mockNotifRepo.create.mockResolvedValue(saved);
    mockSubSvc.validateAction.mockResolvedValue({ allowed: true });
    mockUserRepo.findById.mockResolvedValue({ id: 'u1', telephone: '697000000' });

    await service.createNotification({ user_id: 'u1', type: 'T', title: 'T', message: 'Bonjour' });

    expect(mockSmsSvc.sendSms).toHaveBeenCalledWith('697000000', 'Bonjour');
  });

  it('should send custom SMS for MATCH_FOUND', async () => {
    const saved = { id: 'n5', user_id: 'u1', type: 'MATCH_FOUND', title: 'T', message: 'M', channels: { in_app: true, sms: true, email: false, push: false }, metadata: { docType: 'CNI' } };
    mockNotifRepo.create.mockResolvedValue(saved);
    mockSubSvc.validateAction.mockResolvedValue({ allowed: true });
    mockUserRepo.findById.mockResolvedValue({ id: 'u1', telephone: '697000000' });

    await service.createNotification({ user_id: 'u1', type: 'MATCH_FOUND', title: 'T', message: 'M', metadata: { docType: 'CNI' } });

    expect(mockSmsSvc.sendSms).toHaveBeenCalledWith('697000000', expect.stringContaining('CNI'));
  });

  it('should send email for MATCH_FOUND when email allowed', async () => {
    const saved = { id: 'n6', user_id: 'u1', type: 'MATCH_FOUND', title: 'T', message: 'M', channels: { in_app: true, sms: false, email: true, push: false }, metadata: { docType: 'PASSPORT', matchType: 'LOST_SIDE' } };
    mockNotifRepo.create.mockResolvedValue(saved);
    mockSubSvc.validateAction.mockResolvedValue({ allowed: true });
    mockUserRepo.findById.mockResolvedValue({ id: 'u1', email: 'a@b.com', nom: 'D', prenom: 'J' });

    await service.createNotification({ user_id: 'u1', type: 'MATCH_FOUND', title: 'T', message: 'M', metadata: { docType: 'PASSPORT', matchType: 'LOST_SIDE' } });

    expect(mockMailSvc.sendMatchNotificationEmail).toHaveBeenCalledWith('a@b.com', 'J D', 'PASSPORT', 'LOST_SIDE');
  });

  it('should skip SMS when user has no phone', async () => {
    const saved = { id: 'n7', user_id: 'u1', type: 'T', title: 'T', message: 'M', channels: { in_app: true, sms: true, email: false } };
    mockNotifRepo.create.mockResolvedValue(saved);
    mockSubSvc.validateAction.mockResolvedValue({ allowed: true });
    mockUserRepo.findById.mockResolvedValue({ id: 'u1', telephone: undefined });

    await service.createNotification({ user_id: 'u1', type: 'T', title: 'T', message: 'M' });
    expect(mockSmsSvc.sendSms).not.toHaveBeenCalled();
  });

  it('notifyDocumentAdded should create DOC_ADDED', async () => {
    mockSubSvc.validateAction.mockResolvedValue({ allowed: false });
    mockNotifRepo.create.mockResolvedValue({ id: 'n8' });
    mockUserRepo.findById.mockResolvedValue(null);

    await service.notifyDocumentAdded('u1', 'CNI');

    expect(mockNotifRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'u1', type: 'DOC_ADDED' })
    );
  });

  it('notifyMatchFound should notify both sides', async () => {
    mockSubSvc.validateAction.mockResolvedValue({ allowed: false });
    mockNotifRepo.create.mockResolvedValue({ id: 'n9' });
    mockUserRepo.findById.mockResolvedValue(null);

    await service.notifyMatchFound('loser', 'finder', 'doc1', 'CNI');

    expect(mockNotifRepo.create).toHaveBeenCalledTimes(2);
    expect(mockNotifRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'loser', metadata: expect.objectContaining({ matchType: 'LOST_SIDE' }) })
    );
    expect(mockNotifRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'finder', metadata: expect.objectContaining({ matchType: 'FOUND_SIDE' }) })
    );
  });
});
