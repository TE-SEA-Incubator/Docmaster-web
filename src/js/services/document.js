/**
 * ═════════════════════════════════════════════════════════════════
 * DOCUMENT.JS - Document Service Layer
 * Handles all document-related API calls and submission logic
 * ═════════════════════════════════════════════════════════════════
 */

import { 
  registerMyDocument, 
  getMyDocuments, 
  deleteDocument,
  shareDocument,
  getDocumentShares,
  revokeShare,
  reportDocumentLost as apiReportLost
} from './api.js';
import { 
  showErrorModal, 
  showSuccessModal, 
  generateDocumentPDF as generatePDFUtil, 
  getFriendlyErrorMessage, 
  validateDocumentFile,
  initDatePickers
} from '../utils/index.js';

// Global initialization
document.addEventListener('DOMContentLoaded', () => {
  initDatePickers();
});

// Attach to window for HTML access
window.deleteDocument = deleteDocument;
window.getMyDocuments = getMyDocuments;
window.registerMyDocument = registerMyDocument;
window.shareDocument = shareDocument;
window.getDocumentShares = getDocumentShares;
window.revokeShare = revokeShare;

/**
 * Render document cards dynamically
 */
export function renderDocuments(documents, totalCount = 0) {
  // Store for access by global functions (viewDoc, etc)
  window.lastFetchedDocuments = documents;

  // Update Stats & Filters in UI
  const totalStatsCount = document.getElementById('statsTotal');
  const actualCount = Math.max(documents.length, totalCount);
  if (totalStatsCount) totalStatsCount.textContent = actualCount;
 
  const verifiedCount = documents.filter(d => d.is_verified).length;
  const verifiedStats = document.getElementById('statsVerified');
  if (verifiedStats) verifiedStats.textContent = verifiedCount;
 
  const pendingCount = documents.filter(d => !d.is_verified).length;
  const pendingStats = document.getElementById('statsPending');
  if (pendingStats) pendingStats.textContent = pendingCount;
 
  const allFilterBtn = document.querySelector('.tab-filter[onclick*="all"]');
  if (allFilterBtn) allFilterBtn.textContent = `Tous (${actualCount})`;

  // Update Dashboard specific stats if they exist
  const dashTotal = document.getElementById('dashboardTotalDocs');
  if (dashTotal) dashTotal.textContent = actualCount;
  const dashVerified = document.getElementById('dashboardVerifiedDocs');
  if (dashVerified) dashVerified.textContent = verifiedCount;
  const dashPending = document.getElementById('dashboardPendingDocs');
  if (dashPending) dashPending.textContent = pendingCount;

  const grid = document.getElementById('docs-grid');
  if (!grid) return;

  // Preserve the "Add new" button
  const addBtn = grid.querySelector('button[onclick="openModal()"]')?.parentElement || grid.querySelector('button[onclick="openModal()"]');
  const addBtnHtml = addBtn ? addBtn.outerHTML : '';
  
  if (documents.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full py-12 text-center">
        <div class="w-16 h-16 bg-bgMain rounded-full flex items-center justify-center mx-auto mb-4">
          <i class="fa-solid fa-folder-open text-textMuted text-xl"></i>
        </div>
        <p class="text-textMuted font-medium">Aucun document enregistré pour le moment.</p>
      </div>
      ${addBtnHtml}
    `;
    return;
  }

  const typeLabels = {
    cni: 'Carte ID',
    passport: 'PASSEPORT',
    permis: 'PERMIS',
    diplome: 'DIPLÔME',
    naissance: 'ÉTAT CIVIL',
    autre: 'DOCUMENT'
  };

  const typeIcons = {
    cni: 'fa-id-card',
    passport: 'fa-passport',
    permis: 'fa-car',
    diplome: 'fa-graduation-cap',
    naissance: 'fa-baby',
    autre: 'fa-file'
  };

  grid.innerHTML = documents.map(doc => {
    const isLost = doc.is_lost;

    return `
    <div class="doc-card${isLost ? ' is-lost' : ''}" data-cat="${doc.type_doc}">

      <!-- ── Thumbnail ── -->
      <div class="card-thumb relative overflow-hidden group">
        ${doc.photo_recto
          ? `<img
               src="${doc.photo_recto.startsWith('http') ? doc.photo_recto : '/' + doc.photo_recto.replace(/^\//, '')}"
               class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
               alt="${doc.type_doc}">`
          : `<div class="absolute inset-0 bg-slate-100 flex items-center justify-center">
               <i class="fa-solid ${typeIcons[doc.type_doc] || 'fa-file'} text-4xl text-slate-300"></i>
             </div>`
        }
        <!-- Subtle shadow for text readability -->
        <div class="absolute inset-x-0 bottom-0 h-1/2 bg-black/20"></div>

        <!-- Status badge -->
        <div class="absolute top-2.5 right-2.5">
          ${isLost
            ? `<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600 flex items-center gap-1">
                 <i class="fa-solid fa-triangle-exclamation text-[8px]"></i> Perdu
               </span>`
            : `<span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${doc.is_verified ? 'badge-verified' : 'badge-pending'}">
                 ${doc.is_verified ? 'Vérifié' : 'En attente'}
               </span>`
          }
        </div>

        <!-- Name overlay -->
        <div class="absolute bottom-2.5 left-3 right-3">
          <span class="text-white text-[11px] font-bold tracking-wide uppercase drop-shadow-md truncate block">
            ${doc.nom_sur_doc || typeLabels[doc.type_doc] || 'DOCUMENT'}
          </span>
        </div>
      </div>

      <!-- ── Card body ── -->
      <div class="p-4">

        <!-- Title + actions -->
        <div class="flex items-start justify-between gap-2 mb-2">
          <div class="min-w-0">
            <div class="text-[15px] font-extrabold text-textMain leading-tight mb-0.5 truncate">
              ${doc.nom_sur_doc || 'Sans nom'}
            </div>
            <div class="text-[12px] text-textMuted flex items-center gap-1.5 flex-wrap">
              <span class="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-500 uppercase">
                ${typeLabels[doc.type_doc] || 'DOC'}
              </span>
              N° ${doc.numero_doc || '---'}
            </div>
          </div>
          <div class="flex gap-1 flex-shrink-0">
            <button
              onclick="openShareModal('${doc.id}')"
              class="w-7 h-7 rounded-[7px] bg-bgMain border border-borderMain flex items-center justify-center hover:border-primary hover:text-primary transition-colors text-textMuted"
              title="Partager">
              <i class="fa-solid fa-share-nodes text-[10px]"></i>
            </button>
            <button
              onclick="viewDoc('${doc.id}')"
              class="w-7 h-7 rounded-[7px] bg-bgMain border border-borderMain flex items-center justify-center hover:border-primary hover:text-primary transition-colors text-textMuted"
              title="Voir">
              <i class="fa-solid fa-eye text-[10px]"></i>
            </button>
            <button
              onclick="openDeleteModal('${doc.id}')"
              class="w-7 h-7 rounded-[7px] bg-bgMain border border-borderMain flex items-center justify-center hover:border-red-300 hover:text-red-500 transition-colors text-textMuted"
              title="Supprimer">
              <i class="fa-solid fa-trash text-[10px]"></i>
            </button>
          </div>
        </div>

        <!-- Meta row -->
        <div class="flex items-center gap-3 text-[11.5px] text-textMuted mb-3">
          <span class="flex items-center gap-1">
            <i class="fa-regular fa-calendar text-[10px]"></i>
            ${doc.date_expiration
              ? 'Expire le ' + new Date(doc.date_expiration).toLocaleDateString('fr-FR')
              : 'Pas d\'expiration'}
          </span>
          <span class="flex items-center gap-1 ${doc.is_protected ? 'text-green-mid' : 'text-amber-500'} font-semibold">
            <i class="fa-solid ${doc.is_protected ? 'fa-shield-check' : 'fa-triangle-exclamation'} text-[10px]"></i>
            ${doc.is_protected ? 'Sécurisé' : 'Non protégé'}
          </span>
        </div>

        <!-- "Déclarer perdu" — subtle ghost button, hidden unless hovered or already lost -->
        ${isLost
          ? `<div class="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-[11px] font-bold text-red-600">
               <i class="fa-solid fa-triangle-exclamation"></i> Déclaré comme perdu
             </div>`
          : `<button
               onclick="confirmLost('${doc.id}', this)"
               class="lost-btn w-full py-2 rounded-xl text-[11px] font-semibold border border-dashed border-borderMain text-textMuted
                      hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center gap-1.5 active:scale-95">
               <i class="fa-solid fa-triangle-exclamation text-[10px]"></i> Déclarer comme perdu
             </button>`
        }

      </div>
    </div>
  `}).join('') + addBtnHtml;
}

/**
 * Initialize document list with loader
 */
export async function initDocumentList() {
  const grid = document.getElementById('docs-grid');
  const hasStats = !!(document.getElementById('statsTotal') || document.getElementById('dashboardTotalDocs'));

  if (!grid && !hasStats) return;

  // Show skeleton loader — use aspect-ratio padding trick to match card-thumb CSS
  const skeletons = Array(3).fill(0).map(() => `
    <div class="doc-card animate-pulse">
      <div style="aspect-ratio:16/9" class="w-full bg-slate-200"></div>
      <div class="p-4 space-y-3">
        <div class="h-4 bg-slate-200 rounded w-3/4"></div>
        <div class="h-3 bg-slate-200 rounded w-1/2"></div>
        <div class="h-8 bg-slate-100 rounded-xl"></div>
      </div>
    </div>
  `).join('');
  
  // Keep the "Add new" button if it exists
  const addBtn = grid ? (grid.querySelector('button[onclick="openModal()"]')?.parentElement || grid.querySelector('button[onclick="openModal()"]')) : null;
  const addBtnHtml = addBtn ? addBtn.outerHTML : '';
  
  if (grid) grid.innerHTML = skeletons + addBtnHtml;

  const result = await getMyDocuments();
  
  if (result.success) {
    renderDocuments(result.data, result.count);
  } else if (grid) {
    grid.innerHTML = `
      <div class="col-span-full py-8 text-center text-red-500">
        <p>${result.message}</p>
        <button onclick="initDocumentList()" class="mt-2 text-sm font-bold underline">Réessayer</button>
      </div>
      ${addBtnHtml}
    `;
  }
}

// Auto-init on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDocumentList);
} else {
  initDocumentList();
}

window.initDocumentList = initDocumentList;



/**
 * UI Logic for Document Submission (Migrated from Mesdocument.html)
 */
export async function submitDocumentForm() {
  if (!document.getElementById('consent').checked) {
    showErrorModal('Validation', 'Veuillez accepter les conditions pour continuer.');
    return;
  }

  const submitBtn = document.getElementById('submit-btn');
  const progressWrap = document.getElementById('upload-progress-wrap');
  const progressBar = document.getElementById('upload-bar');
  const progressPct = document.getElementById('progress-pct');

  const fileRectoInput = document.getElementById('file-recto')?.files[0];
  const fileVersoInput = document.getElementById('file-verso')?.files[0];
  
  // Use captured blobs if available, otherwise use file inputs
  const fileRecto = window.capturedBlobs?.recto || fileRectoInput;
  const fileVerso = window.capturedBlobs?.verso || fileVersoInput;

  // Client-side Validation
  const errorRecto = validateDocumentFile(fileRecto);
  if (errorRecto) return showErrorModal('Fichier Recto', errorRecto);

  const errorVerso = validateDocumentFile(fileVerso);
  if (errorVerso) return showErrorModal('Fichier Verso', errorVerso);

  const formData = new FormData();
  formData.append('type_doc', window.selectedType || '');
  formData.append('nom_sur_doc', document.getElementById('doc-name').value);
  formData.append('numero_doc', document.getElementById('doc-number').value);
  formData.append('date_delivrance', document.getElementById('doc-issued').value);
  formData.append('date_expiration', document.getElementById('doc-expiry').value);
  formData.append('nom_autorite', document.getElementById('doc-authority').value);
  formData.append('notes', document.getElementById('doc-notes').value);

  if (fileRecto) {
    // If it's a blob from camera, we should give it a filename
    if (fileRecto instanceof Blob && !(fileRecto instanceof File)) {
      formData.append('photo_recto', fileRecto, 'recto.jpg');
    } else {
      formData.append('photo_recto', fileRecto);
    }
  }
  
  if (fileVerso) {
    if (fileVerso instanceof Blob && !(fileVerso instanceof File)) {
      formData.append('photo_verso', fileVerso, 'verso.jpg');
    } else {
      formData.append('photo_verso', fileVerso);
    }
  }

  // UI States
  progressWrap.classList.remove('hidden');
  submitBtn.disabled = true;
  const originalHtml = submitBtn.innerHTML;
  submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-[13px]"></i> Envoi en cours…';

  let iv;
  try {
    // Simulated progress for UI feel
    let p = 0;
    iv = setInterval(() => {
      p += Math.random() * 15;
      if (p >= 90) {
        p = 90;
        clearInterval(iv);
      }
      progressBar.style.width = p + '%';
      progressPct.textContent = Math.round(p) + '%';
    }, 200);

    const result = await registerMyDocument(formData);

    clearInterval(iv);
    progressBar.style.width = '100%';
    progressPct.textContent = '100%';

    if (result.success) {
      setTimeout(() => {
        document.getElementById('step-3').classList.add('hidden');
        document.getElementById('step-success').classList.remove('hidden');
        
        // Finalize UI state
        ['dot-1', 'dot-2', 'dot-3'].forEach(id => {
          const d = document.getElementById(id);
          d.className = 'step-dot done';
          d.innerHTML = '<i class="fa-solid fa-check text-[10px]"></i>';
        });
        document.getElementById('line-1').classList.add('done');
        document.getElementById('line-2').classList.add('done');
        
        // Refresh the documents list to show the new document
        initDocumentList();
      }, 500);
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    if (iv) clearInterval(iv);
    console.error('Submission Error:', error);
    
    const msg = getFriendlyErrorMessage(error, error.message);
    showErrorModal('Échec de l\'enregistrement', msg);
    
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalHtml;
    progressWrap.classList.add('hidden');
  }
}

// Attach to window for HTML access
window.submitDocument = submitDocumentForm;

/**
 * Navigate between form steps
 */
export function goStep(n) {
  ['step-1', 'step-2', 'step-3'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });
  
  const targetStep = document.getElementById('step-' + n);
  if (targetStep) targetStep.classList.remove('hidden');
  
  const stepNum = document.getElementById('step-num');
  if (stepNum) stepNum.textContent = n;

  // update indicators
  for (let i = 1; i <= 3; i++) {
    const d = document.getElementById('dot-' + i);
    if (!d) continue;
    
    if (i < n) { 
      d.className = 'step-dot done'; 
      d.innerHTML = '<i class="fa-solid fa-check text-[10px]"></i>'; 
    }
    else if (i === n) { 
      d.className = 'step-dot active'; 
      d.textContent = i; 
    }
    else { 
      d.className = 'step-dot pending'; 
      d.textContent = i; 
    }
  }
  
  for (let i = 1; i <= 2; i++) {
    const line = document.getElementById('line-' + i);
    if (line) line.classList.toggle('done', i < n);
  }

  if (n === 3) fillRecap();
}

/**
 * Fill the confirmation recap
 */
export function fillRecap() {
  const typeLabels = { 
    cni: 'CNI', 
    passport: 'Passeport', 
    permis: 'Permis de conduire', 
    diplome: 'Diplôme', 
    naissance: 'Acte de naissance', 
    autre: 'Autre document' 
  };
  
  const fileRecto = document.getElementById('file-recto');
  const fileVerso = document.getElementById('file-verso');
  const fileCount = (fileRecto?.files?.length || 0) + (fileVerso?.files?.length || 0);
  
  const recapName = document.getElementById('recap-name');
  const recapType = document.getElementById('recap-type');
  const recapNumber = document.getElementById('recap-number');
  const recapExpiry = document.getElementById('recap-expiry');
  const recapFiles = document.getElementById('recap-files');
  
  if (recapName) recapName.textContent = document.getElementById('doc-name')?.value || '—';
  if (recapType) recapType.textContent = typeLabels[window.selectedType] || '—';
  if (recapNumber) recapNumber.textContent = document.getElementById('doc-number')?.value || '—';
  
  const expiry = document.getElementById('doc-expiry')?.value;
  if (recapExpiry) {
    recapExpiry.textContent = expiry ? new Date(expiry).toLocaleDateString('fr-FR') : 'Aucune';
  }
  
  if (recapFiles) recapFiles.textContent = fileCount + ' fichier(s)';
}

window.goStep = goStep;
window.fillRecap = fillRecap;

/**
 * Modal Management
 */
export function openModal() {
  initDatePickers();
  resetModal();
  const modal = document.getElementById('add-modal');
  if (modal) modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

export function closeModal() {
  const modal = document.getElementById('add-modal');
  if (modal) modal.classList.add('hidden');
  document.body.style.overflow = '';
}

export function resetModal() {
  window.currentStep = 1; 
  window.selectedType = null; 
  window.fileCount = 0;
  
  ['step-1', 'step-2', 'step-3', 'step-success'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });
  
  const step1 = document.getElementById('step-1');
  if (step1) step1.classList.remove('hidden');
  
  document.querySelectorAll('.doc-type-btn').forEach(b => b.classList.remove('selected'));
  
  const btn1 = document.getElementById('btn-step1');
  if (btn1) btn1.disabled = true;
  
  const stepNum = document.getElementById('step-num');
  if (stepNum) stepNum.textContent = '1';

  ['dot-1', 'dot-2', 'dot-3'].forEach((id, i) => {
    const d = document.getElementById(id);
    if (d) {
      d.className = 'step-dot ' + (i === 0 ? 'active' : 'pending');
      d.textContent = i + 1;
    }
  });

  ['line-1', 'line-2'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('done');
  });

  // reset camera captures
  if (window.capturedBlobs) {
    window.capturedBlobs = { recto: null, verso: null };
  }

  ['preview-recto', 'preview-verso'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });

  ['doc-issued', 'doc-expiry'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      if (el._flatpickr) el._flatpickr.clear();
      else el.value = '';
    }
  });
  ['placeholder-recto', 'placeholder-verso'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
  });
  
  const inputs = ['doc-name', 'doc-number', 'doc-issued', 'doc-expiry', 'doc-authority', 'doc-notes', 'file-recto', 'file-verso', 'consent'];
  inputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      if (el.type === 'checkbox') el.checked = false;
      else el.value = '';
    }
  });
  
  const progressWrap = document.getElementById('upload-progress-wrap');
  if (progressWrap) progressWrap.classList.add('hidden');
  
  const submitBtn = document.getElementById('submit-btn');
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fa-solid fa-shield-halved text-[13px]"></i> Enregistrer et sécuriser';
  }
}

window.openModal = openModal;
window.closeModal = closeModal;
window.resetModal = resetModal;
window.initDocumentList = initDocumentList;

// Auto-initialize if on the right page
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('docs-grid') || document.getElementById('dashboardTotalDocs')) {
    initDocumentList();
  }
});

/**
 * ────────────────────────────────────────────────────────────────
 * SHARING UI LOGIC
 * ────────────────────────────────────────────────────────────────
 */

export async function openShareModal(docId) {
  const doc = window.lastFetchedDocuments?.find(d => d.id === docId);
  if (!doc) return;

  const modal = document.getElementById('share-modal');
  if (!modal) return;

  const title = modal.querySelector('#share-doc-title');
  if (title) title.textContent = doc.type_doc + ' - ' + doc.numero_doc;

  const submitBtn = modal.querySelector('#generate-link-btn');
  if (submitBtn) {
    submitBtn.onclick = () => generateShareLink(docId);
  }

  const downloadBtn = modal.querySelector('#download-doc-btn');
  if (downloadBtn) {
    downloadBtn.onclick = () => generateDocumentPDF(docId);
  }

  const linkContainer = modal.querySelector('#share-link-container');
  if (linkContainer) linkContainer.classList.add('hidden');

  modal.classList.remove('hidden');
}

async function generateShareLink(docId) {
  const btn = document.getElementById('generate-link-btn');
  const daysSelect = document.getElementById('share-expiry');
  const daysValid = daysSelect ? parseInt(daysSelect.value) : null;

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Génération...';

  const result = await shareDocument(docId, daysValid === 0 ? null : daysValid);
  
  btn.disabled = false;
  btn.innerHTML = 'Générer un lien';

  if (result.success) {
    const linkInput = document.getElementById('share-link-input');
    const linkContainer = document.getElementById('share-link-container');
    
    if (linkInput && linkContainer) {
      linkInput.value = result.data.shareUrl;
      linkContainer.classList.remove('hidden');
    }
  } else {
    showErrorModal(result.message);
  }
}

export function copyShareLink() {
  const input = document.getElementById('share-link-input');
  if (!input) return;

  input.select();
  input.setSelectionRange(0, 99999);
  navigator.clipboard.writeText(input.value);

  const btn = document.querySelector('button[onclick="copyShareLink()"]');
  if (btn) {
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Copié !';
    setTimeout(() => {
      btn.innerHTML = originalContent;
    }, 2000);
  }
}

window.openShareModal = openShareModal;
window.copyShareLink = copyShareLink;

export function shareSocial(platform) {
  const linkInput = document.getElementById('share-link-input');
  if (!linkInput || !linkInput.value) return;

  const url = encodeURIComponent(linkInput.value);
  const text = encodeURIComponent('Consultez mon document sécurisé sur DocMaster : ');
  let shareUrl = '';

  switch (platform) {
    case 'whatsapp':
      shareUrl = `https://api.whatsapp.com/send?text=${text}${url}`;
      break;
    case 'facebook':
      shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
      break;
    case 'twitter':
      shareUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
      break;
    case 'linkedin':
      shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
      break;
  }

  if (shareUrl) {
    window.open(shareUrl, '_blank');
  }
}

export function downloadDocument(docId) {
  const doc = window.lastFetchedDocuments?.find(d => d.id === docId);
  if (!doc) return;

  const photo = doc.photo_recto;
  if (!photo) {
    showErrorModal("Aucune image disponible pour ce document.");
    return;
  }

  const link = document.createElement('a');
  link.href = photo.startsWith('http') ? photo : '/' + photo.replace(/^\//, '');
  link.download = `docmaster-${doc.type_doc}-${doc.numero_doc}.jpg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function generateDocumentPDF(docId) {
  const doc = window.lastFetchedDocuments?.find(d => d.id === docId);
  if (!doc) return;

  const btn = document.getElementById('download-doc-btn');
  const originalHtml = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> PDF...';
  }

  try {
    await generatePDFUtil(doc);
    showSuccessModal("PDF généré avec succès !");
  } catch (error) {
    console.error(error);
    showErrorModal("Erreur lors de la génération du PDF.");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }
  }
}

window.generateDocumentPDF = generateDocumentPDF;
window.shareSocial = shareSocial;
window.downloadDocument = downloadDocument;

/**
 * ────────────────────────────────────────────────────────────────
 * LOST DECLARATION UI LOGIC
 * ────────────────────────────────────────────────────────────────
 */

let documentToMarkLost = null;
let lastCreatedDeclarationId = null;

export function confirmLost(id) {
  documentToMarkLost = id;
  const modal = document.getElementById('confirmLostModal');
  if (modal) modal.classList.remove('hidden');
}

export function closeConfirmLost() {
  const modal = document.getElementById('confirmLostModal');
  if (modal) modal.classList.add('hidden');
  documentToMarkLost = null;
  
  const pwdInput = document.getElementById('confirmPassword');
  if (pwdInput) pwdInput.value = '';
  
  const err = document.getElementById('passwordError');
  if (err) err.classList.add('hidden');
}

export async function validateAndSubmitLost() {
  const pwdInput = document.getElementById('confirmPassword');
  const pwd = pwdInput ? pwdInput.value : '';
  
  if (!pwd) {
    const err = document.getElementById('passwordError');
    if (err) err.classList.remove('hidden');
    return;
  }

  const btn = document.getElementById('finalSubmitBtn');
  if (!btn) return;
  
  btn.disabled = true;
  const originalHtml = btn.innerHTML;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Traitement…';

  try {
    const result = await apiReportLost(documentToMarkLost, pwd);
    
    if (result.success) {
      lastCreatedDeclarationId = result.data.declarationId;
      const identifiant = result.data.declarationIdentifiant;
      
      closeConfirmLost();
      
      const successOverlay = document.getElementById('successOverlay');
      if (successOverlay) {
        successOverlay.classList.remove('hidden');
        const idBox = document.getElementById('declarationIdentifiantBox');
        if (idBox && identifiant) {
          idBox.textContent = identifiant;
          idBox.classList.remove('hidden');
        } else if (idBox) {
          idBox.classList.add('hidden');
        }
      }
      
      // Refresh the list to show "Lost" badge
      initDocumentList();
    } else {
      showErrorModal('Erreur', result.message);
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }
  } catch (error) {
    console.error('Lost Declaration Error:', error);
    showErrorModal('Erreur', 'Une erreur est survenue lors de la déclaration.');
    btn.disabled = false;
    btn.innerHTML = originalHtml;
  }
}

export function downloadDeclarationPdf() {
  if (!lastCreatedDeclarationId) {
    alert('Aucun rapport disponible.');
    return;
  }
  
  const url = `http://localhost:5000/api/declarations/${lastCreatedDeclarationId}/pdf`;
  const token = localStorage.getItem('docmaster_jwt_token');
  
  // Open in new tab or download
  const link = document.createElement('a');
  link.href = url + (token ? `?token=${token}` : ''); // Token in query param for direct download if needed
  link.target = '_blank';
  link.download = `declaration_perte_${lastCreatedDeclarationId}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

window.confirmLost = confirmLost;
window.closeConfirmLost = closeConfirmLost;
window.validateAndSubmitLost = validateAndSubmitLost;
window.downloadDeclarationPdf = downloadDeclarationPdf;