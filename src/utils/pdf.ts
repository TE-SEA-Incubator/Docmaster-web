import { jsPDF } from "jspdf";

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
  recompense: string;
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
    const imgW = pageW - margin * 2;
    const imgH = 90;
    const centerX = margin;

    let yOffset = 75;

    if (doc.photo_recto) {
      try {
        const imgRecto = await loadImage(doc.photo_recto);
        docPdf.addImage(imgRecto, "JPEG", centerX, yOffset, imgW, imgH);
      } catch {
        console.error("Error loading recto image");
      }
    }

    if (doc.photo_verso) {
      yOffset += imgH + 8;
      if (yOffset + imgH > pageH - margin) {
        docPdf.addPage();
        yOffset = margin;
      }
      try {
        const imgVerso = await loadImage(doc.photo_verso);
        docPdf.addImage(imgVerso, "JPEG", centerX, yOffset, imgW, imgH);
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
  let y = 20;

  function header() {
    pdf.setFillColor(30, 58, 47);
    pdf.rect(0, 0, pageW, 50, "F");
    pdf.setFillColor(245, 166, 75);
    pdf.rect(0, 50, pageW, 3, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(22);
    pdf.text("DOCMASTER", 105, 22, { align: "center" });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text("DÉCLARATION DE PERTE DE DOCUMENT", 105, 34, { align: "center" });
  }

  function footer() {
    const pages = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      pdf.setPage(i);
      pdf.setFillColor(30, 58, 47);
      pdf.rect(0, 285, pageW, 12, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.text(`DocMaster — ${data.ref} — Généré le ${data.date}`, 105, 293, { align: "center" });
    }
  }

  function section(title: string) {
    y += 6;
    pdf.setFillColor(245, 166, 75);
    pdf.rect(20, y, 3, 10, "F");
    pdf.setTextColor(30, 58, 47);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.text(title, 27, y + 8);
    y += 14;
  }

  function field(label: string, value: string) {
    pdf.setTextColor(107, 114, 128);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text(label, 25, y);
    pdf.setTextColor(26, 26, 26);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text(value || "—", 70, y);
    y += 7;
  }

  function divider() {
    y += 2;
    pdf.setDrawColor(234, 227, 216);
    pdf.line(20, y, 190, y);
    y += 5;
  }

  header();

  y = 62;
  pdf.setTextColor(107, 114, 128);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text(`Réf: ${data.ref}`, 190, y, { align: "right" });
  y += 4;
  pdf.text(`Date: ${data.date}`, 190, y, { align: "right" });
  y += 10;

  section("Informations du déclarant");
  field("Déclarant", data.pour_soi ? "Pour moi-même" : "Pour une autre personne");
  field("Contact", `${data.telephone}${data.email ? ` / ${data.email}` : ""}`);
  y += 4;

  divider();
  section("Document(s) concerné(s)");

  data.documents.forEach((d, i) => {
    if (i > 0) y += 2;
    pdf.setFillColor(245, 166, 75);
    pdf.setDrawColor(245, 166, 75);
    pdf.roundedRect(22, y - 1, 166, 6, 1, 1, "S");
    pdf.setTextColor(30, 58, 47);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.text(`${i + 1}. ${d.label}`, 26, y + 3);
    y += 9;
    field("Nom sur le document", d.nom_complet);
    field("Numéro", d.numero);
    field("Date de délivrance", d.date_delivrance);
    field("Date d'expiration", d.date_expiration);
    y += 2;
  });

  divider();
  section("Circonstances de la perte");
  field("Date de perte", data.date_perte);
  field("Lieu", data.lieu_perte);
  field("Circonstances", data.circonstances || "Non spécifiées");
  field("Urgence", data.urgence);
  if (data.recompense) field("Récompense", `${data.recompense} FCFA`);

  y += 6;
  divider();

  pdf.setDrawColor(234, 227, 216);
  pdf.line(50, y, 160, y);
  y += 4;
  pdf.setTextColor(107, 114, 128);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text("Signature du déclarant", 105, y, { align: "center" });

  if (y > 260) pdf.addPage();
  y = 270;
  pdf.setFillColor(245, 166, 75);
  pdf.roundedRect(60, y, 90, 16, 3, 3, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text("CERTIFICAT DE DÉCLARATION", 105, y + 11, { align: "center" });
  y += 22;
  pdf.setTextColor(107, 114, 128);
  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(8);
  pdf.text("Document officiel généré par DocMaster. Faire défense de le falsifier.", 105, y, { align: "center" });

  footer();
  pdf.save(`declaration-perte-${data.ref}.pdf`);
}
