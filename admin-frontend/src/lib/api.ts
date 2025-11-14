// admin-frontend/src/lib/api.ts
import axios, { AxiosError } from "axios";

// 👇 ЖЁСТКО говорим: ходи в Nest на 3000
// Можно переопределить через переменную окружения NEXT_PUBLIC_API_URL
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/admin";

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// src/lib/api.ts
api.interceptors.response.use(
  (res) => {
    const payload = res.data;
    if (payload && typeof payload === "object" && "data" in payload) {
      return (payload as any).data;
    }
    return payload;
  },
  (error: AxiosError | any) => {
    console.error("API ERROR RAW:", error);
    
    // Более информативная обработка Network Error
    if (error?.message === "Network Error" || error?.code === "ERR_NETWORK") {
      console.error(
        `⚠️ Network Error: Cannot connect to backend at ${API_BASE}\n` +
        `Please ensure:\n` +
        `1. Backend server is running on port 3000\n` +
        `2. CORS is properly configured\n` +
        `3. No firewall is blocking the connection`
      );
    }
    
    console.error(
      "API ERROR SERIALIZED:",
      JSON.stringify(
        {
          message: error?.message,
          status: error?.response?.status,
          data: error?.response?.data,
          url: error?.config?.url,
          method: error?.config?.method,
          baseURL: error?.config?.baseURL,
        },
        null,
        2
      )
    );
    return Promise.reject(error);
  }
);

// const res = await api.post("/ai/docgen/generate", {
//   concept: "AI-система, которая принимает заявки студентов и автоматически отвечает на типовые вопросы, а сложные отправляет в деканат.",
//   domain: "university",
//   docs: ["srs", "api", "db", "userflows"],
//   locale: "ru"
// });
// console.log(res);

export default api;
export { api };
