import { formatarMoeda } from "../shared/formatters.js";
import { criarDocumentoMiShiro, adicionarDetalhes, adicionarLista, adicionarResumoFinanceiro, adicionarTitulo, finalizarDocumento } from "../shared/pdf-theme.js";

export async function exportarPdfCliente({ dados, totais, materiais, imagemReferencia }) {
  const documento = await criarDocumentoMiShiro({ titulo: "Proposta para cliente", subtitulo: "Orçamento de tatuagem" });
  adicionarTitulo(documento, dados.nome || "Proposta de tatuagem", "Proposta preparada especialmente para o seu atendimento.");
  adicionarDetalhes(documento, [
    { rotulo: "Cliente", valor: dados.clienteNome || "Não informado" },
    { rotulo: "Tamanho", valor: dados.tamanho ? `${dados.tamanho} cm` : "A definir" },
    { rotulo: "Local", valor: dados.local || "A definir" },
    { rotulo: "Complexidade", valor: dados.complexidade || "A definir" }
  ]);
  if (imagemReferencia) {
    try {
      documento.doc.addImage(imagemReferencia, formatoImagem(imagemReferencia), 42, documento.y, 180, 125, undefined, "FAST");
      documento.y += 142;
    } catch { /* Referência inválida não bloqueia o arquivo. */ }
  }
  const opcionais = materiais.filter(({ item }) => item.categoria === "Opcional").map(({ item, quantidade, valor }) => ({
    nome: item.nome,
    detalhe: `${quantidade} ${item.unidadeMedida || "un"}`,
    valor
  }));
  adicionarLista(documento, "Itens opcionais", opcionais, { mostrarValor: true, vazio: "Nenhum item opcional foi selecionado." });
  adicionarResumoFinanceiro(documento, [{ rotulo: "Valor estimado", valor: totais.final }]);
  finalizarDocumento(documento, `${arquivoSeguro(dados.nome || "proposta-mishiro")}-cliente.pdf`);
}

export async function exportarPdfEstudio({ dados, totais, materiais }) {
  const documento = await criarDocumentoMiShiro({ titulo: "Documento interno", subtitulo: "Composição completa do orçamento" });
  adicionarTitulo(documento, dados.nome || "Orçamento interno");
  adicionarDetalhes(documento, [
    { rotulo: "Cliente", valor: dados.clienteNome || "Não informado" },
    { rotulo: "Idade", valor: dados.idade || "Não informada" },
    { rotulo: "Contato", valor: dados.telefone || dados.email || "Não informado" },
    { rotulo: "Alergias", valor: dados.alergias || "Não informado" },
    { rotulo: "Tamanho", valor: dados.tamanho ? `${dados.tamanho} cm` : "A definir" },
    { rotulo: "Local", valor: dados.local || "A definir" },
    { rotulo: "Complexidade", valor: dados.complexidade || "A definir" },
    { rotulo: "Duração", valor: `${totais.duracao || 0} horas` }
  ]);
  adicionarTitulo(documento, "Observações", [dados.observacoesArte, dados.observacoesCliente].filter(Boolean).join("\n") || "Sem observações.");
  adicionarLista(documento, "Materiais e opcionais", materiais.map(({ item, quantidade, valor }) => ({
    nome: item.nome,
    detalhe: `${item.categoria} • ${quantidade} ${item.unidadeMedida || "un"} × ${formatarMoeda(valor / Math.max(quantidade, 1))}`,
    valor
  })), { mostrarValor: true });
  adicionarResumoFinanceiro(documento, [
    { rotulo: "Materiais e opcionais", valor: totais.materiaisTotal },
    { rotulo: "Mão de obra", valor: totais.maoObra },
    { rotulo: `Lucro (${totais.margem}%)`, valor: totais.lucro },
    { rotulo: "Subtotal", valor: totais.subtotal },
    { rotulo: `Desconto (${totais.desconto}%)`, valor: -totais.descontoValor },
    { rotulo: "Valor final", valor: totais.final }
  ]);
  finalizarDocumento(documento, `${arquivoSeguro(dados.nome || "orcamento-mishiro")}-estudio.pdf`);
}

function formatoImagem(dataUrl) {
  if (String(dataUrl).startsWith("data:image/png")) return "PNG";
  if (String(dataUrl).startsWith("data:image/webp")) return "WEBP";
  return "JPEG";
}

function arquivoSeguro(texto) {
  return String(texto).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/gi, "-").replace(/(^-|-$)/g, "").toLowerCase();
}
