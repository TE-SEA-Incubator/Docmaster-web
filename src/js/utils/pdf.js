import { jsPDF } from 'jspdf';

/**
 * Generate a professional PDF for a document with both recto and verso images
 */
export async function generateDocumentPDF(doc) {
  if (!doc) return;

  try {
    const docPdf = new jsPDF();
    
    // Header Branding
    docPdf.setFillColor(245, 166, 75); // Primary DocMaster color
    docPdf.rect(0, 0, 210, 40, 'F');
    
    docPdf.setTextColor(255, 255, 255);
    docPdf.setFont('helvetica', 'bold');
    docPdf.setFontSize(24);
    docPdf.text('DOCMASTER', 105, 20, { align: 'center' });
    docPdf.setFont('helvetica', 'normal');
    docPdf.setFontSize(10);
    docPdf.text('VOTRE PORTEFEUILLE DE DOCUMENTS NUMÉRIQUES', 105, 30, { align: 'center' });

    // Document Details Section
    docPdf.setTextColor(26, 26, 26);
    docPdf.setFontSize(18);
    docPdf.setFont('helvetica', 'bold');
    docPdf.text(doc.type_doc.toUpperCase(), 20, 55);
    
    docPdf.setFontSize(10);
    docPdf.setFont('helvetica', 'normal');
    docPdf.setTextColor(107, 114, 128);
    docPdf.text('NUMÉRO:', 20, 65);
    docPdf.setTextColor(26, 26, 26);
    docPdf.setFont('helvetica', 'bold');
    docPdf.text(doc.numero_doc || 'N/A', 50, 65);

    docPdf.setFont('helvetica', 'normal');
    docPdf.setTextColor(107, 114, 128);
    docPdf.text('TITULAIRE:', 20, 72);
    docPdf.setTextColor(26, 26, 26);
    docPdf.setFont('helvetica', 'bold');
    docPdf.text(doc.nom_sur_doc || 'NON SPÉCIFIÉ', 60, 72);

    docPdf.setFont('helvetica', 'normal');
    docPdf.setTextColor(107, 114, 128);
    docPdf.text('DÉLIVRÉ LE:', 20, 79);
    docPdf.setTextColor(26, 26, 26);
    docPdf.setFont('helvetica', 'bold');
    docPdf.text(doc.date_delivrance ? new Date(doc.date_delivrance).toLocaleDateString('fr-FR') : 'NON SPÉCIFIÉ', 60, 79);

    docPdf.setFont('helvetica', 'normal');
    docPdf.setTextColor(107, 114, 128);
    docPdf.text('EXPIRATION:', 20, 86);
    docPdf.setTextColor(26, 26, 26);
    docPdf.setFont('helvetica', 'bold');
    docPdf.text(doc.date_expiration ? new Date(doc.date_expiration).toLocaleDateString('fr-FR') : 'INDÉFINIE', 60, 86);

    docPdf.setFont('helvetica', 'normal');
    docPdf.setTextColor(107, 114, 128);
    docPdf.text('AUTORITÉ:', 20, 93);
    docPdf.setTextColor(26, 26, 26);
    docPdf.setFont('helvetica', 'bold');
    docPdf.text(doc.nom_autorite || 'NON SPÉCIFIÉ', 60, 93);

    // Image Helper
    const loadImage = (url) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url.startsWith('http') ? url : window.location.origin + '/' + url.replace(/^\//, '');
      });
    };

    let yOffset = 110;
    const imgWidth = 170;
    const imgHeight = 85;
    const centerX = (210 - imgWidth) / 2;

    // Add Recto
    if (doc.photo_recto) {
      try {
        const imgRecto = await loadImage(doc.photo_recto);
        docPdf.setFontSize(9);
        docPdf.setTextColor(150, 150, 150);
        docPdf.setFont('helvetica', 'italic');
        docPdf.text('FACE AVANT (RECTO)', 20, yOffset - 5);
        docPdf.addImage(imgRecto, 'JPEG', centerX, yOffset, imgWidth, imgHeight, undefined, 'FAST');
        yOffset += (imgHeight + 15);
      } catch (e) {
        console.error("Error loading recto image", e);
      }
    }

    // Add Verso
    if (doc.photo_verso) {
      try {
        const imgVerso = await loadImage(doc.photo_verso);
        docPdf.setFontSize(9);
        docPdf.setTextColor(150, 150, 150);
        docPdf.setFont('helvetica', 'italic');
        docPdf.text('FACE ARRIÈRE (VERSO)', 20, yOffset - 5);
        docPdf.addImage(imgVerso, 'JPEG', centerX, yOffset, imgWidth, imgHeight, undefined, 'FAST');
      } catch (e) {
        console.error("Error loading verso image", e);
      }
    }

    // Security Footer on all pages
    const totalPages = docPdf.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      docPdf.setPage(i);
      docPdf.setFontSize(8);
      docPdf.setTextColor(180, 180, 180);
      docPdf.text('Ce document est une copie numérique sécurisée générée par DocMaster le ' + new Date().toLocaleDateString('fr-FR'), 105, 285, { align: 'center' });
    }

    docPdf.save(`docmaster-${doc.type_doc}-${doc.numero_doc || 'export'}.pdf`);
    return true;
  } catch (error) {
    console.error('PDF Generation Error:', error);
    throw error;
  }
}
