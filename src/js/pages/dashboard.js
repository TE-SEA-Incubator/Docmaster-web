import {
  getMyDeclarations,
  getMyDevices,
  getMyNotifications,
  markAllNotificationsAsRead,
  getGlobalStats,
  getMySubscription,
  getPerformanceStats,
} from "../services/api.js";
import { getSession } from "../services/auth.js";
import { showSuccessModal } from "../utils/index.js";

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Initialize Basic UI
  setupBasicUI();

  // Check for new user welcome
  checkNewUserWelcome();

  // 2. Load Dashboard Data
  await loadDashboardContent();
  await loadNotifications();
  await loadUserPlan();
  renderGlobalDocStats();

  // 3. Setup global handlers
  window.customMarkAllReadHandler = async () => {
    await markAllNotificationsAsRead();
  };
});

/**
 * Basic UI initializations (Name, Date, etc.)
 */
function setupBasicUI() {
  const user = getSession();
  if (user) {
    // Hello Name
    const helloName = document.getElementById("helloName");
    if (helloName)
      helloName.textContent = user.prenom || user.nom || "Utilisateur";

    // Top Profile
    const topName = document.getElementById("topName");
    if (topName) topName.textContent = user.prenom || user.nom;

    const topInitial = document.getElementById("topInitial");
    if (topInitial) {
      topInitial.textContent =
        (user.prenom?.[0] || "") + (user.nom?.[0] || "U");
    }

    const topPhoto = document.getElementById("topPhoto");
    if (user.photo_url && topPhoto) {
      topPhoto.src = user.photo_url;
      topPhoto.classList.remove("hidden");
      document.getElementById("topInitial").classList.add("hidden");
    }
  }

  // Current Day
  const currentDay = document.getElementById("currentDay");
  if (currentDay) {
    const dateOptions = {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    };
    currentDay.textContent = new Intl.DateTimeFormat(
      "fr-FR",
      dateOptions,
    ).format(new Date());
  }
}

/**
 * Fetches and renders all dynamic dashboard content
 */
async function loadDashboardContent() {
  try {
    const [declRes, deviceRes, globalStatsRes] = await Promise.all([
      getMyDeclarations(),
      getMyDevices(),
      getGlobalStats(),
    ]);

    if (declRes.success) {
      const allDecls = declRes.data || [];
      // Filter out returned/closed items from the dashboard view
      const activeDecls = allDecls.filter(d => !['RETURNED', 'CANCELLED', 'CLAIMED'].includes(d.status));

      renderDeclarationsFlow(activeDecls);
      renderRecentActivities(activeDecls);

      const statsData = {
        totalLost: globalStatsRes.success ? globalStatsRes.data.total_lost : 0,
        totalRecovered: globalStatsRes.success
          ? globalStatsRes.data.total_recovered
          : 0,
      };

      updateStats(
        allDecls, // We pass allDecls to updateStats to keep the 'Recovered' count accurate
        deviceRes.success ? deviceRes.data.length : 0,
        statsData,
      );
    }
  } catch (error) {
    console.error("Error loading dashboard:", error);
  }
}

/**
 * Renders the progression blocks (LOST/FOUND/MATCH)
 */
function renderDeclarationsFlow(declarations) {
  const trackingContainer = document.getElementById("trackingContainer");
  if (!trackingContainer) return;

  trackingContainer.innerHTML = ""; // Clear hardcoded

  if (declarations.length === 0) {
    trackingContainer.innerHTML = `
            <div class="bg-white border border-dashed border-borderMain rounded-[18px] p-8 text-center">
                <div class="w-16 h-16 bg-surface2 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i class="fa-solid fa-folder-open text-textMuted text-2xl"></i>
                </div>
                <h3 class="font-bricolage text-lg font-bold text-textMain">Aucune activité en cours</h3>
                <p class="text-textMuted text-sm mt-1">Vos déclarations de perte ou de trouvaille s'afficheront ici.</p>
                <div class="mt-6 flex justify-center gap-3">
                    <a href="declarer.html" class="px-4 py-2 bg-primary text-white rounded-[10px] text-xs font-bold shadow-lg shadow-primary/20">Déclarer une perte</a>
                    <a href="trouverdocument.html" class="px-4 py-2 border border-borderMain rounded-[10px] text-xs font-bold text-textMain hover:bg-surface2">Signaler une trouvaille</a>
                </div>
            </div>
        `;
    return;
  }

  // Limit to top 3 active declarations to avoid cluttering
  const activeDecls = declarations;

  activeDecls.forEach((decl) => {
    if (decl.declaration_type === "LOST") {
      trackingContainer.appendChild(createLostBlock(decl));
    } else {
      trackingContainer.appendChild(createFoundBlock(decl));
    }
  });
}

/**
 * Helper to create a Lost block (Red)
 */
function createLostBlock(decl) {
  const hasMatch = decl.status === "MATCHED" || decl.status === "RETURNED";
  const hasPotential =
    !hasMatch && decl.matches.some((m) => m.status === "PENDING");

  // If matched, use green. If potential, maybe orange border. Else red.
  let color = hasMatch ? "green" : hasPotential ? "orange" : "red";
  const div = document.createElement("div");
  div.className = `bg-white border-2 border-${color}-500 rounded-[18px] overflow-hidden shadow-md shadow-${color}-500/5 transition-colors duration-500`;

  // Determine progress
  let step = 1;
  let progressWidth = "33%";
  if (decl.status === "SEARCHING") {
    step = 2;
    progressWidth = "50%";
  }
  if (decl.status === "MATCHED") {
    step = 3;
    progressWidth = "75%";
  }
  if (decl.status === "RETURNED") {
    step = 4;
    progressWidth = "100%";
  }

  div.innerHTML = `
      <div class="px-4 sm:px-5 py-3 border-b border-${color}-100 flex items-center justify-between bg-${color}-50/50">
        <div class="font-bricolage text-[13px] font-bold text-${color}-600 flex items-center gap-2">
          <i class="fa-solid ${hasMatch ? "fa-check-double animate-bounce" : hasPotential ? "fa-magnifying-glass-chart" : "fa-triangle-exclamation animate-pulse"}"></i> 
          ${hasMatch ? "Document trouvé !" : hasPotential ? "Correspondance possible" : "Ma perte signalée"}
        </div>
        <span class="text-[9px] font-bold px-2 py-0.5 rounded-full bg-${color}-500 text-white uppercase tracking-wider">
          ${decl.status === "MATCHED" ? "Match trouvé" : decl.status === "RETURNED" ? "Récupéré" : hasPotential ? "Potentiel" : "Perdu"}
        </span>
      </div>
      <div class="p-4 sm:p-5">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-[12px] bg-${color}-50 flex items-center justify-center text-${color}-500">
            <i class="fa-solid ${getIconForType(decl.doc_type, decl.docTypeInfo)} text-lg"></i>
          </div>
          <div>
            <div class="text-[13.5px] font-bold text-textMain">${decl.docTypeInfo ? decl.docTypeInfo.nom : decl.doc_type} — ${decl.owner_name}</div>
            <div class="text-[10px] text-textMuted italic">Réf: ${decl.identifiant_doc_dm} · ${getStatusText(decl.status)}</div>
          </div>
        </div>
        <div class="relative flex justify-between items-start px-2 mt-4">
          <div class="absolute top-3 left-[40px] right-[40px] h-[2px] bg-${color}-100"></div>
          <div class="absolute top-3 left-[40px] h-[2px] bg-${color}-500" style="width: ${progressWidth}"></div>

          <!-- Steps -->
          ${renderSteps(["Soumission", "Recherche", "Matching", "Récupéré"], step, color)}
        </div>
        ${
          decl.status === "MATCHED"
            ? `
        <div class="mt-6 flex justify-end">
          <button onclick="window.location.href='recuperer.html?id=${decl.id}'" class="px-4 py-2 bg-green-600 text-white rounded-[10px] text-[11px] font-bold hover:bg-green-700 transition-all flex items-center gap-2 shadow-lg shadow-green-500/20">
            <i class="fa-solid fa-handshake"></i> Récupérer votre document
          </button>
        </div>`
            : hasPotential
              ? `
        <div class="mt-6 flex justify-end">
          <button onclick="window.location.href='rechercher.html?query=${encodeURIComponent(decl.doc_type)}'" class="px-4 py-2 bg-orange-500 text-white rounded-[10px] text-[11px] font-bold hover:bg-orange-600 transition-all flex items-center gap-2">
            <i class="fa-solid fa-eye"></i> Voir les correspondances
          </button>
        </div>`
              : ""
        }
      </div>
    `;
  return div;
}

/**
 * Helper to create a Found block (Blue)
 */
function createFoundBlock(decl) {
  const hasMatch = decl.status === "MATCHED" || decl.status === "RETURNED";
  const hasPotential =
    !hasMatch && decl.matches.some((m) => m.status === "PENDING");

  // For found items, the user wants to stay blue even if matched
  const color =
    decl.status === "RETURNED" ? "green" : hasPotential ? "orange" : "blue";
  const div = document.createElement("div");
  div.className = `bg-white border-2 border-${color}-500 rounded-[18px] overflow-hidden shadow-md shadow-${color}-500/5 transition-colors duration-500`;

  let step = 1;
  let progressWidth = "33%";
  if (decl.status === "AVAILABLE") {
    step = 2;
    progressWidth = "50%";
  }
  if (decl.status === "MATCHED") {
    step = 3;
    progressWidth = "75%";
  }
  if (decl.status === "RETURNED") {
    step = 4;
    progressWidth = "100%";
  }

  div.innerHTML = `
      <div class="px-4 sm:px-5 py-3 border-b border-${color}-100 flex items-center justify-between bg-${color}-50/50">
        <div class="font-bricolage text-[13px] font-bold text-${color}-600 flex items-center gap-2">
          <i class="fa-solid ${decl.status === "MATCHED" ? "fa-handshake animate-bounce" : "fa-hand-holding-heart"}"></i> 
          ${decl.status === "MATCHED" ? "Propriétaire identifié !" : hasPotential ? "Correspondance possible" : "Document que j'ai trouvé"}
        </div>
        <span class="text-[9px] font-bold px-2 py-0.5 rounded-full bg-${color}-500 text-white uppercase tracking-wider">
          ${decl.status === "MATCHED" ? "Match trouvé" : decl.status === "RETURNED" ? "Remis" : hasPotential ? "Potentiel" : "Trouvé"}
        </span>
      </div>
      <div class="p-4 sm:p-5">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-[12px] bg-${color}-50 flex items-center justify-center text-${color}-500">
            <i class="fa-solid ${getIconForType(decl.doc_type, decl.docTypeInfo)} text-lg"></i>
          </div>
          <div>
            <div class="text-[13.5px] font-bold text-textMain">${decl.docTypeInfo ? decl.docTypeInfo.nom : decl.doc_type} — ${decl.owner_name}</div>
            <div class="text-[10px] text-textMuted italic">Réf: ${decl.identifiant_doc_dm} · ${getStatusText(decl.status)}</div>
          </div>
        </div>
        <div class="relative flex justify-between items-start px-2 mt-4">
          <div class="absolute top-3 left-[40px] right-[40px] h-[2px] bg-${color}-100"></div>
          <div class="absolute top-3 left-[40px] h-[2px] bg-${color}-500" style="width: ${progressWidth}"></div>
          
          ${renderSteps(["Trouvé", "Signalé", "Matching", "Rendre"], step, color)}
        </div>
        ${
          decl.status === "MATCHED"
            ? `
        <div class="mt-6 flex justify-end">
          <button onclick="window.location.href='rendre.html?id=${decl.id}'" class="px-4 py-2 bg-blue-600 text-white rounded-[10px] text-[11px] font-bold hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20">
            <i class="fa-solid fa-hand-holding-heart"></i> Rendre le document
          </button>
        </div>`
            : hasPotential
              ? `
        <div class="mt-6 flex justify-end">
          <button onclick="window.location.href='rechercher.html?query=${encodeURIComponent(decl.doc_type)}'" class="px-4 py-2 bg-orange-500 text-white rounded-[10px] text-[11px] font-bold hover:bg-orange-600 transition-all flex items-center gap-2">
            <i class="fa-solid fa-eye"></i> Voir les correspondances
          </button>
        </div>`
              : ""
        }
      </div>
    `;
  return div;
}

/**
 * Renders the steps circles for progress bars
 */
function renderSteps(labels, currentStep, color) {
  const icons = {
    red: ["fa-check", "fa-search", "fa-handshake", "fa-check-double"],
    blue: ["fa-check", "fa-bullhorn", "fa-handshake", "fa-hand-holding-heart"],
    green: ["fa-check", "fa-check", "fa-handshake", "fa-check-double"],
    orange: ["fa-check", "fa-search", "fa-handshake", "fa-check-double"],
  };

  return labels
    .map((label, idx) => {
      const stepNum = idx + 1;
      const isActive = stepNum <= currentStep;
      const isCompleted = stepNum < currentStep;

      let circleClass = "";
      let textClass = "";
      let icon = icons[color][idx];

      if (isActive) {
        circleClass = `bg-${color}-500 text-white shadow-sm shadow-${color}-200`;
        textClass = `text-${color}-600`;
        if (!isCompleted && stepNum === currentStep && stepNum < 4) {
          // Current step but not last
          circleClass = `bg-white border-2 border-${color}-500 text-${color}-500 shadow-sm`;
        }
      } else {
        circleClass = `bg-white border-2 border-${color}-200 text-${color}-300`;
        textClass = `text-${color}-300`;
      }

      return `
          <div class="relative z-10 flex flex-col items-center gap-1.5 min-w-[60px]">
            <div class="w-6 h-6 rounded-full flex items-center justify-center text-[8px] ${circleClass}">
              <i class="fa-solid ${isCompleted ? "fa-check" : icon}"></i>
            </div>
            <span class="text-[9px] font-bold uppercase tracking-tighter ${textClass}">${label}</span>
          </div>
        `;
    })
    .join("");
}

/**
 * Renders the recent activities list
 */
function renderRecentActivities(declarations) {
  const listContainer = document.getElementById("recentActivitiesList");
  if (!listContainer) return;

  listContainer.innerHTML = ""; // Clear hardcoded

  if (declarations.length === 0) {
    listContainer.innerHTML =
      '<div class="p-5 text-center text-textMuted text-xs italic">Aucune activité récente.</div>';
    return;
  }

  declarations.slice(0, 5).forEach((decl) => {
    const div = document.createElement("div");
    div.className =
      "flex items-center gap-3 px-4 sm:px-5 py-3 sm:py-3.5 hover:bg-surface2 transition-colors cursor-pointer";

    const dateStr = new Date(decl.created_at).toLocaleDateString("fr-FR");
    const iconColor = decl.declaration_type === "LOST" ? "primary" : "blue";
    const iconBg =
      decl.declaration_type === "LOST" ? "primary-light" : "blue-50";

    div.innerHTML = `
            <div class="w-9 h-9 sm:w-[38px] sm:h-[38px] rounded-[10px] sm:rounded-[11px] bg-${iconBg} flex items-center justify-center text-sm sm:text-[15px] flex-shrink-0">
              <i class="fa-solid ${getIconForType(decl.doc_type, decl.docTypeInfo)} text-${iconColor}-dark"></i>
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-[13px] sm:text-[13.5px] font-semibold text-textMain truncate">
                ${decl.docTypeInfo ? decl.docTypeInfo.nom : decl.doc_type} ${decl.declaration_type === "LOST" ? "perdu" : "trouvé"}
              </div>
              <div class="text-[10.5px] sm:text-[11.5px] text-textMuted flex items-center gap-1 italic">
                <i class="fa-solid fa-location-dot text-[9px]"></i> ${decl.ville || "Non spécifié"} · 
                <i class="fa-regular fa-clock text-[9px]"></i> ${dateStr}
              </div>
            </div>
            <span class="text-[10px] font-bold px-2.5 py-0.5 rounded-full ${getStatusBadgeClass(decl.status, decl.declaration_type)} whitespace-nowrap">
                ${getStatusText(decl.status)}
            </span>
        `;
    listContainer.appendChild(div);
  });
}

/**
 * Updates stats and donut chart
 */
function updateStats(declarations, deviceCount, statsData) {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const total = declarations.length;
  const verified = declarations.filter((d) => d.status === "RETURNED").length;
  const pending = declarations.filter(
    (d) => d.status === "AVAILABLE" || d.status === "SEARCHING",
  ).length;
  const matched = declarations.filter((d) => d.status === "MATCHED").length;

  // Nouveaux: Documents déclarés il y a moins d'une semaine
  const isNew = (dateStr) => new Date(dateStr) >= oneWeekAgo;
  const newDocs = declarations.filter((d) => isNew(d.created_at)).length;

  // Global Numbers (Top Cards)
  const totalLostEl = document.getElementById("totalLostDocs");
  const totalRecoveredEl = document.getElementById("totalRecoveredDocs");
  if (totalLostEl) totalLostEl.textContent = `${statsData.totalLost}+`;
  if (totalRecoveredEl)
    totalRecoveredEl.textContent = `${statsData.totalRecovered}+`;

  // Local user stats
  setText("dashboardTotalDocs", total);
  setText("dashboardVerifiedDocs", verified);
  setText("dashboardPendingDocs", pending);
  setText("dashboardNewDocs", newDocs);
  setText("statDevicesCount", deviceCount);

  // Donut calculation (125.7 is half circle circumference roughly, 2*pi*50 = 314)
  // The dasharray is "filled-part empty-part"
  // Total circumference = 314.15
  const circ = 314.15;
  const svg = document.querySelector(".donut-wrap svg");
  if (svg) {
    const circles = svg.querySelectorAll("circle");
    if (circles.length >= 4) {
      const pVerified = total ? (verified / total) * circ : 0;
      const pPending = total ? (pending / total) * circ : 0;
      const pMatched = total ? (matched / total) * circ : 0;

      circles[1].setAttribute(
        "stroke-dasharray",
        `${pVerified} ${circ - pVerified}`,
      );
      circles[2].setAttribute(
        "stroke-dasharray",
        `${pPending} ${circ - pPending}`,
      );
      circles[2].setAttribute("stroke-dashoffset", -pVerified);
      circles[3].setAttribute(
        "stroke-dasharray",
        `${pMatched} ${circ - pMatched}`,
      );
      circles[3].setAttribute("stroke-dashoffset", -(pVerified + pPending));
    }
  }
}

// Utilities
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function getIconForType(type, docTypeInfo = null) {
  if (docTypeInfo && docTypeInfo.icone) {
    return `fa-${docTypeInfo.icone}`;
  }
  
  const t = type.toLowerCase();
  if (t.includes("cni")) return "fa-id-card";
  if (t.includes("pass")) return "fa-passport";
  if (t.includes("permis")) return "fa-car";
  if (t.includes("diplome")) return "fa-graduation-cap";
  if (t.includes("acte")) return "fa-file-invoice";
  if (t.includes("carte")) return "fa-credit-card";
  return "fa-file-lines";
}

function getStatusText(status) {
  switch (status) {
    case "AVAILABLE":
      return "Publié";
    case "SEARCHING":
      return "Recherche active";
    case "MATCHED":
      return "Match trouvé !";
    case "RETURNED":
      return "Clôturé";
    default:
      return status;
  }
}

function getStatusBadgeClass(status, type) {
  if (status === "MATCHED") return "bg-green-100 text-green-700";
  if (status === "RETURNED") return "bg-gray-100 text-gray-700";
  if (type === "LOST") return "bg-amber-100 text-amber-700";
  return "bg-blue-100 text-blue-700";
}

/**
 * Notifications Logic
 */
async function loadNotifications() {
  if (typeof window.clearNotifications !== "function") return;

  window.clearNotifications();
  const result = await getMyNotifications();

  if (result.success && result.data.data) {
    const notifications = result.data.data;

    const dashboardNotifList = document.getElementById(
      "dashboardNotificationList",
    );
    if (dashboardNotifList) dashboardNotifList.innerHTML = "";

    notifications.forEach((notif) => {
      let icon = "fa-solid fa-bell";
      let iconColorClass = "text-primary";
      let iconBgClass = "bg-primary-light";

      // Map types to icons
      switch (notif.type) {
        case "LOST_SUBMITTED":
          icon = "fa-solid fa-file-circle-exclamation";
          iconColorClass = "text-amber-600";
          iconBgClass = "bg-amber-50";
          break;
        case "FOUND_SUBMITTED":
          icon = "fa-solid fa-hand-holding-heart";
          iconColorClass = "text-blue-600";
          iconBgClass = "bg-blue-50";
          break;
        case "MATCH_FOUND":
          icon = "fa-solid fa-circle-check";
          iconColorClass = "text-green-700";
          iconBgClass = "bg-green-100";
          break;
        case "DOC_ADDED":
          icon = "fa-solid fa-shield-halved";
          iconColorClass = "text-purple-600";
          iconBgClass = "bg-purple-50";
          break;
      }

      // 1. Add to global sidebar (if exists)
      if (typeof window.addNotification === "function") {
        window.addNotification(
          notif.title,
          notif.message,
          formatTimeAgo(notif.created_at),
          icon,
          notif.is_read,
        );
      }

      // 2. Add to Dashboard Sidebar List
      if (dashboardNotifList) {
        const div = document.createElement("div");
        div.className =
          "flex gap-3 px-4 sm:px-5 py-3 sm:py-3.5 hover:bg-surface2 transition-colors cursor-pointer relative";
        if (!notif.is_read) {
          div.innerHTML +=
            '<div class="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary"></div>';
        }
        div.innerHTML += `
                    <div class="w-9 h-9 rounded-[9px] ${iconBgClass} flex items-center justify-center text-sm flex-shrink-0">
                        <i class="${icon} ${iconColorClass}"></i>
                    </div>
                    <div>
                        <div class="text-[12px] sm:text-[12.5px] text-textMain leading-snug italic">
                            <strong>${notif.title}</strong> ${notif.message}
                        </div>
                        <div class="text-[10px] sm:text-[10.5px] text-textMuted font-medium italic mt-0.5">${formatTimeAgo(notif.created_at)}</div>
                    </div>
                `;
        dashboardNotifList.appendChild(div);
      }
    });

    if (dashboardNotifList && notifications.length === 0) {
      dashboardNotifList.innerHTML =
        '<div class="p-5 text-center text-textMuted text-xs italic">Aucune notification.</div>';
    }
  }
}

/**
 * Load user's plan and update the card
 */
async function loadUserPlan() {
  const res = await getMySubscription();
  if (res.success && res.data) {
    const sub = res.data;
    setText("userPlanName", sub.plan_name || "Standard");

    const limitsEl = document.getElementById("userPlanLimits");
    if (limitsEl)
      limitsEl.textContent = `${sub.doc_limit} documents · SMS & Email`;

    const quotaTextEl = document.getElementById("userPlanQuotaText");
    if (quotaTextEl)
      quotaTextEl.textContent = `${sub.doc_count} / ${sub.doc_limit}`;

    const progressEl = document.getElementById("userPlanQuotaProgress");
    if (progressEl) {
      const percent = Math.min((sub.doc_count / sub.doc_limit) * 100, 100);
      progressEl.style.width = `${percent}%`;
    }
  }
}


/**
 * Render global document performance stats
 */
async function renderGlobalDocStats() {
    const grid = document.getElementById('globalDocStatsGrid');
    if (!grid) return;

    // Mapping for assets and styles (Keys are normalized to UPPERCASE)
    const typeConfigs = {
        'CNI': { icon: 'fa-id-card', color: 'bg-orange-50 text-orange-600', image: './assets/images/carte.jpeg', label: 'CNI / Attestation' },
        'PASSPORT': { icon: 'fa-passport', color: 'bg-blue-50 text-blue-600', image: './assets/images/passport.jpg', label: 'Passeport' },
        'PASSEPORT': { icon: 'fa-passport', color: 'bg-blue-50 text-blue-600', image: './assets/images/passport.jpg', label: 'Passeport' },
        'PERMIS DE CONDUIRE': { icon: 'fa-car', color: 'bg-green-50 text-green-600', image: './assets/images/app_mockup.png', label: 'Permis' },
        'DIPLÔME': { icon: 'fa-graduation-cap', color: 'bg-purple-50 text-purple-600', image: './assets/images/devices_docs.png', label: 'Diplômes' },
        'CARTE BANCAIRE': { icon: 'fa-credit-card', color: 'bg-indigo-50 text-indigo-600', image: './assets/images/1.webp', label: 'Cartes Bancaires' },
        'CARTE GRISE': { icon: 'fa-file-invoice', color: 'bg-red-50 text-red-600', image: './assets/images/docmaster.png', label: 'Cartes Grises' },
        'DEFAULT': { icon: 'fa-file-lines', color: 'bg-gray-50 text-gray-600', image: './assets/images/devices_docs.png', label: 'Autres Documents' }
    };

    try {
        const res = await getPerformanceStats('month');
        if (!res.success || !res.data) throw new Error("API Error");

        const stats = res.data;
        if (stats.length === 0) {
            grid.innerHTML = '<div class="col-span-full py-10 text-center text-textMuted text-xs italic">Aucune donnée de performance ce mois.</div>';
            return;
        }

        grid.innerHTML = stats.map(doc => {
            const config = typeConfigs[doc.name.toUpperCase()] || typeConfigs['DEFAULT'];
            const trendValue = parseFloat(doc.trend);
            const trendClass = trendValue >= 0 ? 'text-green-600' : 'text-red-500';
            const trendIcon = trendValue >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';

            // Format last activity text for the card preview
            const latest = doc.recent_items?.[0];
            const activityType = latest?.type === 'LOST' ? 'Perdu' : 'Retrouvé';
            const timeAgo = latest?.date ? formatTimeAgo(latest.date) : '';
            const location = latest?.ville ? ` à ${latest.ville}` : '';
            const lastActivityText = latest ? `${activityType} ${timeAgo}${location}` : 'Aucune activité';

            // Store items as string for the click handler
            const itemsJson = JSON.stringify(doc.recent_items).replace(/"/g, '&quot;');

            return `
                <div onclick="window.openStatsModal('${doc.name}', ${itemsJson})" class="bg-white border border-borderMain rounded-2xl overflow-hidden hover:border-primary/50 transition-all group cursor-pointer shadow-sm">
                    <div class="relative h-24 overflow-hidden bg-surface2">
                        <img src="${config.image}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-90" alt="${doc.name}">
                        <div class="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-60"></div>
                        <div class="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-white/90 backdrop-blur-sm text-[9px] font-bold ${trendClass} flex items-center gap-0.5">
                            <i class="fa-solid ${trendIcon} text-[7px]"></i> ${Math.abs(trendValue)}%
                        </div>
                    </div>
                    <div class="p-3">
                        <div class="flex items-center gap-2 mb-1">
                            <div class="w-6 h-6 rounded-md ${config.color} flex items-center justify-center text-[10px]">
                                <i class="fa-solid ${config.icon}"></i>
                            </div>
                            <span class="text-[11px] font-bold text-textMain truncate">${config.label}</span>
                        </div>
                        <div class="flex flex-col">
                            <div class="flex items-baseline gap-1">
                                <span class="text-[13px] font-extrabold text-primary">${parseInt(doc.count).toLocaleString()}</span>
                                <span class="text-[9px] text-textMuted font-medium italic">retrouvés ce mois</span>
                            </div>
                            <span class="text-[8px] text-textMuted mt-1 bg-surface2 px-1.5 py-0.5 rounded-md w-fit font-medium">
                                <i class="fa-solid fa-clock-rotate-left text-[7px] mr-1"></i> ${lastActivityText}
                            </span>
                        </div>
                        <div class="mt-2 w-full h-1 bg-surface2 rounded-full overflow-hidden">
                            <div class="h-full bg-primary/30 rounded-full" style="width: ${Math.min(100, (doc.count / 1000) * 100)}%"></div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error("❌ Stats error:", error);
        grid.innerHTML = '<div class="col-span-full py-10 text-center text-red-400 text-xs italic">Erreur de chargement des statistiques.</div>';
    }
}

/**
 * Open Modal with Details
 */
window.openStatsModal = (categoryName, items) => {
    // 1. Create or Get Modal Overlay
    let modal = document.getElementById('statsDetailsModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'statsDetailsModal';
        modal.className = 'fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm hidden';
        document.body.appendChild(modal);
    }

    // 2. Map for icons
    const getIcon = (type) => type === 'LOST' ? 'fa-circle-exclamation text-amber-500' : 'fa-circle-check text-green-500';
    const getBg = (type) => type === 'LOST' ? 'bg-amber-50' : 'bg-green-50';

    modal.innerHTML = `
        <div class="bg-white w-full max-w-md rounded-[24px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div class="px-6 py-4 border-b border-borderMain flex items-center justify-between">
                <div>
                    <h3 class="font-bricolage text-lg font-bold text-textMain">${categoryName}</h3>
                    <p class="text-[11px] text-textMuted font-medium italic">Dernières activités enregistrées</p>
                </div>
                <button onclick="document.getElementById('statsDetailsModal').classList.add('hidden')" class="w-8 h-8 rounded-full bg-surface2 flex items-center justify-center text-textMuted hover:bg-red-50 hover:text-red-500 transition-colors">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
            
            <div class="max-h-[400px] overflow-y-auto p-4 custom-scrollbar">
                ${items.length === 0 ? '<p class="text-center py-10 text-textMuted italic text-xs">Aucun détail disponible.</p>' : 
                    items.map(item => `
                        <div class="flex items-center gap-3 p-3 rounded-xl hover:bg-surface2 transition-colors mb-2 border border-transparent hover:border-borderMain">
                            <div class="w-10 h-10 rounded-xl ${getBg(item.type)} flex items-center justify-center flex-shrink-0">
                                <i class="fa-solid ${getIcon(item.type)} text-lg"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="text-[13px] font-bold text-textMain">
                                    ${item.doc_type_raw} ${item.type === 'LOST' ? 'perdu' : 'retrouvé'}
                                </div>
                                <div class="text-[11px] text-textMuted italic flex items-center gap-2">
                                    <span class="flex items-center gap-1"><i class="fa-solid fa-location-dot text-[9px]"></i> ${item.ville || 'Inconnu'}</span>
                                    <span class="flex items-center gap-1"><i class="fa-regular fa-clock text-[9px]"></i> ${formatTimeAgo(item.date)}</span>
                                </div>
                            </div>
                            <div class="text-[10px] font-bold px-2 py-1 rounded-md bg-surface2 text-textMuted uppercase tracking-tight">
                                ${item.type === 'LOST' ? 'Signalé' : 'Remis'}
                            </div>
                        </div>
                    `).join('')
                }
            </div>
            
            <div class="p-4 bg-surface1 border-t border-borderMain text-center">
                <button onclick="document.getElementById('statsDetailsModal').classList.add('hidden')" class="px-6 py-2.5 bg-primary text-white rounded-xl text-xs font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
                    Fermer la vue
                </button>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
};



function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return "À l'instant";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `Il y a ${diffInMinutes}m`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `Il y a ${diffInHours}h`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `Il y a ${diffInDays}j`;
}

/**
 * Show a welcome message if the user just registered
 */
function checkNewUserWelcome() {
  const isNew = localStorage.getItem('docmaster_is_new_user');
  if (isNew === 'true') {
    const user = getSession();
    const name = user ? (user.prenom || user.nom) : '';
    
    setTimeout(() => {
      showSuccessModal(
        `Bienvenue sur DocMaster, ${name} ! 🎊`,
        "Votre compte a été créé avec succès. Vous pouvez maintenant commencer à protéger vos documents et déclarer vos pertes.",
        6000
      );
    }, 1000);
    
    localStorage.removeItem('docmaster_is_new_user');
  }
}
