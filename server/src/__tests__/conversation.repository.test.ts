import { describe, it, expect, vi, beforeEach } from 'vitest';

import { query } from '../database/db.js';
import { conversationRepository } from '../repositories/conversation.repository.ts';

function lastQuery(): [string, unknown[]] {
  const calls = vi.mocked(query).mock.calls;
  return calls[calls.length - 1] as [string, unknown[]];
}

describe('ConversationRepository.setStatus', () => {
  beforeEach(() => {
    vi.mocked(query).mockReset();
    vi.mocked(query).mockResolvedValue({ rows: [] } as any);
  });

  it('n utilise aucun paramètre deux fois : Postgres déduit un type par valeur liée', async () => {
    await conversationRepository.setStatus('conv-1', 'ARCHIVED');

    const [sql, params] = lastQuery();
    const placeholders = [...sql.matchAll(/\$(\d+)/g)].map((match) => Number(match[1]));

    // Un paramètre affecté à une colonne VARCHAR puis comparé à une littérale text
    // (CASE WHEN $2 = 'OPEN') lève « inconsistent types deduced for parameter $2 ».
    expect(placeholders).toHaveLength(new Set(placeholders).size);
    expect(Math.max(...placeholders)).toBe(params.length);
  });

  it('archive en liant le statut sur les deux emplacements', async () => {
    await conversationRepository.setStatus('conv-1', 'ARCHIVED');

    expect(lastQuery()[1]).toEqual(['conv-1', 'ARCHIVED', 'ARCHIVED']);
  });

  it('rouvre avec le même contrat, closed_at remis à null côté SQL', async () => {
    await conversationRepository.setStatus('conv-1', 'OPEN');

    const [sql, params] = lastQuery();
    expect(params).toEqual(['conv-1', 'OPEN', 'OPEN']);
    expect(sql).toContain("CASE WHEN $3 = 'OPEN' THEN NULL");
  });
});
