
document.addEventListener("DOMContentLoaded", () => {
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
});
// 1. Vos données JSON
const data = {
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
      image_url: "assets/images/carte.jpeg",
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
      image_url: "assets/images/passport.jpeg",
    },
    {
      id: 3,
      titre: "Acte de Naissance",
      date_retrouve: "03/02/2025",
      statut: "RÉCENT",
      priorite: 3,
      proprietaire: "Koffi Paul",
      retrouve_par: "Theodore Mbarga",
      pourcentage_restitution: 12,
      image_url: "assets/images/acte-naiss.jpeg",
   },
  ],
};

// 2. Fonction pour générer la carte
function renderCards(docs) {
  const container = document.getElementById("document-container");
  container.innerHTML = ""; // Vide le conteneur

  docs.forEach((doc) => {
    // Calcul de l'offset pour le cercle de progression SVG
    // 125 est la circonférence approximative pour r=20
    const strokeOffset = 125 - (125 * doc.pourcentage_restitution) / 100;

    const cardHTML = `
      <div class="bg-white/20  rounded-[35px] hover:-translate-y-2 transition-all overflow-hidden shadow-lg border border-gray-100 flex flex-col relative animate-fadeIn">
  
  <div class="relative">
  <!-- Image -->
  <div class="h-48 bg-gray-200/30 overflow-hidden rounded-t-[35px] group">
    <img src="${doc.image_url}" 
         alt="${doc.titre}" 
         class="w-full h-full object-cover transition-transform duration-500 ease-in-out group-hover:scale-110">
  </div>

  <!-- Badge Statut -->
  <span
    class="absolute left-6 top-48 -translate-y-1/2
           bg-[#2ecc71] text-white
           px-4 py-1
           rounded-full text-xs font-bold uppercase tracking-wider
           shadow-md z-30">
    ${doc.statut}
  </span>

  <!-- Badge Priorité -->
  <div
    class="absolute right-6 top-48 -translate-y-1/2
           bg-orange-400 text-white
           w-8 h-8
           flex items-center justify-center
           rounded-full text-xs font-bold
           shadow-md z-30">
    ${doc.priorite}
  </div>
</div>


  <!-- Contenu principal avec fond blanc légèrement transparent -->
  <div class=" p-6 bg-white/30 relative rounded-b-[35px]">
    

    <div class="flex items-center gap-2 text-gray-400 mb-2">
      <i class="fa-solid fa-calendar-days"></i>
      <span class="font-semibold text-sm">${doc.date_retrouve}</span>
    </div>
    
    <h2 class="text-2xl font-black text-[#1e272e] mb-4">${doc.titre}</h2>

    <div class="space-y-3 mb-8">
      <p class="flex items-center gap-2 font-bold text-gray-600">
        <i class="fa-solid fa-user text-gray-400"></i> Propriétaire: 
        <span class="text-orange-500">${doc.proprietaire}</span>
      </p>
      <p class="flex items-center gap-2 font-bold text-gray-600">
        <i class="fa-solid fa-magnifying-glass text-gray-400"></i> Retrouvé par: 
        <span class="text-orange-500">@ ${doc.retrouve_par}</span>
      </p>
    </div>

    <div class="flex items-center justify-between border-t border-dashed  border-gray-200 pt-6">
      <div class="flex items-center text-xs gap-3">
        <div class="relative w-12 h-12 flex items-center justify-center">
          <svg class="w-full h-full transform -rotate-90">
            <circle cx="24" cy="24" r="20" stroke="#f1f2f6" stroke-width="4" fill="transparent"/>
            <circle cx="24" cy="24" r="20" stroke="#EFA751" stroke-width="4" fill="transparent" 
                    stroke-dasharray="125" stroke-dashoffset="${strokeOffset}" class="transition-all duration-1000"/>
          </svg>
          <span class="absolute text-[10px] font-black">${doc.pourcentage_restitution}%</span>
        </div>
        <span class="font-bold text-gray-500 text-sm italic">Restitution</span>
      </div>

      <button class="bg-[#2ecc71] hover:bg-green-600 text-white px-6 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-green-100 transition-all active:scale-95">
        <i class="fa-solid fa-play text-xs"></i> Récupérer
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
  const btn = document.getElementById('langButton');
  const dropdown = document.getElementById('langDropdown');
  
  btn.onclick = () => dropdown.classList.toggle('hidden');

  function changeLang(code, flagUrl) {
    document.getElementById('currentFlag').src = flagUrl;
    btn.querySelector('span').innerText = code.toUpperCase();
    dropdown.classList.add('hidden');
    // Ici tu peux ajouter ta logique de changement de langue (i18next, etc.)
  }

document.addEventListener('DOMContentLoaded', () => {
  initTestimonials();
  initStatsCounter();
  initScrollAnimations();
  initStatsDecor();
});

/* Récupération (placeholder) */
function handleRecuperation(id) {
  console.log('Récupération demandée pour id:', id);
  alert('Demande de récupération enregistrée (id: ' + id + ')');
}

/* --------------------------
   Testimonials carousel
   -------------------------- */
const TESTIMONIALS = [
  { text: "Interface intuitive, système de récompenses motivant. J'ai déjà aidé 12 personnes à retrouver leurs documents. Une vraie communauté solidaire !", name: "Sandra EKOTTO", meta: "Étudiante, Bafoussam" },
  { text: "En moins de 48h j'ai récupéré ma carte.", name: "Pierre MARTIN", meta: "Employé, Douala" },
  { text: "Service fiable et facile d'utilisation.", name: "Amina NDONGO", meta: "Commerçante, Yaoundé" }
];

function initTestimonials() {
  const track = document.getElementById('testimonialTrack');
  if (!track) return;

  // Render slides
  track.innerHTML = TESTIMONIALS.map(t => `
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
  `).join('');

  const progressBar = document.getElementById('progressBar');
  const controlsContainer = document.getElementById('testimonialControls');
  // Ensure controls exist (create if missing)
  let prevBtn = document.getElementById('prevBtn');
  let nextBtn = document.getElementById('nextBtn');
  let dotsWrap = document.getElementById('dots');

  if (!controlsContainer) {
    // try to create minimal controls below slider
    const cont = document.createElement('div');
    cont.className = 'testimonial-controls';
    cont.id = 'testimonialControls';
    track.parentElement.appendChild(cont);
  }

  prevBtn = prevBtn || document.getElementById('prevBtn');
  nextBtn = nextBtn || document.getElementById('nextBtn');
  dotsWrap = dotsWrap || document.getElementById('dots');

  if (!prevBtn || !nextBtn || !dotsWrap) {
    // create controls structure
    const c = document.getElementById('testimonialControls');
    c.innerHTML = `
      <button class="nav-btn" id="prevBtn" aria-label="Précédent"><i class="fas fa-chevron-left"></i></button>
      <div class="indicator-dots" id="dots" role="tablist" aria-label="Indicateurs"></div>
      <button class="nav-btn" id="nextBtn" aria-label="Suivant"><i class="fas fa-chevron-right"></i></button>
    `;
    prevBtn = document.getElementById('prevBtn');
    nextBtn = document.getElementById('nextBtn');
    dotsWrap = document.getElementById('dots');
  }

  // populate dots
  dotsWrap.innerHTML = TESTIMONIALS.map((_, i) => `<button class="indicator${i === 0 ? ' active' : ''}" data-index="${i}" aria-label="Témoignage ${i + 1}"></button>`).join('');

  const slides = Array.from(track.children);
  let idx = 0;
  const DURATION = 6000;
  let autoplayTimer = null;

  function updateTrack() {
    track.style.transform = `translateX(-${idx * 100}%)`;
    Array.from(dotsWrap.children).forEach((d, i) => d.classList.toggle('active', i === idx));
  }

  function animateProgress() {
    if (!progressBar) return;
    progressBar.style.transition = 'none';
    progressBar.style.width = '0%';
    // force reflow
    void progressBar.offsetWidth;
    progressBar.style.transition = `width ${DURATION}ms linear`;
    progressBar.style.width = '100%';
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
  function next() { goTo(idx + 1); }
  function prev() { goTo(idx - 1); }

  // events
  nextBtn.addEventListener('click', next);
  prevBtn.addEventListener('click', prev);
  dotsWrap.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-index]');
    if (!btn) return;
    goTo(Number(btn.dataset.index));
  });

  // pause on hover/focus
  const sliderWrapper = track.closest('.testimonials-slider') || track.parentElement;
  sliderWrapper.addEventListener('mouseenter', () => {
    stopAutoplay();
    if (progressBar) {
      // freeze progress by computing current percent and applying without transition
      const computed = window.getComputedStyle(progressBar).width;
      progressBar.style.transition = 'none';
      progressBar.style.width = computed;
    }
  });
  sliderWrapper.addEventListener('mouseleave', () => {
    restartAutoplay();
  });

  // visibility
  document.addEventListener('visibilitychange', () => {
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
  if (isFloat) return Number(n).toFixed(1).replace('.', ',');
  return new Intl.NumberFormat('fr-FR').format(Math.round(n));
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
  const elems = document.querySelectorAll('.stat-number');
  if (!elems.length) return;

  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const raw = el.dataset.target || el.textContent;
      const target = parseFloat(String(raw).replace(',', '.')) || 0;
      const isFloat = String(raw).indexOf('.') !== -1 || String(raw).indexOf(',') !== -1;
      const index = Array.from(elems).indexOf(el);
      setTimeout(() => {
        animateValue(el, 0, target, 1400, isFloat);
      }, index * 220);
      obs.unobserve(el);
    });
  }, { threshold: 0.25 });

  elems.forEach(e => {
    e.textContent = '0';
    io.observe(e);
  });
}

/* Animate-on-scroll */

const track = document.getElementById("testimonialTrack");
const slides = Array.from(track.children);
const nextBtn = document.getElementById("nextBtn");
const prevBtn = document.getElementById("prevBtn");
const dotsContainer = document.getElementById("dots");

let currentIndex = 0;

slides.forEach((_, i) => {
  const dot = document.createElement("div");
  dot.classList.add("indicator");
  if (i === 0) dot.classList.add("active");
  dot.addEventListener("click", () => goToSlide(i));
  dotsContainer.appendChild(dot);
});
const dots = Array.from(dotsContainer.children);

function updateDots() {
  dots.forEach(dot => dot.classList.remove("active"));
  dots[currentIndex].classList.add("active");
}

function goToSlide(index) {
  currentIndex = index;
  track.style.transform = `translateX(-${currentIndex * 100}%)`;
  updateDots();
}

nextBtn.addEventListener("click", () => {
  currentIndex = (currentIndex + 1) % slides.length;
  goToSlide(currentIndex);
});

prevBtn.addEventListener("click", () => {
  currentIndex = (currentIndex - 1 + slides.length) % slides.length;
  goToSlide(currentIndex);
});

// index.js
document.addEventListener("DOMContentLoaded", () => {
  const animatedSections = document.querySelectorAll(".animate-on-scroll");

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
        }
      });
    },
    { threshold: 0.2 }
  );

  animatedSections.forEach((section) => observer.observe(section));
});


/* --------------------------
   Stats decorative dots (simple JS animation)
   -------------------------- */
let __statsDotsRAF = null;
function initStatsDecor() {
  const section = document.querySelector('.stats-section');
  if (!section) return;
  if (section._decorInitialized) return;
  section._decorInitialized = true;

  const wrapper = document.createElement('div');
  wrapper.className = 'stats-decor-wrapper';
  section.appendChild(wrapper);

  const rect = section.getBoundingClientRect();
  const count = Math.max(6, Math.min(18, Math.floor(rect.width / 130)));
  const dots = [];

  for (let i = 0; i < count; i++) {
    const d = document.createElement('div');
    d.className = 'stats-decor-dot';
    const size = 4 + Math.random() * 10;
    d.style.width = d.style.height = size + 'px';
    d.style.background = 'rgba(249,115,22,0.12)';
    d.style.opacity = (0.15 + Math.random() * 0.6).toString();
    d.style.left = Math.random() * 100 + '%';
    d.style.top = Math.random() * 100 + '%';
    wrapper.appendChild(d);

    dots.push({
      el: d,
      baseX: Math.random() * rect.width,
      baseY: Math.random() * rect.height,
      ampX: 6 + Math.random() * 18,
      ampY: 6 + Math.random() * 18,
      speed: 0.4 + Math.random() * 0.9,
      phase: Math.random() * Math.PI * 2
    });
  }

  let last = performance.now();
  function tick(now) {
    const dt = (now - last) / 1000;
    last = now;
    const bounds = section.getBoundingClientRect();
    dots.forEach(d => {
      d.phase += d.speed * dt;
      const x = d.baseX + Math.cos(d.phase) * d.ampX;
      const y = d.baseY + Math.sin(d.phase * 1.2) * d.ampY;
      const px = ((x / bounds.width) * 100).toFixed(2) + '%';
      const py = ((y / bounds.height) * 100).toFixed(2) + '%';
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
    dots.forEach(d => {
      d.baseX = Math.random() * b.width;
      d.baseY = Math.random() * b.height;
    });
  };
  window.addEventListener('resize', onResize);

  section._decorCleanup = () => {
    if (__statsDotsRAF) cancelAnimationFrame(__statsDotsRAF);
    window.removeEventListener('resize', onResize);
    try { wrapper.remove(); } catch (e) {}
  };
}

function cleanupDecor() {
  const section = document.querySelector('.stats-section');
  if (section && section._decorCleanup) section._decorCleanup();
}

