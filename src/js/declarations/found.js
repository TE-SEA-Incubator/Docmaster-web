import { createFoundDeclaration, getActiveDocumentTypes } from '../services/api.js';

/**
 * Found Declaration Module
 * Handles UI interactions and API submission for found documents.
 */

// State
let selectedType = null;
const tags = [];
let currentStep = 1;
let map = null;
let marker = null;
let selectedLocation = null;

// Metadata for document types (will be loaded from API)
let DOC_TYPES = [];

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
      <button class="doc-type-card" onclick="selectDocType(this,'${d.id}')">
        <div class="w-9 h-9 rounded-[10px] ${iconWrap} flex items-center justify-center mx-auto mb-2">
          <i class="fa-solid fa-${d.icone || 'file-lines'} ${iconCls} text-lg"></i>
        </div>
        <div class="text-[12px] font-bold text-textMain">${d.nom}</div>
      
      </button>
    `;
    
    // Logic for expiration grid grouping if needed, or just append to one
    expGrid.insertAdjacentHTML('beforeend', html);
  });
}

/**
 * Initialize the found declaration page
 */
export function initFoundDeclaration() {
  // Navigation
  window.goToStep = goToStep;
  window.selectDocType = selectDocType;
  window.submitDeclaration = submitDeclaration;
  window.handleTag = handleTag;
  window.removeTag = removeTag;
  window.selectReward = selectReward;
  window.searchLocation = searchLocation;
  
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
    if (res.success && Array.isArray(res.data) && res.data.length > 0) {
      DOC_TYPES = res.data;
      renderDocTypes();
    } else {
      console.warn('Document types not available or invalid format:', res.data);
      DOC_TYPES = res.data || [];
    }
  }).catch(err => {
    console.error('Failed to load document types:', err);
    DOC_TYPES = [];
  });

  // Defaults
  const dateInput = document.getElementById("lieu-date");
  if (dateInput) dateInput.valueAsDate = new Date();
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
function selectDocType(btn, type) {
  document.querySelectorAll(".doc-type-card").forEach(b => b.classList.remove("selected"));
  btn.classList.add("selected");
  selectedType = type;
  
  const btnNext = document.getElementById("btn-s1");
  if (btnNext) btnNext.disabled = false;
  
  const autreInput = document.getElementById("autre-input");
  if (autreInput) autreInput.classList.toggle("hidden", type !== "autre");
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
 * Submit to API
 */
async function submitDeclaration() {
  const consent = document.getElementById("consent-found");
  if (!consent || !consent.checked) {
    alert("Veuillez accepter les conditions d'utilisation.");
    return;
  }

  const btn = document.getElementById("btn-submit");
  const wrap = document.getElementById("prog-wrap");
  const bar = document.getElementById("upload-bar");
  const pct = document.getElementById("prog-pct");
  const lbl = document.getElementById("prog-label");

  if (wrap) wrap.classList.remove("hidden");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-[12px]"></i> Publication…';
  }

  // Build FormData
  const formData = new FormData();
  const details = document.getElementById('doc-details').value;
  
  // Use the ID directly
  formData.append('doc_type', selectedType);
  formData.append('owner_name', document.getElementById('owner-name').value);
  formData.append('document_number', document.getElementById('doc-num').value);
  
  const etat = document.querySelector('input[name="etat"]:checked');
  formData.append('etat_physique', etat ? etat.value : 'bon');
  
  formData.append('description', `${details}\n\nMots-clés: ${tags.join(', ')}`);
  
  formData.append('ville', document.getElementById('lieu-adresse').value);
  
  // Add region and pays
  formData.append('region', document.getElementById('userRegion')?.value || 'Non spécifiée');
  formData.append('pays', document.getElementById('userCountry')?.value || 'Cameroun');
  
  // Add date found
  const dateFound = document.getElementById('lieu-date')?.value;
  if(dateFound) formData.append('date_perte', dateFound); // Use date_perte for found date too
  
  const contactMode = document.querySelector('input[name="contact-mode"]:checked');
  formData.append('mode_contact', contactMode ? contactMode.value : 'APP_CHAT');
  
  // Add contact info if available
  const phoneEl = document.getElementById('contactPhone') || document.querySelector('input[type="tel"]');
  const emailEl = document.getElementById('contactEmail') || document.querySelector('input[type="email"]');
  if(phoneEl?.value) formData.append('telephone_contact', phoneEl.value);
  if(emailEl?.value) formData.append('email_contact', emailEl.value);

  // Files
  const fileMain = document.getElementById('file-main').files[0];
  if (fileMain) formData.append('photo_recto', fileMain);
  
  const fileExtra1 = document.getElementById('file-extra1').files[0];
  if (fileExtra1) formData.append('photo_verso', fileExtra1);

  // Map Location
  if (selectedLocation) {
    formData.append('found_location', JSON.stringify(selectedLocation));
  }

  // Progress animation simulation (actual upload progress is harder without axios/xhr hooks here, but let's keep the UI alive)
  let p = 0;
  const interval = setInterval(() => {
    p += 10;
    if (p > 90) clearInterval(interval);
    if (bar) bar.style.width = p + "%";
    if (pct) pct.textContent = p + "%";
  }, 200);

  const result = await createFoundDeclaration(formData);

  clearInterval(interval);
  if (bar) bar.style.width = "100%";
  if (pct) pct.textContent = "100%";

  if (result.success) {
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
    alert(result.message);
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
    // Already initialized, just refresh layout
    setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return;
  }

  const mapContainer = document.getElementById('map-inline-container');
  if (!mapContainer) return;

  // Default coordinates (Douala, Cameroon)
  const lat = 4.0511;
  const lng = 9.7679;

  // Initialize Map
  map = L.map('map-inline-container', {
    zoomControl: false, // Custom position below
    attributionControl: false
  }).setView([lat, lng], 14);

  // Google Maps Style Tiles (Roadmap with POIs and Businesses)
  L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    attribution: '&copy; Google Maps'
  }).addTo(map);

  // Reposition zoom control
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  // Add Marker
  marker = L.marker([lat, lng], { 
    draggable: true,
    icon: L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41]
    })
  }).addTo(map);

  // Map Click Logic
  map.on('click', (e) => {
    marker.setLatLng(e.latlng);
    updateSelection(e.latlng);
  });

  // Marker Drag Logic
  marker.on('dragend', () => {
    updateSelection(marker.getLatLng());
  });

  // Initial selection
  updateSelection({ lat, lng });

  // Hide loader
  const loader = document.getElementById('map-loader');
  if (loader) {
    loader.style.opacity = '0';
    setTimeout(() => loader.classList.add('hidden'), 500);
  }
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

  // Update floating badge
  const badge = document.getElementById('location-badge');
  const coordsText = document.getElementById('selected-coords-text');
  const addrText = document.getElementById('selected-address-text');
  
  if (badge) badge.classList.remove('hidden');
  if (coordsText) coordsText.textContent = `${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`;
  
  // Reverse Geocode
  if (addrText) addrText.textContent = 'Identification du lieu...';
  
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}&zoom=18&addressdetails=1`);
    const data = await res.json();
    
    const city = data.address.city || data.address.town || data.address.village || data.address.suburb || document.getElementById('lieu-adresse')?.value || 'Cameroun';
    const address = data.display_name ? data.display_name.split(',').slice(0, 2).join(',') : city;
    
    if (addrText) addrText.textContent = address;
    selectedLocation.city = city;
    
    // Auto-fill input if empty
    const cityInput = document.getElementById('lieu-adresse');
    if (cityInput && !cityInput.value) cityInput.value = city;
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
    // Search restricted to Cameroon (countrycodes=cm)
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

// Helper: Close search results on outside click
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
