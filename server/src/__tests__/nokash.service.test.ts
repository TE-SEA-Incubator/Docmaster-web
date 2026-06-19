import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.hoisted(() => {
  process.env.NOKASH_I_SPACE_KEY = 'test-i-space-key';
  process.env.NOKASH_APP_SPACE_KEY = 'test-app-space-key';
  process.env.NOKASH_BASE_URL = 'https://api.nokash.test';
  process.env.NOKASH_CALLBACK_URL = 'https://example.com/api/payments/nokash/callback';
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

import { nokashService } from '../services/nokash.service.ts';

describe('NokashService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initiatePayment', () => {
    it('should construct correct body', async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ status: 'REQUEST_OK', data: { id: 'txn-123' } }),
      });

      const result = await nokashService.initiatePayment({
        payment_method: 'ORANGE_MONEY',
        amount: 500,
        order_id: 'SUB-abc123',
        user_phone: '697407380',
        country: 'CM',
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);

      expect(body).toMatchObject({
        i_space_key: 'test-i-space-key',
        app_space_key: 'test-app-space-key',
        payment_type: 'CM_MOBILEMONEY',
        country: 'CM',
        payment_method: 'ORANGE_MONEY',
        amount: '500',
        order_id: 'SUB-abc123',
        callback_url: 'https://example.com/api/payments/nokash/callback',
      });
      expect(body.user_data.user_phone).toBe('237697407380');
      expect(result).toEqual({ status: 'REQUEST_OK', data: { id: 'txn-123' } });
    });

    it('should detect MTN_MOMO from 67 prefix and override payment_method', async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ status: 'REQUEST_OK' }),
      });

      await nokashService.initiatePayment({
        payment_method: 'ORANGE_MONEY',
        amount: 1000,
        order_id: 'SUB-def456',
        user_phone: '670000000',
        country: 'CM',
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.payment_method).toBe('MTN_MOMO');
    });

    it('should use NG_BANKTRANSFER for Nigeria', async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ status: 'REQUEST_OK' }),
      });

      await nokashService.initiatePayment({
        payment_method: 'BANK_TRANSFER',
        amount: 50000,
        order_id: 'SUB-ng-001',
        user_phone: '234800000000',
        country: 'NG',
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.payment_type).toBe('NG_BANKTRANSFER');
      expect(body.country).toBe('NG');
    });

    it('should normalize payment_method aliases', async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ status: 'REQUEST_OK' }),
      });

      const cases = [
        { input: 'OM', op: 'ORANGE_MONEY', phone: '697407380' },
        { input: 'orange', op: 'ORANGE_MONEY', phone: '697407380' },
        { input: 'ORANGE_CM', op: 'ORANGE_MONEY', phone: '697407380' },
        { input: 'MTN_MOMO', op: 'MTN_MOMO', phone: '670000000' },
        { input: 'momo', op: 'MTN_MOMO', phone: '670000000' },
        { input: 'mtn', op: 'MTN_MOMO', phone: '670000000' },
        { input: 'MTN_CM', op: 'MTN_MOMO', phone: '670000000' },
      ];

      for (const c of cases) {
        mockFetch.mockClear();
        await nokashService.initiatePayment({
          payment_method: c.input, amount: 500,
          order_id: `SUB-${c.input}`, user_phone: c.phone, country: 'CM',
        });
        expect(JSON.parse(mockFetch.mock.calls[0][1].body).payment_method).toBe(c.op);
      }
    });

    it('should normalize phones', async () => {
      mockFetch.mockResolvedValue({ json: () => Promise.resolve({ status: 'REQUEST_OK' }) });

      const phones = [
        { input: '697407380', expected: '237697407380' },
        { input: '237697407380', expected: '237697407380' },
        { input: '+237697407380', expected: '237697407380' },
      ];
      for (const p of phones) {
        mockFetch.mockClear();
        await nokashService.initiatePayment({
          payment_method: 'ORANGE_MONEY', amount: 500,
          order_id: `SUB-${p.input}`, user_phone: p.input, country: 'CM',
        });
        expect(JSON.parse(mockFetch.mock.calls[0][1].body).user_data.user_phone).toBe(p.expected);
      }
    });

    it('should throw on network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network failure'));
      await expect(nokashService.initiatePayment({
        payment_method: 'ORANGE_MONEY', amount: 500,
        order_id: 'SUB-err', user_phone: '697407380', country: 'CM',
      })).rejects.toThrow('Erreur lors de l\'initialisation du paiement Nokash');
    });

    it('should default country to CM', async () => {
      mockFetch.mockResolvedValue({ json: () => Promise.resolve({ status: 'REQUEST_OK' }) });
      await nokashService.initiatePayment({
        payment_method: 'ORANGE_MONEY', amount: 500,
        order_id: 'SUB-default', user_phone: '697407380',
      });
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.country).toBe('CM');
      expect(body.payment_type).toBe('CM_MOBILEMONEY');
    });
  });

  describe('checkStatus', () => {
    it('should check transaction status', async () => {
      mockFetch.mockResolvedValue({ json: () => Promise.resolve({ status: 'SUCCESS' }) });
      await nokashService.checkStatus('txn-123');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.nokash.test/310/status-request',
        expect.objectContaining({ method: 'POST', body: JSON.stringify({ transaction_id: 'txn-123' }) })
      );
    });

    it('should throw on network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network failure'));
      await expect(nokashService.checkStatus('txn-err')).rejects.toThrow('vérification du statut Nokash');
    });
  });
});
