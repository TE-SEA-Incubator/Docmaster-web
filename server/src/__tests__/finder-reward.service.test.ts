import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPoolQuery, mockWalletCredit, mockRecordReturnPoints } = vi.hoisted(() => ({
  mockPoolQuery: vi.fn(),
  mockWalletCredit: vi.fn(),
  mockRecordReturnPoints: vi.fn(),
}));

vi.mock('../database/db.ts', () => ({
  pool: { query: mockPoolQuery },
  query: mockPoolQuery,
}));

vi.mock('../services/wallet.service.ts', () => ({
  walletService: { credit: mockWalletCredit, creditPartner: vi.fn() },
}));

vi.mock('../services/earnings.service.ts', () => ({
  EarningsService: class {
    recordReturnPoints = mockRecordReturnPoints;
  },
}));

vi.mock('../controllers/payment.controller.ts', () => ({
  activateRecovery: vi.fn(),
  startNokashPaymentPolling: vi.fn(),
}));

import { DeclarationService } from '../services/declaration.service.ts';

const docType = { nom: 'Carte Grise', prix_retrouvaille: 5000, finder_percent: 80, points_recompense: 75 };
const claim = { id: 'claim-1', finder_id: 'finder-1', owner_id: 'owner-1', transaction_id: 'tx-1' };
const lostDecl = { id: 'doc-1', reporter_id: 'owner-1' };

function service() {
  const svc = new DeclarationService();
  (svc as any).notificationService = {
    notifyDocumentRecovered: vi.fn(),
    notifyPartenaireReward: vi.fn(),
  };
  (svc as any).transactionRepository = { create: vi.fn().mockResolvedValue({ id: 'payout-1' }) };
  (svc as any).awardPoints = vi.fn().mockResolvedValue(undefined);
  return svc;
}

describe("rewardFinderAfterValidation — la récompense ne dépasse jamais l'encaissement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPoolQuery.mockResolvedValue({ rows: [] }); // finder n'est pas un partenaire
  });

  it('ne crédite aucun FCFA quand les frais payés sont à 0', async () => {
    const svc = service();
    const amount = await svc.rewardFinderAfterValidation(
      { ...claim, amount: 0 },
      lostDecl,
      { ...docType, prix_retrouvaille: 0 }
    );

    expect(amount).toBe(0);
    expect(mockWalletCredit).not.toHaveBeenCalled();
    expect(mockRecordReturnPoints).toHaveBeenCalledTimes(1);
    expect(mockRecordReturnPoints.mock.calls[0][1]).toBe(75); // points de civisme dus
    expect(mockRecordReturnPoints.mock.calls[0][2]).toBe(0);
  });

  it('applique le pourcentage trouveur au montant réellement encaissé', async () => {
    const svc = service();
    const amount = await svc.rewardFinderAfterValidation(
      { ...claim, amount: 2500 },
      lostDecl,
      docType
    );

    expect(amount).toBe(2000);
    expect(mockWalletCredit).toHaveBeenCalledWith('finder-1', 2000, 'DECLARATION_REWARD', expect.anything());
  });

  it("ne remplace plus un tarif à 0 par le défaut 5000 pour les claims sans fait d'encaissement", async () => {
    const svc = service();
    const amount = await svc.rewardFinderAfterValidation(
      { ...claim, amount: null, transaction_id: null },
      lostDecl,
      { ...docType, prix_retrouvaille: 0 }
    );

    expect(amount).toBe(0);
    expect(mockWalletCredit).not.toHaveBeenCalled();
  });
});
