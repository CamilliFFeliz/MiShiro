import { normalizarNumero } from "../shared/formatters.js";
import { calcularCustoUnitario } from "../services/estoque-service.js";
import { estadoOrcamento, totaisFinanceiros } from "./orcamentos-v3-data.js";
import { exportarPdfCliente, exportarPdfEstudio } from "./orcamentos-export.js";

let conectado = false;

export function conectarPdf() {
  if (conectado) return;
  conectado = true;
  document.querySelector("#gerarPdfCliente")?.addEventListener("click", () => gerar("cliente"));
  document.querySelector("#gerarPdfEstudio")?.addEventListener("click", () => gerar("estudio"));
}

async function gerar(tipo) {
  const total = totaisFinanceiros(v("#valorHora"), v("#duracaoSessao"), v("#desconto"), v("#margem"));
  const dados = { nome:v("#nomeOrcamento"), clienteNome:v("#clienteNome"), idade:v("#clienteIdade"), telefone:v("#clienteTelefone"), email:v("#clienteEmail"), alergias:v("#clienteAlergias"), tamanho:v("#tamanhoTatuagem"), local:v("#localCorpo"), complexidade:v("#complexidade"), observacoesArte:v("#observacoesCliente"), observacoesCliente:v("#clienteObservacoes") };
  const materiais = Array.from(estadoOrcamento.carrinho.values()).map(({ item, quantidade }) => ({ item, quantidade, valor:calcularCustoUnitario(item) * quantidade }));
  const totais = { materiaisTotal:total.materiais, maoObra:total.maoObra, margem:normalizarNumero(v("#margem")), lucro:total.margemValor, subtotal:total.subtotal, desconto:normalizarNumero(v("#desconto")), descontoValor:total.descontoValor, final:total.valorFinal, duracao:normalizarNumero(v("#duracaoSessao")) };
  if (tipo === "cliente") await exportarPdfCliente({ dados, totais, materiais, imagemReferencia:estadoOrcamento.referencias[0]?.dataUrl || "" });
  else await exportarPdfEstudio({ dados, totais, materiais });
}

function v(seletor) { return document.querySelector(seletor)?.value?.trim() || ""; }
