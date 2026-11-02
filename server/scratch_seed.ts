import { query, getClient } from './src/database/db.ts';

const FINDER = 'f4ea3423-945d-4385-9f7a-8fa55235869e'; // DJEUTCHOU Ruxel (USER)
const OWNER_A = '98b8aa11-89db-418e-ad1f-a81797c0602e'; // Djeutchou Ruxel (USER)
const OWNER_B = '3d5501a9-eeb8-4567-8bbd-7fd09eb57720'; // Aboubakar Admin (ADMIN)

const CNI = '3e4f3574-db05-47e0-b9ef-4ef06f90c477';
const PASSPORT = '7fad597f-817c-48c5-87df-a9ac808a7dab';
const PERMIS = '9e77958c-17d6-4bc0-807b-04ae0b8407fc';

type Criterion = { name: string; points: number; max: number; matched: boolean };

async function seed() {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const insertDeclaration = async (params: {
      ref: string;
      type: 'LOST' | 'FOUND';
      docType: string;
      ownerName: string;
      documentNumber: string | null;
      status: string;
      reporterId: string;
      ville: string;
      quartier: string;
      etat: string;
      description: string;
      telephone?: string | null;
      email?: string | null;
      datePerte?: string | null;
      dateExpiration?: string | null;
      foundLocation?: Record<string, unknown> | null;
    }) => {
      const res = await client.query(
        `INSERT INTO declarations (
          identifiant_doc_dm, doc_type, owner_name, document_number, declaration_type,
          status, reporter_id, ville, region, pays, quartier, etat_physique, description,
          telephone_contact, email_contact, date_perte, date_expiration, found_location,
          reporter_type, mode_contact, payment_status, metadata
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, 'Centre', 'Cameroun', $9, $10, $11,
          $12, $13, $14, $15, $16::jsonb,
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
          params.etat,
          params.description,
          params.telephone ?? null,
          params.email ?? null,
          params.datePerte ?? null,
          params.dateExpiration ?? null,
          params.foundLocation ? JSON.stringify(params.foundLocation) : null,
        ],
      );
      return String(res.rows[0].id);
    };

    const insertMatch = async (
      lostId: string,
      foundId: string,
      score: number,
      status: 'PENDING' | 'CONFIRMED',
      criteria: Criterion[],
      ownerConfirmedBy?: string,
    ) => {
      const confirmed = status === 'CONFIRMED';
      await client.query(
        `INSERT INTO matches (lost_declaration_id, found_declaration_id, score, status, details, owner_confirmed_at, owner_confirmed_by)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)`,
        [
          lostId,
          foundId,
          score,
          status,
          JSON.stringify({ criteria }),
          confirmed ? new Date().toISOString() : null,
          confirmed ? ownerConfirmedBy ?? null : null,
        ],
      );
    };

    // ── Scénario 1 : un FOUND, deux LOST (côté trouveur = 2 cartes) ──
    const f1 = await insertDeclaration({
      ref: 'TEST-FOUND-CNI-01',
      type: 'FOUND',
      docType: CNI,
      ownerName: 'KOUAM Hélène',
      documentNumber: 'CM-1122334',
      status: 'MATCHED',
      reporterId: FINDER,
      ville: 'Yaoundé',
      quartier: 'Bastos',
      etat: 'Bon état',
      description: "Carte nationale d'identité trouvée près du marché central.",
      telephone: '699000111',
      email: 'trouveur@test.local',
      dateExpiration: '2031-05-14',
      foundLocation: { lat: 3.8667, lng: 11.5167, ville: 'Yaoundé', quartier: 'Bastos' },
    });
    const l1 = await insertDeclaration({
      ref: 'TEST-LOST-CNI-01',
      type: 'LOST',
      docType: CNI,
      ownerName: 'KOUAM Hélène',
      documentNumber: 'CM-1122334',
      status: 'MATCHED',
      reporterId: OWNER_A,
      ville: 'Yaoundé',
      quartier: 'Mvog-Mbi',
      etat: 'Bon état',
      description: 'Perdue entre le marché central et le quartier Bastos.',
      telephone: '677000222',
      email: 'proprietaire.a@test.local',
      datePerte: '2026-10-12',
      dateExpiration: '2031-05-14',
    });
    const l2 = await insertDeclaration({
      ref: 'TEST-LOST-CNI-02',
      type: 'LOST',
      docType: CNI,
      ownerName: 'MEKONGO Paul',
      documentNumber: 'CM-1122399',
      status: 'MATCHED',
      reporterId: OWNER_B,
      ville: 'Yaoundé',
      quartier: 'Biyem-Assi',
      etat: 'Bon état',
      description: 'Carte perdue dans un taxi à Biyem-Assi.',
      telephone: '677000333',
      email: 'proprietaire.b@test.local',
      datePerte: '2026-10-20',
      dateExpiration: '2030-02-09',
    });
    await insertMatch(l1, f1, 92, 'PENDING', [
      { name: 'Type de document', points: 40, max: 40, matched: true },
      { name: 'Numéro', points: 30, max: 30, matched: true },
      { name: 'Nom', points: 12, max: 20, matched: false },
      { name: 'Ville', points: 10, max: 10, matched: true },
    ]);
    await insertMatch(l2, f1, 78, 'PENDING', [
      { name: 'Type de document', points: 40, max: 40, matched: true },
      { name: 'Numéro', points: 18, max: 30, matched: false },
      { name: 'Nom', points: 10, max: 20, matched: false },
      { name: 'Ville', points: 10, max: 10, matched: true },
    ]);

    // ── Scénario 2 : un LOST déjà confirmé par son propriétaire (paiement direct) ──
    const f2 = await insertDeclaration({
      ref: 'TEST-FOUND-PASS-01',
      type: 'FOUND',
      docType: PASSPORT,
      ownerName: 'NGO BAKANG Alice',
      documentNumber: 'PA-5566778',
      status: 'MATCHED',
      reporterId: FINDER,
      ville: 'Douala',
      quartier: 'Bonapriso',
      etat: 'Bon état',
      description: 'Passeport retrouvé dans une agence bancaire.',
      telephone: '699000444',
      email: 'trouveur@test.local',
      dateExpiration: '2029-11-30',
      foundLocation: { lat: 4.0483, lng: 9.7043, ville: 'Douala', quartier: 'Bonapriso' },
    });
    const l3 = await insertDeclaration({
      ref: 'TEST-LOST-PASS-01',
      type: 'LOST',
      docType: PASSPORT,
      ownerName: 'NGO BAKANG Alice',
      documentNumber: 'PA-5566778',
      status: 'MATCHED',
      reporterId: OWNER_A,
      ville: 'Douala',
      quartier: 'Akwa',
      etat: 'Bon état',
      description: 'Passeport perdu lors d’un déplacement professionnel.',
      telephone: '677000222',
      email: 'proprietaire.a@test.local',
      datePerte: '2026-10-18',
      dateExpiration: '2029-11-30',
    });
    await insertMatch(
      l3,
      f2,
      100,
      'CONFIRMED',
      [
        { name: 'Type de document', points: 40, max: 40, matched: true },
        { name: 'Numéro', points: 30, max: 30, matched: true },
        { name: 'Nom', points: 20, max: 20, matched: true },
        { name: 'Ville', points: 10, max: 10, matched: true },
      ],
      OWNER_A,
    );

    // ── Scénario 3 : LOST sans correspondance (état vide) ──
    await insertDeclaration({
      ref: 'TEST-LOST-PERMIS-01',
      type: 'LOST',
      docType: PERMIS,
      ownerName: 'TAMBA Serge',
      documentNumber: 'PM-3344556',
      status: 'SEARCHING',
      reporterId: OWNER_B,
      ville: 'Yaoundé',
      quartier: 'Nlongkak',
      etat: 'Bon état',
      description: 'Permis de conduire égaré.',
      telephone: '677000333',
      email: 'proprietaire.b@test.local',
      datePerte: '2026-10-25',
      dateExpiration: '2028-07-19',
    });

    await client.query('COMMIT');
    console.log('Jeu de test créé.');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function summary() {
  const rows = await query(`
    SELECT d.identifiant_doc_dm AS ref, d.declaration_type AS type, d.status, d.ville,
           (SELECT COUNT(*)::int FROM matches m
             WHERE m.found_declaration_id = d.id AND m.status IN ('PENDING','CONFIRMED')) AS found_side_active,
           (SELECT COUNT(*)::int FROM matches m
             WHERE m.lost_declaration_id = d.id AND m.status IN ('PENDING','CONFIRMED')) AS lost_side_active
    FROM declarations d
    ORDER BY d.declaration_type, d.identifiant_doc_dm
  `);
  console.table(rows.rows);

  const matches = await query(`
    SELECT m.status, m.score, m.owner_confirmed_at IS NOT NULL AS owner_confirmed,
           l.identifiant_doc_dm AS lost_ref, f.identifiant_doc_dm AS found_ref,
           l.reporter_id AS lost_owner
    FROM matches m
    JOIN declarations l ON l.id = m.lost_declaration_id
    JOIN declarations f ON f.id = m.found_declaration_id
    ORDER BY f.identifiant_doc_dm, m.score DESC
  `);
  console.table(matches.rows);
}

async function main() {
  await seed();
  await summary();
  process.exit(0);
}

main().catch((err) => {
  console.error('Erreur:', err.message);
  process.exit(1);
});
