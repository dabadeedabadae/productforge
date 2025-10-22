export const TOKEN_KEY = "token";

export function setToken(token: string) {
  if (typeof window !== "undefined") localStorage.setItem(TOKEN_KEY, token);
}
export function getToken() {
  if (typeof window !== "undefined") return localStorage.getItem(TOKEN_KEY);
  return null;
}
export function hasToken() {
  return !!getToken();
}
export function clearToken() {
  if (typeof window !== "undefined") localStorage.removeItem(TOKEN_KEY);
}
