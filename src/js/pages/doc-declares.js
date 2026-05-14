import { getMyDeclarations } from '../services/api.js';

/**
 * My Declarations Page Module
 */

let allDeclarations = [];
const state = { filter: 'all' };

/**
 * Initialize the page
 */
export async function initDocDeclares() {
  const queryFilter = new URLSearchParams(window.location.search).get('type');
  state.filter = ['perdu', 'trouve'].includes(queryFilter) ? queryFilter : 'all';

  // Set up event listeners
  document.querySelectorAll('.filter-pill').forEach((btn) => {
    btn.addEventListener('click', () => applyFilter(btn.dataset.filter));
  });

  updateFilterUI(state.filter);
  await loadDeclarations();
}

/**
 * Load declarations from API
 */
async function loadDeclarations() {
  const listRoot = document.getElementById('declaration-list');
  if (listRoot) listRoot.innerHTML = '<div class="col-span-full py-12 text-center"><i class="fa-solid fa-spinner fa-spin text-2xl text-primary mb-2"></i><p class="text-sm text-textMuted">Chargement de vos déclarations...</p></div>';

  const result = await getMyDeclarations();
  
  if (result.success) {
    allDeclarations = result.data;
    renderCards();
  } else {
    if (listRoot) listRoot.innerHTML = `<div class="col-span-full py-12 text-center text-red-500"><i class="fa-solid fa-circle-exclamation text-2xl mb-2"></i><p>${result.message}</p></div>`;
  }
}

/**
 * Apply filter
 */
function applyFilter(filter) {
  state.filter = filter;
  updateFilterUI(filter);
  renderCards();
}

/**
 * Update filter buttons UI
 */
function updateFilterUI(filter) {
  document.querySelectorAll('.filter-pill').forEach((btn) => {
    const isActive = btn.dataset.filter === filter;
    btn.classList.toggle('bg-primary', isActive);
    btn.classList.toggle('text-white', isActive);
    btn.classList.toggle('border-primary', isActive);
    btn.classList.toggle('bg-bgMain', !isActive);
    btn.classList.toggle('text-textMuted', !isActive);
    btn.classList.toggle('border-borderMain', !isActive);
  });
}

/**
 * Render declaration cards
 */
function renderCards() {
  const listRoot = document.getElementById('declaration-list');
  const empty = document.getElementById('empty-state');
  if (!listRoot) return;

  const filtered = allDeclarations.filter(item => {
    if (state.filter === 'all') return true;
    const type = item.declaration_type === 'LOST' ? 'perdu' : 'trouve';
    return type === state.filter;
  });

  if (!filtered.length) {
    listRoot.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');

  listRoot.innerHTML = filtered.map((item) => {
    const isPerdu = item.declaration_type === 'LOST';
    const typeBadgeClass = isPerdu
      ? 'bg-red-50 text-red-700 border-red-100'
      : 'bg-green-50 text-green-700 border-green-100';
    const typeIcon = isPerdu ? 'fa-triangle-exclamation' : 'fa-file-circle-check';
    const typeLabel = isPerdu ? 'Perte' : 'Trouvé';
    
    // Status logic (based on your schema, but let's default to 'en_cours' for now)
    const status = item.status || 'en_cours'; 
    const statusMeta = getStatusMeta(status);

    return `
      <article class="bg-white border border-borderMain rounded-[18px] p-4 sm:p-5 hover:shadow-md transition-shadow cursor-pointer" onclick="openDetail('${item.id}')">
        <div class="flex items-start justify-between gap-3 mb-3">
          <div class="min-w-0">
            <p class="text-[11px] font-bold text-textMuted uppercase tracking-wide">${item.identifiant_doc_dm || 'DOC-DM'}</p>
            <h3 class="font-bricolage text-[18px] font-bold text-textMain leading-tight mt-0.5">${item.docTypeInfo?.nom || item.doc_type || 'Document'}</h3>
          </div>
          <span class="px-2.5 py-1 rounded-full border text-[11px] font-bold ${typeBadgeClass}">
            <i class="fa-solid ${typeIcon} mr-1"></i>${typeLabel}
          </span>
        </div>

        <div class="space-y-1.5 text-[12.5px] text-textMuted">
          <p><i class="fa-regular fa-user mr-1.5 w-4"></i> ${item.owner_name || 'Inconnu'}</p>
          <p><i class="fa-regular fa-calendar mr-1.5 w-4"></i> ${formatDate(item.created_at)}</p>
          <p><i class="fa-solid fa-location-dot mr-1.5 w-4"></i> ${item.ville || '—'}</p>
        </div>

        <div class="mt-4 flex items-center justify-between gap-3">
          <span class="px-2.5 py-1 rounded-full border text-[11px] font-semibold ${statusMeta.cls}">${statusMeta.label}</span>
          <button class="px-3 py-1.5 rounded-[9px] bg-surface2 border border-borderMain text-[12px] font-semibold text-textMuted hover:border-primary hover:text-primary transition-colors">Voir détails</button>
        </div>
      </article>
    `;
  }).join('');
}

/**
 * Open detail panel
 */
export function openDetail(id) {
  const item = allDeclarations.find(d => d.id === id);
  if (!item) return;

  const overlay = document.getElementById('detail-overlay');
  const panel = document.getElementById('detail-panel');
  const content = document.getElementById('detail-content');

  if (!overlay || !panel || !content) return;

  const isPerdu = item.declaration_type === 'LOST';
  const typeLabel = isPerdu ? 'Déclaration de Perte' : 'Document Trouvé';
  const statusMeta = getStatusMeta(item.status);
  
  const photoRecto = item.photo_recto ? (item.photo_recto.startsWith('http') ? item.photo_recto : '/' + item.photo_recto) : null;
  const photoVerso = item.photo_verso ? (item.photo_verso.startsWith('http') ? item.photo_verso : '/' + item.photo_verso) : null;

  content.innerHTML = `
    <div class="space-y-6">
      <!-- Badge Type -->
      <div class="flex items-center gap-2">
        <span class="px-3 py-1 rounded-full bg-bgMain border border-borderMain text-[11px] font-bold text-textMuted uppercase tracking-wider">
          ${item.identifiant_doc_dm}
        </span>
        <span class="px-3 py-1 rounded-full border text-[11px] font-bold ${isPerdu ? 'bg-red-50 text-red-700 border-red-100' : 'bg-green-50 text-green-700 border-green-100'}">
          ${typeLabel}
        </span>
      </div>

      <!-- Main Info -->
      <div>
        <h3 class="font-bricolage text-2xl font-extrabold text-textMain">${item.docTypeInfo?.nom || item.doc_type}</h3>
        <p class="text-textMuted text-sm mt-1">Publié le ${formatDate(item.created_at)}</p>
      </div>

      <!-- Status Card -->
      <div class="p-4 rounded-2xl border ${statusMeta.cls} flex items-center justify-between">
        <span class="text-sm font-bold">Statut actuel</span>
        <span class="px-3 py-1 rounded-full bg-white/50 border border-current text-xs font-bold uppercase">${statusMeta.label}</span>
      </div>

      <!-- Images -->
      <div class="grid grid-cols-2 gap-3">
        <div class="aspect-[4/3] bg-bgMain rounded-2xl border border-borderMain overflow-hidden group relative">
          ${photoRecto ? `<img src="${photoRecto}" class="w-full h-full object-cover" onclick="window.open('${photoRecto}')" title="Cliquer pour agrandir">` : '<div class="w-full h-full flex flex-col items-center justify-center text-textMuted opacity-50"><i class="fa-solid fa-image text-2xl mb-1"></i><span class="text-[10px]">Recto absent</span></div>'}
          <div class="absolute bottom-2 left-2 px-2 py-0.5 bg-black/50 text-white text-[9px] font-bold rounded uppercase">Recto</div>
        </div>
        <div class="aspect-[4/3] bg-bgMain rounded-2xl border border-borderMain overflow-hidden group relative">
          ${photoVerso ? `<img src="${photoVerso}" class="w-full h-full object-cover" onclick="window.open('${photoVerso}')" title="Cliquer pour agrandir">` : '<div class="w-full h-full flex flex-col items-center justify-center text-textMuted opacity-50"><i class="fa-solid fa-image text-2xl mb-1"></i><span class="text-[10px]">Verso absent</span></div>'}
          <div class="absolute bottom-2 left-2 px-2 py-0.5 bg-black/50 text-white text-[9px] font-bold rounded uppercase">Verso</div>
        </div>
      </div>

      <!-- Details List -->
      <div class="space-y-4 pt-4 border-t border-borderMain">
        <div class="flex items-start gap-4">
          <div class="w-10 h-10 rounded-xl bg-bgMain border border-borderMain flex items-center justify-center text-textMuted shrink-0">
            <i class="fa-regular fa-user"></i>
          </div>
          <div>
            <p class="text-[10px] font-bold text-textMuted uppercase tracking-widest">Propriétaire déclaré</p>
            <p class="text-sm font-bold text-textMain">${item.owner_name || 'Non spécifié'}</p>
          </div>
        </div>

        <div class="flex items-start gap-4">
          <div class="w-10 h-10 rounded-xl bg-bgMain border border-borderMain flex items-center justify-center text-textMuted shrink-0">
            <i class="fa-solid fa-hashtag"></i>
          </div>
          <div>
            <p class="text-[10px] font-bold text-textMuted uppercase tracking-widest">Numéro du document</p>
            <p class="text-sm font-bold text-textMain">${item.document_number || 'Non spécifié'}</p>
          </div>
        </div>

        <div class="flex items-start gap-4">
          <div class="w-10 h-10 rounded-xl bg-bgMain border border-borderMain flex items-center justify-center text-textMuted shrink-0">
            <i class="fa-solid fa-location-dot"></i>
          </div>
          <div>
            <p class="text-[10px] font-bold text-textMuted uppercase tracking-widest">Localisation</p>
            <p class="text-sm font-bold text-textMain">${item.ville || '—'}, ${item.region || '—'} (${item.pays || 'Cameroun'})</p>
          </div>
        </div>

        <div class="flex items-start gap-4">
          <div class="w-10 h-10 rounded-xl bg-bgMain border border-borderMain flex items-center justify-center text-textMuted shrink-0">
            <i class="fa-solid fa-stethoscope"></i>
          </div>
          <div>
            <p class="text-[10px] font-bold text-textMuted uppercase tracking-widest">État Physique</p>
            <p class="text-sm font-bold text-textMain">${item.etat_physique ? (item.etat_physique === 'bon' ? 'Bon état' : item.etat_physique === 'use' ? 'Usagé' : 'Endommagé') : 'Non précisé'}</p>
          </div>
        </div>

        ${item.date_expiration ? `
        <div class="flex items-start gap-4">
          <div class="w-10 h-10 rounded-xl bg-bgMain border border-borderMain flex items-center justify-center text-textMuted shrink-0">
            <i class="fa-solid fa-calendar-xmark"></i>
          </div>
          <div>
            <p class="text-[10px] font-bold text-textMuted uppercase tracking-widest">Date d'expiration</p>
            <p class="text-sm font-bold text-textMain">${formatDate(item.date_expiration)}</p>
          </div>
        </div>
        ` : ''}
      </div>

      <!-- Description -->
      <div class="pt-4 border-t border-borderMain">
        <p class="text-[10px] font-bold text-textMuted uppercase tracking-widest mb-2">Description & Notes</p>
        <div class="p-4 bg-bgMain rounded-2xl text-sm text-textMain leading-relaxed italic whitespace-pre-wrap">
          "${item.description || 'Aucune description fournie.'}"
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="pt-6 flex flex-col gap-3">
        ${item.status === 'MATCHED' ? `
          <button onclick="window.location.href='${isPerdu ? 'recuperer.html' : 'rendre.html'}?id=${item.id}'" 
                  class="w-full py-4 ${isPerdu ? 'bg-green-600' : 'bg-blue-600'} text-white rounded-xl font-black text-base shadow-xl transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3">
            <i class="fa-solid ${isPerdu ? 'fa-handshake' : 'fa-hand-holding-heart'}"></i>
            ${isPerdu ? 'Récupérer mon document' : 'Rendre le document'}
          </button>
        ` : ''}
        
        <div class="flex gap-3">
          <button onclick="window.location.href='partage.html?id=${item.id}'" class="flex-1 py-3 bg-textMain text-white rounded-xl font-bold text-sm hover:bg-black transition-colors flex items-center justify-center gap-2 shadow-lg shadow-black/10">
            <i class="fa-solid fa-share-nodes"></i> Partager
          </button>
          <button class="flex-1 py-3 border border-borderMain text-textMain rounded-xl font-bold text-sm hover:bg-bgMain transition-colors">
            <i class="fa-solid fa-flag mr-1"></i> Signaler
          </button>
        </div>
      </div>
    </div>
  `;

  // Animation
  overlay.classList.remove('hidden');
  setTimeout(() => {
    overlay.classList.add('opacity-100');
    panel.classList.remove('translate-x-full');
  }, 10);
}

/**
 * Close detail panel
 */
export function closeDetail() {
  const overlay = document.getElementById('detail-overlay');
  const panel = document.getElementById('detail-panel');

  if (!overlay || !panel) return;

  panel.classList.add('translate-x-full');
  overlay.classList.remove('opacity-100');
  
  setTimeout(() => {
    overlay.classList.add('hidden');
  }, 300);
}

function getStatusMeta(status) {
  switch (status) {
    case 'MATCHED': return { label: 'Match trouvé !', cls: 'bg-green-100 text-green-700 border-green-200 animate-pulse' };
    case 'RETURNED': return { label: 'Clôturé / Remis', cls: 'bg-gray-100 text-gray-700 border-gray-200' };
    case 'RESOLVED': return { label: 'Résolu', cls: 'bg-green-50 text-green-700 border-green-100' };
    case 'NEW': return { label: 'Nouveau', cls: 'bg-blue-50 text-blue-700 border-blue-100' };
    default: return { label: 'En cours', cls: 'bg-amber-50 text-amber-700 border-amber-100' };
  }
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Global scope exposure if needed
window.refreshDeclarations = loadDeclarations;
