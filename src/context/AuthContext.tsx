import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../services/api";
import { getToken, saveToken, saveRefreshToken, deleteToken, getRefreshToken } from "../utils/cookie";
import { auth, googleProvider } from "../services/firebase";
import { signInWithPopup, signInWithCredential, GoogleAuthProvider } from "firebase/auth";
import { useToast } from "./ToastContext";

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

const USER_PORTAL = "user" as const;

function saveSession(user, token, refreshToken?: string) {
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
    genre: user.genre,
    currency: user.currency,
    role: user.role,
    initial: getInitials(user.nom, user.prenom),
    created_at: user.created_at,
    subscription: user.subscription || null,
  };
  localStorage.setItem(AUTH_KEY, JSON.stringify(session));
  if (token) saveToken(token, USER_PORTAL);
  if (refreshToken) saveRefreshToken(refreshToken, USER_PORTAL);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadSession);
  const [loading, setLoading] = useState(true);
  const { success: toastSuccess } = useToast();

  useEffect(() => {
    const token = getToken(USER_PORTAL);
    if (!token) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    apiClient
      .get("auth/profile", { signal: controller.signal })
      .then((res) => {
        const u = res.data;
        saveSession(u, token, getRefreshToken(USER_PORTAL) || undefined);
        setUser({ ...u, initial: getInitials(u.nom, u.prenom) });
        import("../services/webPushService").then((m) => {
          m.registerPushToken();
          m.onForegroundMessage((payload) => {
            const title = payload.notification?.title || "DocMaster";
            const body = payload.notification?.body || "";
            if (Notification.permission === "granted") {
              new Notification(title, { body, icon: "/docmaster-icon.png" });
            }
          });
        }).catch(() => {});
      })
      .catch((err) => {
        if (err?.name === "CanceledError") return;
        if (err?.response?.status === 401) {
          deleteToken(USER_PORTAL);
          localStorage.removeItem(AUTH_KEY);
          setUser(null);
        }
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const login = useCallback(async (email, motDePasse) => {
    try {
      const res = await apiClient.post("auth/login", {
        email,
        mot_de_passe: motDePasse,
      });
      if (res.data.token) {
        saveSession(res.data.user, res.data.token, res.data.refresh_token);
        setUser({ ...res.data.user, initial: getInitials(res.data.user.nom, res.data.user.prenom) });
        import("../services/webPushService").then((m) => {
          m.registerPushToken();
          m.onForegroundMessage((payload) => {
            const title = payload.notification?.title || "DocMaster";
            const body = payload.notification?.body || "";
            if (Notification.permission === "granted") {
              new Notification(title, { body, icon: "/docmaster-icon.png" });
            }
          });
        }).catch(() => {});
        const prenom = res.data.user?.prenom || res.data.user?.nom || "";
        toastSuccess(
          `Ravi de vous revoir${prenom ? `, ${prenom}` : ""} ! Bienvenue sur DocMaster. 🎉`,
          "Connexion réussie",
          5000
        );
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

  const finalizeGoogleUser = useCallback(async (firebaseUser) => {
    console.log("[GoogleAuth] finalizeGoogleUser — email:", firebaseUser?.email, "| displayName:", firebaseUser?.displayName);
    const idToken = await firebaseUser.getIdToken();
    console.log("[GoogleAuth] Firebase ID token obtenu (", idToken.length, "chars) — POST /auth/google-oauth");
    const res = await apiClient.post("auth/google-oauth", {
      token: idToken,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      photoURL: firebaseUser.photoURL,
    });
    console.log("[GoogleAuth] Réponse backend — status:", res.status, "| token présent:", !!res.data?.token, "| user:", res.data?.user?.email);

    if (res.data.token) {
      saveSession(res.data.user, res.data.token, res.data.refresh_token);
      setUser({ ...res.data.user, initial: getInitials(res.data.user.nom, res.data.user.prenom) });
      import("../services/webPushService").then((m) => {
        m.registerPushToken();
        m.onForegroundMessage((payload) => {
          const title = payload.notification?.title || "DocMaster";
          const body = payload.notification?.body || "";
          if (Notification.permission === "granted") {
            new Notification(title, { body, icon: "/docmaster-icon.png" });
          }
        });
      }).catch(() => {});
      const prenom = res.data.user?.prenom || res.data.user?.nom || "";
      toastSuccess(
        `Ravi de vous revoir${prenom ? `, ${prenom}` : ""} ! Bienvenue sur DocMaster. 🎉`,
        "Connexion réussie",
        5000
      );
      console.log("[GoogleAuth] Session sauvegardée — connexion réussie");
      return { success: true };
    }
    console.warn("[GoogleAuth] Aucun token dans la réponse backend");
    return { success: false, message: "Erreur lors de la connexion Google" };
  }, [toastSuccess]);

  const loginWithGoogle = useCallback(async () => {
    try {
      console.log("[GoogleAuth] Popup Google ouvert (loginWithGoogle)");
      const result = await signInWithPopup(auth, googleProvider);
      console.log("[GoogleAuth] Popup résolue — user:", result.user?.email);
      return await finalizeGoogleUser(result.user);
    } catch (err: any) {
      console.error("[GoogleAuth] Erreur popup:", err?.code || err?.message || err);
      return {
        success: false,
        message: err.response?.data?.error || err.message || "Erreur de connexion Google",
      };
    }
  }, [finalizeGoogleUser]);

  const loginWithGoogleCredential = useCallback(async (credential: string) => {
    try {
      console.log("[GoogleAuth] One Tap — signInWithCredential (credential:", credential.slice(0, 30) + "...)");
      const result = await signInWithCredential(auth, GoogleAuthProvider.credential(credential));
      console.log("[GoogleAuth] signInWithCredential réussi — user:", result.user?.email);
      return await finalizeGoogleUser(result.user);
    } catch (err: any) {
      console.error("[GoogleAuth] Erreur One Tap:", err?.code || err?.message || err);
      return {
        success: false,
        message: err.response?.data?.error || err.message || "Erreur de connexion Google",
      };
    }
  }, [finalizeGoogleUser]);

  const register = useCallback(async (userData) => {
    try {
      const res = await apiClient.post("auth/register", {
        nom: userData.nom,
        prenom: userData.prenom,
        email: userData.email,
        mot_de_passe: userData.mot_de_passe,
        telephone: userData.telephone || null,
        date_naissance: userData.date_naissance || null,
        pays: userData.pays || "Cameroun",
        ville: userData.ville || "Yaoundé",
        code_parrainage: userData.code_parrainage || null,
      });
      if (res.data.token) {
        saveSession(res.data.user, res.data.token, res.data.refresh_token);
        setUser({ ...res.data.user, initial: getInitials(res.data.user.nom, res.data.user.prenom) });
        import("../services/webPushService").then((m) => {
          m.registerPushToken();
          m.onForegroundMessage((payload) => {
            const title = payload.notification?.title || "DocMaster";
            const body = payload.notification?.body || "";
            if (Notification.permission === "granted") {
              new Notification(title, { body, icon: "/docmaster-icon.png" });
            }
          });
        }).catch(() => {});
        const prenom = res.data.user?.prenom || res.data.user?.nom || "";
        toastSuccess(
          `Votre compte DocMaster est prêt${prenom ? `, ${prenom}` : ""} ! Bonne utilisation. 🚀`,
          "Compte créé avec succès",
          6000
        );
      }
      return { success: true, data: res.data };
    } catch (err: any) {
      console.error("Registration error:", err.response?.data || err.message || err);
      return {
        success: false,
        message: err.response?.data?.error || "Erreur d'inscription",
      };
    }
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken(USER_PORTAL);
    try {
      await apiClient.post("auth/logout", refreshToken ? { refresh_token: refreshToken } : {});
    } catch {
      // ignore
    }
    import("../services/webPushService").then((m) => m.unregisterPushToken()).catch(() => {});
    deleteToken(USER_PORTAL);
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

  const refreshProfile = useCallback(async () => {
    try {
      const res = await apiClient.get("auth/profile");
      if (res.data) {
        const u = res.data;
        const token = getToken(USER_PORTAL);
        saveSession(u, token, getRefreshToken(USER_PORTAL) || undefined);
        const updatedUser = { ...u, initial: getInitials(u.nom, u.prenom) };
        setUser(updatedUser);
        return updatedUser;
      }
    } catch (e) {
      console.error("[AuthContext] refreshProfile error:", e);
    }
    return null;
  }, []);

  const deleteAccount = useCallback(async () => {
    try {
      await apiClient.delete("auth/account");
      import("../services/webPushService").then((m) => m.unregisterPushToken()).catch(() => {});
      deleteToken(USER_PORTAL);
      localStorage.removeItem(AUTH_KEY);
      localStorage.removeItem("docmaster_admin_login");
      localStorage.removeItem("dm_devices_cache");
      setUser(null);
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        message: err.response?.data?.error || "Erreur lors de la suppression du compte",
      };
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, loginWithGoogleCredential, register, logout, updateUser, refreshProfile, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
