import { test, expect } from '@playwright/test';

// Reads API base and token from environment
const API_BASE = process.env.API_BASE_URL || 'http://localhost:3003/api';
const ADMIN_JWT = process.env.ADMIN_JWT || process.env.PLAYWRIGHT_JWT;

// The test expects an admin/user JWT available in env as ADMIN_JWT
test('Get my devices count via API using provided JWT', async ({ request }) => {
  test.skip(!ADMIN_JWT, 'Set ADMIN_JWT environment variable to run this test');

  // Call GET /devices with Authorization header
  const res = await request.get(`${API_BASE}/devices`, {
    headers: {
      Authorization: `Bearer ${ADMIN_JWT}`
    }
  });

  // Log response status for debugging
  console.log('API GET /devices status:', res.status());
  expect(res.status()).toBe(200);

  const body = await res.json();
  console.log('API GET /devices body:', body);

  expect(body).toHaveProperty('success');
  expect(body.success).toBe(true);
  expect(body).toHaveProperty('count');
  expect(typeof body.count).toBe('number');

  // Output the device count to the test log
  console.log(`✅ Utilisateur connecté a ${body.count} appareil(s)`);
});
