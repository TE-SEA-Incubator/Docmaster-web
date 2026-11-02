import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HttpError } from '../utils/http-error.ts';

const { mockPoolQuery } = vi.hoisted(() => ({ mockPoolQuery: vi.fn() }));

vi.mock('../database/db.ts', () => ({
  pool: { query: mockPoolQuery, connect: vi.fn() },
  query: mockPoolQuery,
  getClient: vi.fn(),
  default: { pool: { query: mockPoolQuery }, query: mockPoolQuery },
}));

vi.mock('../services/subscription.service.ts', () => ({
  subscriptionService: {
    validateAction: vi.fn(),
    consumeBenefit: vi.fn(),
  },
}));

vi.mock('../controllers/payment.controller.ts', () => ({
  activateRecovery: vi.fn(),
  startNokashPaymentPolling: vi.fn(),
}));

vi.mock('../services/notification.service.ts', () => ({
  NotificationService: class {
    notifyDeclarationCreated = vi.fn();
    notifyAutoritesZone = vi.fn();
    notifyDeclarationUpdated = vi.fn();
    notifyMatchConfirmed = vi.fn();
  },
}));

vi.mock('../services/matching.service.ts', () => ({
  matchingService: {
    notifyNewDeclaration: vi.fn(),
    findAndNotifyMatches: vi.fn(),
  },
}));

vi.mock('../utils/media.utils.ts', () => ({
  encodeMediaFields: async (value: unknown) => value,
}));

import { DeclarationService } from '../services/declaration.service.ts';
import { subscriptionService } from '../services/subscription.service.ts';

const ACTIVE_ROW = { doc_type: 'type-cni', status: 'SEARCHING' };
const IDLE_ROW = { rows: [] };

/** Redirige la requête « une seule LOST active par utilisateur » du service. */
function poolWithActiveRows(activeRows: any[]) {
  mockPoolQuery.mockImplementation(async (sql: string) => {
    if (sql.includes("declaration_type = 'LOST'") && sql.includes('LIMIT 1')) {
      return { rows: activeRows };
    }
    return IDLE_ROW;
  });
}

function service() {
  const svc = new DeclarationService();
  (svc as any).docTypeRepository = {
    findById: vi.fn().mockResolvedValue(null),
    findByCode: vi.fn().mockResolvedValue({ id: 'type-cni', code: 'CNI', nom: 'Carte Nationale d’Identité' }),
  };
  (svc as any).declarationRepository = {
    countByMonth: vi.fn().mockResolvedValue(0),
    findByClientRequestId: vi.fn().mockResolvedValue(null),
    checkDuplicate: vi.fn().mockResolvedValue(null),
    countRecentFoundByReporter: vi.fn().mockResolvedValue({ count: 0, oldest: null }),
    create: vi.fn(),
  };
  (svc as any).notificationService = {
    notifyDeclarationCreated: vi.fn().mockResolvedValue(undefined),
    notifyAutoritesZone: vi.fn().mockResolvedValue(undefined),
  };
  (svc as any).matchRepository = { findByDeclarationId: vi.fn().mockResolvedValue([]) };
  (svc as any).settingRepository = { getByKey: vi.fn().mockResolvedValue('5') };
  return svc;
}

const basePayload = () => ({
  doc_type: 'CNI',
  owner_name: 'Jean Dupont',
  declaration_type: 'LOST' as const,
  reporter_id: 'user-1',
  ville: 'Douala',
});

describe('createDeclaration — une seule déclaration de perte active à la fois', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    poolWithActiveRows([]);
    (subscriptionService.validateAction as any).mockResolvedValue({ allowed: true });
  });

  it('refuse une nouvelle déclaration perdue si une autre est encore active (409)', async () => {
    poolWithActiveRows([ACTIVE_ROW]);
    const svc = service();

    const err = await svc.createDeclaration(basePayload()).catch((e) => e);

    expect(err).toBeInstanceOf(HttpError);
    expect((err as HttpError).statusCode).toBe(409);
    expect((err as HttpError).message).toContain('déclaration active');
    expect((svc as any).declarationRepository.create).not.toHaveBeenCalled();
  });

  it('laisse passer quand la déclaration active a été résolue (RETURNED)', async () => {
    poolWithActiveRows([]); // aucun statut actif = tout est RETURNED/CANCELLED/CLAIMED
    const svc = service();
    (svc as any).declarationRepository.create.mockRejectedValue(new Error('STOP_AVANT_SUITE'));

    const err = await svc.createDeclaration(basePayload()).catch((e) => e);

    // On est allé au-delà du contrôle actif : c'est bien la résolution qui débloque.
    expect(err.message).toBe('STOP_AVANT_SUITE');
    expect((subscriptionService.validateAction as any)).toHaveBeenCalled();
  });

  it('ignore le contrôle avec skipActiveCheck (flux internes)', async () => {
    poolWithActiveRows([ACTIVE_ROW]);
    const svc = service();
    (subscriptionService.validateAction as any).mockRejectedValue(new Error('SENTINEL_PASS'));

    const err = await svc
      .createDeclaration(basePayload(), { skipActiveCheck: true })
      .catch((e) => e);

    expect(err.message).toBe('SENTINEL_PASS');
  });

  it('ne bloque pas une déclaration de trouvaille (FOUND) alors qu’une LOST est active', async () => {
    poolWithActiveRows([ACTIVE_ROW]);
    const svc = service();
    (svc as any).declarationRepository.create.mockRejectedValue(new Error('SENTINEL_FOUND'));

    const err = await svc
      .createDeclaration({ ...basePayload(), declaration_type: 'FOUND' })
      .catch((e) => e);

    expect(err.message).toBe('SENTINEL_FOUND');
    expect((svc as any).declarationRepository.countRecentFoundByReporter).toHaveBeenCalled();
  });

  it("convertit la violation de l'index d'unicité en 409 (course concurrente)", async () => {
    poolWithActiveRows([]);
    const svc = service();
    (svc as any).declarationRepository.create.mockRejectedValue({
      code: '23505',
      constraint: 'uniq_active_lost_per_reporter',
    });

    const err = await svc.createDeclaration(basePayload()).catch((e) => e);

    expect(err).toBeInstanceOf(HttpError);
    expect((err as HttpError).statusCode).toBe(409);
    expect((err as HttpError).message).toContain('déclaration active');
  });
});
