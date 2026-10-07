import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Request, Response } from 'express';

const declSvc = vi.hoisted(() => ({ createDeclaration: vi.fn(), updateDeclaration: vi.fn() }));
const docRepo = vi.hoisted(() => ({ updateLostStatus: vi.fn() }));

vi.mock('../services/declaration.service.ts', () => ({
  DeclarationService: class {
    createDeclaration = declSvc.createDeclaration;
    updateDeclaration = declSvc.updateDeclaration;
  },
}));

vi.mock('../repositories/document.repository.ts', () => ({
  DocumentRepository: class {
    updateLostStatus = docRepo.updateLostStatus;
  },
}));

vi.mock('../services/pdf.service.ts', () => ({
  PdfService: class {},
}));

vi.mock('../services/activity-log.service.ts', () => ({
  activityLogService: { log: vi.fn(() => Promise.resolve()) },
}));

import { createLostDeclaration, updateDeclaration } from '../controllers/declaration.controller.ts';

// La charge que poste désormais le web (ReportLostModal) : clés du CreateDeclarationDTO.
const webPayload = () => ({
  doc_type: 'a3f1-uuid-type',
  owner_name: 'Awa Ndiaye',
  ville: 'Douala',
  date_perte: '2026-10-05',
  urgence_niveau: 'Modérée',
  mode_contact: 'PHONE',
  document_number: '112233',
  description: 'Oubliée dans le bus 212',
  telephone_contact: '697123456',
  email_contact: 'awa@example.cm',
  recompense_montant: 5000,
  metadata: { Lieu: 'Transports en commun' },
  source_document_id: 'vault-doc-1',
});

const makeReq = (body: Record<string, any>) =>
  ({
    user: { id: 'user-1' },
    params: { id: 'decl-1' },
    body,
    files: undefined,
    ip: '127.0.0.1',
    headers: {},
  }) as unknown as Request;

type TestResponse = Response & { statusCode: number; payload: any };

const makeRes = (): TestResponse => {
  const res: any = { statusCode: 200, payload: null };
  res.status = (code: number) => {
    res.statusCode = code;
    res.json = (payload: any) => {
      res.payload = payload;
      return res;
    };
    return res;
  };
  res.json = (payload: any) => {
    res.payload = payload;
    return res;
  };
  return res;
};

describe('createLostDeclaration — contrat web', () => {
  let logError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    logError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    declSvc.createDeclaration.mockResolvedValue({
      id: 'decl-1',
      identifiant_doc_dm: 'DOC_2610_1',
      reporter_id: 'user-1',
      declaration_type: 'LOST',
      doc_type: 'a3f1-uuid-type',
    });
  });

  afterEach(() => {
    logError.mockRestore();
    vi.restoreAllMocks();
  });

  it('accepte la charge postée par le web', async () => {
    docRepo.updateLostStatus.mockResolvedValue({ id: 'vault-doc-1' });
    const res = makeRes();

    await createLostDeclaration(makeReq(webPayload()), res);

    expect(res.statusCode).toBe(201);
    expect(res.payload.data.identifiant_doc_dm).toBe('DOC_2610_1');
  });

  it('refusait la charge de l ancien modal (clés inventées, DTO vide)', async () => {
    const res = makeRes();

    await createLostDeclaration(
      makeReq({
        document_id: 'vault-doc-1',
        numero_document: '112233',
        type_document: 'cni',
        nom_complet: 'Awa Ndiaye',
        date_perte: '2026-10-05',
        lieu_perte: 'Transports en commun',
        description: 'Oubliée dans le bus 212',
      }),
      res
    );

    expect(res.statusCode).toBe(400);
    expect(res.payload.errors).toHaveProperty('doc_type');
    expect(declSvc.createDeclaration).not.toHaveBeenCalled();
  });

  it('transmet source_document_id à travers la validation', async () => {
    docRepo.updateLostStatus.mockResolvedValue({ id: 'vault-doc-1' });

    await createLostDeclaration(makeReq(webPayload()), makeRes());

    expect(docRepo.updateLostStatus).toHaveBeenCalledWith('vault-doc-1', 'user-1', true, 'decl-1');
  });

  it('attend le lien vault avant de répondre : le client ne peut pas voir un état non écrit', async () => {
    let linked = false;
    docRepo.updateLostStatus.mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 10));
      linked = true;
      return { id: 'vault-doc-1' };
    });

    await createLostDeclaration(makeReq(webPayload()), makeRes());

    expect(linked).toBe(true);
  });

  it('garde la déclaration créée quand le lien vault échoue', async () => {
    docRepo.updateLostStatus.mockRejectedValue(new Error('Document introuvable'));
    const res = makeRes();

    await createLostDeclaration(makeReq(webPayload()), res);

    expect(res.statusCode).toBe(201);
    expect(res.payload.success).toBe(true);
  });

  it('ne touche au coffre quand aucune source n est demandée', async () => {
    const body = webPayload();
    delete (body as any).source_document_id;

    await createLostDeclaration(makeReq(body), makeRes());

    expect(docRepo.updateLostStatus).not.toHaveBeenCalled();
  });
});

describe('updateDeclaration — compléter les infos manquantes', () => {
  let logError: ReturnType<typeof vi.spyOn>;

  const updatedDecl = (data: Record<string, any>) => ({
    id: 'decl-1',
    reporter_id: 'user-1',
    declaration_type: 'LOST',
    status: 'SEARCHING',
    doc_type: 'a3f1-uuid-type',
    ...data,
  });

  const sentFields = () => Object.keys(declSvc.updateDeclaration.mock.calls[0][2]).sort();

  beforeEach(() => {
    vi.clearAllMocks();
    logError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    declSvc.updateDeclaration.mockResolvedValue(updatedDecl({ ville: 'Yaoundé' }));
  });

  afterEach(() => {
    logError.mockRestore();
    vi.restoreAllMocks();
  });

  it('transmet les champs descriptifs au service, portée au propriétaire', async () => {
    const res = makeRes();

    await updateDeclaration(
      makeReq({ ville: 'Yaoundé', date_expiration: '2030-01-01', recompense_montant: 5000 }),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(declSvc.updateDeclaration).toHaveBeenCalledWith('decl-1', 'user-1', {
      ville: 'Yaoundé',
      date_expiration: '2030-01-01',
      recompense_montant: 5000,
    });
    expect(res.payload.data.status).toBe('SEARCHING');
  });

  it('un client ne peut pas s attribuer un état à lui-même', async () => {
    await updateDeclaration(
      makeReq({ ville: 'Yaoundé', status: 'RETURNED', doc_type: 'PASSPORT', transactions_id: 'pay-1' }),
      makeRes()
    );

    expect(sentFields()).toEqual(['ville']);
  });

  it('refuse une requête qui ne porte que des champs interdits', async () => {
    const res = makeRes();

    await updateDeclaration(makeReq({ status: 'MATCHED' }), res);

    expect(res.statusCode).toBe(400);
    expect(res.payload.message).toBe('Aucun champ modifiable dans la requête');
    expect(declSvc.updateDeclaration).not.toHaveBeenCalled();
  });

  it('rejette une date mal formée plutôt que de l écrire en base', async () => {
    const res = makeRes();

    await updateDeclaration(makeReq({ date_perte: '05/10/2026' }), res);

    expect(res.statusCode).toBe(400);
    expect(res.payload.errors).toHaveProperty('date_perte');
    expect(declSvc.updateDeclaration).not.toHaveBeenCalled();
  });

  it('404 quand la déclaration n est pas celle de l appelant', async () => {
    declSvc.updateDeclaration.mockResolvedValueOnce(null);
    const res = makeRes();

    await updateDeclaration(makeReq({ ville: 'Yaoundé' }), res);

    expect(res.statusCode).toBe(404);
    expect(res.payload.message).toBe('Déclaration introuvable ou non autorisée');
  });

  it('refuse un acteur absent', async () => {
    const res = makeRes();

    await updateDeclaration(
      { params: { id: 'decl-1' }, body: { ville: 'Yaoundé' } } as unknown as Request,
      res
    );

    expect(res.statusCode).toBe(401);
    expect(declSvc.updateDeclaration).not.toHaveBeenCalled();
  });

  it('accepte found_location en chaîne JSON comme en objet', async () => {
    await updateDeclaration(makeReq({ found_location: '{"lat":4.05,"long":9.76}' }), makeRes());
    const fromString = declSvc.updateDeclaration.mock.calls[0][2].found_location;
    expect(fromString).toEqual({ lat: 4.05, long: 9.76 });

    declSvc.updateDeclaration.mockClear();
    await updateDeclaration(makeReq({ found_location: { lat: 4.05, long: 9.76 } }), makeRes());
    expect(declSvc.updateDeclaration.mock.calls[0][2].found_location).toEqual({ lat: 4.05, long: 9.76 });
  });

  it('reste générique quand le serveur échoue', async () => {
    declSvc.updateDeclaration.mockRejectedValueOnce(new Error('inconsistent types deduced for parameter $2'));
    const res = makeRes();

    await updateDeclaration(makeReq({ ville: 'Yaoundé' }), res);

    expect(res.statusCode).toBe(500);
    expect(res.payload.message).not.toMatch(/parameter|types deduced/);
  });
});
