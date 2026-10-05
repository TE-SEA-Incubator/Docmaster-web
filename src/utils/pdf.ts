import { jsPDF, GState } from "jspdf";

export interface DeclarationPDFData {
  ref: string;
  date: string;
  proprietaire: string;
  pour_soi: boolean;
  documents: { label: string; nom_complet: string; numero: string; date_delivrance: string; date_expiration: string }[];
  lieu_perte: string;
  date_perte: string;
  circonstances: string;
  urgence: string;
  telephone: string;
  email: string;
  certifie?: boolean;
  certifie_par?: string | null;
  certifie_le?: string | null;
}

interface DocumentPDFData {
  type_doc: string;
  numero_doc?: string;
  nom_sur_doc?: string;
  date_delivrance?: string;
  date_expiration?: string;
  nom_autorite?: string;
  photo_recto?: string;
  photo_verso?: string;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!url.startsWith("data:")) {
      img.crossOrigin = "Anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = reject;
    if (url.startsWith("data:") || url.startsWith("http")) {
      img.src = url;
    } else {
      img.src = window.location.origin + "/" + url.replace(/^\//, "");
    }
  });
}

function imageToDataUrl(img: HTMLImageElement, quality = 0.92): string {
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return img.src;
  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL("image/jpeg", quality);
}

function fitImageToArea(
  naturalW: number,
  naturalH: number,
  maxW: number,
  maxH: number
): { w: number; h: number } {
  const ratio = naturalW / naturalH;
  if (ratio > maxW / maxH) {
    return { w: maxW, h: maxW / ratio };
  }
  return { w: maxH * ratio, h: maxH };
}

export async function generateDocumentPDF(
  doc: DocumentPDFData,
  isFreePlan = true
): Promise<boolean> {
  if (!doc) return false;

  try {
    const docPdf = new jsPDF();

    const pageW = 210;
    const pageH = 297;
    const margin = 10;
    const maxImgW = pageW - margin * 2;
    const maxImgH = doc.photo_verso ? 100 : 160;

    let yOffset = 75;

    if (doc.photo_recto) {
      try {
        const imgRecto = await loadImage(doc.photo_recto);
        const { w, h } = fitImageToArea(
          imgRecto.naturalWidth,
          imgRecto.naturalHeight,
          maxImgW,
          maxImgH
        );
        const imgX = margin + (maxImgW - w) / 2;
        const dataUrl = imageToDataUrl(imgRecto);
        docPdf.addImage(dataUrl, "JPEG", imgX, yOffset, w, h);
        yOffset += h + 8;
      } catch {
        console.error("Error loading recto image");
      }
    }

    if (doc.photo_verso) {
      try {
        const imgVerso = await loadImage(doc.photo_verso);
        const { w, h } = fitImageToArea(
          imgVerso.naturalWidth,
          imgVerso.naturalHeight,
          maxImgW,
          maxImgH
        );
        const imgX = margin + (maxImgW - w) / 2;
        const dataUrl = imageToDataUrl(imgVerso);
        docPdf.addImage(dataUrl, "JPEG", imgX, yOffset, w, h);
      } catch {
        console.error("Error loading verso image");
      }
    }

    if (isFreePlan) {
      const totalPages = docPdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        docPdf.setPage(i);
        docPdf.setFillColor(30, 58, 47);
        docPdf.rect(0, 0, pageW, 55, "F");
        docPdf.setTextColor(255, 255, 255);
        docPdf.setFont("helvetica", "bold");
        docPdf.setFontSize(22);
        docPdf.text("DOCMASTER", pageW / 2, 25, { align: "center" });
        docPdf.setFont("helvetica", "normal");
        docPdf.setFontSize(9);
        docPdf.text("VOTRE PORTEFEUILLE DE DOCUMENTS NUMÉRIQUES", pageW / 2, 38, {
          align: "center",
        });
        docPdf.setFontSize(7);
        docPdf.text("Version gratuite", pageW / 2, 48, { align: "center" });
      }
    }

    const totalPages = docPdf.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      docPdf.setPage(i);
      docPdf.setFontSize(7);
      docPdf.setTextColor(180, 180, 180);
      docPdf.text(
        `Généré par DocMaster le ${new Date().toLocaleDateString("fr-FR")}`,
        pageW / 2,
        pageH - 5,
        { align: "center" }
      );
    }

    docPdf.save(
      `docmaster-${doc.type_doc}-${doc.numero_doc || "export"}.pdf`
    );
    return true;
  } catch (error) {
    console.error("PDF Generation Error:", error);
    throw error;
  }
}

export function generateDeclarationPDF(data: DeclarationPDFData) {
  const pdf = new jsPDF();

  const pageW = 210;
  const pageH = 297;
  const mL = 20;
  const mR = 20;
  const contentW = pageW - mL - mR;
  const certifie = !!data.certifie;
  const certifiePar = data.certifie_par || "Autorité DocMaster";
  const certifieLe = data.certifie_le || "";

  let y = 0;

  function setY(v: number) {
    y = v;
  }

  function ensureSpace(needed: number) {
    if (y + needed > 265) {
      pdf.addPage();
      y = 28;
    }
  }

  function drawWatermark() {
    pdf.setGState(new GState({ opacity: 0.12 }));
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(72);
    pdf.setTextColor(120, 120, 120);
    pdf.text("CERTIFIÉ", pageW / 2, 150, { align: "center", angle: 35 });
    pdf.setGState(new GState({ opacity: 1 }));
  }

  function footerOnPage(pageIndex: number) {
    pdf.setPage(pageIndex);
    pdf.setDrawColor(180, 180, 180);
    pdf.setLineWidth(0.4);
    pdf.line(mL, pageH - 16, pageW - mR, pageH - 16);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.5);
    pdf.setTextColor(130, 130, 130);
    pdf.text(`Généré électroniquement par DocMaster — Réf: ${data.ref} — ${data.date}`, pageW / 2, pageH - 11, { align: "center" });
    pdf.setFontSize(6);
    pdf.setFont("helvetica", "italic");
    pdf.text("Ce document est une attestation de déclaration. Toute falsification engage la responsabilité de son auteur.", pageW / 2, pageH - 7, { align: "center" });
  }

  function header() {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.setTextColor(20, 20, 20);
    pdf.text("DOCMASTER", mL, 22);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(110, 110, 110);
    pdf.text("PLATEFORME DE GESTION DOCUMENTAIRE", mL, 28);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(90, 90, 90);
    pdf.text(`Réf: ${data.ref}`, pageW - mR, 22, { align: "right" });
    pdf.text(`Date: ${data.date}`, pageW - mR, 28, { align: "right" });

    pdf.setDrawColor(30, 30, 30);
    pdf.setLineWidth(1.1);
    pdf.line(mL, 35, pageW - mR, 35);
    pdf.setLineWidth(0.3);
    pdf.line(mL, 37, pageW - mR, 37);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(15);
    pdf.setTextColor(15, 15, 15);
    pdf.text("DÉCLARATION DE PERTE DE DOCUMENT", pageW / 2, 47, { align: "center" });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(90, 90, 90);
    pdf.text("ATTESTATION OFFICIELLE DE DÉCLARATION", pageW / 2, 53, { align: "center" });
    setY(61);
  }

  function section(title: string) {
    ensureSpace(20);
    y += 2;
    pdf.setFillColor(243, 243, 245);
    pdf.setDrawColor(190, 190, 195);
    pdf.setLineWidth(0.4);
    pdf.rect(mL, y, contentW, 8, "FD");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(20, 20, 20);
    pdf.text(title, mL + 4, y + 5.7);
    y += 10;
  }

  function field(label: string, value: string) {
    ensureSpace(7);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6.5);
    pdf.setTextColor(110, 110, 110);
    pdf.text(label, mL + 2, y);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9.5);
    pdf.setTextColor(20, 20, 20);
    const maxW = contentW - 62;
    const lines = pdf.splitTextToSize(value || "—", maxW);
    pdf.text(lines, mL + 64, y);
    y += 1 + lines.length * 3.9;
  }

  function divider() {
    y += 2;
    pdf.setDrawColor(210, 210, 215);
    pdf.setLineWidth(0.3);
    pdf.line(mL, y, pageW - mR, y);
    y += 3;
  }

  header();

  section("1. INFORMATIONS DU DÉCLARANT");
  field("DÉCLARANT", data.pour_soi ? "Pour moi-même" : "Pour une autre personne");
  field("NOM DU PROPRIÉTAIRE", data.proprietaire);
  field("CONTACT", `${data.telephone || "—"}${data.email ? ` / ${data.email}` : ""}`);
  y += 3;

  divider();
  section("2. DOCUMENT(S) CONCERNÉ(S)");

  data.documents.forEach((d, i) => {
    ensureSpace(30);
    if (i > 0) y += 2;
    pdf.setDrawColor(190, 190, 195);
    pdf.setLineWidth(0.3);
    pdf.setFillColor(250, 250, 250);
    pdf.rect(mL, y, contentW, 7, "FD");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(20, 20, 20);
    pdf.text(`${i + 1}. ${d.label}`, mL + 3, y + 5);
    y += 9;
    field("NOM SUR LE DOCUMENT", d.nom_complet);
    field("NUMÉRO", d.numero);
    field("DATE DE DÉLIVRANCE", d.date_delivrance);
    field("DATE D'EXPIRATION", d.date_expiration);
  });

  divider();
  section("3. CIRCONSTANCES DE LA PERTE");
  field("DATE DE PERTE", data.date_perte);
  field("LIEU", data.lieu_perte);
  field("CIRCONSTANCES", data.circonstances || "Non spécifiées");

  y += 5;

  ensureSpace(58);

  const sigBoxW = (contentW - 14) / 2;
  const sigY = y;
  const sigH = 48;

  pdf.setDrawColor(140, 140, 145);
  pdf.setLineWidth(0.4);
  pdf.rect(mL, sigY, sigBoxW, sigH);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7);
  pdf.setTextColor(60, 60, 60);
  pdf.text("SIGNATURE DU DÉCLARANT", mL + sigBoxW / 2, sigY + 8, { align: "center" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.setTextColor(130, 130, 130);
  pdf.text("Lu et approuvé", mL + sigBoxW / 2, sigY + 13, { align: "center" });
  pdf.setDrawColor(160, 160, 165);
  pdf.line(mL + 14, sigY + 34, mL + sigBoxW - 14, sigY + 34);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(6.5);
  pdf.setTextColor(80, 80, 80);
  pdf.text(data.proprietaire || "", mL + sigBoxW / 2, sigY + 39, { align: "center" });

  const stampX = mL + sigBoxW + 14 + sigBoxW / 2;
  const stampY = sigY + 24;
  pdf.setDrawColor(140, 140, 145);
  pdf.setLineWidth(0.4);
  pdf.rect(mL + sigBoxW + 14, sigY, sigBoxW, sigH);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7);
  pdf.setTextColor(60, 60, 60);
  pdf.text("CACHET DU SERVICE", mL + sigBoxW + 14 + sigBoxW / 2, sigY + 8, { align: "center" });

  if (certifie) {
    pdf.setDrawColor(30, 30, 30);
    pdf.setLineWidth(1.2);
    pdf.circle(stampX, stampY, 16);
    pdf.setLineWidth(0.4);
    pdf.circle(stampX, stampY, 13.5);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(30, 30, 30);
    pdf.text("CERTIFIÉ", stampX, stampY - 1, { align: "center", angle: -12 });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(5.5);
    pdf.text(certifiePar, stampX, stampY + 6, { align: "center", angle: -12, maxWidth: 26 });
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(5.5);
    pdf.text(certifieLe, stampX, stampY + 11, { align: "center", angle: -12 });
  }

  setY(sigY + sigH + 10);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.setTextColor(90, 90, 90);
  pdf.text("Document officiel délivré par DocMaster. Conservez précieusement cette attestation ainsi que la référence indiquée.", pageW / 2, y, { align: "center" });

  const pages = pdf.getNumberOfPages();
  if (certifie) {
    for (let i = 1; i <= pages; i++) {
      pdf.setPage(i);
      drawWatermark();
    }
  }
  for (let i = 1; i <= pages; i++) {
    footerOnPage(i);
  }

  pdf.save(`declaration-perte-${data.ref}.pdf`);
}
