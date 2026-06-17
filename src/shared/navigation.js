export function obterPaginaAtual() {
  return document.body?.dataset?.page || "dashboard";
}

export function navegarPara(url) {
  window.location.href = url;
}
