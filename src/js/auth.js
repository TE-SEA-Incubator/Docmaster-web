/**
 * AUTH.JS - Mock Authentication System for DocMaster
 * Handles login, registration, and session management using localStorage.
 */

const AUTH_KEY = "docmaster_user_session";
const USERS_KEY = "docmaster_users_db";

/**
 * Initialize mock DB with a default user if empty
 */
function initDB() {
  if (!localStorage.getItem(USERS_KEY)) {
    const defaultUsers = [
      {
        email: "user@example.com",
        password: "password123",
        name: "Jean-Marc D.",
        initial: "JM",
      },
    ];
    localStorage.setItem(USERS_KEY, JSON.stringify(defaultUsers));
  }
}

/**
 * Login function
 */
function login(email, password) {
  const users = JSON.parse(localStorage.getItem(USERS_KEY));
  const user = users.find((u) => u.email === email && u.password === password);

  if (user) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    return { success: true, user };
  }
  return { success: false, message: "Email ou mot de passe incorrect." };
}

/**
 * Register function
 */
function register(name, email, password) {
  const users = JSON.parse(localStorage.getItem(USERS_KEY));

  if (users.some((u) => u.email === email)) {
    return { success: false, message: "Cet email est déjà utilisé." };
  }

  const newUser = {
    name,
    email,
    password,
    initial: name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2),
  };

  users.push(newUser);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));

  // Auto-login
  localStorage.setItem(AUTH_KEY, JSON.stringify(newUser));
  return { success: true, user: newUser };
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
  const isLoginPage = window.location.pathname.includes("login.html");

  if (
    !session &&
    !isLoginPage &&
    !window.location.pathname.endsWith("index.html")
  ) {
    window.location.href = "login.html";
  } else if (session && isLoginPage) {
    window.location.href = "dashboard.html";
  }

  if (session) {
    const user = JSON.parse(session);
    updateUI(user);
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

// Initialize on load
document.addEventListener("DOMContentLoaded", () => {
  initDB();
  checkAuth();

  // Setup login forms (handles both mobile and desktop)
  document.querySelectorAll(".form-login").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = form.querySelector('input[type="email"]').value;
      const password = form.querySelector('input[type="password"]').value;

      const result = login(email, password);
      if (result.success) {
        window.location.href = "dashboard.html";
      } else {
        alert(result.message);
      }
    });
  });

  // Setup register forms (handles both mobile and desktop)
  document.querySelectorAll(".form-register").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = form.querySelector('input[type="text"]').value;
      const email = form.querySelector('input[type="email"]').value;
      const password = form.querySelector('input[type="password"]').value;

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
});
