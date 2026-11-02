import { query, getClient } from './src/database/db.ts';

const ACTE_NAISSANCE = '92afb74f-4031-4abe-9f8b-998e97b374d2';

async function userId(email: string) {
  const res = await query<{ id: string }>('SELECT id FROM users WHERE email = $1 LIMIT 1', [email]);
  if (!res.rows[0]) throw new Error(`Utilisateur introuvable: ${email}`);
  return String(res.rows[0].id);
}

async function main() {
  const bouki = await userId('bouki.boukar@gmail.com');
  const autre = await userId('djeutchouruxel@gmail.com');

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const insertDeclaration = async (params: {
      ref: string;
      type: 'LOST' | 'FOUND';
      ownerName: string;
      documentNumber: string;
      status: string;
      reporterId: string;
      quartier: string;
      datePerte?: string | null;
    }) => {
      const res = await client.query(
        `INSERT INTO declarations (
          identifiant_doc_dm, doc_type, owner_name, document_number, declaration_type,
          status, reporter_id, ville, region, pays, quartier, etat_physique, description,
          telephone_contact, email_contact, date_perte, date_expiration, found_location,
          reporter_type, mode_contact, payment_status, metadata
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, 'Yaoundé', 'Centre', 'Cameroun', $8, 'Bon état', $9,
          '699555666', 'potentiel@test.local', $10, NULL, NULL,
          'USER', 'APP_CHAT', 'PENDING', '{}'::jsonb
        ) RETURNING id`,
        [
          params.ref,
          ACTE_NAISSANCE,
          params.ownerName,
          params.documentNumber,
          params.type,
          params.status,
          params.reporterId,
          params.quartier,
          params.type === 'FOUND'
            ? 'Acte de naissance trouvé dans un bureau.'
            : 'Acte de naissance égaré.',
          params.datePerte ?? null,
        ],
      );
      return String(res.rows[0].id);
    };

    // Score attendu : type 10 + nom 40 (quasi identique) + ville 20 + état 5 = 75.
    // Nombre, quartier et date ne correspondent pas : PENDING, pas CONFIRMED.
    const found = await insertDeclaration({
      ref: 'TEST-FOUND-ACTE-01',
      type: 'FOUND',
      ownerName: 'NGO BAKANG Alice',
      documentNumber: 'AN-9988771',
      status: 'AVAILABLE',
      reporterId: bouki,
      quartier: 'Bastos',
    });
    const lost = await insertDeclaration({
      ref: 'TEST-LOST-ACTE-01',
      type: 'LOST',
      ownerName: 'NGO BAKANG Alica',
      documentNumber: 'AN-1122334',
      status: 'SEARCHING',
      reporterId: autre,
      quartier: 'Mvog-Mbi',
      datePerte: '2026-10-20',
    });

    const criteria = [
      { name: 'Type de document', points: 10, max: 10, matched: true },
      { name: 'Similitude nom', points: 40, max: 40, matched: true },
      { name: 'Ville', points: 20, max: 20, matched: true },
      { name: 'État physique', points: 5, max: 5, matched: true },
    ];
    await client.query(
      `INSERT INTO matches (lost_declaration_id, found_declaration_id, score, status, details)
       VALUES ($1, $2, 75, 'PENDING', $3::jsonb)`,
      [lost, found, JSON.stringify({ criteria })],
    );

    await client.query('COMMIT');
    console.log('Potentiel 75 créé.');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  const rows = await query(`
    SELECT l.identifiant_doc_dm AS lost_ref, f.identifiant_doc_dm AS found_ref,
           m.status, m.score, lu.email AS lost_owner, fu.email AS found_owner
      FROM matches m
      JOIN declarations l ON l.id = m.lost_declaration_id
      JOIN declarations f ON f.id = m.found_declaration_id
      JOIN users lu ON lu.id = l.reporter_id
      JOIN users fu ON fu.id = f.reporter_id
     WHERE f.identifiant_doc_dm = 'TEST-FOUND-ACTE-01'`);
  console.table(rows.rows);
  process.exit(0);
}

main().catch((err) => {
  console.error('Erreur:', err.message);
  process.exit(1);
});
