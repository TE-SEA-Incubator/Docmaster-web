import { vi } from 'vitest';

vi.mock('../database/db.ts', () => ({
  pool: {
    query: vi.fn(),
    connect: vi.fn(),
  },
  query: vi.fn(),
  getClient: vi.fn(),
  default: {
    pool: { query: vi.fn() },
    query: vi.fn(),
    getClient: vi.fn(),
  },
}));
