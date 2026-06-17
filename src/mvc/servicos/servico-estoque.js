import { converterRequisicao, executarTransacao, obterPorId, obterTodos } from "../modelos/banco-local.js";
import { criarIdentificador, LOJAS, normalizarNumero, normalizarTexto, obterDataIso, TIPO_MOVIMENTO_ESTOQUE } from "../modelos/esquema-banco.js";

export async function cadastrarItemEstoque(dados = {}) {
  const agora = obterDataIso();
  const quantidadeAtual = Math.max(normalizarNumero(dados.quantidadeAtual || dados.stockQuantity), 0);
  const precoEmbalagem = Math.max(normalizarNumero(dados.precoEmbalagem || dados.packagePrice || dados.singleUnitPrice), 0);
  const quantidadeEmbalagem = Math.max(normalizarNumero(dados.quantidadeEmbalagem || dados.packageQuantity), 1);
  const item = {
    id: dados.id || criarIdentificador("item-estoque"),
    nome: dados.nome || dados.name || "Item sem nome",
    nomeNormalizado: normalizarTexto(dados.nome || dados.name),
    categoria: dados.categoria || dados.category || "Sem categoria",
    marca: dados.marca || dados.brand || "",
    unidadeMedida: dados.unidadeMedida || dados.measureUnit || "un",
    precoEmbalagem,
    quantidadeEmbalagem,
    custoUnitarioSnapshot: arredondar(precoEmbalagem / quantidadeEmbalagem),
    quantidadeAtual,
    quantidadeMinima: Math.max(normalizarNumero(dados.quantidadeMinima || dados.minimumQuantity), 0),
    formatoCompra: dados.formatoCompra || dados.purchaseMode || "unidade",
    cor: dados.cor || dados.color || "",
    numeracao: dados.numeracao || dados.numbering || "",
    linhaTipo: dados.linhaTipo || dados.lineType || "",
    observacoes: dados.observacoes || dados.notes || "",
    criadoEm: dados.criadoEm || dados.createdAt || agora,
    atualizadoEm: agora,
    arquivadoEm: null
  };

  await executarTransacao([LOJAS.itensEstoque, LOJAS.movimentosEstoque, LOJAS.metadadosBackup], "readwrite", async ({ lojas }) => {
    await converterRequisicao(lojas[LOJAS.itensEstoque].put(item));
    await converterRequisicao(lojas[LOJAS.movimentosEstoque].put(criarMovimentoEstoque({ itemEstoqueId: item.id, tipo: TIPO_MOVIMENTO_ESTOQUE.estoqueInicial, quantidade: quantidadeAtual, quantidadeAnterior: 0, quantidadeNova: quantidadeAtual, motivo: "Cadastro inicial" })));
    await marcarBancoAlterado(lojas);
  });

  return item;
}

export async function adicionarEntradaEstoque(itemEstoqueId, quantidade, motivo = "Entrada manual") {
  const quantidadeEntrada = normalizarNumero(quantidade);
  if (quantidadeEntrada <= 0) throw new Error("A quantidade precisa ser maior que zero.");
  return alterarQuantidade(itemEstoqueId, quantidadeEntrada, (atual) => atual + quantidadeEntrada, TIPO_MOVIMENTO_ESTOQUE.entradaManual, motivo);
}

export async function ajustarEstoque(itemEstoqueId, novaQuantidade, motivo = "Ajuste manual") {
  const quantidadeFinal = Math.max(normalizarNumero(novaQuantidade), 0);
  return alterarQuantidade(itemEstoqueId, quantidadeFinal, () => quantidadeFinal, TIPO_MOVIMENTO_ESTOQUE.ajusteManual, motivo);
}

export async function listarItensEstoque() {
  return obterTodos(LOJAS.itensEstoque);
}

export async function obterItemEstoque(itemEstoqueId) {
  return obterPorId(LOJAS.itensEstoque, itemEstoqueId);
}

export async function listarAlertasEstoqueBaixo() {
  const itens = await listarItensEstoque();
  return itens.filter((item) => !item.arquivadoEm && normalizarNumero(item.quantidadeAtual) <= normalizarNumero(item.quantidadeMinima));
}

export function calcularCustoUnitario(item) {
  const precoDireto = normalizarNumero(item?.precoUnitario || item?.custoUnitarioSnapshot);
  if (precoDireto > 0) return arredondar(precoDireto);
  const preco = normalizarNumero(item?.precoEmbalagem || item?.packagePrice || item?.singleUnitPrice);
  const quantidade = Math.max(normalizarNumero(item?.quantidadeEmbalagem || item?.packageQuantity), 1);
  return arredondar(preco / quantidade);
}

export function calcularValorTotalEstoque(item) {
  const precoEmbalagem = normalizarNumero(item?.precoEmbalagem || item?.packagePrice || item?.singleUnitPrice);
  const quantidadeAtual = Math.max(normalizarNumero(item?.quantidadeAtual || item?.stockQuantity), 0);
  return arredondar(precoEmbalagem * quantidadeAtual);
}

export function calcularResumoEstoque(item) {
  const custoUnitario = calcularCustoUnitario(item);
  const quantidadeAtual = Math.max(normalizarNumero(item?.quantidadeAtual), 0);
  const quantidadeMinima = Math.max(normalizarNumero(item?.quantidadeMinima), 0);
  const valorTotal = calcularValorTotalEstoque(item);
  const percentualMinimo = quantidadeMinima > 0 ? Math.min((quantidadeAtual / quantidadeMinima) * 100, 100) : 100;
  return { custoUnitario, quantidadeAtual, quantidadeMinima, valorTotal, percentualMinimo, estoqueBaixo: quantidadeMinima > 0 && quantidadeAtual <= quantidadeMinima };
}

export function criarSnapshotItemEstoque(item, quantidadeUsada) {
  const quantidade = Math.max(normalizarNumero(quantidadeUsada), 0);
  const custoUnitario = calcularCustoUnitario(item);
  return { itemEstoqueId: item.id, nomeItemSnapshot: item.nome, categoriaSnapshot: item.categoria, unidadeMedidaSnapshot: item.unidadeMedida, quantidadeUsada: quantidade, custoUnitarioSnapshot: arredondar(custoUnitario), subtotalSnapshot: arredondar(custoUnitario * quantidade), criadoEm: obterDataIso() };
}

async function alterarQuantidade(itemEstoqueId, quantidade, calcularNovaQuantidade, tipo, motivo) {
  let itemAtualizado = null;
  await executarTransacao([LOJAS.itensEstoque, LOJAS.movimentosEstoque, LOJAS.metadadosBackup], "readwrite", async ({ lojas }) => {
    const item = await converterRequisicao(lojas[LOJAS.itensEstoque].get(itemEstoqueId));
    if (!item) throw new Error("Item não encontrado.");
    const quantidadeAnterior = normalizarNumero(item.quantidadeAtual);
    const quantidadeNova = Math.max(normalizarNumero(calcularNovaQuantidade(quantidadeAnterior)), 0);
    itemAtualizado = { ...item, quantidadeAtual: quantidadeNova, atualizadoEm: obterDataIso() };
    await converterRequisicao(lojas[LOJAS.itensEstoque].put(itemAtualizado));
    await converterRequisicao(lojas[LOJAS.movimentosEstoque].put(criarMovimentoEstoque({ itemEstoqueId, tipo, quantidade, quantidadeAnterior, quantidadeNova, motivo })));
    await marcarBancoAlterado(lojas);
  });
  return itemAtualizado;
}

export function criarMovimentoEstoque({ itemEstoqueId, orcamentoId = null, agendamentoId = null, tipo, quantidade, quantidadeAnterior, quantidadeNova, motivo }) {
  return { id: criarIdentificador("movimento"), itemEstoqueId, orcamentoId, agendamentoId, tipo, quantidade: normalizarNumero(quantidade), quantidadeAnterior: normalizarNumero(quantidadeAnterior), quantidadeNova: normalizarNumero(quantidadeNova), motivo, criadoEm: obterDataIso() };
}

async function marcarBancoAlterado(lojas) {
  const atual = await converterRequisicao(lojas[LOJAS.metadadosBackup].get("principal")) || { id: "principal" };
  await converterRequisicao(lojas[LOJAS.metadadosBackup].put({ ...atual, bancoAlteradoEm: obterDataIso(), atualizadoEm: obterDataIso() }));
}

function arredondar(valor) {
  return Math.round((normalizarNumero(valor) + Number.EPSILON) * 100) / 100;
}
