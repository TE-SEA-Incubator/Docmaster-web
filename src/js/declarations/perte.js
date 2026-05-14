import { createLostDeclaration, getActiveDocumentTypes } from '../services/api.js';

/**
 * Lost Declaration Module
 * Handles UI interactions and API submission for lost documents.
 */

/* ════════════════════════════════════════
   PERSISTANCE DES DONNÉES (localStorage)
════════════════════════════════════════ */
const STORAGE_KEY = 'docmaster_declaration_draft';

/**
 * Sauvegarde toutes les données du formulaire
 */
function saveDeclarationDraft() {
  const container = document.getElementById('dynamicFields');
  if (!container) return;

  const draft = {
    docType: selectedDocs[0] || null,
    timestamp: Date.now(),
    fields: {}
  };

  // Sauvegarder les champs dynamilques
  const inputs = container.querySelectorAll('input[type="text"], input[type="date"], input[type="tel"], input[type="email"], select, textarea');
  inputs.forEach(input => {
    if (input.value) {
      draft.fields[input.id || input.name || input.placeholder] = input.value;
    }
  });

  // Sauvegarder les autres champs spéciaux
  const lossDate = document.getElementById('lossDate');
  if (lossDate?.value) draft.fields['lossDate'] = lossDate.value;

  const userRegion = document.getElementById('userRegion');
  if (userRegion?.value) draft.fields['userRegion'] = userRegion.value;

  const userCountry = document.getElementById('userCountry');
  if (userCountry?.value) draft.fields['userCountry'] = userCountry.value;

  // Sauvegarder les boutons de sélection
  const etatEl = document.querySelector('input[name="etat"]:checked');
  if (etatEl) draft.fields['etat'] = etatEl.value;

  const contactModeEl = document.querySelector('input[name="contact-mode"]:checked');
  if (contactModeEl) draft.fields['contact-mode'] = contactModeEl.value;

  const urgEl = document.querySelector('.urgency-btn.sel-low, .urgency-btn.sel-medium, .urgency-btn.sel-high');
  if (urgEl) draft.fields['urgency'] = urgEl.textContent.trim();

  localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  console.log('💾 Brouillon sauvegardé');
}

/**
 * Restaure les données du formulaire depuis localStorage
 */
function restoreDeclarationDraft() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;

  try {
    const draft = JSON.parse(saved);
    
    // Restaurer les champs
    for (const [key, value] of Object.entries(draft.fields)) {
      const input = document.getElementById(key) || document.querySelector(`[name="${key}"]`) || document.querySelector(`[placeholder*="${key}"]`);
      
      if (input) {
        if (input.type === 'checkbox' || input.type === 'radio') {
          input.checked = (input.value === value);
        } else {
          input.value = value;
        }
      }
    }

    console.log('🔄 Brouillon restauré');
  } catch (e) {
    console.error('Erreur lors de la restauration:', e);
  }
}

/**
 * Efface le brouillon sauvegardé
 */
function clearDeclarationDraft() {
  localStorage.removeItem(STORAGE_KEY);
  console.log('🗑️ Brouillon supprimé');
}

/* ════════════════════════════════════════
   MÉTADONNÉES PAR TYPE DE DOCUMENT
════════════════════════════════════════ */
export const DOC_META = {
  cni: {
    label:"Carte d'identité", icon:'fa-id-card', color:'#3B82F6',
    fields:[
      { id:'titulaire', label:'Nom du titulaire', type:'text', placeholder:'Nom complet sur le document', icon:'fa-user', optional:false },
      { id:'date_naissance', label:'Date de naissance', type:'date', icon:'fa-cake-candles', optional:false },
      { id:'numero',    label:'Numéro du document', type:'text', placeholder:'Ex: CMR1234567', icon:'fa-barcode', optional:true },
      { id:'expiration',label:"Date d'expiration", type:'date', placeholder:'', icon:'fa-calendar', optional:true },
      { id:'pays',      label:'Pays émetteur', type:'select', icon:'fa-earth-africa', optional:false,
        options:['Cameroun','Sénégal','Côte d\'Ivoire','Mali','Gabon','RD Congo','France','Autre…'] },
      { id:'desc',      label:'Description physique', type:'textarea', placeholder:'Couleur, état, particularités…', icon:'', optional:true },
    ]
  },
  passeport: {
    label:'Passeport', icon:'fa-passport', color:'#8B5CF6',
    fields:[
      { id:'titulaire', label:'Nom du titulaire', type:'text', placeholder:'Nom complet', icon:'fa-user', optional:false },
      { id:'date_naissance', label:'Date de naissance', type:'date', icon:'fa-cake-candles', optional:false },
      { id:'numero',    label:'Numéro de passeport', type:'text', placeholder:'Ex: P1234567', icon:'fa-barcode', optional:true },
      { id:'expiration',label:"Date d'expiration", type:'date', placeholder:'', icon:'fa-calendar', optional:true },
      { id:'pays',      label:'Pays émetteur', type:'select', icon:'fa-earth-africa', optional:false,
        options:['Cameroun','Sénégal','Côte d\'Ivoire','Mali','Gabon','RD Congo','France','Autre…'] },
      { id:'desc',      label:'Description physique', type:'textarea', placeholder:'Couleur, état, particularités…', icon:'', optional:true },
    ]
  },
  permis: {
    label:'Permis de conduire', icon:'fa-car-side', color:'#F59E0B',
    fields:[
      { id:'titulaire', label:'Nom du titulaire', type:'text', placeholder:'Nom complet', icon:'fa-user', optional:false },
      { id:'numero',    label:'Numéro du permis', type:'text', placeholder:'Ex: PC-23-0012345', icon:'fa-barcode', optional:true },
      { id:'categorie', label:'Catégorie', type:'select', icon:'fa-layer-group', optional:true,
        options:['A (Moto)','B (Voiture)','C (Poids lourd)','D (Bus)','BE','CE','Autre'] },
      { id:'expiration',label:"Date d'expiration", type:'date', placeholder:'', icon:'fa-calendar', optional:true },
      { id:'pays',      label:'Pays émetteur', type:'select', icon:'fa-earth-africa', optional:false,
        options:['Cameroun','Sénégal','Côte d\'Ivoire','Mali','Gabon','France','Autre…'] },
      { id:'desc',      label:'Description physique', type:'textarea', placeholder:'Couleur, état…', icon:'', optional:true },
    ]
  },
  acte: {
    label:'Acte de naissance', icon:'fa-file-lines', color:'#10B981',
    fields:[
      { id:'titulaire', label:'Nom de la personne concernée', type:'text', placeholder:'Nom complet', icon:'fa-user', optional:false },
      { id:'date_naissance', label:'Date de naissance', type:'date', icon:'fa-cake-candles', optional:false },
      { id:'numero',    label:'Numéro de l\'acte', type:'text', placeholder:'Ex: 2024-YDE-000123', icon:'fa-hashtag', optional:true },
      { id:'dateEtab',  label:'Date d\'établissement', type:'date', placeholder:'', icon:'fa-calendar', optional:true },
      { id:'commune',   label:'Commune / Mairie émettrice', type:'text', placeholder:'Ex: Mairie de Yaoundé 1er', icon:'fa-building', optional:false },
      { id:'desc',      label:'Observations', type:'textarea', placeholder:'Annotations, état du document…', icon:'', optional:true },
    ]
  },
  banque: {
    label:'Carte bancaire', icon:'fa-credit-card', color:'#EF4444',
    fields:[
      { id:'titulaire', label:'Nom du titulaire', type:'text', placeholder:'Nom complet', icon:'fa-user', optional:false },
      { id:'derniers',  label:'4 derniers chiffres', type:'text', placeholder:'Ex: 4521', icon:'fa-hashtag', optional:true },
      { id:'banque',    label:'Banque émettrice', type:'text', placeholder:'Ex: Afriland First Bank, UBA…', icon:'fa-building-columns', optional:false },
      { id:'expiration',label:"Date d'expiration", type:'month', placeholder:'MM/AA', icon:'fa-calendar', optional:true },
      { id:'desc',      label:'Description', type:'textarea', placeholder:'Couleur, type Visa/Mastercard…', icon:'', optional:true },
    ]
  },
  titre: {
    label:'Titre foncier', icon:'fa-house', color:'#6366F1',
    fields:[
      { id:'titulaire', label:'Nom du propriétaire', type:'text', placeholder:'Nom complet', icon:'fa-user', optional:false },
      { id:'numero',    label:'Numéro de parcelle', type:'text', placeholder:'Ex: TF/2345/B', icon:'fa-hashtag', optional:true },
      { id:'localisation', label:'Localisation du bien', type:'text', placeholder:'Ex: Bastos, Yaoundé', icon:'fa-map-pin', optional:false },
      { id:'superficie',label:'Superficie (m²)', type:'number', placeholder:'Ex: 500', icon:'fa-ruler-combined', optional:true },
      { id:'desc',      label:'Description', type:'textarea', placeholder:'État, particularités du document…', icon:'', optional:true },
    ]
  },
  diplome: {
    label:'Diplôme', icon:'fa-graduation-cap', color:'#EC4899',
    fields:[
      { id:'titulaire', label:'Nom du diplômé', type:'text', placeholder:'Nom complet', icon:'fa-user', optional:false },
      { id:'etablissement', label:'Établissement', type:'text', placeholder:'Ex: Université de Yaoundé 1', icon:'fa-school', optional:false },
      { id:'specialite',label:'Specialité / Filière', type:'text', placeholder:'Ex: Droit privé, Médecine…', icon:'fa-book', optional:true },
      { id:'annee',     label:'Année d\'obtention', type:'number', placeholder:'Ex: 2022', icon:'fa-calendar', optional:true },
      { id:'desc',      label:'Description', type:'textarea', placeholder:'État, couleur, mentions…', icon:'', optional:true },
    ]
  },
  carte_grise: {
    label:'Carte grise', icon:'fa-car', color:'#3B82F6',
    fields:[
      { id:'titulaire', label:'Nom du titulaire', type:'text', placeholder:'Nom complet sur le document', icon:'fa-user', optional:false },
      { id:'immatriculation', label:'N° d\'immatriculation', type:'text', placeholder:'Ex: CE 123 AB', icon:'fa-car-rear', optional:false },
      { id:'marque_modele', label:'Marque / Modèle', type:'text', placeholder:'Ex: Toyota Corolla', icon:'fa-car-side', optional:true },
      { id:'chassis', label:'Numéro de châssis (VIN)', type:'text', placeholder:'Ex: VF3...', icon:'fa-barcode', optional:true },
      { id:'pays',      label:'Pays émetteur', type:'select', icon:'fa-earth-africa', optional:false,
        options:['Cameroun','Sénégal','Côte d\'Ivoire','Mali','Gabon','RD Congo','France','Autre…'] },
      { id:'desc',      label:'Description physique', type:'textarea', placeholder:'Couleur, état, particularités…', icon:'', optional:true },
    ]
  },
  autre: {
    label:'Autre document', icon:'fa-folder', color:'#9CA3AF',
    fields:[
      { id:'typePrec',  label:'Type précis du document', type:'text', placeholder:'Ex: Carte grise, Carte d\'étudiant…', icon:'fa-file', optional:false },
      { id:'titulaire', label:'Nom du titulaire', type:'text', placeholder:'Nom complet', icon:'fa-user', optional:false },
      { id:'numero',    label:'Numéro ou référence', type:'text', placeholder:'Numéro si disponible', icon:'fa-barcode', optional:true },
      { id:'desc',      label:'Description', type:'textarea', placeholder:'Couleur, état, particularités…', icon:'', optional:true },
    ]
  },
};

/**
 * Resolves metadata for a document type by ID.
 * Since selectedDocs contains database IDs, we need to find the corresponding 
 * document type object to get its code and look up in DOC_META.
 */
function getDocMeta(id) {
  const types = window.allDocumentTypes || [];
  const t = types.find(type => type.id === id);
  
  // Si le type n'est pas trouvé du tout dans l'API, on utilise le type "Autre" par défaut
  if (!t) return DOC_META.autre;
  
  const code = t.code ? t.code.toLowerCase() : '';
  const meta = DOC_META[code];
  
  // Si on a une configuration précise, on l'utilise
  if (meta) return meta;
  
  // Sinon, on utilise la structure de "autre" mais on garde le nom et l'icône de l'API si possible
  return {
    ...DOC_META.autre,
    label: t.nom || DOC_META.autre.label,
    icon: t.icone ? (t.icone.startsWith('fa-') ? t.icone : `fa-${t.icone}`) : DOC_META.autre.icon,
    fields: DOC_META.autre.fields
  };
}

/* ════ ÉTAT ════ */
let isThirdParty = false;
const selectedDocs = [];
let activeDocIdx = 0;
let currentStep = 1;
const totalSteps = 6;
let checked = false;
export let lastDeclarationData = null;

/**
 * Initialize the module
 */
export function initLostDeclaration() {
  window.selectOwner = selectOwner;
  window.toggleDocType = toggleDocType;
  window.removeDoc = removeDoc;
  window.goToNextStep = goToNextStep;
  window.goToPrevStep = goToPrevStep;
  window.jumpToDoc = jumpToDoc;
  window.selectPlace = selectPlace;
  window.setUrgency = setUrgency;
  window.toggleReward = toggleReward;
  window.toggleCheckbox = toggleCheckbox;
  window.previewFile = previewFile;
  window.dragOver = dragOver;
  window.dragLeave = dragLeave;
  window.dropFile = dropFile;
  window.submitDeclaration = submitDeclaration;
  window.closeConfirmModal = closeConfirmModal;
  window.validateAndSubmit = validateAndSubmit;
  window.downloadDeclarationPdf = downloadDeclarationPdf;

  // Initial load
  const sessionRaw = localStorage.getItem("docmaster_user_session");
  if (sessionRaw) {
    try {
      window.USER_SESSION = JSON.parse(sessionRaw);
    } catch(e) {}
  }

  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('lossDate');
  if (dateInput) dateInput.value = today;

  // Pre-fill contact if session exists
  if (window.USER_SESSION) {
    const phoneInput = document.querySelector('input[type="tel"]');
    const emailInput = document.querySelector('input[type="email"]');
    if (phoneInput && window.USER_SESSION.telephone) phoneInput.value = window.USER_SESSION.telephone;
    if (emailInput && window.USER_SESSION.email) emailInput.value = window.USER_SESSION.email;
  }

  showStep(1);

  // Global storage for dynamic types
  window.allDocumentTypes = [];

  // Render types (async)
  getActiveDocumentTypes().then(res => {
    if (res.success && Array.isArray(res.data) && res.data.length > 0) {
      window.allDocumentTypes = res.data;
      renderDocTypeCards(res.data);
    } else {
      console.warn('Document types not available or invalid format:', res.data);
      window.allDocumentTypes = res.data || [];
    }
  }).catch(err => {
    console.error('Failed to load document types:', err);
    window.allDocumentTypes = [];
  });

  // URL params
  const urlParams = new URLSearchParams(window.location.search);
  const docCode = urlParams.get('doc');
  if (docCode) {
    // Wait for types to be loaded
    const checkInterval = setInterval(() => {
      if (window.allDocumentTypes.length > 0) {
        clearInterval(checkInterval);
        const type = window.allDocumentTypes.find(t => t.code.toLowerCase() === docCode.toLowerCase());
        if (type) {
          const card = document.querySelector(`.doc-type-card[onclick*="'${type.id}'"]`) || document.querySelector(`.doc-card[onclick*="'${type.id}'"]`);
          if (card) toggleDocType(card, type.id);
        }
      }
    }, 100);
    // Safety timeout after 3 seconds
    setTimeout(() => clearInterval(checkInterval), 3000);
  }

  // ═══════════════════════════════════════
  // AUTO-SAVE DES DONNÉES
  // ═══════════════════════════════════════
  
  // Restaurer les données sauvegardées au démarrage
  restoreDeclarationDraft();

  // Écouter les changements et auto-sauvegarder
  document.addEventListener('input', (e) => {
    if (e.target.matches('input, select, textarea')) {
      saveDeclarationDraft();
    }
  });
  
  document.addEventListener('change', (e) => {
    if (e.target.matches('input[type="checkbox"], input[type="radio"], select')) {
      saveDeclarationDraft();
    }
  });
}

function renderDocTypeCards(types) {
  const container = document.getElementById('docTypeGrid') || document.querySelector('.grid.grid-cols-2.sm\\:grid-cols-4.gap-3');
  if (!container) {
    console.warn('Document type grid container not found');
    return;
  }

  container.innerHTML = types.map(t => {
    const isSelected = selectedDocs.includes(t.id);
    return `
      <div class="doc-type-card ${isSelected ? 'selected' : ''}" onclick="toggleDocType(this, '${t.id}')">
        <div class="doc-check"><i class="fa-solid fa-check"></i></div>
        <div class="card-icon">
          <i class="fa-solid fa-${t.icone || 'file-lines'}"></i>
        </div>
        <span class="card-label">${t.nom}</span>
      </div>
    `;
  }).join('');
}

function selectOwner(type){
  isThirdParty = (type === 'other');
  document.getElementById('ownerMe').classList.toggle('selected', type==='me');
  document.getElementById('ownerOther').classList.toggle('selected', type==='other');
  
  Object.keys(DOC_META).forEach(key => {
    const fields = DOC_META[key].fields;
    const existingLien = fields.find(f => f.id === 'lien_parente');
    if(isThirdParty && !existingLien){
      fields.splice(1, 0, { id:'lien_parente', label:'Lien avec le titulaire', type:'select', icon:'fa-people-arrows', optional:false, options:['Enfant','Époux/Épouse','Parent','Frère/Sœur','Employé','Ami','Autre'] });
    } else if(!isThirdParty && existingLien){
      const lIdx = fields.indexOf(existingLien);
      fields.splice(lIdx, 1);
    }
  });

  if(currentStep === 3) buildStep2('right');
}

function toggleDocType(card, type){
  const idx = selectedDocs.indexOf(type);
  if(idx > -1){
    selectedDocs.splice(idx,1);
    card.classList.remove('selected');
  } else {
    selectedDocs.push(type);
    card.classList.add('selected');
  }
  renderSelectionUI();
  updateRecapSidebar();
}

function renderSelectionUI(){
  const info = document.getElementById('selectionInfo');
  const tags = document.getElementById('selectionTags');
  const count = selectedDocs.length;
  if(count === 0){ info.style.display='none'; tags.innerHTML=''; return; }
  info.style.display='flex';
  document.getElementById('selCount').textContent = count;
  document.getElementById('selText').textContent = count > 1 ? 'documents sélectionnés' : 'document sélectionné';
  
  tags.innerHTML = selectedDocs.map(id => {
    const m = getDocMeta(id);
    
    return `<span class="sel-tag" onclick="removeDoc('${id}')">
      <i class="fa-solid ${m.icon}"></i> ${m.label} <i class="fa-solid fa-xmark"></i>
    </span>`;
  }).join('');
}

function removeDoc(type){
  const idx = selectedDocs.indexOf(type);
  if(idx > -1) selectedDocs.splice(idx,1);
  document.querySelectorAll('.doc-type-card').forEach(c=>{
    if(c.getAttribute('onclick') && c.getAttribute('onclick').includes(`'${type}'`)) c.classList.remove('selected');
  });
  renderSelectionUI();
  updateRecapSidebar();
}

function updateRecapSidebar(){
  const el = document.getElementById('recapDocList');
  if(!el) return;
  if(selectedDocs.length === 0){
    el.innerHTML='<span style="font-size:11px;color:rgba(255,255,255,.4);font-style:italic;">Aucun sélectionné</span>';
    return;
  }
  el.innerHTML = selectedDocs.map(id => {
    const m = getDocMeta(id);
    return `<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:rgba(255,255,255,.08);border-radius:10px;">
      <i class="fa-solid ${m.icon}" style="color:#F5A64B;font-size:13px;width:16px;text-align:center;"></i>
      <span style="font-size:11.5px;font-weight:600;color:white;">${m.label}</span>
    </div>`;
  }).join('');
}

function buildStep2(direction){
  if(selectedDocs.length === 0) return;
  const id = selectedDocs[activeDocIdx];
  const meta = getDocMeta(id);
  const total = selectedDocs.length;

  document.getElementById('step2Title').textContent = `Détails : ${meta.label}`;
  document.getElementById('step2Sub').textContent = total > 1
    ? `Renseignez les infos de ce document. Vous passerez au suivant après.`
    : `Renseignez les informations connues.`;
  document.getElementById('currentDocIcon').innerHTML = `<i class="fa-solid ${meta.icon}" style="color:${meta.color};font-size:16px;"></i>`;
  document.getElementById('currentDocName').textContent = meta.label;
  document.getElementById('currentDocCounter').textContent = total > 1 ? `Document ${activeDocIdx+1} / ${total}` : '';

  const subProg = document.getElementById('docSubProgress');
  if(total > 1){
    subProg.style.display='block';
    document.getElementById('docSubProgressBar').style.width = `${((activeDocIdx+1)/total)*100}%`;
  } else {
    subProg.style.display='none';
  }

  const tabs = document.getElementById('docTabs');
  if(total > 1){
    tabs.style.display='block';
    document.getElementById('docTabsInner').innerHTML = selectedDocs.map((id, i) => {
      const m2 = getDocMeta(id);
      const cls = i < activeDocIdx ? 'done' : (i === activeDocIdx ? 'active' : '');
      return `<button type="button" class="doc-nav-tab ${cls}" onclick="jumpToDoc(${i})">
        <span class="tab-num">${i < activeDocIdx ? '<i class="fa-solid fa-check" style="font-size:8px;"></i>' : (i+1)}</span>
        <i class="fa-solid ${m2.icon}" style="font-size:11px;"></i>
        ${m2.label}
      </button>`;
    }).join('');
  } else {
    tabs.style.display='none';
  }

  const container = document.getElementById('dynamicFields');
  const animClass = direction === 'left' ? 'slide-left' : 'slide-right';
  
  let html = `<div class="${animClass}"><div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">`;
  let inGrid = true;
  
  meta.fields.forEach(f => {
    let defaultValue = '';
    if (!isThirdParty && window.USER_SESSION) {
      if (f.id === 'titulaire') defaultValue = `${window.USER_SESSION.prenom || ''} ${window.USER_SESSION.nom || ''}`.trim();
      if (f.id === 'date_naissance' && window.USER_SESSION.date_naissance) {
        defaultValue = window.USER_SESSION.date_naissance.split('T')[0];
      }
    }

    if(f.type === 'textarea'){
      if(inGrid){ html += '</div>'; inGrid=false; }
      html += buildField(f, 'margin-top:14px;', defaultValue);
    } else {
      if(!inGrid){ html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">'; inGrid=true; }
      html += buildField(f, '', defaultValue);
    }
  });
  if(inGrid) html += '</div></div>';
  container.innerHTML = html;

  if (typeof flatpickr !== 'undefined') {
    flatpickr(container.querySelectorAll('input[type="date"]'), {
      locale: "fr",
      dateFormat: "Y-m-d",
      altInput: true,
      altFormat: "d F Y",
      allowInput: true
    });
  }
}

function buildField(f, extra, defaultValue = ''){
  const optBadge = f.optional ? `<span class="opt-badge">Optionnel</span>` : '';
  const iconHtml = f.icon ? `<i class="fa-solid ${f.icon} field-icon"></i>` : '';
  const noIcon   = !f.icon ? ' no-icon' : '';
  const valAttr  = defaultValue ? `value="${defaultValue}"` : '';

  if(f.type === 'select'){
    const opts = (f.options || []).map(o => `<option value="${o}" ${o===defaultValue?'selected':''}>${o}</option>`).join('');
    return `<div class="field-group" style="${extra}">
      <label class="field-label"><i class="fa-solid ${f.icon}" style="color:#F5A64B;font-size:10px;"></i> ${f.label} ${optBadge}</label>
      <div class="field-wrapper">
        ${iconHtml}
        <select class="field-input" id="${f.id}" name="${f.id}"><option value="">Sélectionner…</option>${opts}</select>
        <i class="fa-solid fa-chevron-down" style="position:absolute;right:14px;color:#C4BAB0;font-size:11px;pointer-events:none;"></i>
      </div>
    </div>`;
  }
  if(f.type === 'textarea'){
    return `<div class="field-group" style="${extra}">
      <label class="field-label">${f.icon ? `<i class="fa-solid ${f.icon}" style="color:#F5A64B;font-size:10px;"></i>` : ''} ${f.label} ${optBadge}</label>
      <div class="field-wrapper"><textarea class="field-input no-icon" id="${f.id}" name="${f.id}" placeholder="${f.placeholder}">${defaultValue}</textarea></div>
    </div>`;
  }
  return `<div class="field-group" style="${extra}">
    <label class="field-label">${f.icon ? `<i class="fa-solid ${f.icon}" style="color:#F5A64B;font-size:10px;"></i>` : ''} ${f.label} ${optBadge}</label>
    <div class="field-wrapper">${iconHtml}<input type="${f.type}" class="field-input${noIcon}" id="${f.id}" name="${f.id}" placeholder="${f.placeholder||''}" ${valAttr}/></div>
  </div>`;
}

function jumpToDoc(idx){
  const dir = idx > activeDocIdx ? 'right' : 'left';
  activeDocIdx = idx;
  buildStep2(dir);
}

function showStep(step){
  currentStep=Math.max(1,Math.min(totalSteps,step));
  document.querySelectorAll('.form-step').forEach(s=>s.classList.toggle('active',Number(s.dataset.step)===currentStep));
  updateProgressUI();
  document.getElementById('formLeft').scrollTop=0;
  if(currentStep===3){ activeDocIdx=0; buildStep2('right'); }
  if(currentStep===6) fillSummary();
  
  // Restaurer les données sauvegardées après un délai (pour laisser le DOM se construire)
  setTimeout(() => restoreDeclarationDraft(), 100);
}

function updateProgressUI(){
  for(let i=1;i<=totalSteps;i++){
    const dot=document.getElementById(`ps${i}`);
    if(!dot) continue;
    dot.className='progress-dot';
    if(i<currentStep)       { dot.classList.add('done');    dot.innerHTML='<i class="fa-solid fa-check" style="font-size:9px;"></i>'; }
    else if(i===currentStep){ dot.classList.add('current'); dot.textContent=String(i); }
    else                    { dot.textContent=String(i); }
    if(i<totalSteps){ const l=document.getElementById(`pl${i}`); if(l) l.className=i<currentStep?'progress-vline done':'progress-vline'; }
  }
  document.getElementById('progressBar').style.width=`${(currentStep/totalSteps)*100}%`;
  document.getElementById('stepCounter').textContent=`Étape ${currentStep} / ${totalSteps}`;
  const prev=document.getElementById('prevStepBtn'),next=document.getElementById('nextStepBtn'),actions=document.getElementById('stepActions');
  prev.disabled=currentStep===1; prev.style.opacity=currentStep===1?'0.45':'1';
  next.style.display=currentStep===totalSteps?'none':'flex';
  actions.classList.toggle('active',currentStep===totalSteps);
}

function goToNextStep(){
  if(currentStep===1){
    const me = document.getElementById('ownerMe').classList.contains('selected');
    const other = document.getElementById('ownerOther').classList.contains('selected');
    if(!me && !other) return;
  }
  if(currentStep===2 && selectedDocs.length===0) return;
  
  if(currentStep === 3 && activeDocIdx < selectedDocs.length - 1){
    jumpToDoc(activeDocIdx + 1);
    return;
  }

  // Sauvegarder avant de passer à l'étape suivante
  saveDeclarationDraft();
  if(currentStep < totalSteps) showStep(currentStep+1);
}

function goToPrevStep(){
  // Sauvegarder avant de revenir à l'étape précédente
  saveDeclarationDraft();
  if(currentStep===3 && activeDocIdx > 0){ jumpToDoc(activeDocIdx-1); return; }
  if(currentStep>1) showStep(currentStep-1);
}

function selectPlace(btn){ document.querySelectorAll('.place-tag').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); }

function setUrgency(level,btn){ 
  document.querySelectorAll('.urgency-btn').forEach(b=>b.className='urgency-btn'); 
  btn.classList.add('sel-'+level); 
  const urgTexts={low:'Situation non urgente, quelques semaines acceptables.',medium:'Document important, situation gérable sous quelques jours.',high:'URGENT — Ce document est indispensable dès maintenant !'};
  document.getElementById('urgencyDesc').textContent=urgTexts[level]; 
}

function toggleReward(on){ 
  document.getElementById('rewardField').style.display=on?'block':'none'; 
  document.getElementById('rewardSlider').style.background=on?'#F5A64B':'#E0D5C4'; 
  document.getElementById('rewardThumb').style.transform=on?'translateX(20px)':'translateX(0)'; 
}

function toggleCheckbox(){ 
  checked=!checked; 
  const ui=document.getElementById('checkboxUI'),icon=document.getElementById('checkIcon'); 
  ui.style.background=checked?'#1E3A2F':'white'; 
  ui.style.borderColor=checked?'#1E3A2F':'#E0D5C4'; 
  icon.style.display=checked?'block':'none'; 
}

function previewFile(input,previewId,zoneId,textId,iconId){ 
  const file=input.files[0];
  if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    document.getElementById(previewId).src=e.target.result;
    document.getElementById(previewId).style.display='block';
    document.getElementById(textId).style.display='none';
    document.getElementById(iconId).style.display='none';
    document.getElementById(zoneId).classList.add('has-file');
  };
  reader.readAsDataURL(file); 
}

function dragOver(e,z){e.preventDefault();z.classList.add('dragover')} 
function dragLeave(z){z.classList.remove('dragover')}
function dropFile(e,z,previewId){
  e.preventDefault();
  z.classList.remove('dragover');
  const file=e.dataTransfer.files[0];
  if(!file||!file.type.startsWith('image/'))return;
  const reader=new FileReader();
  reader.onload=ev=>{
    document.getElementById(previewId).src=ev.target.result;
    document.getElementById(previewId).style.display='block';
    z.classList.add('has-file');
  };
  reader.readAsDataURL(file);
}

function fillSummary(){
  const data = collectDeclarationData('DRAFT');
  
  // Vérifier que les éléments existent avant de les modifier
  const summaryType = document.getElementById('summary-type');
  const summaryDate = document.getElementById('summary-date');
  const summaryLieu = document.getElementById('summary-lieu');
  
  if (summaryType && data.documents) summaryType.textContent = data.documents;
  if (summaryDate && data.datePerte) summaryDate.textContent = data.datePerte;
  if (summaryLieu && data.lieu) summaryLieu.textContent = data.lieu;
  
  // Mettre à jour le récapitulatif des documents
  const recapDocList = document.getElementById('recapDocList');
  if (recapDocList && selectedDocs.length > 0) {
    recapDocList.innerHTML = selectedDocs
      .map(id => {
        const m = getDocMeta(id);
        return `<span style="font-size:11px;color:rgba(255,255,255,.8);">✓ ${m.label}</span>`;
      })
      .join('');
  }
}

function collectDeclarationData(ref) {
  const documents = selectedDocs.map(id => {
    const meta = getDocMeta(id);
    // On essaie de trouver le numéro dans les champs dynamiques (le sélecteur dépend de comment ils sont générés)
    // Dans buildStep2, les inputs ont des IDs comme 'field_numero_id'
    const numInput = document.getElementById(`field_numero_${id}`) || 
                     document.getElementById(`field_document_number_${id}`) ||
                     document.querySelector(`input[name*="numero"]`) || 
                     { value: '' };
                     
    return {
      label: meta.label,
      number: numInput.value || ''
    };
  });

  const datePerte = document.getElementById('lossDate')?.value || '';
  let ville = document.getElementById('ville')?.value || '';
  let quartier = document.getElementById('quartier')?.value || '';
  let lieuPrecis = document.getElementById('lieu_precis')?.value || '';
  let descriptionLieu = document.getElementById('description_lieu')?.value || '';
  
  const lieuTag = document.querySelector('.place-tag.active')?.textContent.trim();
  
  let circumstances = `Perte survenue le ${datePerte}`;
  if (ville) circumstances += ` à ${ville}`;
  if (quartier) circumstances += ` (Quartier: ${quartier})`;
  if (lieuPrecis) circumstances += `, lieu précis : ${lieuPrecis}`;
  if (lieuTag) circumstances += ` [Type de lieu: ${lieuTag}]`;
  if (descriptionLieu) circumstances += `. Détails additionnels : ${descriptionLieu}`;

  const user = {
    name: window.USER_SESSION ? `${window.USER_SESSION.prenom || ''} ${window.USER_SESSION.nom || ''}`.trim() : 'Déclarant DocMaster',
    phone: document.getElementById('contactPhone')?.value || window.USER_SESSION?.telephone || '',
    email: document.getElementById('contactEmail')?.value || window.USER_SESSION?.email || '',
    adresse: window.USER_SESSION?.adresse || 'Non renseignée',
    birthDate: window.USER_SESSION?.date_naissance ? window.USER_SESSION.date_naissance.split('T')[0] : '........',
    birthPlace: window.USER_SESSION?.lieu_naissance || '........'
  };

  return {
    ref: ref,
    date: new Date().toLocaleDateString('fr-FR'),
    place: ville || 'Yaoundé',
    user: user,
    documents: documents,
    circumstances: circumstances,
    datePerte: datePerte, // Pour compatibilité summary
    lieu: ville // Pour compatibilité summary
  };
}

function submitDeclaration() {
  if (!checked) {
    const ui = document.getElementById('checkboxUI');
    ui.style.borderColor = '#ef4444';
    setTimeout(() => ui.style.borderColor = '#E0D5C4', 2000);
    return;
  }
  document.getElementById('confirmOverlay').classList.add('show');
}

function closeConfirmModal() {
  document.getElementById('confirmOverlay').classList.remove('show');
}

async function validateAndSubmit() {
  const passInput = document.getElementById('confirmPassword');
  const btn = document.getElementById('finalSubmitBtn');

  if (passInput.value.length < 4) {
    alert("Veuillez saisir votre code secret.");
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Envoi...';

  try {
    const formData = new FormData();
    
    // ① Récupérer l'ID du type de document sélectionné
    const docId = selectedDocs[0];
    if (!docId) {
      throw new Error('Aucun document sélectionné');
    }
    formData.append('doc_type', docId);
    
    // Trouver le code pour DOC_META
    const selectedType = window.allDocumentTypes.find(t => t.id === docId);
    const docKey = selectedType ? selectedType.code.toLowerCase() : null;
    
    // ② Collecter les données du formulaire dynamique
    const container = document.getElementById('dynamicFields');
    if (!container) {
      throw new Error('Formulaire introuvable');
    }
    
    const inputs = container.querySelectorAll('input, select, textarea');
    const docMeta = getDocMeta(docId);
    
    // Créer une map des inputs par ID
    const inputsMap = {};
    inputs.forEach(input => {
      const id = input.id || input.name;
      if (id) inputsMap[id] = input;
    });
    
    console.group('🔎 INPUTS TROUVÉS:');
    console.log(inputsMap);
    console.groupEnd();
    
    // Mapper chaque champ en cherchant par ID (pas par ordre)
    docMeta.fields.forEach((fieldMeta) => {
      const input = inputsMap[fieldMeta.id];
      if (!input) {
        console.warn(`❌ Champ "${fieldMeta.id}" NON TROUVÉ dans le DOM`);
        return;
      }
      
      let value = input.value?.trim() || '';
      if (!value) {
        console.log(`⊘ ${fieldMeta.id}: vide (input.id=${input.id}, input.name=${input.name})`);
        return; // Ignore les champs vides
      }
      
      let fieldName = fieldMeta.id;
      
      // Mapper les noms des champs
      if (fieldName === 'titulaire') fieldName = 'owner_name';
      if (fieldName === 'numero') fieldName = 'document_number';
      if (fieldName === 'expiration') fieldName = 'date_expiration';
      if (fieldName === 'date_naissance') fieldName = 'date_naissance';
      if (fieldName === 'desc') fieldName = 'description';
      
      console.log(`✓ ${fieldMeta.id} (type=${input.type}) → ${fieldName}: "${value}"`);
      formData.append(fieldName, value);
    });

    // ③ Date de perte (champ requis par le formulaire)
    const datePerte = document.getElementById('lossDate')?.value?.trim();
    if (datePerte) {
      console.log('✓ date_perte:', datePerte);
      formData.append('date_perte', datePerte);
    }
    
    // ④ Ville
    const cityInput = document.getElementById('ville');
    const ville = cityInput?.value?.trim() || '';
    if (ville && ville.length >= 2) {
      console.log('✓ ville:', ville);
      formData.append('ville', ville);
    } else {
      console.warn('❌ Ville manquante ou invalide:', { id: 'ville', value: ville });
    }

    // ⑤ Région et Pays (optionnel)
    const region = document.getElementById('userRegion')?.value?.trim() || '';
    const pays = document.getElementById('userCountry')?.value?.trim() || '';
    if (region) {
      console.log('✓ region:', region);
      formData.append('region', region);
    }
    if (pays) {
      console.log('✓ pays:', pays);
      formData.append('pays', pays);
    }

    // ⑥ Description (combiner lieu précis et circonstances)
    let extraDesc = '';
    const lieuPrecis = document.getElementById('lieu_precis')?.value?.trim();
    const descLieu = document.getElementById('description_lieu')?.value?.trim();
    if (lieuPrecis) extraDesc += `Lieu: ${lieuPrecis}. `;
    if (descLieu) extraDesc += `Circonstances: ${descLieu}. `;

    if (extraDesc) {
      console.log('✓ description (extra):', extraDesc);
      // On l'ajoute à la description existante ou on la crée
      const existingDesc = formData.get('description');
      if (existingDesc) {
        formData.set('description', existingDesc + ' | ' + extraDesc);
      } else {
        formData.append('description', extraDesc);
      }
    }

    // ⑦ Contact - téléphone
    const phoneInput = document.querySelector('input[type="tel"]');
    if (phoneInput?.value?.trim()) {
      console.log('✓ telephone_contact:', phoneInput.value.trim());
      formData.append('telephone_contact', phoneInput.value.trim());
    }
    
    // ⑧ Contact - email
    const emailInput = document.querySelector('input[type="email"]');
    if (emailInput?.value?.trim()) {
      console.log('✓ email_contact:', emailInput.value.trim());
      formData.append('email_contact', emailInput.value.trim());
    }
    
    // ⑨ Mode de contact (optionnel)
    const contactModeEl = document.querySelector('input[name="contact-mode"]:checked');
    if (contactModeEl?.value) {
      formData.append('mode_contact', contactModeEl.value);
    }
    
    // ⑩ État physique (optionnel)
    const etatEl = document.querySelector('input[name="etat"]:checked');
    if (etatEl?.value) {
      formData.append('etat_physique', etatEl.value);
    }

    // ⑪ Niveau urgence (optionnel)
    const urgEl = document.querySelector('.urgency-btn.sel-low, .urgency-btn.sel-medium, .urgency-btn.sel-high');
    if (urgEl?.textContent) {
      formData.append('urgence_niveau', urgEl.textContent.trim());
    }

    // ⑫ Montant récompense (optionnel)
    const rewardAmtEl = document.querySelector('#rewardField input[type="number"]');
    if (rewardAmtEl?.value && rewardAmtEl.parentElement?.style.display !== 'none') {
      formData.append('recompense_montant', rewardAmtEl.value);
    }

    // ⑬ Fichiers photos (optionnel)
    const fileRecto = document.getElementById('fileRecto')?.files?.[0];
    const fileVerso = document.getElementById('fileVerso')?.files?.[0];
    if (fileRecto) formData.append('photo_recto', fileRecto);
    if (fileVerso) formData.append('photo_verso', fileVerso);

    // 🔍 AFFICHE LES DONNÉES ENVOYÉES
    console.group('📤 DONNÉES ENVOYÉES AU BACKEND');
    for (let [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(`  ${key}:`, `File(${value.name}, ${value.size} bytes)`);
      } else {
        console.log(`  ${key}:`, value);
      }
    }
    console.groupEnd();

    // ✅ Envoyer
    const result = await createLostDeclaration(formData);

    // 🔍 AFFICHE LES DONNÉES REÇUES
    console.group('🔄 RÉPONSE DU BACKEND');
    console.log('Success:', result.success);
    console.log('Message:', result.message);
    if (result.errors) {
      console.log('Erreurs:', result.errors);
    }
    if (result.data) {
      console.log('Données reçues:', result.data);
    }
    console.groupEnd();

    if (result.success) {
      const refNum = result.data?.data?.identifiant_doc_dm || result.data?.id || 'DOC-' + Math.random().toString(36).substr(2, 9).toUpperCase();
      
      // Sauvegarder les données pour le PDF
      lastDeclarationData = collectDeclarationData(refNum);
      
      closeConfirmModal();
      document.getElementById('refNumber').textContent = refNum;
      document.getElementById('successOverlay').classList.add('show');
      
      // Effacer le brouillon après succès
      clearDeclarationDraft();
    } else {
      // Afficher les erreurs de validation du backend
      if (result.errors && Object.keys(result.errors).length > 0) {
        console.error('❌ Erreurs de validation:', result.errors);
        let errorMsg = '❌ Validation échouée:\n\n';
        for (const [field, messages] of Object.entries(result.errors)) {
          errorMsg += `▸ ${field}:\n`;
          if (Array.isArray(messages)) {
            messages.forEach(msg => {
              errorMsg += `   ${msg}\n`;
            });
          } else {
            errorMsg += `   ${messages}\n`;
          }
        }
        alert(errorMsg);
      } else {
        alert("❌ " + (result.message || "Erreur lors de l'enregistrement"));
      }
    }
  } catch (error) {
    console.error('❌ Erreur:', error);
    alert("❌ " + error.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Envoyer la déclaration';
  }
}

function downloadDeclarationPdf() {
  if (!lastDeclarationData) {
    alert("Erreur: Données de déclaration introuvables.");
    return;
  }

  if (typeof window.generateSwornStatementPdf === 'function') {
    window.generateSwornStatementPdf(lastDeclarationData);
  } else {
    alert("Le générateur de PDF n'est pas encore prêt. Veuillez patienter.");
    console.error("generateSwornStatementPdf is not defined on window");
  }
}
