import { formatarMoeda } from "./formatters.js";

const ROXO = [54, 10, 117];
const ROXO_MEDIO = [92, 22, 172];
const ROXO_CLARO = [155, 108, 255];
const FUNDO = [9, 2, 18];
const CARD = [248, 244, 255];
const CARD_LINHA = [224, 212, 247];
const TEXTO = [30, 18, 43];
const CINZA = [104, 94, 118];
const BRANCO_SUAVE = [238, 231, 255];

export async function criarDocumentoMiShiro({ titulo, subtitulo = "", logoUrl = "../img/mishiro-logo-claro.jpg" } = {}) {
  const JsPdf = window.jspdf?.jsPDF;
  if (!JsPdf) throw new Error("Biblioteca PDF ainda não carregou.");
  const doc = new JsPdf({ unit: "pt", format: "a4" });
  const logo = await carregarImagem(logoUrl);
  return { doc, logo, titulo, subtitulo, y: 126 };
}

export function novaPagina(documento) {
  documento.doc.addPage();
  documento.y = 126;
  return documento.y;
}

export function adicionarTitulo(documento, titulo, descricao = "") {
  garantirEspaco(documento, descricao ? 74 : 48);
  const { doc } = documento;
  doc.setTextColor(...ROXO);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(titulo, 42, documento.y);
  documento.y += 20;
  if (descricao) {
    doc.setTextColor(...CINZA);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    documento.y = escreverQuebrado(doc, descricao, 42, documento.y, 512, 14) + 10;
  }
}

export function adicionarDetalhes(documento, linhas = []) {
  const { doc } = documento;
  const itens = linhas.filter((linha) => linha?.rotulo);
  const altura = Math.ceil(itens.length / 2) * 46 + 14;
  garantirEspaco(documento, altura);
  let x = 42;
  let y = documento.y;

  itens.forEach((linha, indice) => {
    doc.setFillColor(...CARD);
    doc.setDrawColor(...CARD_LINHA);
    doc.roundedRect(x, y - 18, 246, 38, 9, 9, "FD");
    doc.setTextColor(...CINZA);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(String(linha.rotulo).toUpperCase(), x + 12, y - 4);
    doc.setTextColor(...TEXTO);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(String(linha.valor || "—").slice(0, 44), x + 12, y + 10);
    if (indice % 2 === 1) { x = 42; y += 46; } else x = 308;
  });
  documento.y = y + (itens.length % 2 ? 48 : 8);
}

export function adicionarLista(documento, titulo, itens = [], { mostrarValor = false, vazio = "Nenhum item informado." } = {}) {
  adicionarTitulo(documento, titulo);
  const lista = itens.length ? itens : [{ nome: vazio, detalhe: "" }];
  const { doc } = documento;

  lista.forEach((item) => {
    garantirEspaco(documento, 46);
    doc.setFillColor(252, 250, 255);
    doc.setDrawColor(...CARD_LINHA);
    doc.roundedRect(42, documento.y - 16, 512, item.detalhe || item.descricao ? 44 : 32, 8, 8, "FD");
    doc.setTextColor(...TEXTO);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.2);
    doc.text(String(item.nome || item.nomeItemSnapshot || "Item").slice(0, 58), 56, documento.y);
    if (mostrarValor) {
      doc.setTextColor(...ROXO);
      doc.setFont("helvetica", "bold");
      doc.text(formatarMoeda(item.valor ?? item.subtotalSnapshot ?? 0), 540, documento.y, { align: "right" });
    }
    const detalhe = item.detalhe || item.descricao || "";
    if (detalhe) {
      doc.setTextColor(...CINZA);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.8);
      const linhas = doc.splitTextToSize(String(detalhe), mostrarValor ? 390 : 470);
      doc.text(linhas.slice(0, 2), 56, documento.y + 14);
    }
    documento.y += detalhe ? 52 : 40;
  });
  documento.y += 8;
}

export function adicionarResumoFinanceiro(documento, linhas = [], { destacarUltima = true } = {}) {
  const { doc } = documento;
  adicionarTitulo(documento, "Resumo financeiro", "Valores calculados pelo orçamento MiShiro.");
  linhas.forEach((linha, indice) => {
    garantirEspaco(documento, 34);
    const destaque = destacarUltima && indice === linhas.length - 1;
    if (destaque) {
      doc.setFillColor(...ROXO);
      doc.setDrawColor(...ROXO_CLARO);
      doc.roundedRect(42, documento.y - 18, 512, 44, 12, 12, "FD");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text(String(linha.rotulo), 58, documento.y + 6);
      doc.setFontSize(16);
      doc.text(formatarMoeda(linha.valor), 538, documento.y + 6, { align: "right" });
      documento.y += 54;
    } else {
      doc.setDrawColor(...CARD_LINHA);
      doc.line(42, documento.y + 12, 554, documento.y + 12);
      doc.setTextColor(...TEXTO);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      doc.text(String(linha.rotulo), 52, documento.y);
      doc.setFont("helvetica", "bold");
      doc.text(formatarMoeda(linha.valor), 544, documento.y, { align: "right" });
      documento.y += 28;
    }
  });
}

export function finalizarDocumento(documento, nomeArquivo) {
  const { doc, logo, titulo, subtitulo } = documento;
  const paginas = doc.getNumberOfPages();
  for (let pagina = 1; pagina <= paginas; pagina += 1) {
    doc.setPage(pagina);
    desenharCabecalho(doc, logo, titulo, subtitulo);
    desenharRodape(doc, pagina, paginas);
  }
  doc.save(nomeArquivo);
}

function desenharCabecalho(doc, logo, titulo, subtitulo) {
  doc.setFillColor(...FUNDO);
  doc.rect(0, 0, 595, 96, "F");
  doc.setFillColor(...ROXO);
  doc.roundedRect(42, 22, 64, 48, 14, 14, "F");
  if (logo) {
    try { doc.addImage(logo, detectarFormatoImagem(logo), 116, 22, 118, 42, undefined, "FAST"); } catch { escreverMarca(doc); }
  } else {
    escreverMarca(doc);
  }
  doc.setTextColor(...BRANCO_SUAVE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("MISHIRO TATTOO", 554, 34, { align: "right" });
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.text(titulo || "Documento", 554, 52, { align: "right" });
  if (subtitulo) {
    doc.setTextColor(...BRANCO_SUAVE);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(String(subtitulo).slice(0, 52), 554, 66, { align: "right" });
  }
  doc.setFillColor(...ROXO_MEDIO);
  doc.rect(0, 92, 595, 4, "F");
}

function escreverMarca(doc) {
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text("MiShiro", 116, 46);
  doc.setFontSize(8.5);
  doc.text("TATTOO", 118, 59);
}

function desenharRodape(doc, pagina, total) {
  doc.setDrawColor(...CARD_LINHA);
  doc.line(42, 792, 554, 792);
  doc.setTextColor(...CINZA);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("MiShiro Tattoo • documento gerado pelo sistema local", 42, 808);
  doc.text(`${new Date().toLocaleDateString("pt-BR")} • ${pagina}/${total}`, 554, 808, { align: "right" });
}

function garantirEspaco(documento, altura) {
  if (documento.y + altura <= 770) return;
  novaPagina(documento);
}

function escreverQuebrado(doc, texto, x, y, largura, alturaLinha) {
  const linhas = doc.splitTextToSize(String(texto), largura);
  doc.text(linhas, x, y);
  return y + linhas.length * alturaLinha;
}

async function carregarImagem(url) {
  try {
    const resposta = await fetch(url);
    if (!resposta.ok) return "";
    const blob = await resposta.blob();
    return await new Promise((resolver, rejeitar) => {
      const leitor = new FileReader();
      leitor.onload = () => resolver(leitor.result);
      leitor.onerror = () => rejeitar(leitor.error);
      leitor.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
}

function detectarFormatoImagem(dataUrl) {
  if (String(dataUrl).startsWith("data:image/png")) return "PNG";
  if (String(dataUrl).startsWith("data:image/webp")) return "WEBP";
  return "JPEG";
}
