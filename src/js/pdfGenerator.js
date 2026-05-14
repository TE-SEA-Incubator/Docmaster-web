(function (global) {

  function getDateStamp() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function sanitizeFileBaseName(name) {
    return String(name || 'document').replace(/\.pdf$/i, '').replace(/[^a-z0-9-_]/gi, '_');
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      // Éviter de charger plusieurs fois le même script
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve(src);
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.dataset.jspdfLoader = 'true';
      script.onload = () => resolve(src);
      script.onerror = () => reject(new Error('Echec chargement: ' + src));
      document.head.appendChild(script);
    });
  }

  // ── Chargement de jsPDF ──────────────────────────────────────────────────
  async function ensureJsPdf() {
    // 1. Vérifier si déjà présent globalement
    if (global.jspdf && global.jspdf.jsPDF) return global.jspdf.jsPDF;
    if (global.jsPDF) return global.jsPDF;
    
    // 2. Tenter de charger depuis le CDN
    try {
      console.log("Chargement de jsPDF depuis CDN...");
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      
      // Laisser un petit délai pour l'initialisation globale
      await new Promise(r => setTimeout(r, 100));
      
      if (global.jspdf && global.jspdf.jsPDF) return global.jspdf.jsPDF;
      if (global.jsPDF) return global.jsPDF;
    } catch (e) {
      console.warn("Échec chargement CDN, tentative de secours...");
    }
    
    // 3. Boucle d'attente finale
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const interval = setInterval(() => {
        const lib = (global.jspdf && global.jspdf.jsPDF) || global.jsPDF;
        if (lib) {
          clearInterval(interval);
          resolve(lib);
          return;
        }
        if (attempts++ > 30) { // 3 secondes
          clearInterval(interval);
          reject(new Error("La bibliothèque jsPDF n'a pas pu être chargée. Vérifiez votre connexion internet."));
        }
      }, 100);
    });
  }

  // ── Generation generique ───────────────────────────────────────────────────
  async function generatePdf(options) {
    const { title = 'Document', content = '', filename = 'document.pdf' } = options || {};
    const jsPDF  = await ensureJsPdf();
    const doc    = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW  = doc.internal.pageSize.getWidth();
    const margin = 15;
    let y = 20;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(String(title), margin, y);

    y += 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);

    const lines = doc.splitTextToSize(String(content), pageW - margin * 2);
    lines.forEach(line => {
      if (y > 285) { doc.addPage(); y = 20; }
      doc.text(line, margin, y);
      y += 6;
    });

    const dateStamp = getDateStamp();
    const baseName = sanitizeFileBaseName(filename);
    doc.save(`${baseName}_${dateStamp}.pdf`);
  }

  // ── Generation de la declaration DocMaster ────────────────────────────────
  async function generateDeclarationPdf(data) {
    const jsPDF = await ensureJsPdf();
    const doc   = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const mg    = 18;
    const colR  = pageW - mg;
    let y       = 0;

    const checkPage = (need = 8) => {
      if (y + need > pageH - 18) { doc.addPage(); y = 20; }
    };

    const drawLine = () => {
      doc.setDrawColor(224, 213, 196);
      doc.setLineWidth(0.3);
      doc.line(mg, y, colR, y);
      y += 6;
    };

    const block = (label, value, indent) => {
      indent = indent || mg;
      checkPage(12);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.text(label.toUpperCase(), indent, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(26, 26, 26);
      var lines = doc.splitTextToSize(String(value || '-'), colR - indent - 2);
      lines.forEach(function(l) { checkPage(6); doc.text(l, indent, y); y += 5.5; });
      y += 2;
    };

    // EN-TETE
    doc.setFillColor(30, 58, 47);
    doc.rect(0, 0, pageW, 36, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text('DocMaster', mg, 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(180, 180, 180);
    doc.text('Declaration de document perdu', mg, 24);

    // Badge reference
    doc.setFillColor(245, 166, 75);
    doc.roundedRect(pageW - mg - 56, 8, 56, 20, 4, 4, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('REFERENCE', pageW - mg - 52, 16);
    doc.setFontSize(11);
    doc.text(String(data.ref || '-'), pageW - mg - 52, 24);

    y = 46;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(107, 114, 128);
    doc.text('Declare le : ' + (data.date || '-'), mg, y);
    doc.text('Perte le : ' + (data.datePerte || '-'), mg + 72, y);
    y += 10;

    drawLine();

    // SECTION DOCUMENTS
    checkPage(14);
    doc.setFillColor(245, 166, 75);
    doc.rect(mg, y - 1, 3, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(26, 26, 26);
    doc.text('DOCUMENTS DECLARES', mg + 6, y + 4);
    y += 12;

    (data.documents || []).forEach(function(docItem, i) {
      checkPage(16);
      doc.setFillColor(242, 235, 217);
      doc.roundedRect(mg, y - 4, colR - mg, 10, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(217, 138, 48);
      doc.text((i + 1) + '. ' + docItem.label, mg + 4, y + 2);
      y += 11;
      (docItem.fields || []).forEach(function(f) {
        if (f.value) block(f.label, f.value, mg + 4);
      });
      y += 2;
    });

    drawLine();

    // SECTION LIEU
    checkPage(14);
    doc.setFillColor(245, 166, 75);
    doc.rect(mg, y - 1, 3, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(26, 26, 26);
    doc.text('LIEU & CIRCONSTANCES', mg + 6, y + 4);
    y += 12;

    block('Lieu de perte', data.lieu);
    if (data.circonstances) block('Circonstances', data.circonstances);

    drawLine();

    // SECTION CONTACT
    checkPage(14);
    doc.setFillColor(245, 166, 75);
    doc.rect(mg, y - 1, 3, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(26, 26, 26);
    doc.text('CONTACT & URGENCE', mg + 6, y + 4);
    y += 12;

    block('Telephone', data.contact && data.contact.phone ? data.contact.phone : '-');
    if (data.contact && data.contact.email) block('E-mail', data.contact.email);
    block("Niveau d'urgence", data.urgence);
    if (data.recompense) block('Recompense proposee', data.recompense + ' FCFA');

    // PIED DE PAGE
    var totalPages = doc.internal.getNumberOfPages();
    for (var p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(156, 163, 175);
      doc.text('DocMaster - Plateforme de declaration de documents perdus', mg, pageH - 8);
      doc.text('Page ' + p + ' / ' + totalPages, pageW - mg - 20, pageH - 8);
      doc.setDrawColor(224, 213, 196);
      doc.setLineWidth(0.3);
      doc.line(mg, pageH - 12, pageW - mg, pageH - 12);
    }

    var safeName = sanitizeFileBaseName(data.ref || 'declaration');
    var dateStamp = getDateStamp();
    doc.save(safeName + '_' + dateStamp + '.pdf');
  }

  /**
   * Génère une déclaration sur l'honneur formelle (PDF)
   */
  async function generateSwornStatementPdf(data) {
    const jsPDF = await ensureJsPdf();
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const mg = 20; // marges
    let y = 25;

    const checkPage = (needed) => {
      if (y + needed > pageH - 25) {
        doc.addPage();
        y = 25;
        return true;
      }
      return false;
    };

    // 1. EN-TÊTE (Coordonnées)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    
    // Coordonnées utilisateur (Gauche)
    doc.text(String(data.user?.name || 'Prénom Nom').toUpperCase(), mg, y); y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(String(data.user?.adresse || 'Adresse complète'), mg, y); y += 5;
    doc.text('Tél : ' + String(data.user?.phone || '...'), mg, y); y += 5;
    doc.text('E-mail : ' + String(data.user?.email || '...'), mg, y);

    // Lieu et Date (Droite)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const dateText = `Fait à ${data.place || '........'}, le ${data.date || getDateStamp()}`;
    const dateWidth = doc.getTextWidth(dateText);
    doc.text(dateText, pageW - mg - dateWidth, 25);

    y = 65;

    // 2. L'OBJET
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(26, 26, 26);
    const titleText = "DÉCLARATION SUR L'HONNEUR DE PERTE";
    const titleW = doc.getTextWidth(titleText);
    doc.text(titleText, (pageW - titleW) / 2, y);
    y += 2;
    doc.setDrawColor(245, 166, 75); // DocMaster Orange
    doc.setLineWidth(1);
    doc.line((pageW - titleW) / 2, y, (pageW + titleW) / 2, y);
    y += 18;

    // 3. LE CORPS DU TEXTE
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(26, 26, 26);

    const introText = `Je soussigné(e), ${data.user?.name || '........'}, né(e) le ${data.user?.birthDate || '........'} à ${data.user?.birthPlace || '........'}, déclare sur l'honneur avoir perdu le(s) document(s) suivant(s) :`;
    const introLines = doc.splitTextToSize(introText, pageW - mg * 2);
    doc.text(introLines, mg, y);
    y += (introLines.length * 6) + 10;

    // Liste des documents
    (data.documents || []).forEach((d) => {
      checkPage(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`• ${d.label}`, mg + 10, y);
      if (d.number) {
        doc.setFont('helvetica', 'normal');
        doc.text(` (Numéro : ${d.number})`, mg + 10 + doc.getTextWidth(`• ${d.label}`), y);
      }
      y += 8;
    });
    y += 6;

    // Circonstances
    checkPage(20);
    doc.setFont('helvetica', 'normal');
    const circText = `Les circonstances de la perte sont les suivantes : ${data.circumstances || 'Lieu et date approximative non précisés'}.`;
    const circLines = doc.splitTextToSize(circText, pageW - mg * 2);
    doc.text(circLines, mg, y);
    y += (circLines.length * 6) + 15;

    const commitText = "Je m'engage à restituer ledit document ou à informer les services compétents si celui-ci venait à être retrouvé.";
    doc.text(commitText, mg, y);
    y += 20;

    // 4. MENTION LÉGALE
    checkPage(25);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const legalText = "Fait pour servir et valoir ce que de droit. Je suis conscient(e) que cette déclaration m'engage et que toute fausse déclaration m'expose à des sanctions pénales (Article 441-7 du Code Pénal).";
    const legalLines = doc.splitTextToSize(legalText, pageW - mg * 2);
    doc.text(legalLines, mg, y);
    y += (legalLines.length * 5) + 25;

    // 5. SIGNATURE
    checkPage(40);
    const sigY = y;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(26, 26, 26);
    doc.text("Signature du déclarant", pageW - mg - 55, sigY);
    
    // Cadre signature
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.rect(pageW - mg - 60, sigY + 5, 55, 30);

    // CACHET DOCMASTER (Positionné à gauche de la signature)
    const sealX = mg + 35;
    const sealY = sigY + 15;
    
    doc.setDrawColor(30, 58, 47); // Vert DocMaster
    doc.setLineWidth(0.8);
    doc.circle(sealX, sealY, 20);
    doc.setLineWidth(0.3);
    doc.circle(sealX, sealY, 18);

    doc.setTextColor(30, 58, 47);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text("CERTIFIÉ", sealX - 8, sealY - 5);
    doc.setFontSize(11);
    doc.text("DocMaster", sealX - 10, sealY + 2);
    doc.setFontSize(6);
    doc.text("SÉCURITÉ & AUTHENTICITÉ", sealX - 15, sealY + 8);
    
    doc.setFontSize(5);
    doc.setFont('helvetica', 'normal');
    doc.text("REF: " + (data.ref || '...'), sealX - 12, sealY + 13);

    // PIED DE PAGE
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('DocMaster - Plateforme de gestion des documents perdus - www.docmaster.net', mg, pageH - 12);
      doc.text('Page ' + p + ' / ' + totalPages, pageW - mg - 18, pageH - 12);
    }

    const safeName = sanitizeFileBaseName(data.ref || 'declaration_perte');
    doc.save(`${safeName}.pdf`);
  }

  global.generatePdf               = generatePdf;
  global.generateDeclarationPdf    = generateDeclarationPdf;
  global.generateSwornStatementPdf = generateSwornStatementPdf;

})(window);