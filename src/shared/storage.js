export function lerLocalJson(chave, fallback = {}) { try { return JSON.parse(localStorage.getItem(chave) || "null") ?? fallback; } catch { return fallback; } }
export function salvarLocalJson(chave, valor) { localStorage.setItem(chave, JSON.stringify(valor)); return valor; }
