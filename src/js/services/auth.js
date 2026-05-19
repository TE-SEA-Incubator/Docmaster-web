/**
 * ═════════════════════════════════════════════════════════════════
 * AUTH.JS - Authentication System for DocMaster
 * Handles login, registration, and session management
 * Uses API backend instead of Firebase
 * ═════════════════════════════════════════════════════════════════
 */

import {
  loginUser as apiLogin,
  registerUser as apiRegister,
  logout as apiLogout,
  updateProfile as apiUpdateProfile,
  requestPasswordReset as apiRequestReset,
  resetPassword as apiResetPassword,
} from './api.js';
import { socketService } from './socket.js';
import { saveToken, deleteToken, getToken } from '../utils/cookie.js';

// Import utility functions
import {
  startButtonLoader,
  stopButtonLoader,
  setupGlobalButtonLoaders,
  openSb,
  closeSb,
  markActiveSidebar,
  switchTab,
  togglePw,
  checkStrength,
  checkMatch,
  checkPseudo,
  selectPseudo,
  toggleReferral,
  resendPin,
  nextStep,
  prevStep,
  submitRegister,
  showErrorModal,
  showSuccessModal,
} from '../utils/index.js';

/**
 * Generate pseudo suggestions based on name
 */
export function generateSuggestions(prefix) {
  const nom = document.getElementById(`${prefix}-nom`)?.value.trim() || '';
  const prenom = document.getElementById(`${prefix}-prenom`)?.value.trim() || '';
  
  if (!nom && !prenom) return;
  
  const base = (prenom + nom).toLowerCase().replace(/\s+/g, '');
  const suggestions = [
    base,
    `${base}${Math.floor(Math.random() * 99)}`,
    `${prenom.toLowerCase()}_${nom.toLowerCase()}`,
    `${nom.toLowerCase()}${prenom.charAt(0).toLowerCase()}${new Date().getFullYear()}`
  ];
  
  const container = document.getElementById(`${prefix}-suggestions`);
  if (container) {
    container.innerHTML = suggestions.map(s => `
      <button type="button" onclick="selectPseudo('${prefix}', '${s}', this)" class="pseudo-chip px-3 py-1.5 rounded-full border border-borderMain text-[11px] font-bold text-textMuted hover:border-primary hover:text-primary transition-all">
        @${s}
      </button>
    `).join('');
  }
}

const AUTH_KEY = "docmaster_user_session";
const AUTH_TOKEN_KEY = "docmaster_jwt_token";

/**
 * Get initials from full name
 */
function getInitials(nom, prenom) {
  const fullName = `${nom || ''} ${prenom || ''}`.trim();
  if (!fullName) return "DM";
  return fullName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
}

/**
 * Save user session to localStorage and cookies
 */
function saveSession(user, token) {
  const session = {
    id: user.id,
    nom: user.nom,
    prenom: user.prenom,
    email: user.email,
    telephone: user.telephone,
    pays: user.pays,
    ville: user.ville,
    code_invitation: user.code_invitation,
    is_verified: user.is_verified,
    points: user.points,
    wallet_balance: user.wallet_balance,
    photo_url: user.photo_url,
    date_naissance: user.date_naissance,
    lieu_naissance: user.lieu_naissance,
    currency: user.currency,
    initial: getInitials(user.nom, user.prenom),
    created_at: user.created_at,
    role: user.role,
  };
  localStorage.setItem(AUTH_KEY, JSON.stringify(session));
  saveToken(token);
}

/**
 * Get user session from localStorage
 */
function getSession() {
  const session = localStorage.getItem(AUTH_KEY);
  return session ? JSON.parse(session) : null;
}

/**
 * Login - Authenticate user
 */
async function login(email, password) {
  try {
    if (!email || !password) {
      const message = "Email et mot de passe requis.";
      showErrorModal("Erreur de validation", message);
      return { success: false, message };
    }

    const result = await apiLogin(email, password);

    if (result.success) {
      const { user, token } = result.data;
      saveSession(user, token);
      console.log("✓ Connexion réussie:", email);
      return { success: true, user };
    } else {
      console.error("❌ Erreur de connexion:", result.message);
      showErrorModal("Erreur de connexion", result.message || "Identifiants invalides.", 5000);
      return { success: false, message: result.message };
    }
  } catch (error) {
    console.error("❌ Erreur lors de la connexion:", error);
    const message = error.message || "Une erreur est survenue lors de la connexion. Vérifiez votre connexion réseau.";
    showErrorModal("Erreur de connexion", message);
    return { success: false, message };
  }
}

/**
 * Register - Create new user account
 */
async function register(nom, prenom, email, password, telephone = null, pays = 'Cameroun', ville = 'Yaoundé', codeParrainage = null, is_verified = false) {
  try {
    if (!nom || !prenom || !email || !password) {
      const message = "Le nom, prénom, email et mot de passe sont requis.";
      showErrorModal("Erreur de validation", message);
      return { success: false, message };
    }

    const result = await apiRegister({
      nom,
      prenom,
      email,
      mot_de_passe: password,
      telephone,
      pays,
      ville,
      code_parrainage: codeParrainage,
      is_verified,
    });

    if (result.success) {
      const { user, token, code_invitation } = result.data;
      console.log("✓ Inscription réussie. Code d'invitation:", code_invitation);
      
      // Auto-login if token is provided
      if (token) {
        saveSession(user, token);
        localStorage.setItem('docmaster_is_new_user', 'true');
      }

      showSuccessModal(
        "Inscription réussie! ✓",
        `Bienvenue ${prenom || nom}!\n\nVotre code d'invitation: ${code_invitation}\n\nConnexion automatique en cours...`,
        2500
      );

      return {
        success: true,
        user: {
          ...user,
          initial: getInitials(user.nom, user.prenom),
        },
        token,
        code_invitation,
      };
    } else {
      console.error("❌ Erreur d'inscription:", result.message);
      showErrorModal("Erreur d'inscription", result.message || "Une erreur est survenue lors de l'inscription.", 5000);
      return { success: false, message: result.message };
    }
  } catch (error) {
    console.error("❌ Erreur lors de l'inscription:", error);
    const message = error.message || "Une erreur est survenue lors de l'inscription.";
    showErrorModal("Erreur d'inscription", message);
    return { success: false, message };
  }
}


/**
 * Handle profile update
 */
async function handleUpdateProfile(userData) {
  try {
    const result = await apiUpdateProfile(userData);
    if (result.success) {
      const updatedUser = result.data.user;
      const session = getSession();
      
      // Update session with new data
      const newSession = { 
        ...session, 
        ...updatedUser,
        initial: getInitials(updatedUser.nom, updatedUser.prenom)
      };
      
      localStorage.setItem(AUTH_KEY, JSON.stringify(newSession));
      updateUI(newSession);
      return { success: true, user: newSession };
    }
    return result;
  } catch (error) {
    console.error("❌ Erreur de mise à jour du profil:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Logout - Clear session and redirect
 */
async function logout() {
  try {
    await apiLogout();
    socketService.disconnect();
    console.log("✓ Déconnexion réussie");
    return { success: true };
  } catch (error) {
    console.error("❌ Erreur de déconnexion:", error);
    localStorage.removeItem(AUTH_KEY);
    deleteToken();
    window.location.href = "/login.html";
  }
}

/**
 * Google OAuth Login
 * Handles sign-in with Google via Firebase
 */
async function loginWithGoogle() {
  try {
    console.log("🔐 Initialisation de la connexion Google...");
    console.log("🔐 Step 1: Firebase config check");
    console.log("API Key:", import.meta.env.VITE_FIREBASE_API_KEY?.substring(0, 10) + "***");
    console.log("Auth Domain:", import.meta.env.VITE_FIREBASE_AUTH_DOMAIN);
    
    // Import Firebase auth functions
    console.log("🔐 Step 2: Importing Firebase modules...");
    const { signInWithPopup } = await import("firebase/auth");
    console.log("✓ signInWithPopup imported");
    
    const { auth, googleProvider } = await import("../firebase.js");
    console.log("✓ Firebase auth imported:", auth !== undefined);
    console.log("✓ Google Provider imported:", googleProvider !== undefined);
    
    const { googleOAuthLogin } = await import("./api.js");
    console.log("✓ googleOAuthLogin imported");
    
    // Show loading state
    console.log("🔐 Step 3: Finding Google buttons and showing loaders...");
    const googleButtons = document.querySelectorAll('button.google-login-btn');
    console.log("✓ Found", googleButtons.length, "Google buttons");
    googleButtons.forEach(btn => startButtonLoader(btn));
    
    // Firebase Google sign-in with popup
    console.log("🔐 Step 4: Opening Google sign-in popup...");
    const result = await signInWithPopup(auth, googleProvider);
    console.log("✓ Google sign-in popup result:", result);
    
    const user = result.user;
    const token = await user.getIdToken();
    
    console.log("✓ Google Sign-in réussi:", user.email);
    console.log("✓ Got Firebase ID token (length:", token.length, ")");
    
    // Send token to backend
    console.log("🔐 Step 5: Sending token to backend...");
    const oauthResult = await googleOAuthLogin(token, {
      email: user.email,
      displayName: user.displayName,
    });
    console.log("✓ Backend response:", oauthResult);
    
    if (googleButtons.length > 0) {
      googleButtons.forEach(btn => stopButtonLoader(btn));
    }
    
    if (oauthResult.success) {
      const { user: dbUser, token: jwtToken } = oauthResult.data;
      
      // Save session with JWT from backend
      saveSession(dbUser, jwtToken);
      
      console.log("✓ Connexion Google réussie!");
      showSuccessModal(
        "Bienvenue! 🎉",
        `Connexion réussie en tant que ${dbUser.prenom || dbUser.email}`,
        1500
      );
      
      // Redirect after modal
      setTimeout(() => {
        const isAdmin = dbUser.role && dbUser.role.toUpperCase() === 'ADMIN';
        if (isAdmin) {
          window.location.href = "/admin/dashboard.html";
        } else {
          window.location.href = "/dashboard.html";
        }
      }, 1500);
      
      return { success: true, user: dbUser };
    } else {
      if (googleButtons.length > 0) {
        googleButtons.forEach(btn => stopButtonLoader(btn));
      }
      showErrorModal(
        "Erreur",
        oauthResult.message || "Une erreur s'est produite lors de la connexion au serveur.",
        5000
      );
      return { success: false, message: oauthResult.message };
    }
  } catch (error) {
    console.error("❌ Erreur Google Login:", error);
    
    const googleButtons = document.querySelectorAll('button.google-login-btn');
    if (googleButtons.length > 0) {
      googleButtons.forEach(btn => stopButtonLoader(btn));
    }
    
    // Handle specific Firebase error codes
    const errorMessages = {
      'auth/popup-closed-by-user': 'Fenêtre de connexion fermée. Veuillez réessayer.',
      'auth/popup-blocked': 'Les popups sont bloquées. Veuillez activer les popups pour ce site.',
      'auth/cancelled-popup-request': 'Connexion annulée.',
      'auth/operation-not-allowed': 'La connexion Google n\'est pas activée.',
    };
    
    const errorMessage = errorMessages[error.code] || error.message || "Une erreur inattendue s'est produite.";
    showErrorModal("Erreur de connexion Google", errorMessage);
    
    return { success: false, message: error.message };
  }
}

/**
 * Check authentication status and redirect if needed
 */
function checkAuth() {
  const session = getSession();
  const token = getToken();
  const currentPage = window.location.pathname.split("/").pop();
  
  // Pages that don't require authentication
  const publicPages = [
    "index.html",
    "login.html",
    "rechercher.html",
    "rechercher.old.html",
    "",
  ];

  const isLoginPage = currentPage === "login.html" || currentPage === "";
  const isPublicPage = publicPages.includes(currentPage);

  if (session && token) {
    console.log("👤 Utilisateur connecté:", session.email, "Rôle:", session.role);
    updateUI(session);
    markActiveSidebarLocal();

    // Initialize Real-time Socket
    socketService.init();

    const isAdmin = session.role && session.role.toUpperCase() === 'ADMIN';
    const isInsideAdmin = window.location.pathname.includes('/admin/');

    // Auto-redirect Admin to their dashboard if they are on user pages
    if (isAdmin && !isInsideAdmin && !isPublicPage) {
      console.log("⚡ Redirection Admin vers Dashboard Admin...");
      window.location.href = "/admin/dashboard.html";
      return;
    }

    // Auto-redirect regular users AWAY from admin pages
    if (!isAdmin && isInsideAdmin) {
      console.log("🚫 Accès refusé: Redirection vers Dashboard Utilisateur...");
      window.location.href = "/dashboard.html";
      return;
    }

    // Redirect to dashboard if on login page
    if (isLoginPage) {
      if (isAdmin) {
        window.location.href = "/admin/dashboard.html";
      } else {
        window.location.href = "/dashboard.html";
      }
    }
  } else {
    console.log("👤 Aucun utilisateur connecté.");
    
    // Redirect to login if on protected page
    const isInsideAdmin = window.location.pathname.includes('/admin/');
    if (!isPublicPage && !isLoginPage) {
      window.location.href = "/login.html";
    }
  }
}

/**
 * Update UI with user information
 */
function updateUI(user) {
  if (!user) return;

  const fullName = `${user.prenom || ''} ${user.nom || ''}`.trim() || user.name;
  const initial = user.initial || (user.nom ? user.nom[0] : "D");

  // Update profile button/header/sidebar
  document.querySelectorAll("[data-user-initial], #userInitial, #topInitial").forEach(el => {
    el.textContent = initial;
  });

  // Update user name display
  document.querySelectorAll("[data-user-name], #userName, #topName, #helloName").forEach(el => {
    // helloName and topName often only use prenom
    if (el.id === "helloName" || el.id === "topName") {
      el.textContent = user.prenom || user.name || user.nom;
    } else {
      el.textContent = fullName;
    }
  });

  // Update user photo display
  document.querySelectorAll("[data-user-photo], #userPhoto, #topPhoto").forEach(el => {
    if (user.photo_url) {
      const fullUrl = user.photo_url.startsWith('http') ? user.photo_url : '/' + user.photo_url.replace(/^\//, '');
      if (el.tagName === 'IMG') {
        el.src = fullUrl;
        el.classList.remove('hidden');
      } else {
        el.style.backgroundImage = `url('${fullUrl}')`;
        el.style.backgroundSize = 'cover';
        el.style.backgroundPosition = 'center';
      }
      
      // Hide initials if we have a photo
      const initialWrap = el.closest('#topInitialWrap') || el.parentElement;
      if (initialWrap) {
        const initialEl = initialWrap.querySelector('#topInitial, #userInitial, [data-user-initial]');
        if (initialEl) initialEl.classList.add('hidden');
      }
    } else {
      // Show initial if no photo
      if (el.tagName === 'IMG') el.classList.add('hidden');
      const initialWrap = el.closest('#topInitialWrap') || el.parentElement;
      if (initialWrap) {
        const initialEl = initialWrap.querySelector('#topInitial, #userInitial, [data-user-initial]');
        if (initialEl) initialEl.classList.remove('hidden');
      }
    }
  });

  // Update email display
  const userEmailDisplay = document.querySelector("[data-user-email]");
  if (userEmailDisplay) {
    userEmailDisplay.textContent = user.email;
  }

  // Update profile completion
  const completionDisplay = document.querySelectorAll("[data-user-completion], #profileCompletion");
  if (completionDisplay.length > 0) {
    const fields = ['nom', 'prenom', 'email', 'phone', 'city', 'photo_url'];
    const filledFields = fields.filter(f => user[f] && user[f] !== "").length;
    const completion = Math.round((filledFields / fields.length) * 100);
    completionDisplay.forEach(el => {
      el.textContent = `${completion}%`;
    });
  }

  // Update points display
  const pointsDisplay = document.querySelector("[data-user-points]");
  if (pointsDisplay) {
    pointsDisplay.textContent = user.points || 0;
  }

  // Update wallet display
  const walletDisplay = document.querySelector("[data-user-wallet]");
  if (walletDisplay) {
    walletDisplay.textContent = `${user.wallet_balance || 0} XAF`;
  }
}

/**
 * Mark active page in sidebar
 */
function markActiveSidebarLocal() {
  markActiveSidebar();
}

// sidebar open/close helpers (attach to window for inline HTML)
window.openSb = openSb;
window.closeSb = closeSb;

// Button loader helpers (attach to window for inline HTML)
window.startButtonLoader = startButtonLoader;
window.stopButtonLoader = stopButtonLoader;

// ═════════════════════════════════════════════════════════════════
// UI Helper Functions (attach to window for inline HTML calls)
// ═════════════════════════════════════════════════════════════════

// Auth functions
window.login = login;
window.register = register;
window.logout = logout;
window.loginWithGoogle = loginWithGoogle;
window.checkAuth = checkAuth;
window.getSession = getSession;

// UI helpers
window.switchTab = switchTab;
window.togglePw = togglePw;
window.checkStrength = checkStrength;
window.checkMatch = checkMatch;
window.nextStep = nextStep;
window.prevStep = prevStep;
window.submitRegister = submitRegister;
window.resendPin = resendPin;
window.checkPseudo = checkPseudo;
window.selectPseudo = selectPseudo;
window.toggleReferral = toggleReferral;

// ensure sidebar starts closed on mobile
if (window.innerWidth < 900) closeSb();

// Initialize
checkAuth();
setupGlobalButtonLoaders();

// Setup login forms (handles both mobile and desktop)
document.querySelectorAll(".form-login").forEach((form) => {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const emailInput = form.querySelector('input[type="email"]');
    const passwordInput = form.querySelector('input[type="password"]') ||
                          form.querySelector('input[id$="-pw"][type="text"]');

    if (!emailInput || !passwordInput) {
      showErrorModal("Erreur", "Formulaire de connexion incomplet");
      return false;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      showErrorModal("Erreur de validation", "Veuillez remplir tous les champs.");
      return false;
    }

    console.log("🔐 Tentative de connexion pour:", email);
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) startButtonLoader(submitBtn);
    
    try {
      const result = await login(email, password);

      if (submitBtn) stopButtonLoader(submitBtn);

      if (result.success) {
        console.log("✓ Connexion réussie!");
        const isAdmin = result.user && result.user.role && result.user.role.toUpperCase() === 'ADMIN';
        if (isAdmin) {
          window.location.href = "/admin/dashboard.html";
        } else {
          window.location.href = "/dashboard.html";
        }
      }
    } catch (err) {
      if (submitBtn) stopButtonLoader(submitBtn);
      showErrorModal("Erreur", "Une erreur inattendue est survenue.");
    }
    
    return false;
  });
});

// Setup register forms (handles both mobile and desktop)
document.querySelectorAll(".form-register").forEach((form) => {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Detect if mobile or desktop form by checking for mobile-specific IDs
    const isMobile = form.querySelector("#m-nom") !== null;
    const prefix = isMobile ? "m" : "d";
    
    const nomInput = form.querySelector(`#${prefix}-nom`);
    const prenomInput = form.querySelector(`#${prefix}-prenom`);
    const emailInput = form.querySelector(`#${prefix}-email`);
    const passwordInput = form.querySelector(`#${prefix}-pw1`);
    
    // Validate that all inputs exist
    if (!nomInput || !emailInput || !passwordInput) {
      showErrorModal("Erreur", "Formulaire incomplet");
      return false;
    }
    
    const nom = nomInput.value.trim();
    const prenom = prenomInput?.value.trim() || "";
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password || !nom) {
      showErrorModal("Erreur de validation", "Veuillez remplir tous les champs obligatoires.");
      return false;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) startButtonLoader(submitBtn);

    try {
      const result = await register(nom, prenom, email, password);

      if (submitBtn) stopButtonLoader(submitBtn);

      if (result.success) {
        console.log("✓ Inscription réussie! Redirection vers le dashboard...");
        setTimeout(() => {
          window.location.href = "/dashboard.html";
        }, 2500);
      }
    } catch (err) {
      if (submitBtn) stopButtonLoader(submitBtn);
      showErrorModal("Erreur", "Une erreur est survenue.");
    }
    
    return false;
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

window.handleUpdateProfile = handleUpdateProfile;
window.updateUI = updateUI;
window.switchTab = switchTab;
window.togglePw = togglePw;
window.checkStrength = checkStrength;
window.checkMatch = checkMatch;
window.checkPseudo = checkPseudo;
window.selectPseudo = selectPseudo;
window.toggleReferral = toggleReferral;
window.generateSuggestions = generateSuggestions;
window.resendPin = resendPin;
window.nextStep = nextStep;
window.prevStep = prevStep;
window.submitRegister = submitRegister;

/**
 * Open Forgot Password Modal
 */
export function openForgotModal() {
  const modal = document.getElementById('forgot_modal');
  if (modal) modal.showModal();
}

/**
 * Handle Forgot Password Form Submission
 */
export async function handleForgotPassword(event) {
  event.preventDefault();
  const emailInput = document.getElementById('forgot-email');
  const btn = document.getElementById('btn-forgot-submit');
  
  if (!emailInput?.value) return;

  startButtonLoader(btn);
  
  const result = await apiRequestReset(emailInput.value);
  
  stopButtonLoader(btn);
  
  if (result.success) {
    const modal = document.getElementById('forgot_modal');
    if (modal) modal.close();
    
    // In dev mode, we show the token for convenience
    const message = result.data.token 
      ? `Un lien de réinitialisation a été généré. (Dev Mode Token: ${result.data.token})` 
      : 'Un lien de réinitialisation a été envoyé à votre adresse email.';
      
    showSuccessModal(message);
    
    // For testing/dev purposes, if token exists, we could redirect to reset page
    if (result.data.token) {
      setTimeout(() => {
        if(confirm("Voulez-vous aller à la page de réinitialisation avec ce token ?")) {
          window.location.href = `/reset-password.html?token=${result.data.token}`;
        }
      }, 2000);
    }
  } else {
    showErrorModal(result.message);
  }
}

/**
 * Handle Reset Password Form Submission
 */
export async function handleResetPassword(event) {
  event.preventDefault();
  const passwordInput = document.getElementById('new-password');
  const confirmInput = document.getElementById('confirm-password');
  const btn = document.getElementById('btn-reset-submit');
  
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  if (!token) {
    showErrorModal("Token de réinitialisation manquant.");
    return;
  }

  if (passwordInput.value !== confirmInput.value) {
    showErrorModal("Les mots de passe ne correspondent pas.");
    return;
  }

  startButtonLoader(btn);
  
  const result = await apiResetPassword(token, passwordInput.value);
  
  stopButtonLoader(btn);
  
  if (result.success) {
    showSuccessModal("Votre mot de passe a été réinitialisé avec succès.");
    setTimeout(() => {
      window.location.href = "/login.html";
    }, 2000);
  } else {
    showErrorModal(result.message);
  }
}

window.handleForgotPassword = handleForgotPassword;
window.handleResetPassword = handleResetPassword;
window.openForgotModal = openForgotModal;

// Initialize auth
checkAuth();

// Export functions
export { login, register, logout, checkAuth, getSession, updateUI, handleUpdateProfile };