import { query, getClient } from './src/database/db.ts';

const CNI = '3e4f3574-db05-47e0-b9ef-4ef06f90c477';
const PERMIS = '9e77958c-17d6-4bc0-807b-04ae0b8407fc';

type Criterion = { name: string; points: number; max: number; matched: boolean };

const criteria = (score: number): Criterion[] => [
  { name: 'Type de document', points: 40, max: 40, matched: true },
  { name: 'Numéro', points: score >= 85 ? 30 : 18, max: 30, matched: score >= 85 },
  { name: 'Nom', points: score >= 85 ? 20 : 10, max: 20, matched: score >= 85 },
  { name: 'Ville', points: 10, max: 10, matched: true },
];

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
      docType: string;
      ownerName: string;
      documentNumber: string;
      status: string;
      reporterId: string;
      ville: string;
      quartier: string;
      description: string;
      telephone: string;
      email: string;
      datePerte?: string;
      dateExpiration?: string;
      foundLocation?: Record<string, unknown>;
    }) => {
      const res = await client.query(
        `INSERT INTO declarations (
          identifiant_doc_dm, doc_type, owner_name, document_number, declaration_type,
          status, reporter_id, ville, region, pays, quartier, etat_physique, description,
          telephone_contact, email_contact, date_perte, date_expiration, found_location,
          reporter_type, mode_contact, payment_status, metadata
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, 'Centre', 'Cameroun', $9, 'Bon état', $10,
          $11, $12, $13, $14, $15::jsonb,
          'USER', 'APP_CHAT', 'PENDING', '{}'::jsonb
        ) RETURNING id`,
        [
          params.ref,
          params.docType,
          params.ownerName,
          params.documentNumber,
          params.type,
          params.status,
          params.reporterId,
          params.ville,
          params.quartier,
          params.description,
          params.telephone,
          params.email,
          params.datePerte ?? null,
          params.dateExpiration ?? null,
          params.foundLocation ? JSON.stringify(params.foundLocation) : null,
        ],
      );
      return String(res.rows[0].id);
    };

    const insertMatch = async (lostId: string, foundId: string, score: number) => {
      await client.query(
        `INSERT INTO matches (lost_declaration_id, found_declaration_id, score, status, details, owner_confirmed_at, owner_confirmed_by)
         VALUES ($1, $2, $3, 'PENDING', $4::jsonb, NULL, NULL)`,
        [lostId, foundId, score, JSON.stringify({ criteria: criteria(score) })],
      );
    };

    // Sens 1 : bouki trouve, djeutchouruxel@gmail.com a perdu
    const fPermis = await insertDeclaration({
      ref: 'TEST-FOUND-PERMIS-02',
      type: 'FOUND',
      docType: PERMIS,
      ownerName: 'TAMBA Serge',
      documentNumber: 'PM-7788990',
      status: 'MATCHED',
      reporterId: bouki,
      ville: 'Yaoundé',
      quartier: 'Nlongkak',
      description: 'Permis de conduire trouvé devant la pharmacie.',
      telephone: '699111222',
      email: 'bouki.trouveur@test.local',
      dateExpiration: '2029-04-22',
      foundLocation: { lat: 3.8775, lng: 11.5201, ville: 'Yaoundé', quartier: 'Nlongkak' },
    });
    const lPermis = await insertDeclaration({
      ref: 'TEST-LOST-PERMIS-02',
      type: 'LOST',
      docType: PERMIS,
      ownerName: 'TAMBA Serge',
      documentNumber: 'PM-7788990',
      status: 'MATCHED',
      reporterId: autre,
      ville: 'Yaoundé',
      quartier: 'Nlongkak',
      description: 'Permis égaré autour du marché de Nlongkak.',
      telephone: '677222333',
      email: 'autre.proprietaire@test.local',
      datePerte: '2026-10-24',
      dateExpiration: '2029-04-22',
    });
    await insertMatch(lPermis, fPermis, 90);

    // Sens 2 : djeutchouruxel@gmail.com trouve, bouki a perdu
    const fCni = await insertDeclaration({
      ref: 'TEST-FOUND-CNI-03',
      type: 'FOUND',
      docType: CNI,
      ownerName: 'MEKONGO Paul',
      documentNumber: 'CM-4455667',
      status: 'MATCHED',
      reporterId: autre,
      ville: 'Douala',
      quartier: 'Akwa',
      description: 'CNI retrouvée dans un taxi à Akwa.',
      telephone: '699333444',
      email: 'autre.trouveur@test.local',
      dateExpiration: '2032-08-15',
      foundLocation: { lat: 4.0483, lng: 9.7043, ville: 'Douala', quartier: 'Akwa' },
    });
    const lCni = await insertDeclaration({
      ref: 'TEST-LOST-CNI-03',
      type: 'LOST',
      docType: CNI,
      ownerName: 'MEKONGO Paul',
      documentNumber: 'CM-4455667',
      status: 'MATCHED',
      reporterId: bouki,
      ville: 'Douala',
      quartier: 'Bonapriso',
      description: 'CNI perdue pendant un trajet en taxi.',
      telephone: '677444555',
      email: 'bouki.proprietaire@test.local',
      datePerte: '2026-10-23',
      dateExpiration: '2032-08-15',
    });
    await insertMatch(lCni, fCni, 88);

    await client.query('COMMIT');
    console.log('Paires de test créées.');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  const rows = await query(`
    SELECT l.identifiant_doc_dm AS lost_ref, f.identifiant_doc_dm AS found_ref,
           m.status, m.score, m.owner_confirmed_at IS NOT NULL AS owner_confirmed,
           lu.email AS lost_owner, fu.email AS found_owner
      FROM matches m
      JOIN declarations l ON l.id = m.lost_declaration_id
      JOIN declarations f ON f.id = m.found_declaration_id
      JOIN users lu ON lu.id = l.reporter_id
      JOIN users fu ON fu.id = f.reporter_id
     WHERE l.identifiant_doc_dm LIKE 'TEST-%0%'
     ORDER BY m.created_at DESC
     LIMIT 10
  `);
  console.table(rows.rows);
  process.exit(0);
}

main().catch((err) => {
  console.error('Erreur:', err.message);
  process.exit(1);
});
