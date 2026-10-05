export type TokenPortal = "user" | "admin" | "partenaire" | "autorite";

const ACCESS_KEYS: Record<TokenPortal, string> = {
  user: "docmaster_user_jwt_token",
  admin: "docmaster_admin_jwt_token",
  partenaire: "docmaster_partenaire_jwt_token",
  autorite: "docmaster_autorite_jwt_token",
};

const REFRESH_KEYS: Record<TokenPortal, string> = {
  user: "docmaster_user_refresh_token",
  admin: "docmaster_admin_refresh_token",
  partenaire: "docmaster_partenaire_refresh_token",
  autorite: "docmaster_autorite_refresh_token",
};

const LEGACY_ACCESS = "docmaster_jwt_token";
const LEGACY_REFRESH = "docmaster_refresh_token";

function migrateLegacyAccess(portal: TokenPortal): string | null {
  const legacy = localStorage.getItem(LEGACY_ACCESS);
  if (!legacy) return null;
  if (portal === "user" || portal === "partenaire") {
    localStorage.setItem(ACCESS_KEYS[portal], legacy);
    localStorage.removeItem(LEGACY_ACCESS);
    return legacy;
  }
  return null;
}

function migrateLegacyRefresh(portal: TokenPortal): string | null {
  const legacy = localStorage.getItem(LEGACY_REFRESH);
  if (!legacy) return null;
  if (portal === "user" || portal === "partenaire") {
    localStorage.setItem(REFRESH_KEYS[portal], legacy);
    localStorage.removeItem(LEGACY_REFRESH);
    return legacy;
  }
  return null;
}

export function getToken(portal: TokenPortal = "user") {
  let token = localStorage.getItem(ACCESS_KEYS[portal]);
  if (!token) token = migrateLegacyAccess(portal);
  if (token) return token;

  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === ACCESS_KEYS[portal] || (portal === "user" && name === LEGACY_ACCESS)) {
      token = decodeURIComponent(value);
      if (token) {
        localStorage.setItem(ACCESS_KEYS[portal], token);
        return token;
      }
    }
  }
  return null;
}

export function getRefreshToken(portal: TokenPortal = "user") {
  const stored = localStorage.getItem(REFRESH_KEYS[portal]);
  if (stored) return stored;
  return migrateLegacyRefresh(portal);
}

export function saveToken(token: string, portal: TokenPortal = "user") {
  if (!token) return;
  localStorage.setItem(ACCESS_KEYS[portal], token);
  if (portal === "user") {
    document.cookie = `${ACCESS_KEYS.user}=${token}; path=/; max-age=604800; SameSite=Lax`;
  }
}

export function saveRefreshToken(token: string, portal: TokenPortal = "user") {
  if (!token) return;
  localStorage.setItem(REFRESH_KEYS[portal], token);
}

export function deleteToken(portal: TokenPortal = "user") {
  localStorage.removeItem(ACCESS_KEYS[portal]);
  localStorage.removeItem(REFRESH_KEYS[portal]);
  if (portal === "user") {
    localStorage.removeItem(LEGACY_ACCESS);
    localStorage.removeItem(LEGACY_REFRESH);
    document.cookie = `${ACCESS_KEYS.user}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    document.cookie = `${LEGACY_ACCESS}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }
}

export function isAuthenticated(portal: TokenPortal = "user") {
  return !!getToken(portal);
}
