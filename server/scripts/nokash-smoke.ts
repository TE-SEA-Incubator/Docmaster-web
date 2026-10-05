/**
 * Smoke test Nokash (PAYOUT + PAYIN) contre l'API réelle.
 *
 * Aucune transaction réelle n'est créée : tous les appels "d'écriture" sont
 * volontairement incomplets, ce qui fait réagir l'API (REQUEST_BAD_INFOS)
 * sans déclencher de transfert d'argent.
 *
 * Usage : npm run test:nokash
 */
import dotenv from 'dotenv';
dotenv.config();

import { nokashPayoutService } from '../src/services/nokash-payout.service.ts';

type CheckResult = { name: string; ok: boolean; detail: string };

const BASE_URL = process.env.NOKASH_BASE_URL || 'https://api.nokash.app/lapas-on-trans/trans';
const FAKE_ID = '00000000-0000-0000-0000-000000000000';

const results: CheckResult[] = [];

function record(name: string, ok: boolean, detail: string) {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✅' : '❌'} ${name}\n     → ${detail}`);
}

async function post(url: string, opts: { headers?: Record<string, string>; body?: unknown }) {
  const res = await fetch(url, {
    method: 'POST',
    headers: opts.headers,
    body: opts.body as BodyInit | undefined,
  });
  return { status: res.status, json: await res.json() };
}

async function run() {
  console.log('═══ Smoke test Nokash ═══\n');

  // ── PAYOUT ──────────────────────────────────────────────────────────────
  console.log('── PAYOUT (retraits) ──');

  // 1. Génération du passcode : doit être en form url-encoded
  let authCode = '';
  try {
    authCode = await nokashPayoutService.generateAuthKey();
    record('Payout /auth (urlencoded)', !!authCode, `clé générée: ${authCode}`);
  } catch (err: any) {
    record('Payout /auth (urlencoded)', false, err.message);
  }

  // 2. Statut : /310/status-request en urlencoded, faux id → erreur métier attendue
  try {
    const res = await nokashPayoutService.checkPayoutStatus(FAKE_ID);
    const ok = res?.status === 'GET_BAD_INFOS';
    record(
      'Payout statut /310/status-request (urlencoded)',
      ok,
      `status=${res?.status} message=${res?.message}`
    );
  } catch (err: any) {
    record('Payout statut /310/status-request (urlencoded)', false, err.message);
  }

  // 3. Initiation : JSON + header auth-code, corps vide → REQUEST_BAD_INFOS
  try {
    const { json } = await post(`${BASE_URL}/api-payout-request/407`, {
      headers: {
        'Content-Type': 'application/json',
        ...(authCode ? { 'auth-code': authCode } : {}),
      },
      body: '{}',
    });
    const ok = json?.status === 'REQUEST_BAD_INFOS';
    record(
      'Payout /api-payout-request/407 (JSON + auth-code)',
      ok,
      `status=${json?.status} message=${json?.message}`
    );
  } catch (err: any) {
    record('Payout /api-payout-request/407 (JSON + auth-code)', false, err.message);
  }

  // ── PAYIN (dépôts / paiements) ──────────────────────────────────────────
  console.log('\n── PAYIN (paiements) ──');

  // 4. Initiation payin : JSON, corps vide → REQUEST_BAD_INFOS
  try {
    const { json } = await post(`${BASE_URL}/api-payin-request/407`, {
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    const ok = json?.status === 'REQUEST_BAD_INFOS';
    record(
      'Payin /api-payin-request/407 (JSON)',
      ok,
      `status=${json?.status} message=${json?.message}`
    );
  } catch (err: any) {
    record('Payin /api-payin-request/407 (JSON)', false, err.message);
  }

  // 5. Statut payin : même endpoint /310/status-request en urlencoded
  try {
    const params = new URLSearchParams();
    params.set('transaction_id', FAKE_ID);
    const { json } = await post(`${BASE_URL}/310/status-request`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });
    const ok = json?.status === 'GET_BAD_INFOS';
    record('Payin statut /310/status-request (urlencoded)', ok, `status=${json?.status} message=${json?.message}`);
  } catch (err: any) {
    record('Payin statut /310/status-request (urlencoded)', false, err.message);
  }

  // ── Bilan ───────────────────────────────────────────────────────────────
  const failed = results.filter((r) => !r.ok);
  console.log('\n═══ Bilan ═══');
  console.log(`${results.length - failed.length}/${results.length} vérifications OK`);
  if (failed.length > 0) {
    console.log('Échecs :');
    failed.forEach((f) => console.log(`  ✗ ${f.name}`));
    process.exitCode = 1;
  }
}

run().catch((err) => {
  console.error('💥 Smoke test interrompu :', err);
  process.exitCode = 1;
});
