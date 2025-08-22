import axios from "axios";

// TODO: mudar pra env
const BASE_URL = "http://10.90.0.58:3666"
// const BASE_URL = "http://localhost:3000"

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

// Instância separada para refresh token sem interceptors
const refreshApi = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        console.log("refresh_token primeiro try");
        const response = await refreshApi.get("/refresh_token");
        const { access_token } = response.data;
        sessionStorage.setItem("access_token", access_token);

        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        console.log("refreshError", refreshError);
        // Se o refresh token também falhou, marca como já tentado para evitar loop
        originalRequest._retry = true;
        sessionStorage.removeItem("access_token");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
