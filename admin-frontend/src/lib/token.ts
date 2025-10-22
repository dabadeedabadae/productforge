// парсим токен из любых «форматов» ответа
export function extractTokenFromAny(data: any): string | null {
  if (!data) return null;

  // прямые варианты
  const direct =
    data.access_token ?? data.token ?? data.accessToken ?? data.jwt ?? data.id_token ?? data.sessionToken;
  if (typeof direct === "string" && direct.length > 10) return direct;

  // вложенные: { data: {...} } | { result: {...} } | { payload: {...} }
  const nestedCandidates = [data.data, data.result, data.payload, data.response];
  for (const n of nestedCandidates) {
    if (!n) continue;
    const t = n.access_token ?? n.token ?? n.accessToken ?? n.jwt ?? n.id_token ?? n.sessionToken;
    if (typeof t === "string" && t.length > 10) return t;
  }

  // если ответ — просто строка и она похожа на JWT
  if (typeof data === "string" && data.split(".").length === 3 && data.length > 20) return data;

  // иногда сервер кладёт в headers (редко)
  if (data?.headers?.authorization?.startsWith?.("Bearer ")) {
    const h = data.headers.authorization.slice(7);
    if (h.length > 10) return h;
  }

  return null;
}
