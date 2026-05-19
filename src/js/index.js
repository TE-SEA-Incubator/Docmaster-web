import { initDatePickers } from "./utils/index.js";
import { protectPage, isPublicPage } from "./utils/auth-guard.js";

// Protéger les pages internes
if (!isPublicPage()) {
  protectPage();
}

document.addEventListener("DOMContentLoaded", () => {
  initDatePickers();
  const navLinks = document.querySelectorAll(".nav-link");
  // On récupère le chemin actuel, par défaut "index.html" si vide
  const currentPath = window.location.pathname.split("/").pop() || "index.html";
  const recherchePath =
    window.location.pathname.split("/rechercher.html").pop() ||
    "rechercher.html";
  const objectPath =
    window.location.pathname.split("/object.html").pop() || "object.html";

  const documentPath =
    window.location.pathname.split("/document.html").pop() || "document.html";

  navLinks.forEach((link) => {
    const anchor = link.querySelector("a");
    if (!anchor) return; // Skip si pas de <a> trouvé
    
    const href = anchor.getAttribute("href");

    if (
      href === currentPath ||
      href === recherchePath ||
      href === objectPath ||
      href === documentPath
    ) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });

  // Update dynamic counts if they exist
  const updateCounts = () => {
    const totalDocs = data.documents.length;
    const countElements = document.querySelectorAll(".dynamic-doc-count");
    countElements.forEach(el => {
      el.textContent = totalDocs;
    });
  };
  updateCounts();
});
// 1. Vos données JSON
window.data = {
  documents: [
    {
      id: 1,
      titre: "Carte D'identité",
      date_retrouve: "13/08/2025",
      statut: "RÉCENT",
      priorite: 1,
      proprietaire: "Jean Dupont",
      retrouve_par: "Pierre Martin",
      pourcentage_restitution: 50,
      image_url: "assets/images/images.jpg",
    },
    {
      id: 2,
      titre: "Passeport",
      date_retrouve: "15/08/2025",
      statut: "RÉCENT",
      priorite: 2,
      proprietaire: "Awa Traoré",
      retrouve_par: "Koffi Paul",
      pourcentage_restitution: 80,
      image_url: "assets/images/passport.jpg",
    },
    {
      "id": 3,
      "titre": "acte de naissance",
      "date_retrouve": "10/08/2025",
      "statut": "RÉCENT",
      "priorite": 3,
      "proprietaire": "Marie Curie",
      "retrouve_par": "Albert Einstein",
      "pourcentage_restitution": 90,
      "image_url": "assets/images/1.webp"
    }
  ],
};

// 2. Fonction pour générer la carte
function renderCards(docs) {
  const container = document.getElementById("document-container");
  if (!container) return; // Sortir si le conteneur n'existe pas
  
  container.innerHTML = ""; // Vide le conteneur

  docs.forEach((doc) => {
    // Calcul de l'offset pour le cercle de progression SVG
    // 125 est la circonférence approximative pour r=20
    const strokeOffset = 125 - (125 * doc.pourcentage_restitution) / 100;

    const cardHTML = `
      <div class="bg-white rounded-[24px] hover:-translate-y-1.5 transition-all overflow-hidden shadow-sm hover:shadow-xl border border-gray-100/50 flex flex-col relative animate-fadeIn group">
  
        <div class="relative">
          <!-- Image -->
          <div class="h-44 bg-gray-50 overflow-hidden">
            <img src="${doc.image_url}" 
                 alt="${doc.titre}" 
                 class="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105">
          </div>

          <!-- Badge Statut -->
          <span class="absolute left-4 top-4 bg-primary text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm z-10">
            ${doc.statut}
          </span>
        </div>

        <!-- Contenu principal -->
        <div class="p-5 flex flex-col flex-1">
          <div class="flex items-center gap-1.5 text-textMuted mb-1">
            <i class="fa-solid fa-calendar-days text-[10px]"></i>
            <span class="font-medium text-[11px]">${doc.date_retrouve}</span>
          </div>
          
          <h2 class="text-lg font-bold text-green-dark mb-3 leading-tight group-hover:text-primary transition-colors">${doc.titre}</h2>

          <div class="space-y-2 mb-6 flex-1">
            <p class="flex items-center gap-2 text-[12.5px] font-medium text-textMuted">
              <i class="fa-solid fa-user text-[11px] opacity-50"></i> 
              Propriétaire: <span class="text-green-mid font-semibold">${doc.proprietaire}</span>
            </p>
            <p class="flex items-center gap-2 text-[12.5px] font-medium text-textMuted">
              <i class="fa-solid fa-location-dot text-[11px] opacity-50"></i> 
              Retrouvé le: <span class="text-green-mid font-semibold">${doc.date_retrouve}</span>
            </p>
          </div>

          <div class="flex items-center justify-between border-t border-gray-100 pt-4 mt-auto">
            <div class="flex items-center gap-2.5">
              <div class="relative w-9 h-9 flex items-center justify-center">
                <svg class="w-full h-full transform -rotate-90">
                  <circle cx="18" cy="18" r="16" stroke="#f1f2f6" stroke-width="3" fill="transparent"/>
                  <circle cx="18" cy="18" r="16" stroke="var(--color-primary)" stroke-width="3" fill="transparent" 
                          stroke-dasharray="100.5" stroke-dashoffset="${100.5 - (100.5 * doc.pourcentage_restitution) / 100}" 
                          class="transition-all duration-1000"/>
                </svg>
                <span class="absolute text-[9px] font-bold">${doc.pourcentage_restitution}%</span>
              </div>
              <span class="font-semibold text-textMuted text-[11px] italic">Restitution</span>
            </div>

            <button class="bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-xl text-[11px] font-bold flex items-center gap-2 shadow-sm transition-all active:scale-95">
              <i class="fa-solid fa-play text-[10px]"></i> Récupérer
            </button>
          </div>
        </div>
      </div>
    `;
    container.innerHTML += cardHTML;
  });
}

// 3. Lancer le chargement au démarrage
document.addEventListener("DOMContentLoaded", () => {
  renderCards(data.documents);
});
// Script simple pour ouvrir/fermer et changer le drapeau
const btn = document.getElementById("langButton");
const dropdown = document.getElementById("langDropdown");

if (btn && dropdown) {
  btn.onclick = () => dropdown.classList.toggle("hidden");
}

function changeLang(code, flagUrl) {
  const currentFlag = document.getElementById("currentFlag");
  if (currentFlag) currentFlag.src = flagUrl;
  
  if (btn) {
    const span = btn.querySelector("span");
    if (span) span.innerText = code.toUpperCase();
  }
  
  if (dropdown) dropdown.classList.add("hidden");
  // Ici tu peux ajouter ta logique de changement de langue (i18next, etc.)
}

document.addEventListener("DOMContentLoaded", () => {
  initTestimonials();
  initStatsCounter();
  initScrollAnimations();
  initStatsDecor();
});

/* Récupération (placeholder) */
function handleRecuperation(id) {
  console.log("Récupération demandée pour id:", id);
  alert("Demande de récupération enregistrée (id: " + id + ")");
}

/* --------------------------
   Testimonials carousel
   -------------------------- */
const TESTIMONIALS = [
  {
    text: "Interface intuitive, système de récompenses motivant. J'ai déjà aidé 12 personnes à retrouver leurs documents. Une vraie communauté solidaire !",
    name: "Sandra EKOTTO",
    meta: "Étudiante, Bafoussam",
  },
  {
    text: "En moins de 48h j'ai récupéré ma carte.",
    name: "Pierre MARTIN",
    meta: "Employé, Douala",
  },
  {
    text: "Service fiable et facile d'utilisation.",
    name: "Amina NDONGO",
    meta: "Commerçante, Yaoundé",
  },
];

function initTestimonials() {
  const track = document.getElementById("testimonialTrack");
  if (!track) return;

  // Render slides
  track.innerHTML = TESTIMONIALS.map(
    (t) => `
    <article class="testimonial-slide" role="group">
      <div class="testimonial-content">${t.text}</div>
      <div class="testimonial-footer">
        <div class="avatar" aria-hidden="true"><i class="fas fa-user"></i></div>
        <div>
          <div class="author">${t.name}</div>
          <div class="author-sub"><i class="fas fa-graduation-cap" aria-hidden="true"></i> ${t.meta}</div>
        </div>
      </div>
      <div class="testimonial-underline" aria-hidden="true"></div>
    </article>
  `,
  ).join("");

  const progressBar = document.getElementById("progressBar");
  const controlsContainer = document.getElementById("testimonialControls");
  // Ensure controls exist (create if missing)
  let prevBtn = document.getElementById("prevBtn");
  let nextBtn = document.getElementById("nextBtn");
  let dotsWrap = document.getElementById("dots");

  if (!controlsContainer) {
    // try to create minimal controls below slider
    const cont = document.createElement("div");
    cont.className = "testimonial-controls";
    cont.id = "testimonialControls";
    track.parentElement.appendChild(cont);
  }

  prevBtn = prevBtn || document.getElementById("prevBtn");
  nextBtn = nextBtn || document.getElementById("nextBtn");
  dotsWrap = dotsWrap || document.getElementById("dots");

  if (!prevBtn || !nextBtn || !dotsWrap) {
    // create controls structure
    const c = document.getElementById("testimonialControls");
    c.innerHTML = `
      <button class="nav-btn" id="prevBtn" aria-label="Précédent"><i class="fas fa-chevron-left"></i></button>
      <div class="indicator-dots" id="dots" role="tablist" aria-label="Indicateurs"></div>
      <button class="nav-btn" id="nextBtn" aria-label="Suivant"><i class="fas fa-chevron-right"></i></button>
    `;
    prevBtn = document.getElementById("prevBtn");
    nextBtn = document.getElementById("nextBtn");
    dotsWrap = document.getElementById("dots");
  }

  // populate dots
  dotsWrap.innerHTML = TESTIMONIALS.map(
    (_, i) =>
      `<button class="indicator${i === 0 ? " active" : ""}" data-index="${i}" aria-label="Témoignage ${i + 1}"></button>`,
  ).join("");

  const slides = Array.from(track.children);
  let idx = 0;
  const DURATION = 6000;
  let autoplayTimer = null;

  function updateTrack() {
    track.style.transform = `translateX(-${idx * 100}%)`;
    Array.from(dotsWrap.children).forEach((d, i) =>
      d.classList.toggle("active", i === idx),
    );
  }

  function animateProgress() {
    if (!progressBar) return;
    progressBar.style.transition = "none";
    progressBar.style.width = "0%";
    // force reflow
    void progressBar.offsetWidth;
    progressBar.style.transition = `width ${DURATION}ms linear`;
    progressBar.style.width = "100%";
  }

  function restartAutoplay() {
    stopAutoplay();
    autoplayTimer = setInterval(() => goTo(idx + 1), DURATION);
    animateProgress();
  }

  function stopAutoplay() {
    if (autoplayTimer) {
      clearInterval(autoplayTimer);
      autoplayTimer = null;
    }
  }

  function goTo(i) {
    idx = ((i % slides.length) + slides.length) % slides.length;
    updateTrack();
    restartAutoplay();
  }
  function next() {
    goTo(idx + 1);
  }
  function prev() {
    goTo(idx - 1);
  }

  // events
  nextBtn.addEventListener("click", next);
  prevBtn.addEventListener("click", prev);
  dotsWrap.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-index]");
    if (!btn) return;
    goTo(Number(btn.dataset.index));
  });

  // pause on hover/focus
  const sliderWrapper =
    track.closest(".testimonials-slider") || track.parentElement;
  sliderWrapper.addEventListener("mouseenter", () => {
    stopAutoplay();
    if (progressBar) {
      // freeze progress by computing current percent and applying without transition
      const computed = window.getComputedStyle(progressBar).width;
      progressBar.style.transition = "none";
      progressBar.style.width = computed;
    }
  });
  sliderWrapper.addEventListener("mouseleave", () => {
    restartAutoplay();
  });

  // visibility
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopAutoplay();
    else restartAutoplay();
  });

  // init
  updateTrack();
  restartAutoplay();
}

/* --------------------------
   Stats counter (improved)
   -------------------------- */
function formatNumber(n, isFloat) {
  if (isFloat) return Number(n).toFixed(1).replace(".", ",");
  return new Intl.NumberFormat("fr-FR").format(Math.round(n));
}

function animateValue(el, from, to, duration = 1200, isFloat = false) {
  const start = performance.now();
  function frame(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    const value = from + (to - from) * eased;
    el.textContent = formatNumber(value, isFloat && value % 1 !== 0);
    if (t < 1) requestAnimationFrame(frame);
    else el.textContent = formatNumber(to, isFloat);
  }
  requestAnimationFrame(frame);
}

function initStatsCounter() {
  const elems = document.querySelectorAll(".stat-number");
  if (!elems.length) return;

  const io = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const raw = el.dataset.target || el.textContent;
        const target = parseFloat(String(raw).replace(",", ".")) || 0;
        const isFloat =
          String(raw).indexOf(".") !== -1 || String(raw).indexOf(",") !== -1;
        const index = Array.from(elems).indexOf(el);
        setTimeout(() => {
          animateValue(el, 0, target, 1400, isFloat);
        }, index * 220);
        obs.unobserve(el);
      });
    },
    { threshold: 0.25 },
  );

  elems.forEach((e) => {
    e.textContent = "0";
    io.observe(e);
  });
}

/* Animate-on-scroll */
function initScrollAnimations() {
  const els = document.querySelectorAll(".animate-on-scroll");
  if (!els.length) return;
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) e.target.classList.add("in-view");
      });
    },
    { threshold: 0.12 },
  );
  els.forEach((el) => io.observe(el));
}

/* --------------------------
   Stats decorative dots (simple JS animation)
   -------------------------- */
let __statsDotsRAF = null;
function initStatsDecor() {
  const section = document.querySelector(".stats-section");
  if (!section) return;
  if (section._decorInitialized) return;
  section._decorInitialized = true;

  const wrapper = document.createElement("div");
  wrapper.className = "stats-decor-wrapper";
  section.appendChild(wrapper);

  const rect = section.getBoundingClientRect();
  const count = Math.max(6, Math.min(18, Math.floor(rect.width / 130)));
  const dots = [];

  for (let i = 0; i < count; i++) {
    const d = document.createElement("div");
    d.className = "stats-decor-dot";
    const size = 4 + Math.random() * 10;
    d.style.width = d.style.height = size + "px";
    d.style.background = "rgba(249,115,22,0.12)";
    d.style.opacity = (0.15 + Math.random() * 0.6).toString();
    d.style.left = Math.random() * 100 + "%";
    d.style.top = Math.random() * 100 + "%";
    wrapper.appendChild(d);

    dots.push({
      el: d,
      baseX: Math.random() * rect.width,
      baseY: Math.random() * rect.height,
      ampX: 6 + Math.random() * 18,
      ampY: 6 + Math.random() * 18,
      speed: 0.4 + Math.random() * 0.9,
      phase: Math.random() * Math.PI * 2,
    });
  }

  let last = performance.now();
  function tick(now) {
    const dt = (now - last) / 1000;
    last = now;
    const bounds = section.getBoundingClientRect();
    dots.forEach((d) => {
      d.phase += d.speed * dt;
      const x = d.baseX + Math.cos(d.phase) * d.ampX;
      const y = d.baseY + Math.sin(d.phase * 1.2) * d.ampY;
      const px = ((x / bounds.width) * 100).toFixed(2) + "%";
      const py = ((y / bounds.height) * 100).toFixed(2) + "%";
      d.el.style.left = px;
      d.el.style.top = py;
      const scale = 0.85 + 0.35 * (0.5 + 0.5 * Math.sin(d.phase * 1.5));
      d.el.style.transform = `translate(-50%,-50%) scale(${scale})`;
    });
    __statsDotsRAF = requestAnimationFrame(tick);
  }
  __statsDotsRAF = requestAnimationFrame(tick);

  const onResize = () => {
    const b = section.getBoundingClientRect();
    dots.forEach((d) => {
      d.baseX = Math.random() * b.width;
      d.baseY = Math.random() * b.height;
    });
  };
  window.addEventListener("resize", onResize);

  section._decorCleanup = () => {
    if (__statsDotsRAF) cancelAnimationFrame(__statsDotsRAF);
    window.removeEventListener("resize", onResize);
    try {
      wrapper.remove();
    } catch (e) {}
  };
}

function cleanupDecor() {
  const section = document.querySelector(".stats-section");
  if (section && section._decorCleanup) section._decorCleanup();
}
