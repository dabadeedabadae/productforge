// src/lib/auth.ts

export function setToken(token: string) {
    if (typeof window === "undefined") return;
    localStorage.setItem("access_token", token);
    document.cookie = `access_token=${token}; Max-Age=${60 * 60 * 24}; Path=/; SameSite=Lax`;
}

export function clearToken() {
    if (typeof window === "undefined") return;
    localStorage.removeItem("access_token");
    document.cookie = "access_token=; Max-Age=0; Path=/";
}

export function hasToken() {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem("access_token");
}

export function getToken() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("access_token");
}
