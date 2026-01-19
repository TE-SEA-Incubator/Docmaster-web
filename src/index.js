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
function initScrollAnimations() {
  const els = document.querySelectorAll('.animate-on-scroll');
  if (!els.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) e.target.classList.add('in-view');
    });
  }, { threshold: 0.12 });
  els.forEach(el => io.observe(el));
}

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