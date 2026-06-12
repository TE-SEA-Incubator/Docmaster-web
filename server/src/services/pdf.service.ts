import PDFDocument from 'pdfkit';
import { Response } from 'express';
import path from 'path';
import fs from 'fs';

// ─── Palette officielle ───────────────────────────────────────────────────────
const C = {
  green:      '#1B4332',   // Vert foncé institutionnel (Cameroun)
  greenMid:   '#2D6A4F',   // Vert moyen
  greenLight: '#D8F3DC',   // Fond vert très clair
  gold:       '#C8A45C',   // Or pour les filets de prestige
  goldLight:  '#FDF6E9',   // Fond crème
  red:        '#C1121F',   // Rouge drapeau camerounais
  yellow:     '#F4A900',   // Jaune drapeau camerounais
  black:      '#0D0D0D',
  darkGray:   '#1F2937',
  gray:       '#4B5563',
  lightGray:  '#9CA3AF',
  silver:     '#F3F4F6',
  white:      '#FFFFFF',
  cream:      '#FAFAF8',
  border:     '#D1D5DB',
};

// ─── Helpers positionnement ───────────────────────────────────────────────────
function val(v: any, fallback = '—'): string {
  if (v === null || v === undefined || v === '') return fallback;
  return String(v);
}

function fmtDate(d: any): string {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }); }
  catch { return String(d); }
}

function fmtDateShort(d: any): string {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
  catch { return String(d); }
}

// ─── Status helpers ───────────────────────────────────────────────────────────
const STATUS_FR: Record<string, string> = {
  AVAILABLE: 'Disponible',
  MATCHED:   'Correspondance trouvée',
  PENDING:   'En attente de traitement',
  RETURNED:  'Document restitué',
  SEARCHING: 'Recherche en cours',
  CANCELLED: 'Déclaration annulée',
};
const STATUS_COLOR: Record<string, string> = {
  AVAILABLE: '#16A34A',
  MATCHED:   '#D97706',
  PENDING:   '#2563EB',
  RETURNED:  '#7C3AED',
  SEARCHING: '#0891B2',
  CANCELLED: '#DC2626',
};

// ─── Type du document ─────────────────────────────────────────────────────────
const DOC_ARTICLES: Record<string, string> = {
  'Carte Nationale d\'Identité': 'sa Carte Nationale d\'Identité (CNI)',
  'Passeport':                   'son Passeport',
  'Permis de conduire':          'son Permis de conduire',
  'Carte grise':                 'sa Carte grise',
  'Titre foncier':               'son Titre foncier',
  'Diplôme':                     'son Diplôme',
  'Acte de naissance':           'son Acte de naissance',
  'Carte consulaire':            'sa Carte consulaire',
};

function docArticle(docType: string): string {
  return DOC_ARTICLES[docType] || `le document intitulé "${docType}"`;
}

// ─── Service principal ────────────────────────────────────────────────────────
export class PdfService {

  async generateDeclarationPdf(declaration: any, res: Response): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          margin: 0,
          size: 'A4',
          info: {
            Title: 'Attestation de Déclaration de Perte – DocMaster',
            Author: 'DocMaster – Plateforme officielle de gestion documentaire',
            Subject: 'Déclaration de perte de document',
            Keywords: 'déclaration, perte, document, Cameroun, DocMaster',
          },
        });

        doc.pipe(res);

        // ── Dimensions A4 ──
        const PW = 595.28;  // page width
        const PH = 841.89;  // page height
        const ML = 42;      // margin left
        const MR = 42;      // margin right
        const CW = PW - ML - MR;  // content width = 511.28

        // ── Données de base ──
        const docTypeName  = val(declaration.docTypeInfo?.nom || declaration.doc_type, 'Document');
        const ref          = val(declaration.identifiant_doc_dm || declaration.id?.substring(0, 8), 'N/A');
        const isLost       = declaration.declaration_type !== 'FOUND';
        const declTypeLabel = isLost ? 'PERTE' : 'DÉCOUVERTE';
        const ownerName    = val(declaration.owner_name);
        const today        = new Date();
        const todayLong    = today.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
        const status       = declaration.status || 'PENDING';
        const statusLabel  = STATUS_FR[status] || status;
        const statusColor  = STATUS_COLOR[status] || C.gray;

        // ─────────────────────────────────────────────────────────────────────
        // BANDE SUPÉRIEURE — DRAPEAU CAMEROUNAIS (Vert | Rouge | Jaune)
        // ─────────────────────────────────────────────────────────────────────
        const flagH = 5;
        const bandW = PW / 3;
        doc.rect(0, 0, bandW, flagH).fill(C.green);
        doc.rect(bandW, 0, bandW, flagH).fill(C.red);
        doc.rect(bandW * 2, 0, bandW, flagH).fill(C.yellow);

        // ─────────────────────────────────────────────────────────────────────
        // EN-TÊTE OFFICIEL BILINGUE
        // (Structure identique au formulaire DGSN officiel)
        // ─────────────────────────────────────────────────────────────────────
        let y = flagH + 10;

        // ── Bloc français (gauche) ──
        doc.font('Helvetica-Bold').fontSize(7).fillColor(C.green)
          .text('REPUBLIQUE DU CAMEROUN', ML, y, { width: 200, align: 'center' });
        doc.font('Helvetica').fontSize(6).fillColor(C.darkGray)
          .text('Paix – Travail – Patrie', ML, y + 8, { width: 200, align: 'center' });
        doc.font('Helvetica').fontSize(5.5).fillColor(C.darkGray)
          .text('————————————', ML, y + 15, { width: 200, align: 'center' });
        doc.font('Helvetica-Bold').fontSize(6).fillColor(C.darkGray)
          .text('PRESIDENCE DE LA REPUBLIQUE', ML, y + 22, { width: 200, align: 'center' });
        doc.font('Helvetica').fontSize(5.5).fillColor(C.darkGray)
          .text('————————————', ML, y + 29, { width: 200, align: 'center' });
        doc.font('Helvetica-Bold').fontSize(6).fillColor(C.darkGray)
          .text('DELEGATION GENERALE A LA SURETE NATIONALE', ML, y + 36, { width: 200, align: 'center' });
        doc.font('Helvetica').fontSize(5.5).fillColor(C.darkGray)
          .text('————————————', ML, y + 43, { width: 200, align: 'center' });

        // ── Étoile centrale stylisée ──
        const cx = PW / 2;
        const cy = y + 26;
        doc.save();
        doc.circle(cx, cy, 18).fill(C.greenLight).stroke();
        doc.circle(cx, cy, 18).lineWidth(1.5).strokeColor(C.green).stroke();
        doc.font('Helvetica-Bold').fontSize(14).fillColor(C.green)
          .text('★', cx - 7, cy - 8);
        doc.restore();

        // Logo / nom plateforme sous l'étoile
        doc.font('Helvetica-Bold').fontSize(8).fillColor(C.green)
          .text('DocMaster', cx - 25, cy + 12, { width: 50, align: 'center' });

        // ── Bloc anglais (droite) ──
        const rx = PW - ML - 200;
        doc.font('Helvetica-Bold').fontSize(7).fillColor(C.green)
          .text('REPUBLIC OF CAMEROON', rx, y, { width: 200, align: 'center' });
        doc.font('Helvetica').fontSize(6).fillColor(C.darkGray)
          .text('Peace – Work – Fatherland', rx, y + 8, { width: 200, align: 'center' });
        doc.font('Helvetica').fontSize(5.5).fillColor(C.darkGray)
          .text('————————————', rx, y + 15, { width: 200, align: 'center' });
        doc.font('Helvetica-Bold').fontSize(6).fillColor(C.darkGray)
          .text('PRESIDENCY OF THE REPUBLIC', rx, y + 22, { width: 200, align: 'center' });
        doc.font('Helvetica').fontSize(5.5).fillColor(C.darkGray)
          .text('————————————', rx, y + 29, { width: 200, align: 'center' });
        doc.font('Helvetica-Bold').fontSize(6).fillColor(C.darkGray)
          .text('GENERAL DELEGATION FOR NATIONAL SECURITY', rx, y + 36, { width: 200, align: 'center' });
        doc.font('Helvetica').fontSize(5.5).fillColor(C.darkGray)
          .text('————————————', rx, y + 43, { width: 200, align: 'center' });

        y += 58;

        // ── Ligne de séparation dorée ──
        doc.moveTo(ML, y).lineTo(PW - MR, y).lineWidth(1).strokeColor(C.gold).stroke();
        y += 2;
        doc.moveTo(ML, y).lineTo(PW - MR, y).lineWidth(0.3).strokeColor(C.gold).stroke();
        y += 5;

        // ── Numéro de référence et unité (bloc de droite, style officiel) ──
        doc.roundedRect(ML, y, CW, 22, 3)
          .fill(C.greenLight).strokeColor(C.green).lineWidth(0.5).stroke();

        doc.font('Helvetica').fontSize(6).fillColor(C.gray)
          .text('N° Réf :', ML + 8, y + 3);
        doc.font('Helvetica-Bold').fontSize(8).fillColor(C.green)
          .text(ref, ML + 8, y + 11);

        doc.font('Helvetica').fontSize(6).fillColor(C.gray)
          .text('Unité / Service :', ML + 180, y + 3);
        doc.font('Helvetica-Bold').fontSize(6.5).fillColor(C.darkGray)
          .text('DocMaster — Plateforme Numérique de Gestion Documentaire', ML + 180, y + 11, { width: 200 });

        doc.font('Helvetica').fontSize(6).fillColor(C.gray)
          .text('Fait à :', PW - MR - 140, y + 3);
        doc.font('Helvetica-Bold').fontSize(6.5).fillColor(C.darkGray)
          .text(`Yaoundé, le ${todayLong}`, PW - MR - 140, y + 11, { width: 135, align: 'right' });

        y += 28;

        // ─────────────────────────────────────────────────────────────────────
        // TITRE PRINCIPAL — BILINGUE
        // ─────────────────────────────────────────────────────────────────────
        doc.roundedRect(ML, y, CW, 30, 4).fill(C.green);
        doc.font('Helvetica-Bold').fontSize(10).fillColor(C.white)
          .text(`ATTESTATION DE DÉCLARATION DE ${declTypeLabel}`, ML, y + 3, { width: CW, align: 'center' });
        doc.font('Helvetica').fontSize(7).fillColor('#A7C4B0')
          .text(`DECLARATION OF ${isLost ? 'LOSS' : 'FOUND ITEM'}`, ML, y + 16, { width: CW, align: 'center' });
        y += 36;

        // ── Sous-titre légal ──
        doc.font('Helvetica-Oblique').fontSize(6.5).fillColor(C.lightGray)
          .text(
            'Conformément à la Loi N° 2010/012 du 21 décembre 2010 relative à la sécurité intérieure — Art. 162 du Code Pénal Camerounais',
            ML, y, { width: CW, align: 'center' }
          );
        y += 11;

        // ── Filet mince ──
        doc.moveTo(ML, y).lineTo(PW - MR, y).lineWidth(0.4).strokeColor(C.border).stroke();
        y += 6;

        // ─────────────────────────────────────────────────────────────────────
        // PRÉAMBULE OFFICIEL
        // (Fidèle au formulaire DGSN : "Nous ... attestons que s'est présenté(e)")
        // ─────────────────────────────────────────────────────────────────────
        const article = docArticle(docTypeName);
        const preambleText = isLost
          ? `Nous, soussignés, DocMaster, Plateforme Numérique agréée de gestion et de recherche de documents perdus, auxiliaire des services de la Sûreté Nationale, attestons que s'est présenté(e) devant notre système, ce jour :\n\n${ownerName.toUpperCase()}\n\nQui nous déclare avoir égaré ou perdu ${article}${declaration.document_number ? `, portant le numéro ${declaration.document_number},` : ''} dans les circonstances décrites ci-après.`
          : `Nous, soussignés, DocMaster, Plateforme Numérique agréée de gestion et de recherche de documents perdus, attestons que s'est présenté(e) devant notre système, ce jour :\n\n${ownerName.toUpperCase()}\n\nQui nous déclare avoir trouvé ${article}${declaration.document_number ? `, portant le numéro ${declaration.document_number},` : ''} et en sollicite la restitution au propriétaire légitime.`;

        doc.roundedRect(ML, y, CW, 70, 4)
          .fill(C.cream).strokeColor(C.border).lineWidth(0.5).stroke();

        // Filet vert à gauche (style "citation officielle")
        doc.rect(ML, y, 4, 70).fill(C.green);

        doc.font('Helvetica').fontSize(8).fillColor(C.darkGray)
          .text(preambleText, ML + 12, y + 6, {
            width: CW - 20,
            align: 'justify',
            lineGap: 2,
          });

        y += 76;

        // ─────────────────────────────────────────────────────────────────────
        // SECTION I — IDENTITÉ DU DÉCLARANT
        // ─────────────────────────────────────────────────────────────────────
        y = drawSectionTitle(doc, 'I', 'IDENTITÉ DU DÉCLARANT', 'DECLARANT IDENTITY', ML, y, CW, C);
        y += 4;

        // ── Tableau identité — 2 colonnes ──
        const colW2 = (CW - 8) / 2;

        // Ligne 1 : Nom & Prénoms | CNI du déclarant
        y = drawFieldRow(doc, ML, y, CW, C, [
          { label: 'Nom & Prénoms / Full Name', value: ownerName },
          { label: 'N° CNI / ID Card No.', value: val(declaration.cni_declarant) },
        ]);
        // Ligne 2 : Date de naissance | Lieu de naissance
        y = drawFieldRow(doc, ML, y, CW, C, [
          { label: 'Date de naissance / Date of Birth', value: fmtDateShort(declaration.date_naissance_declarant) },
          { label: 'Lieu de naissance / Place of Birth', value: val(declaration.lieu_naissance_declarant) },
        ]);
        // Ligne 3 : Filiation (père | mère) — comme le formulaire DGSN
        y = drawFieldRow(doc, ML, y, CW, C, [
          { label: 'Fils/Fille de (Père) / Father\'s Name', value: val(declaration.nom_pere) },
          { label: 'et de (Mère) / Mother\'s Name', value: val(declaration.nom_mere) },
        ]);
        // Ligne 4 : Nationalité | Profession
        y = drawFieldRow(doc, ML, y, CW, C, [
          { label: 'Nationalité / Nationality', value: val(declaration.nationalite, 'Camerounaise') },
          { label: 'Profession / Occupation', value: val(declaration.profession) },
        ]);
        // Ligne 5 : Domicile | Téléphone
        y = drawFieldRow(doc, ML, y, CW, C, [
          { label: 'Domicile / Address', value: `${val(declaration.ville)}, ${val(declaration.region)} — ${val(declaration.pays, 'Cameroun')}` },
          { label: 'Téléphone / Phone', value: val(declaration.telephone_contact) },
        ]);
        // Ligne 6 : Email
        y = drawFieldRow(doc, ML, y, CW, C, [
          { label: 'Adresse email / Email', value: val(declaration.email_contact) },
          { label: 'Quartier / Quarter', value: val(declaration.quartier) },
        ]);

        y += 4;

        // ─────────────────────────────────────────────────────────────────────
        // SECTION II — DESCRIPTION DU DOCUMENT
        // ─────────────────────────────────────────────────────────────────────
        y = drawSectionTitle(doc, 'II', 'DESCRIPTION DU DOCUMENT PERDU', 'DESCRIPTION OF THE LOST DOCUMENT', ML, y, CW, C);
        y += 4;

        y = drawFieldRow(doc, ML, y, CW, C, [
          { label: 'Type de document / Document Type', value: docTypeName },
          { label: 'Numéro / Reference No.', value: val(declaration.document_number) },
        ]);

        if (declaration.date_expiration) {
          y = drawFieldRow(doc, ML, y, CW, C, [
            { label: 'Date d\'expiration / Expiry Date', value: fmtDateShort(declaration.date_expiration) },
            { label: 'État physique / Physical Condition', value: val(declaration.etat_physique) },
          ]);
        } else {
          y = drawFieldRow(doc, ML, y, CW, C, [
            { label: 'État physique / Physical Condition', value: val(declaration.etat_physique) },
            { label: 'Autorité émettrice / Issuing Authority', value: val(declaration.autorite_emettrice) },
          ]);
        }

        y += 4;

        // ─────────────────────────────────────────────────────────────────────
        // SECTION III — CIRCONSTANCES DE LA PERTE / DÉCOUVERTE
        // ─────────────────────────────────────────────────────────────────────
        const sectionIIITitle = isLost
          ? 'CIRCONSTANCES DE LA PERTE'
          : 'CIRCONSTANCES DE LA DÉCOUVERTE';
        const sectionIIITitleEN = isLost ? 'CIRCUMSTANCES OF LOSS' : 'CIRCUMSTANCES OF DISCOVERY';
        y = drawSectionTitle(doc, 'III', sectionIIITitle, sectionIIITitleEN, ML, y, CW, C);
        y += 4;

        y = drawFieldRow(doc, ML, y, CW, C, [
          { label: isLost ? 'Date de la perte / Date of Loss' : 'Date de découverte / Date Found', value: fmtDateShort(declaration.date_perte) },
          { label: 'Niveau d\'urgence / Urgency Level', value: val(declaration.urgence_niveau, 'Modérée') },
        ]);

        y = drawFieldRow(doc, ML, y, CW, C, [
          { label: 'Ville / City', value: val(declaration.ville) },
          { label: 'Quartier / Quarter', value: val(declaration.quartier) },
        ]);

        // Description / circonstances
        if (declaration.description) {
          const descH = 30;
          doc.roundedRect(ML, y, CW, descH, 3)
            .fill(C.white).strokeColor(C.border).lineWidth(0.5).stroke();
          doc.font('Helvetica-Bold').fontSize(6.5).fillColor(C.lightGray)
            .text('Circonstances / Circumstances', ML + 8, y + 3);
          doc.font('Helvetica-Oblique').fontSize(7.5).fillColor(C.darkGray)
            .text(`« ${declaration.description} »`, ML + 8, y + 13, {
              width: CW - 16, height: 15, ellipsis: true,
            });
          y += descH + 2;
        }

        y += 2;

        // ─────────────────────────────────────────────────────────────────────
        // RÉCOMPENSE (si applicable)
        // ─────────────────────────────────────────────────────────────────────
        if (declaration.recompense_montant && parseFloat(declaration.recompense_montant) > 0) {
          doc.roundedRect(ML, y, CW, 18, 4)
            .fill(C.goldLight).strokeColor(C.gold).lineWidth(1).stroke();
          doc.font('Helvetica-Bold').fontSize(8).fillColor('#92400E')
            .text(
              `🏅  RÉCOMPENSE OFFERTE : ${Number(declaration.recompense_montant).toLocaleString('fr-FR')} FCFA`,
              ML + 10, y + 4,
              { width: CW - 20, align: 'center' }
            );
          y += 22;
        }

        // ─────────────────────────────────────────────────────────────────────
        // STATUT DE LA DÉCLARATION
        // ─────────────────────────────────────────────────────────────────────
        y += 2;
        doc.roundedRect(ML, y, CW, 18, 4).fill('#F9FAFB').strokeColor(C.border).lineWidth(0.5).stroke();
        doc.font('Helvetica-Bold').fontSize(6.5).fillColor(C.lightGray)
          .text('STATUT DE LA DÉCLARATION / DECLARATION STATUS', ML + 10, y + 3);
        doc.roundedRect(ML + 10, y + 10, 140, 5, 2).fill(statusColor);
        doc.font('Helvetica-Bold').fontSize(5.5).fillColor(C.white)
          .text(statusLabel.toUpperCase(), ML + 10, y + 12, { width: 140, align: 'center' });
        y += 22;

        // ─────────────────────────────────────────────────────────────────────
        // ATTESTATION LÉGALE FINALE
        // (Reprise exacte du formulaire DGSN officiel)
        // ─────────────────────────────────────────────────────────────────────
        doc.moveTo(ML, y).lineTo(PW - MR, y).lineWidth(0.4).strokeColor(C.border).stroke();
        y += 6;

        const legalText =
          `Le (la) déclarant(e) a été informé(e) des dispositions de l'article 162 du Code Pénal Camerounais punissant quiconque aura sciemment fait usage d'un certificat ou d'une attestation concernant des faits matériels inexacts. L'intéressé(e) est informé(e) des peines encourues en cas de fausses déclarations (Art. 167 C.P. Camerounais).\n\nEn foi de quoi, le présent certificat lui est délivré pour servir et valoir ce que de droit.`;

        doc.roundedRect(ML, y, CW, 44, 4)
          .fill('#F0FDF4').strokeColor(C.green).lineWidth(0.5).stroke();
        doc.rect(ML, y, 4, 44).fill(C.green);
        doc.font('Helvetica').fontSize(7).fillColor(C.darkGray)
          .text(legalText, ML + 12, y + 5, { width: CW - 20, align: 'justify', lineGap: 1 });

        y += 50;

        // ─────────────────────────────────────────────────────────────────────
        // ZONE DE SIGNATURES
        // ─────────────────────────────────────────────────────────────────────
        const sigBoxH = 52;
        doc.roundedRect(ML, y, CW, sigBoxH, 4)
          .fill(C.cream).strokeColor(C.border).lineWidth(0.5).stroke();

        // Signature gauche — Le Déclarant
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.darkGray)
          .text('LE (LA) DÉCLARANT(E)', ML + 20, y + 6, { width: 160, align: 'center' });
        doc.font('Helvetica').fontSize(6).fillColor(C.lightGray)
          .text('(Signature précédée de la mention\n"Lu et approuvé")', ML + 20, y + 16, { width: 160, align: 'center', lineGap: 1 });
        doc.moveTo(ML + 20, y + sigBoxH - 12).lineTo(ML + 180, y + sigBoxH - 12)
          .lineWidth(0.6).strokeColor(C.gold).stroke();
        doc.font('Helvetica').fontSize(6).fillColor(C.lightGray)
          .text(ownerName, ML + 20, y + sigBoxH - 9, { width: 160, align: 'center' });

        // Séparateur vertical
        doc.moveTo(PW / 2, y + 8).lineTo(PW / 2, y + sigBoxH - 8)
          .lineWidth(0.5).strokeColor(C.border).stroke();

        // Signature droite — DocMaster / Commissaire
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.darkGray)
          .text('LE RESPONSABLE ADMINISTRATIF', PW / 2 + 10, y + 6, { width: 220, align: 'center' });
        doc.font('Helvetica').fontSize(6).fillColor(C.lightGray)
          .text('DOCMASTER\nPlateforme agréée de gestion documentaire', PW / 2 + 10, y + 16, { width: 220, align: 'center', lineGap: 1 });

        // Tampon circulaire DocMaster
        const stampCX = PW / 2 + 120;
        const stampCY = y + 30;
        doc.circle(stampCX, stampCY, 13)
          .lineWidth(1.5).strokeColor(C.green).stroke();
        doc.circle(stampCX, stampCY, 10)
          .lineWidth(0.5).strokeColor(C.green).stroke();
        doc.font('Helvetica-Bold').fontSize(4.5).fillColor(C.green)
          .text('DOCMASTER', stampCX - 12, stampCY - 5, { width: 24, align: 'center' });
        doc.font('Helvetica').fontSize(4).fillColor(C.green)
          .text('OFFICIEL', stampCX - 12, stampCY + 1, { width: 24, align: 'center' });
        doc.font('Helvetica').fontSize(3.5).fillColor(C.green)
          .text(todayLong.split(' ').slice(-1)[0], stampCX - 12, stampCY + 6, { width: 24, align: 'center' });

        doc.moveTo(PW / 2 + 10, y + sigBoxH - 12).lineTo(PW - MR - 20, y + sigBoxH - 12)
          .lineWidth(0.6).strokeColor(C.gold).stroke();

        y += sigBoxH + 4;

        // ── Validité (comme le formulaire DGSN) ──
        doc.roundedRect(ML, y, CW, 12, 3).fill(C.greenLight).strokeColor(C.green).lineWidth(0.4).stroke();
        doc.font('Helvetica-Bold').fontSize(6.5).fillColor(C.green)
          .text(`Validité : 3 (trois) mois à compter de la date de délivrance  —  Valide jusqu'au : ${new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`,
            ML + 8, y + 2, { width: CW - 16, align: 'center' });
        y += 14;

        // ─────────────────────────────────────────────────────────────────────
        // PIED DE PAGE
        // ─────────────────────────────────────────────────────────────────────
        // Filets dorés
        doc.moveTo(ML, y).lineTo(PW - MR, y).lineWidth(0.3).strokeColor(C.gold).stroke();
        doc.moveTo(ML, y + 2).lineTo(PW - MR, y + 2).lineWidth(1).strokeColor(C.green).stroke();
        y += 4;

        doc.font('Helvetica-Bold').fontSize(6).fillColor(C.green)
          .text('DocMaster', ML, y, { continued: true })
          .font('Helvetica').fillColor(C.gray)
          .text('  –  Plateforme Numérique Officielle de Recherche et Gestion de Documents Perdus', { continued: false });

        doc.font('Helvetica').fontSize(5.5).fillColor(C.lightGray)
          .text('www.docmaster.cm  |  contact@docmaster.cm  |  +237 000 000 000', ML, y + 8, {
            width: CW, align: 'center',
          });

        doc.font('Helvetica').fontSize(5).fillColor('#D1D5DB')
          .text(
            `Document généré électroniquement — Référence : ${ref} — ${todayLong} — Toute falsification est passible de poursuites judiciaires conformément à l'article 167 du Code Pénal Camerounais.`,
            ML, y + 15, { width: CW, align: 'center', lineGap: 1 }
          );

        // ── Bande inférieure drapeau ──
        doc.rect(0, PH - flagH, bandW, flagH).fill(C.green);
        doc.rect(bandW, PH - flagH, bandW, flagH).fill(C.red);
        doc.rect(bandW * 2, PH - flagH, bandW, flagH).fill(C.yellow);

        // ─────────────────────────────────────────────────────────────────────
        doc.end();
        res.on('finish', () => resolve());
        res.on('error', (err) => reject(err));

      } catch (err) {
        console.error('[PDF Service Error]', err);
        reject(err);
      }
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS D'UI
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Titre de section vert, style officiel avec numéro romain
 */
function drawSectionTitle(
  doc: any,
  num: string,
  titleFR: string,
  titleEN: string,
  x: number, y: number, w: number,
  C: Record<string, string>
): number {
  doc.roundedRect(x, y, w, 16, 3).fill(C.green);
  doc.font('Helvetica-Bold').fontSize(8).fillColor(C.white)
    .text(`SECTION ${num} —  ${titleFR}`, x + 8, y + 4, { continued: true })
    .font('Helvetica').fontSize(6.5).fillColor('#A7C4B0')
    .text(`   /   ${titleEN}`);
  return y + 18;
}

/**
 * Ligne de deux champs côte à côte, fond alterné
 */
interface FieldDef { label: string; value: string; }
function drawFieldRow(
  doc: any,
  x: number, y: number, w: number,
  C: Record<string, string>,
  fields: [FieldDef, FieldDef],
  rowIndex = 0
): number {
  const rowH = 20;
  const halfW = (w - 4) / 2;

  // Fond alternant
  const bg = C.white;
  doc.roundedRect(x, y, halfW, rowH, 2)
    .fill(bg).strokeColor(C.border).lineWidth(0.4).stroke();
  doc.roundedRect(x + halfW + 4, y, halfW, rowH, 2)
    .fill(bg).strokeColor(C.border).lineWidth(0.4).stroke();

  // Contenu champ gauche
  doc.font('Helvetica-Bold').fontSize(6).fillColor(C.lightGray)
    .text(fields[0].label, x + 6, y + 3, { width: halfW - 12 });
  doc.font('Helvetica').fontSize(8).fillColor(C.darkGray)
    .text(fields[0].value, x + 6, y + 11, { width: halfW - 12, ellipsis: true, lineBreak: false });

  // Contenu champ droit
  doc.font('Helvetica-Bold').fontSize(6).fillColor(C.lightGray)
    .text(fields[1].label, x + halfW + 10, y + 3, { width: halfW - 12 });
  doc.font('Helvetica').fontSize(8).fillColor(C.darkGray)
    .text(fields[1].value, x + halfW + 10, y + 11, { width: halfW - 12, ellipsis: true, lineBreak: false });

  return y + rowH + 2;
}