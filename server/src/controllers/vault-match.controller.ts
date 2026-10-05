import { Request, Response } from 'express';
import { DeclarationRepository } from '../repositories/declaration.repository.ts';
import { MatchRepository } from '../repositories/match.repository.ts';
import { DocumentRepository } from '../repositories/document.repository.ts';
import { DocumentTypeRepository } from '../repositories/document-type.repository.ts';
import { NotificationService } from '../services/notification.service.ts';
import { pool } from '../database/db.js';

const declarationRepository = new DeclarationRepository();
const matchRepository = new MatchRepository();
const documentRepository = new DocumentRepository();
const docTypeRepository = new DocumentTypeRepository();
const notificationService = new NotificationService();

async function generateLostIdentifiant(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const yy = String(year).slice(-2);
  const mm = String(month).padStart(2, '0');
  const { rows } = await pool.query(
    `SELECT COUNT(*) as count FROM declarations
     WHERE declaration_type = 'LOST'
       AND EXTRACT(YEAR FROM created_at) = $1
       AND EXTRACT(MONTH FROM created_at) = $2`,
    [year, month]
  );
  const n = parseInt(rows[0].count) + 1;
  return `DOC_${yy}${mm}_${n}`;
}

export async function respondVaultMatch(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      console.warn('[VaultMatch] Requête sans userId');
      return res.status(401).json({ success: false, message: 'Non authentifié' });
    }

    const { declaration_id, vault_doc_id, response } = req.body;
    console.log(`[VaultMatch] Requête reçue — userId=${userId}, declaration_id=${declaration_id}, vault_doc_id=${vault_doc_id}, response=${response}`);

    if (!declaration_id || !response || !['yes', 'no'].includes(response)) {
      console.warn(`[VaultMatch] Paramètres invalides — declaration_id=${declaration_id}, response=${response}`);
      return res.status(400).json({
        success: false,
        message: 'Paramètres invalides. declaration_id et response (yes/no) requis.',
      });
    }

    console.log(`[VaultMatch] Recherche déclaration ${declaration_id}...`);
    const foundDecl = await declarationRepository.findById(declaration_id);
    if (!foundDecl) {
      console.warn(`[VaultMatch] ❌ Déclaration ${declaration_id} introuvable en base`);
      return res.status(404).json({ success: false, message: 'Déclaration introuvable' });
    }
    console.log(`[VaultMatch] Déclaration trouvée — type=${foundDecl.declaration_type}, status=${foundDecl.status}, doc_type=${foundDecl.doc_type}`);

    if (foundDecl.declaration_type !== 'FOUND') {
      console.warn(`[VaultMatch] Mauvais type de déclaration — attendu FOUND, reçu ${foundDecl.declaration_type}`);
      return res.status(400).json({ success: false, message: 'La déclaration doit être de type FOUND' });
    }

    if (response === 'yes') {
      console.log(`[VaultMatch] Confirmation positive — vault_doc_id=${vault_doc_id}`);
      let vaultDoc = null;
      if (vault_doc_id) {
        console.log(`[VaultMatch] Recherche document vault ${vault_doc_id}...`);
        vaultDoc = await documentRepository.findById(vault_doc_id);
        console.log(`[VaultMatch] Document vault ${vaultDoc ? 'trouvé' : 'introuvable'}`);
      }

      const lostIdentifiant = await generateLostIdentifiant();
      console.log(`[VaultMatch] Création déclaration LOST identifiant=${lostIdentifiant}`);
      const lostDecl = await declarationRepository.create({
        identifiant_doc_dm: lostIdentifiant,
        doc_type: foundDecl.doc_type,
        owner_name: vaultDoc?.nom_sur_doc || foundDecl.owner_name,
        document_number: vaultDoc?.numero_doc || foundDecl.document_number,
        declaration_type: 'LOST',
        status: 'SEARCHING',
        reporter_id: userId,
        ville: foundDecl.ville,
        region: foundDecl.region,
        pays: foundDecl.pays,
        fingerprint: vaultDoc?.fingerprint || foundDecl.fingerprint,
        etat_physique: foundDecl.etat_physique,
        mode_contact: 'APP_CHAT',
        metadata: { source: 'vault_confirmation', vault_doc_id },
      });
      console.log(`[VaultMatch] Déclaration LOST créée — id=${lostDecl.id}`);

      await declarationRepository.updateStatus(lostDecl.id, 'MATCHED');
      await declarationRepository.updateStatus(foundDecl.id, 'MATCHED');
      console.log(`[VaultMatch] Statuts mis à jour — LOST=${lostDecl.id}, FOUND=${foundDecl.id}`);

      const match = await matchRepository.create(
        lostDecl.id,
        foundDecl.id,
        100,
        'CONFIRMED',
        { source: 'vault_confirmation', vault_doc_id },
      );
      console.log(`[VaultMatch] Match créé — id=${match?.id}`);

      if (vault_doc_id) {
        await documentRepository.updateLostStatus(vault_doc_id, userId, true, lostDecl.id);
        console.log(`[VaultMatch] Document vault marqué comme perdu`);
      }

      const meta = await docTypeRepository.findById(foundDecl.doc_type)
        || await docTypeRepository.findByCode(foundDecl.doc_type);
      const docTypeLabel = meta?.nom || foundDecl.doc_type;

      const finderId =
        foundDecl.reporter_type === 'PARTENAIRE' ? null : foundDecl.reporter_id;

      try {
        await notificationService.notifyMatchFound(
          userId,
          finderId,
          lostDecl.id,
          docTypeLabel,
        );
        console.log(`[VaultMatch] Notification MATCH_FOUND envoyée`);
      } catch (notifyErr) {
        console.error('[VaultMatch] notifyMatchFound failed (non-blocking):', notifyErr);
      }

      console.log(`[VaultMatch] ✅ Match confirmé avec succès — lost=${lostDecl.id}, found=${foundDecl.id}`);
      return res.json({
        success: true,
        message: 'Match confirmé. Vous pouvez procéder à la récupération.',
        match,
        lost_declaration_id: lostDecl.id,
        found_declaration_id: foundDecl.id,
      });
    }

    if (response === 'no') {
      console.log(`[VaultMatch] ❌ Rejet — userId=${userId}, declaration_id=${declaration_id}`);
      return res.json({
        success: true,
        message: 'Merci de nous avoir informé. Aucune action supplémentaire ne sera prise.',
      });
    }
  } catch (error) {
    console.error('❌ [VaultMatch] Error responding to vault match:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
}
