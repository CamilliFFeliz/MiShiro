import { formatarMoeda } from "./formatters.js";

const ROXO = [54, 10, 117];
const LILAS = [157, 122, 221];
const ESCURO = [32, 24, 40];
const CINZA = [106, 96, 117];

export async function criarDocumentoMiShiro({ titulo, subtitulo = "", logoUrl = "../img/mishiro-logo-escuro.jpg" } = {}) {
  const JsPdf = window.jspdf?.jsPDF;
  if (!JsPdf) throw new Error("Biblioteca PDF ainda não carregou.");
  const doc = new JsPdf({ unit: "pt", format: "a4" });
  const logo = await carregarImagem(logoUrl);
  return { doc, logo, titulo, subtitulo, y: 108 };
}

export function novaPagina(documento) {
  documento.doc.addPage();
  documento.y = 108;
  return documento.y;
}

export function adicionarTitulo(documento, titulo, descricao = "") {
  garantirEspaco(documento, descricao ? 62 : 42);
  const { doc } = documento;
  doc.setTextColor(...ESCURO);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(titulo, 42, documento.y);
  documento.y += 18;
  if (descricao) {
    doc.setTextColor(...CINZA);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    documento.y = escreverQuebrado(doc, descricao, 42, documento.y, 512, 13) + 8;
  }
}

export function adicionarDetalhes(documento, linhas = []) {
  const { doc } = documento;
  const itens = linhas.filter((linha) => linha?.rotulo);
  const altura = Math.ceil(itens.length / 2) * 30 + 12;
  garantirEspaco(documento, altura);
  let x = 42;
  let y = documento.y;
  itens.forEach((linha, indice) => {
    doc.setFillColor(247, 244, 251);
    doc.roundedRect(x, y - 13, 246, 25, 5, 5, "F");
    doc.setTextColor(...CINZA);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(String(linha.rotulo).toUpperCase(), x + 10, y - 2);
    doc.setTextColor(...ESCURO);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text(String(linha.valor || "—").slice(0, 48), x + 10, y + 9);
    if (indice % 2 === 1) { x = 42; y += 32; } else x = 308;
  });
  documento.y = y + (itens.length % 2 ? 32 : 4);
}

export function adicionarLista(documento, titulo, itens = [], { mostrarValor = false, vazio = "Nenhum item informado." } = {}) {
  adicionarTitulo(documento, titulo);
  const lista = itens.length ? itens : [{ nome: vazio, detalhe: "" }];
  const { doc } = documento;
  lista.forEach((item) => {
    garantirEspaco(documento, 22);
    doc.setDrawColor(229, 222, 237);
    doc.line(42, documento.y + 5, 554, documento.y + 5);
    doc.setTextColor(...ESCURO);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(String(item.nome || item.nomeItemSnapshot || "Item").slice(0, 62), 46, documento.y);
    if (mostrarValor) {
      doc.setTextColor(...ROXO);
      doc.setFont("helvetica", "bold");
      doc.text(formatarMoeda(item.valor ?? item.subtotalSnapshot ?? 0), 550, documento.y, { align: "right" });
    }
    const detalhe = item.detalhe || item.descricao || "";
    if (detalhe) {
      doc.setTextColor(...CINZA);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text(String(detalhe).slice(0, 90), 46, documento.y + 13);
    }
    documento.y += detalhe ? 28 : 20;
  });
  documento.y += 6;
}

export function adicionarResumoFinanceiro(documento, linhas = [], { destacarUltima = true } = {}) {
  const { doc } = documento;
  adicionarTitulo(documento, "Resumo financeiro");
  linhas.forEach((linha, indice) => {
    garantirEspaco(documento, 22);
    const destaque = destacarUltima && indice === linhas.length - 1;
    if (destaque) {
      doc.setFillColor(...ROXO);
      doc.roundedRect(42, documento.y - 14, 512, 27, 6, 6, "F");
      doc.setTextColor(255, 255, 255);
    } else {
      doc.setTextColor(...ESCURO);
    }
    doc.setFont("helvetica", destaque ? "bold" : "normal");
    doc.setFontSize(destaque ? 11 : 10);
    doc.text(String(linha.rotulo), 52, documento.y + 3);
    doc.text(formatarMoeda(linha.valor), 544, documento.y + 3, { align: "right" });
    documento.y += destaque ? 34 : 22;
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
  doc.setFillColor(...ROXO);
  doc.rect(0, 0, 595, 76, "F");
  if (logo) {
    try { doc.addImage(logo, detectarFormatoImagem(logo), 40, 16, 45, 45, undefined, "FAST"); } catch { /* palavra-marca abaixo mantém o cabeçalho válido */ }
  }
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("MiShiro Tattoo", logo ? 96 : 42, 33);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(subtitulo || "Gestão do estúdio", logo ? 96 : 42, 48);
  doc.setTextColor(240, 230, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(titulo || "Documento", 554, 38, { align: "right" });
}

function desenharRodape(doc, pagina, total) {
  doc.setDrawColor(...LILAS);
  doc.line(42, 794, 554, 794);
  doc.setTextColor(...CINZA);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("MiShiro Tattoo • documento gerado pelo sistema", 42, 808);
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
