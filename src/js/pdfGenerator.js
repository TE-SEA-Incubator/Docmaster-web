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
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.dataset.jspdfLoader = 'true';
      script.onload = () => resolve(src);
      script.onerror = () => reject(new Error('Echec chargement: ' + src));
      document.head.appendChild(script);
    });
  }

  // ── Chargement local (npm install jspdf) ──────────────────────────────────
  async function ensureJsPdf() {
    if (global.jspdf && global.jspdf.jsPDF) return global.jspdf.jsPDF;

    const existing = document.querySelector('script[data-jspdf-loader="true"]');
    if (existing) {
      await new Promise((resolve) => {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => resolve(), { once: true });
      });
      if (global.jspdf && global.jspdf.jsPDF) return global.jspdf.jsPDF;
    }

    const candidates = [
      '../node_modules/jspdf/dist/jspdf.umd.min.js',
      '/node_modules/jspdf/dist/jspdf.umd.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
    ];

    let loaded = false;
    for (const src of candidates) {
      try {
        await loadScript(src);
        if (global.jspdf && global.jspdf.jsPDF) {
          loaded = true;
          break;
        }
      } catch (_) {
      }
    }

    if (!loaded || !global.jspdf || !global.jspdf.jsPDF)
      throw new Error('jsPDF introuvable. Verifiez le chemin ou la connexion internet.');

    return global.jspdf.jsPDF;
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

  global.generatePdf            = generatePdf;
  global.generateDeclarationPdf = generateDeclarationPdf;

})(window);