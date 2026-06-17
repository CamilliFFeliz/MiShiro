import { montarLayout } from "../shared/layout.js";
import { lerLocalJson, salvarLocalJson } from "../shared/storage.js";
import { mostrarStatus } from "../shared/ui.js";

const KEY = "MISHIRO_PERFIL_ESTUDIO";
montarLayout({ paginaAtual: "configuracoes", titulo: "Configurações", subtitulo: "Preferências" });
iniciar();
function iniciar(){ const p = lerLocalJson(KEY, {}); set("#nomeEstudio", p.nomeEstudio || "MiShiro Tattoo"); set("#nomeArtista", p.nomeArtista || ""); set("#contatoEstudio", p.contatoEstudio || ""); set("#sinalPadrao", p.sinalPadrao || "30"); document.querySelector("#formConfiguracoes")?.addEventListener("submit", salvar); document.querySelector("#usarTemaClaro")?.addEventListener("click", ()=>tema("light")); document.querySelector("#usarTemaEscuro")?.addEventListener("click", ()=>tema("dark")); }
function salvar(evento){ evento.preventDefault(); salvarLocalJson(KEY, { nomeEstudio: v("#nomeEstudio"), nomeArtista: v("#nomeArtista"), contatoEstudio: v("#contatoEstudio"), sinalPadrao: v("#sinalPadrao") }); mostrarStatus(document.querySelector("#statusConfiguracoes"), "Configurações salvas."); }
function tema(valor){ document.documentElement.dataset.theme = valor; localStorage.setItem("MISHIRO_TEMA", valor); localStorage.setItem("CALCULADORA_TATTOO_THEME", valor); }
function v(sel){ return document.querySelector(sel)?.value || ""; }
function set(sel, val){ const el = document.querySelector(sel); if(el) el.value = val; }
