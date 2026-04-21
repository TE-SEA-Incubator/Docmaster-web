/**
 * ═════════════════════════════════════════════════════════════════
 * AUTH.JS - Authentication System for DocMaster
 * Handles login, registration, and session management with localStorage
 * ═════════════════════════════════════════════════════════════════
 */

const AUTH_KEY = "docmaster_user_session";
const USERS_KEY = "docmaster_users_db";

/**
 * Initialize database with default user
 */
function initDB() {
  if (!localStorage.getItem(USERS_KEY)) {
    const defaultUsers = [
      {
        id: 1,
        name: "Jean-Marc D.",
        email: "user@example.com",
        password: "password123",
        initial: "JM",
        createdAt: new Date().toISOString(),
      },
    ];
    localStorage.setItem(USERS_KEY, JSON.stringify(defaultUsers));
    console.log("✓ Base de données initialisée");
  }
}

/**
 * Get initials from full name
 */
function getInitials(name) {
  if (!name) return "DM";
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
}

/**
 * Login function - Authenticate user
 */
function login(email, password) {
  try {
    if (!email || !password) {
      return { success: false, message: "Email et mot de passe requis." };
    }

    const users = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
    const user = users.find((u) => u.email === email && u.password === password);

    if (user) {
      // Save session immediately
      const sessionData = JSON.stringify(user);
      localStorage.setItem(AUTH_KEY, sessionData);
      
      // Verify session was saved
      const verification = localStorage.getItem(AUTH_KEY);
      if (!verification) {
        console.error("❌ Impossible de sauvegarder la session!");
        return { success: false, message: "Erreur: Impossible de sauvegarder la session." };
      }

      console.log("✓ Connexion réussie:", email);
      console.log("✓ Session sauvegardée dans localStorage");
      return { success: true, user };
    }

    console.warn("❌ Identifiants invalides pour:", email);
    return { success: false, message: "Email ou mot de passe incorrect." };
  } catch (error) {
    console.error("❌ Erreur lors de la connexion:", error);
    return { success: false, message: "Erreur lors de la connexion." };
  }
}

/**
 * Register function - Save new user to localStorage
 */
function register(name, email, password) {
  try {
    // Initialize DB
    initDB();

    // Get current users
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");

    // Check if email already exists
    if (users.some((u) => u.email === email)) {
      return { success: false, message: "Cet email est déjà utilisé." };
    }

    // Create new user
    const newUser = {
      id: Date.now(),
      name: name || "Anonymous",
      email: email,
      password: password,
      initial: getInitials(name),
      createdAt: new Date().toISOString(),
    };

    // Save to database
    users.push(newUser);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    console.log("✓ Utilisateur enregistré dans la BD:", newUser);

    // Auto-login
    localStorage.setItem(AUTH_KEY, JSON.stringify(newUser));
    console.log("✓ Session créée pour:", email);

    return { success: true, user: newUser };
  } catch (error) {
    console.error("❌ Erreur lors de l'enregistrement:", error);
    return { success: false, message: "Erreur lors de l'enregistrement." };
  }
}

/**
 * Logout function
 */
function logout() {
  localStorage.removeItem(AUTH_KEY);
  window.location.href = "login.html";
}

/**
 * Check if user is authenticated
 */
function checkAuth() {
  const session = localStorage.getItem(AUTH_KEY);
  const currentPage = window.location.pathname.split("/").pop();
  const publicPages = ["index.html", "login.html", "rechercher.html", "rechercher.old.html"];
  const isLoginPage = currentPage === "login.html";
  const isPublicPage = publicPages.includes(currentPage);

  if (!session && !isPublicPage) {
    window.location.href = "login.html";
  } else if (session && isLoginPage) {
    window.location.href = "dashboard.html";
  }

  if (session) {
    const user = JSON.parse(session);
    updateUI(user);
    markActiveSidebar();
  }
}

/**
 * Update UI elements with user data
 */
function updateUI(user) {
  const nameEls = ["userName", "topName", "helloName"];
  const initialEls = ["userInitial", "topInitial"];

  nameEls.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.innerText = user.name;
  });

  initialEls.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.innerText = user.initial;
  });
}

function getCurrentUser() {
  const session = localStorage.getItem(AUTH_KEY);
  if (!session) return null;

  try {
    return JSON.parse(session);
  } catch {
    return null;
  }
}

function saveCurrentUserProfile(updates) {
  const currentUser = getCurrentUser();
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");

  if (!currentUser) {
    return { success: false, message: "Aucune session active." };
  }

  const currentIndex = users.findIndex((user) => user.email === currentUser.email);
  if (currentIndex === -1) {
    return { success: false, message: "Utilisateur introuvable." };
  }

  const nextName = (updates.name || currentUser.name || "").trim();
  const nextEmail = (updates.email || currentUser.email || "").trim();

  if (!nextName || !nextEmail) {
    return { success: false, message: "Nom et email sont obligatoires." };
  }

  const emailAlreadyUsed = users.some((user, index) => {
    return index !== currentIndex && user.email === nextEmail;
  });

  if (emailAlreadyUsed) {
    return { success: false, message: "Cet email est déjà utilisé." };
  }

  const mergedUser = {
    ...users[currentIndex],
    ...currentUser,
    ...updates,
    name: nextName,
    email: nextEmail,
    initial: getInitials(nextName),
  };

  users[currentIndex] = mergedUser;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  localStorage.setItem(AUTH_KEY, JSON.stringify(mergedUser));

  updateUI(mergedUser);
  markActiveSidebar();

  return { success: true, user: mergedUser };
}

// Highlight the active sidebar link based on current URL
function markActiveSidebar() {
  const current = window.location.pathname.split("/").pop();
  document.querySelectorAll(".sb-item").forEach((a) => {
    const href = a.getAttribute("href");
    if (href && href !== "#" && href.split("/").pop() === current) {
      a.classList.add("active");
    } else {
      a.classList.remove("active");
    }
  });
}

// sidebar open/close helpers (used by the hamburger & overlay)
function openSb() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  if (sidebar) sidebar.classList.add('open');
  if (overlay) overlay.classList.add('show');
}
function closeSb() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('show');
}

function startButtonLoader(button) {
  if (!button || button.classList.contains('btn-is-loading')) return;
  button.dataset.originalHtml = button.innerHTML;
  button.classList.add('btn-is-loading');
  button.disabled = true;
  const loadingText = button.dataset.loadingText || 'Chargement...';
  button.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin" style="margin-right:8px"></i>${loadingText}`;
}

function stopButtonLoader(button) {
  if (!button || !button.classList.contains('btn-is-loading')) return;
  button.classList.remove('btn-is-loading');
  button.disabled = false;
  if (button.dataset.originalHtml) {
    button.innerHTML = button.dataset.originalHtml;
  }
}

function setupGlobalButtonLoaders() {
  if (!document.getElementById('global-loader-style')) {
    const style = document.createElement('style');
    style.id = 'global-loader-style';
    style.textContent = `.btn-is-loading{pointer-events:none;opacity:.9}`;
    document.head.appendChild(style);
  }

  document.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-loading-text]');
    if (!button || button.disabled) return;
    startButtonLoader(button);
    const delay = Number(button.dataset.loadingDelay || 900);
    setTimeout(() => stopButtonLoader(button), Number.isFinite(delay) ? delay : 900);
  });
}

// ═════════════════════════════════════════════════════════════════
// UI Helper Functions for Login/Register Forms
// ═════════════════════════════════════════════════════════════════

/**
 * Switch between login and register tabs
 */
window.switchTab = function (tab) {
  const forms = document.querySelectorAll('.auth-form');
  const tabButtons = document.querySelectorAll('[id^="tab-"]');
  const slider = document.getElementById('toggle-slider');

  forms.forEach(form => form.classList.remove('visible'));
  tabButtons.forEach(btn => btn.classList.remove('text-white'));

  if (tab === 'login') {
    document.getElementById('form-login')?.classList.add('visible');
    document.getElementById('dform-login')?.classList.add('visible');
    document.getElementById('tab-login').classList.add('text-white');
    if (slider) slider.style.transform = 'translateX(0)';
  } else {
    document.getElementById('form-register')?.classList.add('visible');
    document.getElementById('dform-register')?.classList.add('visible');
    document.getElementById('tab-register').classList.add('text-white');
    if (slider) slider.style.transform = 'translateX(calc(100% + 6px))';
  }
};

/**
 * Toggle password visibility
 */
window.togglePw = function (inputId, button) {
  const input = document.getElementById(inputId);
  if (!input) return;

  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';
  button.innerHTML = `<i class="fa-regular fa-${isPassword ? 'eye-slash' : 'eye'}"></i>`;
};

/**
 * Check password strength
 */
window.checkStrength = function (input, prefix) {
  const value = input.value;
  const strengthBar = document.querySelector(`#${prefix}-pw-bar`);
  if (!strengthBar) return;

  let strength = 'weak';
  if (value.length >= 12 && /[A-Z]/.test(value) && /[0-9]/.test(value)) {
    strength = 'strong';
  } else if (value.length >= 8) {
    strength = 'medium';
  }

  strengthBar.className = `pw-bar ${strength}`;
};

/**
 * Check if passwords match
 */
window.checkMatch = function (prefix) {
  const pw1 = document.getElementById(`${prefix}-pw1`)?.value || '';
  const pw2 = document.getElementById(`${prefix}-pw2`)?.value || '';
  const okMsg = document.getElementById(`${prefix}-pw-ok`);

  if (okMsg) {
    okMsg.classList.toggle('hidden', pw1 !== pw2 || !pw1);
  }
};

/**
 * Navigate to next step in multi-step register
 */
window.nextStep = function (prefix, currentStep) {
  const currentStepDiv = document.getElementById(`${prefix}-step-${currentStep}`);
  const nextStepDiv = document.getElementById(`${prefix}-step-${currentStep + 1}`);
  const currentDot = document.getElementById(`${prefix}-dot-${currentStep}`);
  const nextDot = document.getElementById(`${prefix}-dot-${currentStep + 1}`);
  const currentLine = document.getElementById(`${prefix}-line-${currentStep}`);

  if (currentStepDiv && nextStepDiv) {
    currentStepDiv.classList.remove('active');
    nextStepDiv.classList.add('active');
    
    if (currentDot) {
      currentDot.classList.remove('active');
      currentDot.classList.add('done');
    }
    if (nextDot) nextDot.classList.add('active');
    if (currentLine) currentLine.classList.add('done');

    // Update step title/subtitle if they exist
    const titles = {
      1: { title: 'Créer un compte', subtitle: 'Rejoignez la communauté DocMaster' },
      2: { title: 'Sécurisez votre compte', subtitle: 'Choisissez un mot de passe fort' },
      3: { title: 'Vérification email', subtitle: 'Entrez le code reçu dans votre email' },
      4: { title: 'Presque fini !', subtitle: 'Choisissez votre pseudo' }
    };
    
    const nextTitle = titles[currentStep + 1];
    if (nextTitle) {
      const titleEl = document.getElementById(`${prefix}-step-title`);
      const subtitleEl = document.getElementById(`${prefix}-step-subtitle`);
      if (titleEl) titleEl.innerText = nextTitle.title;
      if (subtitleEl) subtitleEl.innerText = nextTitle.subtitle;
    }
  }
};

/**
 * Navigate to previous step
 */
window.prevStep = function (prefix, currentStep) {
  const currentStepDiv = document.getElementById(`${prefix}-step-${currentStep}`);
  const prevStepDiv = document.getElementById(`${prefix}-step-${currentStep - 1}`);
  const currentDot = document.getElementById(`${prefix}-dot-${currentStep}`);
  const prevDot = document.getElementById(`${prefix}-dot-${currentStep - 1}`);
  const prevLine = document.getElementById(`${prefix}-line-${currentStep - 1}`);

  if (currentStepDiv && prevStepDiv) {
    currentStepDiv.classList.remove('active');
    prevStepDiv.classList.add('active');
    
    if (currentDot) currentDot.classList.remove('active');
    if (prevDot) {
      prevDot.classList.remove('done');
      prevDot.classList.add('active');
    }
    if (prevLine) prevLine.classList.remove('done');

    const titles = {
      1: { title: 'Créer un compte', subtitle: 'Rejoignez la communauté DocMaster' },
      2: { title: 'Sécurisez votre compte', subtitle: 'Choisissez un mot de passe fort' },
      3: { title: 'Vérification email', subtitle: 'Entrez le code reçu dans votre email' }
    };
    
    const prevTitle = titles[currentStep - 1];
    if (prevTitle) {
      const titleEl = document.getElementById(`${prefix}-step-title`);
      const subtitleEl = document.getElementById(`${prefix}-step-subtitle`);
      if (titleEl) titleEl.innerText = prevTitle.title;
      if (subtitleEl) subtitleEl.innerText = prevTitle.subtitle;
    }
  }
};

/**
 * Submit the multi-step register form
 */
window.submitRegister = function (prefix) {
  try {
    // Get form inputs
    const nomInput = document.getElementById(`${prefix}-nom`);
    const prenomInput = document.getElementById(`${prefix}-prenom`);
    const emailInput = document.getElementById(`${prefix}-email`);
    const passwordInput = document.getElementById(`${prefix}-pw1`);

    // Validate inputs exist
    if (!nomInput || !emailInput || !passwordInput) {
      alert("Erreur: Formulaire incomplet");
      return;
    }

    // Get values
    const nom = nomInput.value.trim();
    const prenom = prenomInput?.value.trim() || "";
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    // Validate data
    if (!nom || !email || !password) {
      alert("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    if (password.length < 8) {
      alert("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    if (!email.includes("@")) {
      alert("Veuillez entrer une adresse email valide.");
      return;
    }

    // Validate pseudo (step 4 field)
    const pseudoVal = document.getElementById(`${prefix}-pseudo`)?.value.trim() || '';
    if (pseudoVal.length < 3 || !/^[a-zA-Z0-9_]+$/.test(pseudoVal)) {
      alert("Veuillez choisir un pseudo valide (min. 3 caractères, lettres, chiffres et _).");
      return;
    }

    // Try to register
    const fullName = prenom ? `${nom} ${prenom}` : nom;
    const pseudo = document.getElementById(`${prefix}-pseudo`)?.value.trim() || '';
    console.log("📝 Inscription en cours pour:", email);
    
    const result = register(fullName, email, password);

    if (result.success) {
      // Attach pseudo to the saved user
      if (pseudo) {
        const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
        const idx = users.findIndex(u => u.email === email);
        if (idx > -1) {
          users[idx].pseudo = pseudo;
          localStorage.setItem(USERS_KEY, JSON.stringify(users));
          const session = JSON.parse(localStorage.getItem(AUTH_KEY) || '{}');
          session.pseudo = pseudo;
          localStorage.setItem(AUTH_KEY, JSON.stringify(session));
        }
      }
      console.log("✓ Inscription réussie!");
      console.log("✓ Utilisateur sauvegardé dans la BD");
      
      // Verify session was saved
      const savedSession = localStorage.getItem(AUTH_KEY);
      if (savedSession) {
        console.log("✓ Session créée et sauvegardée");
        console.log("✓ Redirection vers le dashboard...");
        // Redirect immediately
        window.location.href = "dashboard.html";
      } else {
        console.error("❌ Session non sauvegardée!");
        alert("❌ Erreur: Session non sauvegardée. Veuillez vous reconnecter.");
      }
    } else {
      console.error("❌ Erreur d'inscription:", result.message);
      alert("❌ " + result.message);
    }
  } catch (error) {
    console.error("❌ Erreur:", error);
    alert("Une erreur est survenue. Veuillez réessayer.");
  }
};

/**
 * Resend PIN code
 */
window.resendPin = function (event) {
  event?.preventDefault();
  alert('Un nouveau code a été envoyé à votre adresse email.');
};

/**
 * Check pseudo availability
 */
window.checkPseudo = function (input, prefix) {
  const value = input.value.toLowerCase();
  const suggestionsDiv = document.getElementById(`${prefix}-suggestions`);
  
  if (!suggestionsDiv || value.length < 3) return;

  // Mock pseudo suggestions
  const suggestions = [
    `${value}_42`,
    `${value}_pro`,
    `${value}_official`,
    `${value}_2024`,
  ];

  suggestionsDiv.innerHTML = suggestions
    .map(s => `<button type="button" class="pseudo-chip" onclick="selectPseudo('${s}', '${prefix}')">${s}</button>`)
    .join('');
};

/**
 * Select a pseudo suggestion
 */
window.selectPseudo = function (pseudo, prefix) {
  const pseudoInput = document.getElementById(`${prefix}-pseudo`);
  if (pseudoInput) {
    pseudoInput.value = pseudo;
    document.querySelectorAll('.pseudo-chip').forEach(chip => chip.classList.remove('selected'));
    event?.target?.classList.add('selected');
  }
};

/**
 * Toggle referral field
 */
window.toggleReferral = function (prefix) {
  const field = document.getElementById(`${prefix}-referral-field`);
  const chevron = document.getElementById(`${prefix}-referral-chevron`);
  
  if (field) field.classList.toggle('hidden');
  if (chevron) chevron.style.transform = field?.classList.contains('hidden') ? '' : 'rotate(180deg)';
};

// ensure sidebar starts closed on mobile
if (window.innerWidth < 900) closeSb();

// Initialize on load
document.addEventListener("DOMContentLoaded", () => {
  initDB();
  checkAuth();
  setupGlobalButtonLoaders();

  // Setup login forms (handles both mobile and desktop)
  document.querySelectorAll(".form-login").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const emailInput = form.querySelector('input[type="email"]');
      const passwordInput = form.querySelector('input[type="password"]') ||
                            form.querySelector('input[id$="-pw"][type="text"]');

      if (!emailInput || !passwordInput) {
        alert("Erreur: Formulaire de connexion incomplet");
        return;
      }

      const email = emailInput.value.trim();
      const password = passwordInput.value.trim();

      if (!email || !password) {
        alert("Veuillez remplir tous les champs.");
        return;
      }

      console.log("🔐 Tentative de connexion pour:", email);
      const result = login(email, password);

      if (result.success) {
        console.log("✓ Connexion réussie! Redirection vers le dashboard...");
        // Vérifier que la session est bien sauvegardée
        const savedSession = localStorage.getItem(AUTH_KEY);
        console.log("✓ Session sauvegardée:", savedSession ? "OUI" : "NON");
        // Redirection
        window.location.href = "dashboard.html";
      } else {
        console.error("❌ Erreur de connexion:", result.message);
        alert(result.message);
      }
    });
  });

  // Setup register forms (handles both mobile and desktop)
  document.querySelectorAll(".form-register").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      
      // Detect if mobile or desktop form by checking for mobile-specific IDs
      const isMobile = form.querySelector("#m-nom") !== null;
      const prefix = isMobile ? "m" : "d";
      
      // Get values using form-specific IDs
      const nomInput = form.querySelector(`#${prefix}-nom`);
      const prenomInput = form.querySelector(`#${prefix}-prenom`);
      const emailInput = form.querySelector(`#${prefix}-email`);
      const passwordInput = form.querySelector(`#${prefix}-pw1`);
      
      // Validate that all inputs exist
      if (!nomInput || !emailInput || !passwordInput) {
        console.error("Form inputs not found. Missing:", { 
          nom: !nomInput, 
          email: !emailInput, 
          password: !passwordInput 
        });
        alert("Erreur: Formulaire incomplet");
        return;
      }
      
      const name = (nomInput.value.trim() || "") + " " + (prenomInput?.value.trim() || "");
      const email = emailInput.value.trim();
      const password = passwordInput.value.trim();

      if (!email || !password || !nomInput.value.trim()) {
        alert("Veuillez remplir tous les champs obligatoires.");
        return;
      }

      const result = register(name, email, password);
      if (result.success) {
        window.location.href = "dashboard.html";
      } else {
        alert(result.message);
      }
    });
  });

  // Setup logout buttons
  document.querySelectorAll(".logout-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      logout();
    });
  });

  // close sidebar on mobile when a navigation link is tapped
  document.querySelectorAll(".sb-item").forEach((a) => {
    a.addEventListener("click", () => {
      if (window.innerWidth < 900) closeSb();
    });
  });
});