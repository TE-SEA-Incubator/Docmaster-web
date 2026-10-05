import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockFindPaidByDocId, mockValidateRecoveryCode, mockResolveLostFoundPair } = vi.hoisted(() => ({
  mockFindPaidByDocId: vi.fn(),
  mockValidateRecoveryCode: vi.fn(),
  mockResolveLostFoundPair: vi.fn(),
}));

vi.mock('../services/recovery-validation.service.ts', () => ({
  validateRecoveryCode: mockValidateRecoveryCode,
}));

vi.mock('../controllers/payment.controller.ts', () => ({
  payRecovery: vi.fn(),
}));

vi.mock('../repositories/claim.repository.ts', () => ({
  ClaimRepository: class {
    findPaidByDocId = mockFindPaidByDocId;
  },
}));

vi.mock('../utils/recovery.utils.ts', () => ({
  resolveLostFoundPair: mockResolveLostFoundPair,
}));

import { RecoveryController } from '../controllers/recovery.controller.ts';

describe('RecoveryController - Unified Payments & Claims', () => {
  let controller: RecoveryController;

  beforeEach(() => {
    controller = new RecoveryController();
    vi.clearAllMocks();
  });

  describe('validateCode', () => {
    it('devrait retourner 401 si l\'utilisateur n\'est pas authentifié', async () => {
      const req = { body: { docId: 'doc-1', code: '123456' } } as any;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;

      await controller.validateCode(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'Non authentifié' })
      );
    });

    it('devrait retourner 400 si docId ou code est manquant', async () => {
      const req = { user: { id: 'user-1' }, body: { docId: '' } } as any;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;

      await controller.validateCode(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });

    it('devrait valider avec succès le code de remise', async () => {
      const req = { user: { id: 'finder-1' }, body: { docId: 'doc-1', code: '654321' } } as any;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;

      mockValidateRecoveryCode.mockResolvedValue({
        success: true,
        message: 'Code validé avec succès ! Le document a été officiellement remis.',
        claimId: 'claim-123',
      });

      await controller.validateCode(req, res);

      expect(mockValidateRecoveryCode).toHaveBeenCalledWith('doc-1', 'finder-1', '654321');
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, claimId: 'claim-123' })
      );
    });
  });

  describe('getRecoveryStatus', () => {
    it('devrait révéler le code secret uniquement au propriétaire', async () => {
      const req = {
        params: { docId: 'lost-doc-1' },
        user: { id: 'owner-user-id' },
      } as any;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;

      mockResolveLostFoundPair.mockResolvedValue({
        lostId: 'lost-doc-1',
        foundId: 'found-doc-2',
        lostDecl: { id: 'lost-doc-1', reporter_id: 'owner-user-id' },
        foundDecl: { id: 'found-doc-2', reporter_id: 'finder-user-id' },
      });

      mockFindPaidByDocId.mockResolvedValue({
        id: 'claim-1',
        doc_id: 'lost-doc-1',
        owner_id: 'owner-user-id',
        finder_id: 'finder-user-id',
        verification_code: '987654',
        status: 'PAID',
        created_at: new Date().toISOString(),
      });

      await controller.getRecoveryStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            verification_code: '987654',
            isOwner: true,
          }),
        })
      );
    });

    it('devrait masquer le code secret au trouveur', async () => {
      const req = {
        params: { docId: 'lost-doc-1' },
        user: { id: 'finder-user-id' },
      } as any;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;

      mockResolveLostFoundPair.mockResolvedValue({
        lostId: 'lost-doc-1',
        foundId: 'found-doc-2',
        lostDecl: { id: 'lost-doc-1', reporter_id: 'owner-user-id' },
        foundDecl: { id: 'found-doc-2', reporter_id: 'finder-user-id' },
      });

      mockFindPaidByDocId.mockResolvedValue({
        id: 'claim-1',
        doc_id: 'lost-doc-1',
        owner_id: 'owner-user-id',
        finder_id: 'finder-user-id',
        verification_code: '987654',
        status: 'PAID',
        created_at: new Date().toISOString(),
      });

      await controller.getRecoveryStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const jsonCall = res.json.mock.calls[0][0];
      expect(jsonCall.data.verification_code).toBeUndefined();
      expect(jsonCall.data.isFinder).toBe(true);
      expect(jsonCall.data.isOwner).toBe(false);
    });
  });
});
