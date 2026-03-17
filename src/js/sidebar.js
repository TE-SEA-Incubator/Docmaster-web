/**
 * SIDEBAR.JS — Composant sidebar réutilisable
 *
 * Usage dans n'importe quelle page :
 *   1. Ajouter <div id="sidebar-root"></div> là où tu veux le sidebar
 *   2. Inclure <script src="./js/sidebar.js"></script> (après auth.js)
 *
 * Le lien actif est détecté automatiquement via window.location.pathname.
 * openSb() / closeSb() sont exposés globalement.
 */

// ── Définition des liens de navigation ──────────────────────────────────────
const SIDEBAR_NAV = {
  principal: [
    {
      href: "dashboard.html",
      icon: "fa-house",
      label: "Tableau de bord",
    },
    {
      href: "declarer.html",
      icon: "fa-triangle-exclamation",
      label: "Déclarer une perte",
    },
    {
      href: "Mesdocument.html",
      icon: "fa-folder-open",
      label: "Mes Documents",
    },
    {
      href: "trouverdocument.html",
      icon: "fa-file-circle-check",
      label: "Déclarer trouvé",
    },
    {
      href: "rechercher.html",
      icon: "fa-magnifying-glass",
      label: "Rechercher",
    },
    {
      href: "#",
      icon: "fa-envelope",
      label: "Messages",
      badge: "5",
    },
    {
      href: "mesGains.html",
      icon: "fa-wallet",
      label: "Mes Gains",
    },
  ],
  compte: [
    {
      href: "Abonnement.html",
      icon: "fa-crown",
      label: "Abonnement",
    },
    {
      href: "parrainage.html?v=20260317",
      icon: "fa-users-gear",
      label: "Parrainage",
    },
    {
      href: "infosProfil.html",
      icon: "fa-gear",
      label: "Paramètres",
    },
    {
      href: "#",
      icon: "fa-right-from-bracket",
      label: "Déconnexion",
      isLogout: true,
    },
  ],
};

// ── Détection de la page active ─────────────────────────────────────────────
function _sbCurrentPage() {
  return window.location.pathname.split("/").pop() || "index.html";
}

function _sbIsActive(href) {
  if (href === "#") return false;
  const current = _sbCurrentPage();
  const normalized = href.split("/").pop().split("?")[0].split("#")[0];
  return normalized === current;
}

// ── Génération d'un lien nav ─────────────────────────────────────────────────
function _sbNavItem(item) {
  const active = _sbIsActive(item.href);
  const baseClass =
    "sb-item flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[13px] font-medium relative transition-all";
  const stateClass = active
    ? "text-white"
    : item.isLogout
      ? "text-red-400/70 hover:bg-white/5 hover:text-red-400"
      : "text-white/60 hover:bg-white/5 hover:text-white/90";

  const iconClass = active
    ? "fa-solid " + item.icon + " w-4 text-center text-primary"
    : "fa-solid " + item.icon + " w-4 text-center opacity-80";

  const badge = item.badge
    ? `<span class="ml-auto bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">${item.badge}</span>`
    : "";

  const extraAttr = item.isLogout ? ' data-logout="true"' : "";

  return `
    <a class="${baseClass} ${stateClass}" href="${item.href}"${active ? ' aria-current="page"' : ""}${extraAttr}>
      <i class="${iconClass}"></i>
      ${item.label}
      ${badge}
    </a>`;
}

// ── Rendu complet du sidebar ─────────────────────────────────────────────────
function _sbRender() {
  return `
    <!-- Overlay mobile -->
    <div class="sb-overlay" id="overlay" onclick="closeSb()"></div>

    <!-- Sidebar -->
    <aside
      class="sidebar w-[var(--sidebar,260px)] bg-green-dark flex flex-col"
      id="sidebar"
    >
      <!-- Logo -->
      <div class="flex items-center gap-3 px-5 py-4 border-b border-white/10 flex-shrink-0">
        <img src="./assets/images/logo.png" alt="DocMaster" class="h-9 w-auto object-contain rounded" />
        <button
          class="ml-auto text-white/40 hover:text-white lg:hidden transition-colors"
          onclick="closeSb()"
          aria-label="Fermer le menu"
        >
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <!-- Nav links -->
      <div class="flex-1 overflow-y-auto py-2 custom-scroll">
        <div class="px-5 pt-4 pb-1 text-[9.5px] font-bold text-white/30 uppercase tracking-widest">Principal</div>
        <nav class="flex flex-col gap-0.5 px-2" aria-label="Navigation principale">
          ${SIDEBAR_NAV.principal.map(_sbNavItem).join("")}
        </nav>

        <div class="px-5 pt-5 pb-1 text-[9.5px] font-bold text-white/30 uppercase tracking-widest">Compte</div>
        <nav class="flex flex-col gap-0.5 px-2" aria-label="Navigation compte">
          ${SIDEBAR_NAV.compte.map(_sbNavItem).join("")}
        </nav>
      </div>

      <!-- User footer -->
      <div class="px-2 py-3 border-t border-white/10 flex-shrink-0">
        <div class="flex items-center gap-2.5 px-3 py-2 rounded-[10px] cursor-pointer hover:bg-white/5 transition-colors">
          <div
            class="w-[30px] h-[30px] rounded-[8px] bg-primary flex items-center justify-center font-bricolage text-[10px] font-extrabold text-white flex-shrink-0"
            id="userInitial"
          >JM</div>
          <div>
            <div class="text-[12.5px] font-semibold text-white leading-tight" id="userName">Jean-Marc D.</div>
            <div class="text-[10.5px] text-white/40">Plan Standard</div>
          </div>
          <i class="fa-solid fa-chevron-up ml-auto text-white/30 text-[10px]"></i>
        </div>
      </div>
    </aside>`;
}

// ── Helpers mobile open/close (exposés globalement dès le chargement) ────────
function openSb() {
  _sbSetState(true);
}

function closeSb() {
  _sbSetState(false);
}

function toggleSb() {
  const sb = document.getElementById("sidebar");
  if (!sb) return;
  const isOpen = sb.classList.contains("open") && !sb.classList.contains("closed");
  _sbSetState(!isOpen);
}

function _sbSetState(isOpen) {
  const sb = document.getElementById("sidebar");
  const ov = document.getElementById("overlay");
  if (!sb) return;

  sb.classList.toggle("open", isOpen);
  sb.classList.toggle("closed", !isOpen);

  if (ov) {
    if (window.innerWidth < 900 && isOpen) ov.classList.add("show");
    else ov.classList.remove("show");
  }
}

window.openSb = openSb;
window.closeSb = closeSb;
window.toggleSb = toggleSb;

// ── Injection dans le DOM + listeners (après que le DOM est prêt) ─────────────
document.addEventListener("DOMContentLoaded", function () {
  // 1. Montage du sidebar
  const root = document.getElementById("sidebar-root");
  if (root) {
    root.outerHTML = _sbRender();
  }

  const style = document.createElement("style");
  style.id = "sb-desktop-slide-style";
  style.textContent = `
    @media (min-width: 900px) {
      .sidebar {
        transition: transform .28s cubic-bezier(.4,0,.2,1), width .28s cubic-bezier(.4,0,.2,1) !important;
      }
      .sidebar.open {
        width: var(--sidebar,260px) !important;
        transform: translateX(0) !important;
      }
      .sidebar.closed {
        width: 0 !important;
        min-width: 0 !important;
        transform: translateX(-100%) !important;
        overflow: hidden !important;
      }
    }
  `;
  if (!document.getElementById("sb-desktop-slide-style")) {
    document.head.appendChild(style);
  }

  _sbSetState(window.innerWidth >= 900);

  // 2. Hydratation depuis la session auth (auth.js a déjà lu le localStorage
  //    mais les éléments n'existaient pas encore — on les remplit ici)
  try {
    const AUTH_KEY = "docmaster_user_session";
    const raw = localStorage.getItem(AUTH_KEY);
    if (raw) {
      const user = JSON.parse(raw);

      const initialEl = document.getElementById("userInitial");
      const nameEl    = document.getElementById("userName");
      if (initialEl && user.initial) initialEl.textContent = user.initial;
      if (nameEl    && user.name)    nameEl.textContent    = user.name;

      // Aussi mettre à jour les éléments topbar présents sur certaines pages
      ["topInitial"].forEach(function (id) {
        const el = document.getElementById(id);
        if (el && user.initial) el.textContent = user.initial;
      });
      ["topName", "helloName"].forEach(function (id) {
        const el = document.getElementById(id);
        if (el && user.name) el.textContent = user.name;
      });
    }
  } catch (e) { /* session absente ou invalide */ }

  // 3. Fermeture automatique sur mobile après clic sur un lien
  document.querySelectorAll(".sb-item").forEach(function (link) {
    link.addEventListener("click", function () {
      if (window.innerWidth < 900) closeSb();
    });
  });

  // 4. Gestion du logout depuis le sidebar
  document.querySelectorAll('[data-logout="true"]').forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      if (typeof logout === "function") logout();
    });
  });

  window.addEventListener("resize", function () {
    if (window.innerWidth >= 900) {
      const sb = document.getElementById("sidebar");
      if (sb && !sb.classList.contains("open") && !sb.classList.contains("closed")) {
        _sbSetState(true);
      }
    } else {
      closeSb();
    }
  });
});
