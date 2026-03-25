import axios from "axios";

// Django expone las rutas bajo /api/
let API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

if (API_BASE_URL && !API_BASE_URL.endsWith("/api")) {
  API_BASE_URL = API_BASE_URL.replace(/\/?$/, "") + "/api";
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// =============================
// REQUEST INTERCEPTOR (JWT)
// =============================
apiClient.interceptors.request.use((config) => {
  const url = String(config.url || "");

  // Endpoints públicos donde NO se debe adjuntar JWT:
  // - Registro: POST auth/users/
  // - Login: POST auth/token/
  // - Refresh: POST auth/token/refresh/
  // IMPORTANTE: no excluimos auth/users/me/, porque ahí sí necesitamos JWT (PATCH/PUT).
  const isPublicRegisterEndpoint = url.endsWith("auth/users/") || url.endsWith("auth/users");
  const isPublicTokenObtain = url.endsWith("auth/token/") || url.endsWith("auth/token");
  const isPublicTokenRefresh =
    url.includes("auth/token/refresh") || url.endsWith("auth/token/refresh/");
  const isPublicAuthEndpoint = isPublicRegisterEndpoint || isPublicTokenObtain || isPublicTokenRefresh;

  const token = window.localStorage.getItem("accessToken");
  if (token && !isPublicAuthEndpoint) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// =============================
// RESPONSE INTERCEPTOR
// (Refresh + manejo de errores)
// =============================

let isRefreshing = false;
let pendingQueue = [];

const processQueue = (error, newToken = null) => {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(newToken);
  });
  pendingQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};
    const originalUrl = String(originalRequest.url || "");
    const status = error.response?.status;
    const logoutAt = window.localStorage.getItem("logoutAt");

    // Si no hay respuesta del servidor (ERR_CONNECTION_REFUSED / ERR_EMPTY_RESPONSE),
    // generamos un mensaje entendible para el usuario.
    if (!error.response) {
      const friendlyError = new Error(
        "No se pudo conectar con el servidor. Asegúrate de que el backend esté ejecutándose en http://localhost:8000 y que la URL de la API sea correcta."
      );
      friendlyError.isAxiosError = true;
      friendlyError.originalError = error;
      return Promise.reject(friendlyError);
    }

    // Manejo error 500 amigable
    if (status === 500) {
      const friendlyError = new Error("Ups! Hubo un error en el servidor, intenta más tarde.");
      friendlyError.response = error.response;
      friendlyError.request = error.request;
      friendlyError.config = error.config;
      friendlyError.isAxiosError = true;
      return Promise.reject(friendlyError);
    }

    // Si no es 401 o ya reintentamos
    if (status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Si acabas de cerrar sesión, no intentamos refresh ni reintentos.
    if (logoutAt) {
      return Promise.reject(error);
    }

    // No intentar refresh en endpoints públicos de auth (registro/login/refresh).
    // Si hay token viejo, aquí limpiamos y devolvemos el error original.
    if (
      originalUrl.endsWith("auth/users/") ||
      originalUrl.endsWith("auth/users") ||
      originalUrl.endsWith("auth/token/") ||
      originalUrl.endsWith("auth/token") ||
      originalUrl.includes("auth/token/refresh")
    ) {
      window.localStorage.removeItem("accessToken");
      window.localStorage.removeItem("refreshToken");
      return Promise.reject(error);
    }

    const refreshToken = window.localStorage.getItem("refreshToken");
    if (!refreshToken) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    // Si ya hay refresh en curso
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({
          resolve: (token) => {
            if (!token) {
              reject(error);
              return;
            }
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          },
          reject,
        });
      });
    }

    isRefreshing = true;

    try {
      const base = API_BASE_URL.replace(/\/api\/?$/, "");
      const { data } = await axios.post(
        `${base}/api/auth/token/refresh/`,
        { refresh: refreshToken },
        { headers: { "Content-Type": "application/json" } }
      );

      // Si mientras esperábamos el refresh el usuario cerró sesión,
      // evitamos volver a autenticarlo por el "retry".
      if (window.localStorage.getItem("logoutAt")) {
        processQueue(error, null);
        return Promise.reject(error);
      }

      const newAccess = data.access;
      window.localStorage.setItem("accessToken", newAccess);
      processQueue(null, newAccess);

      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${newAccess}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      window.localStorage.removeItem("accessToken");
      window.localStorage.removeItem("refreshToken");
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default apiClient;

