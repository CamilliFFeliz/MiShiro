export const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const dataCurta = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" });
export const mesLongo = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });

export function formatarMoeda(valor) { return moeda.format(Number(valor) || 0); }
export function normalizarNumero(valor) { const limpo = String(valor || "").replace(/\s/g, "").replace(/[^0-9,.-]/g, ""); const convertido = limpo.includes(",") ? limpo.replace(/\./g, "").replace(",", ".") : limpo; const n = Number.parseFloat(convertido); return Number.isFinite(n) ? n : 0; }
export function formatarData(valor) { if (!valor) return "Sem data"; const data = new Date(`${valor}T00:00:00`); return Number.isNaN(data.getTime()) ? "Sem data" : dataCurta.format(data); }
export function chaveData(data) { return `${data.getFullYear()}-${String(data.getMonth()+1).padStart(2,"0")}-${String(data.getDate()).padStart(2,"0")}`; }
export function capitalizar(texto) { return String(texto || "").replace(/^./, (letra) => letra.toUpperCase()); }
