// found.js - Version corrigée avec logs détaillés

import { createFoundDeclaration, getActiveDocumentTypes } from '../services/api.js';

// State
let selectedType = null;
const tags = [];
let currentStep = 1;
let map = null;
let marker = null;
let selectedLocation = null;

// Metadata for document types (will be loaded from API)
let DOC_TYPES = [];

// Helper to check if a string is a valid UUID
function isValidUUID(str) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Render document type cards grouped by expiration
 */
function renderDocTypes() {
  const expGrid = document.getElementById("type-grid-expiring");
  const nexGrid = document.getElementById("type-grid-non-expiring");
  
  if (!expGrid || !nexGrid) return;
  
  expGrid.innerHTML = '';
  nexGrid.innerHTML = '';

  DOC_TYPES.forEach(d => {
    const iconCls = d.icone === 'id-card' ? 'text-green-mid' : (d.icone === 'passport' ? 'text-blue-500' : 'text-primary');
    const iconWrap = d.icone === 'id-card' ? 'bg-green-light' : (d.icone === 'passport' ? 'bg-blue-50' : 'bg-primary/10');
    
    const html = `
      <button class="doc-type-card" data-doc-type-id="${d.id}" data-doc-type-code="${d.code}" onclick="selectDocType(this,'${d.id}','${d.code}')">
        <div class="w-9 h-9 rounded-[10px] ${iconWrap} flex items-center justify-center mx-auto mb-2">
          <i class="fa-solid fa-${d.icone || 'file-lines'} ${iconCls} text-lg"></i>
        </div>
        <div class="text-[12px] font-bold text-textMain">${d.nom}</div>
      </button>
    `;
    
    expGrid.insertAdjacentHTML('beforeend', html);
  });
}

/**
 * Initialize the found declaration page
 */
export function initFoundDeclaration() {
  console.log('🚀 [found.js] Initialisation de la page de déclaration de trouvaille');
  
  // Navigation
  window.goToStep = goToStep;
  window.selectDocType = selectDocType;
  window.submitDeclaration = submitDeclaration;
  window.handleTag = handleTag;
  window.removeTag = removeTag;
  window.selectReward = selectReward;
  window.searchLocation = searchLocation;
  window.useCurrentLocation = useCurrentLocation;
  
  // Real-time search setup
  const searchInput = document.getElementById('map-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(() => searchLocation(), 400));
  }
  
  // File previews
  window.fileChg = fileChg;
  window.drgOver = drgOver;
  window.drgLeave = drgLeave;
  window.drgDrop = drgDrop;

  // Render types (async)
  getActiveDocumentTypes().then(res => {
    console.log('📄 [found.js] Types de documents reçus:', res);
    if (res.success && Array.isArray(res.data) && res.data.length > 0) {
      DOC_TYPES = res.data;
      renderDocTypes();
      console.log('✅ [found.js] Types de documents chargés:', DOC_TYPES.length);
    } else {
      console.warn('⚠️ [found.js] Types de documents non disponibles:', res.data);
      DOC_TYPES = res.data || [];
    }
  }).catch(err => {
    console.error('❌ [found.js] Erreur chargement types documents:', err);
    DOC_TYPES = [];
  });

  // Defaults
  const dateInput = document.getElementById("lieu-date");
  if (dateInput && dateInput.type === "date") {
    dateInput.valueAsDate = new Date();
  }
}

/**
 * Change wizard step
 */
function goToStep(n) {
  // Simple validation before moving
  if (n === 2 && !selectedType) {
    alert("Veuillez sélectionner un type de document.");
    return;
  }
  
  if (n === 3 && currentStep === 2) {
    const ownerName = document.getElementById('owner-name').value;
    if (!ownerName || ownerName.trim().length < 2) {
      alert("Veuillez entrer le nom du propriétaire (ou 'Inconnu' si illisible).");
      return;
    }
  }

  if (n === 4 && currentStep === 3) {
    const ville = document.getElementById('lieu-adresse').value;
    if (!ville || ville.trim().length < 2) {
      alert("Veuillez préciser la ville ou le quartier.");
      return;
    }
  }

  for (let i = 1; i <= 5; i++) {
    const panel = document.getElementById("panel-" + i);
    if (!panel) continue;
    
    panel.classList.add("hidden");
    const si = document.getElementById("si-" + i);
    const sc = document.getElementById("sc-" + i);
    
    if (i < n) {
      si.className = "step-item done";
      sc.className = "step-circle done";
      sc.innerHTML = '<i class="fa-solid fa-check text-[9px]"></i>';
    } else if (i === n) {
      si.className = "step-item active";
      sc.className = "step-circle active";
      sc.textContent = i;
    } else {
      si.className = "step-item pending";
      sc.className = "step-circle pending";
      sc.textContent = i;
    }
  }

  const activePanel = document.getElementById("panel-" + n);
  if (activePanel) {
    activePanel.classList.remove("hidden");
    activePanel.classList.add("panel-content");
  }
  
  currentStep = n;
  if (n === 3) {
    setTimeout(initInlineMap, 100);
  }
  if (n === 5) fillRecap();
  
  const panelArea = document.getElementById("panel-area");
  if (panelArea) panelArea.scrollTo({ top: 0, behavior: "smooth" });
}

/**
 * Document type selection
 */
function selectDocType(btn, typeId, typeCode) {
  console.log('📌 [found.js] Type sélectionné - ID:', typeId, 'Code:', typeCode);
  
  document.querySelectorAll(".doc-type-card").forEach(b => b.classList.remove("selected"));
  btn.classList.add("selected");
  
  // Store the UUID for API submission (CRITICAL FIX)
  selectedType = typeId;
  
  const btnNext = document.getElementById("btn-s1");
  if (btnNext) btnNext.disabled = false;
  
  const autreInput = document.getElementById("autre-input");
  if (autreInput) autreInput.classList.toggle("hidden", typeId !== "autre");
}

/**
 * Handle tags (mots-clés)
 */
function handleTag(e) {
  if ((e.key === "Enter" || e.key === ",") && e.target.value.trim()) {
    e.preventDefault();
    const v = e.target.value.trim().replace(",", "");
    if (v && !tags.includes(v)) {
      tags.push(v);
      const t = document.createElement("span");
      t.className = "tag";
      t.innerHTML = `${v}<button onclick="removeTag(this,'${v}')">✕</button>`;
      document.getElementById("tags-list").appendChild(t);
    }
    e.target.value = "";
  }
}

function removeTag(btn, v) {
  const i = tags.indexOf(v);
  if (i > -1) tags.splice(i, 1);
  btn.parentElement.remove();
}

/**
 * Reward selection UI
 */
function selectReward(card, type) {
  document.querySelectorAll(".reward-card").forEach(c => c.classList.remove("selected"));
  card.classList.add("selected");
}

/**
 * File handling
 */
function fileChg(input, prevId, imgId, zoneId) {
  const file = input.files[0];
  if (!file) return;
  showPreview(file, prevId, imgId, zoneId);
}

function drgOver(e, id) { e.preventDefault(); document.getElementById(id).classList.add("drag-over"); }
function drgLeave(id) { document.getElementById(id).classList.remove("drag-over"); }
function drgDrop(e, zoneId, prevId, imgId) {
  e.preventDefault();
  drgLeave(zoneId);
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith("image/")) showPreview(file, prevId, imgId, zoneId);
}

function showPreview(file, prevId, imgId, zoneId) {
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById(imgId).src = e.target.result;
    document.getElementById(prevId).classList.remove("hidden");
    const ph = prevId.replace("prev", "phold");
    const phEl = document.getElementById(ph);
    if (phEl) phEl.classList.add("hidden");
    if (zoneId) document.getElementById(zoneId).classList.add("has-file");
  };
  reader.readAsDataURL(file);
}

/**
 * Fill Recap sidebar
 */
function fillRecap() {
  const recapType = document.getElementById("recap-doc-type");
  if (recapType) {
    const meta = DOC_TYPES.find(d => d.id === selectedType);
    recapType.textContent = meta ? meta.nom : (selectedType === 'autre' ? document.getElementById('autre-type-input')?.value : "—");
  }
  
  const addr = document.getElementById("lieu-adresse");
  const recapLieu = document.getElementById("recap-lieu");
  if (recapLieu) recapLieu.textContent = addr ? (addr.value || "—") : "—";
  
  const dateInput = document.getElementById("lieu-date");
  const recapDate = document.getElementById("recap-date");
  if (recapDate && dateInput && dateInput.value) {
    recapDate.textContent = new Date(dateInput.value).toLocaleDateString("fr-FR");
  }
  
  let photosCount = 0;
  ["file-main", "file-extra1", "file-extra2", "file-extra3"].forEach(id => {
    const input = document.getElementById(id);
    if (input && input.files.length) photosCount++;
  });
  const recapPhotos = document.getElementById("recap-photos");
  if (recapPhotos) recapPhotos.textContent = `${photosCount} photo(s)`;
}

/**
 * Submit to API - VERSION CORRIGÉE AVEC LOGS DÉTAILLÉS
 */
async function submitDeclaration() {
  console.log('📤 [submitDeclaration] Début de la soumission');
  
  const consent = document.getElementById("consent-found");
  if (!consent || !consent.checked) {
    alert("Veuillez accepter les conditions d'utilisation.");
    return;
  }

  // Validate selected type
  if (!selectedType) {
    alert("Veuillez sélectionner un type de document.");
    return;
  }

  const btn = document.getElementById("btn-submit");
  const wrap = document.getElementById("prog-wrap");
  const bar = document.getElementById("upload-bar");

  if (wrap) wrap.classList.remove("hidden");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-[12px]"></i> Publication…';
  }

  // Build FormData
  const formData = new FormData();
  
  // Get form values
  const ownerName = document.getElementById('owner-name').value.trim();
  const documentNumber = document.getElementById('doc-num').value.trim() || '';
  const etat = document.querySelector('input[name="etat"]:checked');
  const details = document.getElementById('doc-details').value.trim() || '';
  const ville = document.getElementById('lieu-adresse').value.trim() || '';
  const dateFound = document.getElementById('lieu-date')?.value || new Date().toISOString().split('T')[0];
  const contactMode = document.querySelector('input[name="contact-mode"]:checked');
  const phoneEl = document.getElementById('contact-tel');
  const emailEl = document.querySelector('input[type="email"]');
  
  // CRITICAL: Use the UUID for doc_type, not the name
  console.log('🔍 [submitDeclaration] selectedType (UUID):', selectedType);
  console.log('🔍 [submitDeclaration] ownerName:', ownerName);
  console.log('🔍 [submitDeclaration] documentNumber:', documentNumber);
  console.log('🔍 [submitDeclaration] ville:', ville);
  
  // Validate required fields
  if (!ownerName) {
    alert("Veuillez entrer le nom du propriétaire.");
    if (btn) btn.disabled = false;
    if (wrap) wrap.classList.add("hidden");
    return;
  }
  
  if (!ville) {
    alert("Veuillez préciser la ville ou le quartier.");
    if (btn) btn.disabled = false;
    if (wrap) wrap.classList.add("hidden");
    return;
  }
  
  // Append fields according to backend expectations
  formData.append('doc_type', selectedType);  // UUID format
  formData.append('owner_name', ownerName);
  formData.append('document_number', documentNumber);
  formData.append('etat_physique', etat ? etat.value : 'bon');
  formData.append('ville', ville);
  formData.append('region', 'Non spécifiée');
  formData.append('pays', 'Cameroun');
  formData.append('date_perte', dateFound);  // For FOUND declarations, date_perte is used as date found
  formData.append('mode_contact', contactMode ? contactMode.value : 'APP_CHAT');
  
  // Build description with tags
  let description = details;
  if (tags.length > 0) {
    description = description ? `${description}\n\nMots-clés: ${tags.join(', ')}` : `Mots-clés: ${tags.join(', ')}`;
  }
  formData.append('description', description);
  
  // Add contact info if available
  if (phoneEl?.value) {
    formData.append('telephone_contact', phoneEl.value);
  }
  if (emailEl?.value) {
    formData.append('email_contact', emailEl.value);
  }

  // Files
  const fileMain = document.getElementById('file-main').files[0];
  if (fileMain) {
    console.log('📷 [submitDeclaration] Photo recto ajoutée:', fileMain.name, fileMain.size, fileMain.type);
    formData.append('photo_recto', fileMain);
  } else {
    console.warn('⚠️ [submitDeclaration] Aucune photo recto');
  }
  
  const fileExtra1 = document.getElementById('file-extra1').files[0];
  if (fileExtra1) {
    console.log('📷 [submitDeclaration] Photo verso ajoutée:', fileExtra1.name);
    formData.append('photo_verso', fileExtra1);
  }

  // Version alternative - envoyer les coordonnées séparément
// Remplacer la section des lignes 382-395 par ceci :

  // Version alternative - envoyer les coordonnées séparément
  if (selectedLocation) {
    if (!selectedLocation.city) selectedLocation.city = ville;
    
    // Normaliser les clés (gérer à la fois 'lng' et 'long')
    const lat = selectedLocation.lat;
    const lng = selectedLocation.long || selectedLocation.lng;
    const city = selectedLocation.city;
    
    // Vérifier que les valeurs sont valides
    if (lat === undefined || lng === undefined) {
      console.error('❌ [submitDeclaration] Coordonnées invalides:', selectedLocation);
    } else {
      // Option 1: Envoyer en JSON string
      const locationObj = { lat, long: lng, city };
      formData.append('found_location', JSON.stringify(locationObj));
      
      // Option 2: Ajouter aussi les champs individuels comme fallback
      formData.append('found_location_lat', lat.toString());
      formData.append('found_location_long', lng.toString());
      formData.append('found_location_city', city);
      
      console.log('📍 [submitDeclaration] Location ajoutée:', locationObj);
    }
  }

  // Log all formData entries for debugging
  console.log('📋 [submitDeclaration] Contenu du FormData:');
  for (let pair of formData.entries()) {
    if (pair[0].includes('photo')) {
      console.log(`  ${pair[0]}: [FILE] ${pair[1] instanceof File ? pair[1].name : pair[1]}`);
    } else {
      console.log(`  ${pair[0]}: ${pair[1]}`);
    }
  }

  // Progress animation simulation
  let p = 0;
  const interval = setInterval(() => {
    p += 10;
    if (p > 90) clearInterval(interval);
    if (bar) bar.style.width = p + "%";
  }, 200);

  try {
    console.log('🚀 [submitDeclaration] Appel API createFoundDeclaration...');
    const result = await createFoundDeclaration(formData);
    console.log('📡 [submitDeclaration] Réponse API:', result);

    clearInterval(interval);
    if (bar) bar.style.width = "100%";

    if (result.success) {
      console.log('✅ [submitDeclaration] Succès!');
      document.getElementById("panel-5").classList.add("hidden");
      const successPanel = document.getElementById("panel-success");
      successPanel.classList.remove("hidden");
      successPanel.classList.add("panel-content");
      
      // Set ref
      document.getElementById("decl-ref").textContent = result.data.identifiant_doc_dm || "DOC-FND-SUCCESS";
      
      // Update steps
      for (let i = 1; i <= 5; i++) {
        const sc = document.getElementById("sc-" + i);
        if (sc) {
          sc.className = "step-circle done";
          sc.innerHTML = '<i class="fa-solid fa-check text-[9px]"></i>';
        }
        const si = document.getElementById("si-" + i);
        if (si) si.className = "step-item done";
      }
    } else {
      console.error('❌ [submitDeclaration] Erreur API:', result.message, result.errors);
      let errorMessage = result.message || 'Erreur lors de la publication.';
      if (result.errors && Object.keys(result.errors).length > 0) {
        errorMessage += '\n\nDétails:\n' + Object.entries(result.errors)
          .map(([key, val]) => `- ${key}: ${val}`)
          .join('\n');
      }
      alert(errorMessage);
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-paper-plane text-[12px]"></i> Réessayer';
      }
      if (wrap) wrap.classList.add("hidden");
    }
  } catch (error) {
    console.error('💥 [submitDeclaration] Exception:', error);
    clearInterval(interval);
    alert('Erreur de connexion au serveur. Veuillez vérifier votre connexion et réessayer.');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-paper-plane text-[12px]"></i> Réessayer';
    }
    if (wrap) wrap.classList.add("hidden");
  }
}

/**
 * Map Integration Logic (Inline)
 */
function initInlineMap() {
  if (map) {
    setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return;
  }

  const mapContainer = document.getElementById('map-inline-container');
  if (!mapContainer) return;

  const lat = 4.0511;
  const lng = 9.7679;

  map = L.map('map-inline-container', {
    zoomControl: false,
    attributionControl: false
  }).setView([lat, lng], 14);

  L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    attribution: '&copy; Google Maps'
  }).addTo(map);

  L.control.zoom({ position: 'bottomright' }).addTo(map);

  marker = L.marker([lat, lng], { 
    draggable: true,
    icon: L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41]
    })
  }).addTo(map);

  map.on('click', (e) => {
    marker.setLatLng(e.latlng);
    updateSelection(e.latlng);
  });

  marker.on('dragend', () => {
    updateSelection(marker.getLatLng());
  });

  updateSelection({ lat, lng });

  const loader = document.getElementById('map-loader');
  if (loader) {
    loader.style.opacity = '0';
    setTimeout(() => loader.classList.add('hidden'), 500);
  }
}

/**
 * Use Browser Geolocation
 */
async function useCurrentLocation() {
  if (!navigator.geolocation) {
    alert("La géolocalisation n'est pas supportée par votre navigateur.");
    return;
  }

  const btn = document.querySelector('button[onclick="useCurrentLocation()"]');
  const originalHtml = btn.innerHTML;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Localisation...';
  btn.disabled = true;

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const latlng = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      map.setView(latlng, 16);
      marker.setLatLng(latlng);
      updateSelection(latlng);
      
      btn.innerHTML = originalHtml;
      btn.disabled = false;
    },
    (error) => {
      console.error("Geolocation error:", error);
      alert("Impossible de récupérer votre position. Assurez-vous d'avoir autorisé l'accès.");
      btn.innerHTML = originalHtml;
      btn.disabled = false;
    },
    { enableHighAccuracy: true }
  );
}

/**
 * Update selection state and UI
 */
async function updateSelection(latlng) {
  selectedLocation = {
    lat: latlng.lat,
    long: latlng.lng,
    city: ''
  };

  const badge = document.getElementById('location-badge');
  const coordsText = document.getElementById('selected-coords-text');
  const addrText = document.getElementById('selected-address-text');
  
  if (badge) badge.classList.remove('hidden');
  if (coordsText) coordsText.textContent = `${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`;
  
  if (addrText) addrText.textContent = 'Identification du lieu...';
  
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}&zoom=18&addressdetails=1`);
    const data = await res.json();
    
    const city = data.address.city || data.address.town || data.address.village || data.address.suburb || document.getElementById('lieu-adresse')?.value || 'Cameroun';
    const address = data.display_name ? data.display_name.split(',').slice(0, 2).join(',') : city;
    
    if (addrText) addrText.textContent = address;
    selectedLocation.city = city;
    
    const cityInput = document.getElementById('lieu-adresse');
    if (cityInput) cityInput.value = city;
  } catch (err) {
    if (addrText) addrText.textContent = 'Lieu sélectionné';
    selectedLocation.city = document.getElementById('lieu-adresse')?.value || 'Cameroun';
  }
}

/**
 * Search Location with Nominatim
 */
async function searchLocation() {
  const input = document.getElementById('map-search-input');
  const query = input?.value.trim();
  if (!query) return;

  const resultsBox = document.getElementById('map-search-results');
  resultsBox.innerHTML = '<div class="p-3 text-[12px] text-textMuted italic flex items-center gap-2"><i class="fa-solid fa-spinner fa-spin"></i> Recherche...</div>';
  resultsBox.classList.remove('hidden');

  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=cm&limit=5`);
    const data = await res.json();
    
    if (data.length === 0) {
      resultsBox.innerHTML = '<div class="p-3 text-[12px] text-red-500 italic">Aucun résultat trouvé au Cameroun.</div>';
      return;
    }

    resultsBox.innerHTML = data.map(item => `
      <div class="p-3 hover:bg-surface2 cursor-pointer border-b border-borderMain last:border-0 transition-colors" 
           onclick="selectSearchResult(${item.lat}, ${item.lon}, '${item.display_name.replace(/'/g, "\\'")}')">
        <div class="text-[12.5px] font-bold text-textMain truncate">${item.display_name.split(',')[0]}</div>
        <div class="text-[11px] text-textMuted truncate">${item.display_name.split(',').slice(1).join(',')}</div>
      </div>
    `).join('');
  } catch (err) {
    resultsBox.innerHTML = '<div class="p-3 text-[12px] text-red-500 italic">Erreur de connexion.</div>';
  }
}

/**
 * Handle search result selection
 */
window.selectSearchResult = (lat, lon, displayName) => {
  const latlng = { lat: parseFloat(lat), lng: parseFloat(lon) };
  map.setView(latlng, 16);
  marker.setLatLng(latlng);
  updateSelection(latlng);
  
  document.getElementById('map-search-results').classList.add('hidden');
  document.getElementById('map-search-input').value = displayName.split(',')[0];
};

/**
 * Debounce helper
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Close search results on outside click
document.addEventListener('click', (e) => {
  const box = document.getElementById('map-search-results');
  const input = document.getElementById('map-search-input');
  if (box && !box.contains(e.target) && e.target !== input) {
    box.classList.add('hidden');
  }
});

// Global Exposure
window.searchLocation = searchLocation;
window.copyRef = function() {
  const ref = document.getElementById("decl-ref").textContent;
  navigator.clipboard.writeText(ref).then(() => alert("Référence copiée !"));
};