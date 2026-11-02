import { writeFileSync } from 'node:fs';
import { query, getClient } from './src/database/db.ts';

async function backup() {
  const dump: Record<string, unknown[]> = {};
  for (const table of [
    'declarations',
    'matches',
    'claims',
    'recovery_reservations',
    'conversations',
    'conversation_participants',
    'messages',
    'deletion_requests',
  ]) {
    dump[table] = (await query(`SELECT * FROM ${table}`)).rows;
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const path = `/tmp/docmaster_declarations_backup_${stamp}.json`;
  writeFileSync(path, JSON.stringify(dump, null, 2));
  console.log('Sauvegarde écrite:', path);
  console.log(
    'Lignes sauvegardées:',
    Object.fromEntries(Object.entries(dump).map(([k, v]) => [k, v.length])),
  );
  return path;
}

async function wipe() {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    // claims.doc_id empêche le cascade vers declarations
    const claims = await client.query('DELETE FROM claims');
    const declarations = await client.query('DELETE FROM declarations RETURNING id');
    await client.query('COMMIT');
    console.log('Claims supprimés:', claims.rowCount);
    console.log('Déclarations supprimées:', declarations.rowCount);
    console.log('Matches, réservations, conversations supprimés par cascade.');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function main() {
  const path = await backup();
  await wipe();
  console.log('Terminé. Sauvegarde:', path);
  process.exit(0);
}

main().catch((err) => {
  console.error('Erreur:', err.message);
  process.exit(1);
});
