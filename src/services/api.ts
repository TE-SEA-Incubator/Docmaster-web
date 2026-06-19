import axios from "axios";
import { getToken, saveToken, deleteToken } from "../utils/cookie";

const resolveBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BACKEND_URL_PROD;
  if (envUrl) {
    return envUrl.replace(/\/+$/, "") + "/api/";
  }
  const origin = window.location.origin;
  if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
    return "http://localhost:5000/api/";
  }
  return "/api/";
};

const API_BASE_URL = resolveBaseUrl();

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {},
});

apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      deleteToken();
      localStorage.removeItem("docmaster_user_session");
      localStorage.removeItem("dm_devices_cache");
      if (
        !window.location.pathname.includes("/login") &&
        window.location.pathname !== "/"
      ) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
export { API_BASE_URL };
