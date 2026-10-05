import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.hoisted(() => {
  process.env.NOKASH_I_SPACE_KEY = 'test-i-space-key';
  process.env.NOKASH_APP_SPACE_KEY = 'test-app-space-key';
  process.env.NOKASH_BASE_URL = 'https://api.nokash.test/lapas-on-trans/trans';
  process.env.NOKASH_PAYOUT_CALLBACK_URL = 'https://example.com/api/withdrawals/nokash/callback';
});

vi.mock('dotenv', () => {
  const mockConfig = vi.fn();
  return {
    default: { config: mockConfig, parse: vi.fn() },
    config: mockConfig,
    parse: vi.fn(),
  };
});

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

import { NokashPayoutService, nokashPayoutService } from '../services/nokash-payout.service.ts';

const jsonResponse = (payload: unknown) => ({ json: () => Promise.resolve(payload) });

const authCall = () => mockFetch.mock.calls[0];
const payoutCall = () => mockFetch.mock.calls[1];

describe('NokashPayoutService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateAuthKey (étape 1 : génération du passcode)', () => {
    it('demande la clé en form url-encoded sur /auth', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ status: 'LOGIN_SUCCESS', data: 'auth-code-1' }));

      const key = await nokashPayoutService.generateAuthKey();

      expect(key).toBe('auth-code-1');
      const [url, init] = authCall();
      expect(url).toBe('https://api.nokash.test/lapas-on-trans/trans/auth');
      expect(init.method).toBe('POST');
      expect(init.headers['Content-Type']).toBe('application/x-www-form-urlencoded');

      const params = new URLSearchParams(String(init.body));
      expect(params.get('i_space_key')).toBe('test-i-space-key');
      expect(params.get('app_space_key')).toBe('test-app-space-key');
    });

    it('échoue si LOGIN_BAD_INFOS', async () => {
      mockFetch.mockResolvedValue(
        jsonResponse({ status: 'LOGIN_BAD_INFOS', message: 'keys invalid' })
      );
      await expect(nokashPayoutService.generateAuthKey()).rejects.toThrow(
        /Échec d'authentification Payout Nokash/
      );
    });

    it('échoue avant tout appel réseau si les clés manquent', async () => {
      const savedI = process.env.NOKASH_I_SPACE_KEY;
      delete process.env.NOKASH_I_SPACE_KEY;
      try {
        const svc = new NokashPayoutService();
        await expect(svc.generateAuthKey()).rejects.toThrow(/Clés manquantes/);
        expect(mockFetch).not.toHaveBeenCalled();
      } finally {
        process.env.NOKASH_I_SPACE_KEY = savedI;
      }
    });

    it("propage l'erreur réseau", async () => {
      mockFetch.mockRejectedValue(new Error('Network failure'));
      await expect(nokashPayoutService.generateAuthKey()).rejects.toThrow(
        /Erreur génération clé Payout Nokash/
      );
    });
  });

  describe('initiatePayout (étape 2 : retrait)', () => {
    it('appelle /auth en urlencoded puis /api-payout-request/407 en JSON avec auth-code', async () => {
      mockFetch
        .mockResolvedValueOnce(jsonResponse({ status: 'LOGIN_SUCCESS', data: 'auth-code-1' }))
        .mockResolvedValueOnce(
          jsonResponse({
            status: 'REQUEST_OK',
            data: { id: 'nk-1', status: 'PENDING', amount: '25.0', orderId: 'w-1' },
          })
        );

      const result = await nokashPayoutService.initiatePayout({
        amount: 25,
        order_id: 'w-1',
        user_phone: '697407380',
        payment_method: 'MTN_MOMO',
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);

      const [authUrl, authInit] = authCall();
      expect(authUrl).toBe('https://api.nokash.test/lapas-on-trans/trans/auth');
      expect(authInit.headers['Content-Type']).toBe('application/x-www-form-urlencoded');

      const [payoutUrl, payoutInit] = payoutCall();
      expect(payoutUrl).toBe(
        'https://api.nokash.app/lapas-on-trans/trans/api-payout-request/407'
      );
      expect(payoutInit.method).toBe('POST');
      expect(payoutInit.headers['Content-Type']).toBe('application/json');
      expect(payoutInit.headers['auth-code']).toBe('auth-code-1');

      const body = JSON.parse(payoutInit.body);
      expect(body).toMatchObject({
        i_space_key: 'test-i-space-key',
        app_space_key: 'test-app-space-key',
        payment_type: 'CM_MOBILEMONEY',
        country: 'CM',
        order_id: 'w-1',
        amount: '25',
        callback_url: 'https://example.com/api/withdrawals/nokash/callback',
      });
      expect(body.user_data.user_phone).toBe('237697407380');
      expect(result.status).toBe('REQUEST_OK');
      expect(result.data?.id).toBe('nk-1');
    });

    it("détecte l'opérateur depuis le préfixe et écrase payment_method", async () => {
      mockFetch
        .mockResolvedValueOnce(jsonResponse({ status: 'LOGIN_SUCCESS', data: 'code' }))
        .mockResolvedValueOnce(jsonResponse({ status: 'REQUEST_OK', data: { id: 'nk-2' } }));

      await nokashPayoutService.initiatePayout({
        amount: 100,
        order_id: 'w-2',
        user_phone: '670000000',
        payment_method: 'ORANGE_MONEY',
      });

      const body = JSON.parse(payoutCall()[1].body);
      expect(body.payment_method).toBe('MTN_MOMO');
    });

    it('utilise NG_BANKTRANSFER et les champs bancaires pour le Nigéria', async () => {
      mockFetch
        .mockResolvedValueOnce(jsonResponse({ status: 'LOGIN_SUCCESS', data: 'code' }))
        .mockResolvedValueOnce(jsonResponse({ status: 'REQUEST_OK', data: { id: 'nk-3' } }));

      await nokashPayoutService.initiatePayout({
        amount: 5000,
        order_id: 'w-ng',
        user_phone: '234800000000',
        country: 'NG',
        payment_method: 'BANK_TRANSFER',
        user_email: 'a@b.com',
        user_name: 'Test',
        user_bank_code: '001',
        user_bank_account: '1234567890',
      });

      const body = JSON.parse(payoutCall()[1].body);
      expect(body.payment_type).toBe('NG_BANKTRANSFER');
      expect(body.payment_method).toBe('BANK_TRANSFER');
      expect(body.user_data).toEqual({
        user_email: 'a@b.com',
        user_name: 'Test',
        user_bank_code: '001',
        user_bank_account: '1234567890',
      });
    });

    it("n'appelle jamais le payout si l'auth échoue", async () => {
      mockFetch.mockResolvedValue(
        jsonResponse({ status: 'API_ERROR_HANDLING', message: 'i_space_key parameter is missing' })
      );

      await expect(
        nokashPayoutService.initiatePayout({
          amount: 25,
          order_id: 'w-ko',
          user_phone: '697407380',
        })
      ).rejects.toThrow(/Échec d'authentification Payout Nokash|Erreur génération clé/);

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('propage une erreur réseau du payout', async () => {
      mockFetch
        .mockResolvedValueOnce(jsonResponse({ status: 'LOGIN_SUCCESS', data: 'code' }))
        .mockRejectedValueOnce(new Error('Network failure'));

      await expect(
        nokashPayoutService.initiatePayout({
          amount: 25,
          order_id: 'w-net',
          user_phone: '697407380',
        })
      ).rejects.toThrow(/Erreur lors de l'initiation du Payout Nokash/);
    });
  });

  describe('checkPayoutStatus (étape 3 : statut)', () => {
    it('POST urlencoded transaction_id vers /310/status-request', async () => {
      mockFetch.mockResolvedValue(
        jsonResponse({ status: 'REQUEST_OK', data: { status: 'SUCCESS' } })
      );

      await nokashPayoutService.checkPayoutStatus('tx-1');

      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api.nokash.test/lapas-on-trans/trans/310/status-request');
      expect(init.method).toBe('POST');
      expect(init.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
      expect(new URLSearchParams(String(init.body)).get('transaction_id')).toBe('tx-1');
    });

    it("propage l'erreur réseau", async () => {
      mockFetch.mockRejectedValue(new Error('Network failure'));
      await expect(nokashPayoutService.checkPayoutStatus('tx-err')).rejects.toThrow(
        /vérification du statut Payout/
      );
    });
  });

  describe('toFormBody (sérialisation urlencoded)', () => {
    it('sérialise les objets imbriqués en notation crochets et ignore les null', () => {
      const svc = nokashPayoutService as unknown as {
        toFormBody: (d: Record<string, unknown>) => URLSearchParams;
      };
      const params = svc.toFormBody({
        a: '1',
        n: 25,
        nested: { b: '2', deep: { c: '3' } },
        nil: null,
        undef: undefined,
      });

      expect(params.get('a')).toBe('1');
      expect(params.get('n')).toBe('25');
      expect(params.get('nested[b]')).toBe('2');
      expect(params.get('nested[deep][c]')).toBe('3');
      expect(params.has('nil')).toBe(false);
      expect(params.has('undef')).toBe(false);
    });
  });
});
