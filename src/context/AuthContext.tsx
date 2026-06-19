import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../services/api";
import { getToken, saveToken, deleteToken } from "../utils/cookie";
import { auth, googleProvider } from "../services/firebase";
import { signInWithPopup } from "firebase/auth";

const AuthContext = createContext(null);

const AUTH_KEY = "docmaster_user_session";

function getInitials(nom, prenom) {
  const full = `${nom || ""} ${prenom || ""}`.trim();
  if (!full) return "DM";
  return full
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
}

function loadSession() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

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
    role: user.role,
    initial: getInitials(user.nom, user.prenom),
    created_at: user.created_at,
  };
  localStorage.setItem(AUTH_KEY, JSON.stringify(session));
  if (token) saveToken(token);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadSession);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    if (user) {
      setLoading(false);
      return;
    }
    apiClient
      .get("auth/profile")
      .then((res) => {
        const u = res.data;
        saveSession(u, token);
        setUser({ ...u, initial: getInitials(u.nom, u.prenom) });
      })
      .catch(() => {
        deleteToken();
        localStorage.removeItem(AUTH_KEY);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, motDePasse) => {
    try {
      const res = await apiClient.post("auth/login", {
        email,
        mot_de_passe: motDePasse,
      });
      if (res.data.token) {
        saveSession(res.data.user, res.data.token);
        setUser({ ...res.data.user, initial: getInitials(res.data.user.nom, res.data.user.prenom) });
        return { success: true };
      }
      return { success: false, message: "Token manquant" };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.error || "Erreur de connexion",
      };
    }
  }, []);

  const loginWithGoogle = useCallback(async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      
      const res = await apiClient.post("auth/google-oauth", {
        token: idToken,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL
      });

      if (res.data.token) {
        saveSession(res.data.user, res.data.token);
        setUser({ ...res.data.user, initial: getInitials(res.data.user.nom, res.data.user.prenom) });
        return { success: true };
      }
      return { success: false, message: "Erreur lors de la connexion Google" };
    } catch (err: any) {
      console.error("Google Login Error:", err);
      return {
        success: false,
        message: err.response?.data?.error || err.message || "Erreur de connexion Google",
      };
    }
  }, []);

  const register = useCallback(async (userData) => {
    try {
      const res = await apiClient.post("auth/register", {
        nom: userData.nom,
        prenom: userData.prenom,
        email: userData.email,
        mot_de_passe: userData.mot_de_passe,
        telephone: userData.telephone || null,
        pays: userData.pays || "Cameroun",
        ville: userData.ville || "Yaoundé",
        code_parrainage: userData.code_parrainage || null,
      });
      if (res.data.token) {
        saveSession(res.data.user, res.data.token);
        setUser({ ...res.data.user, initial: getInitials(res.data.user.nom, res.data.user.prenom) });
      }
      return { success: true, data: res.data };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.error || "Erreur d'inscription",
      };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.post("auth/logout");
    } catch {
      // ignore
    }
    deleteToken();
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem("docmaster_admin_login");
    localStorage.removeItem("dm_devices_cache");
    setUser(null);
  }, []);

  const updateUser = useCallback((updatedFields) => {
    setUser((prev) => {
      const next = { ...prev, ...updatedFields };
      // Recalculer les initiales au cas où le nom change
      next.initial = getInitials(next.nom, next.prenom);
      
      localStorage.setItem(AUTH_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
