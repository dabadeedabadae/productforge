// admin-frontend/src/lib/api.ts
import axios, { AxiosError } from "axios";

// 👇 ЖЁСТКО говорим: ходи в Nest на 3000
const API_BASE = "http://localhost:3000/api/admin";

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
    console.error(
      "API ERROR SERIALIZED:",
      JSON.stringify(
        {
          message: error?.message,
          status: error?.response?.status,
          data: error?.response?.data,
          url: error?.config?.url,
          method: error?.config?.method,
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
