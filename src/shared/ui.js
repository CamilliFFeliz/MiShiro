export function vazio(mensagem) { return `<p class="empty-state">${mensagem}</p>`; }
export function escapar(valor) { return String(valor ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
export function mostrarStatus(elemento, mensagem) { if (!elemento) return; elemento.textContent = mensagem; window.clearTimeout(elemento._timeout); elemento._timeout = window.setTimeout(() => { elemento.textContent = ""; }, 3600); }
export function atualizarIcones() { window.lucide?.createIcons?.(); }
