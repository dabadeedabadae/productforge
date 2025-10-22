import axios from "axios";
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL, // напр. http://localhost:3000/api/admin
});
api.interceptors.request.use((cfg) => {
  if (typeof window !== "undefined") {
    const t = localStorage.getItem("access_token");
    if (t) cfg.headers.Authorization = `Bearer ${t}`;
  }
  return cfg;
});
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      document.cookie = "access_token=; Max-Age=0; Path=/";
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);
