import apiClient from "../axiosClient";

// POST /api/auth/users/
export const register = async (payload) => {
  const { data } = await apiClient.post("auth/users/", payload);
  return data;
};

// POST /api/auth/token/
export const login = async (email, password) => {
  const { data } = await apiClient.post("auth/token/", { email, password });
  return data; // { access, refresh, ... }
};

// POST /api/auth/token/refresh/
export const refreshToken = async (refresh) => {
  const { data } = await apiClient.post("auth/token/refresh/", { refresh });
  return data;
};

