import { normalizarNumero } from "../shared/formatters.js";
import { CATEGORY_OPTIONAL, getMeasureSuffix } from "../shared/stock-catalog.js";
import { calcularCustoUnitario } from "../services/estoque-service.js";

export const estadoOrcamento = {
  estoque: [],
  carrinho: new Map(),
  referencias: [],
  categoria: "Todos",
  termo: "",
  orcamento: null
};

export function quantidadeDisponivel(item) {
  const emEstoque = Math.max(0, normalizarNumero(item?.quantidadeAtual));
  const unidade = item?.unidadeMedida || "un";
  if (["ml", "g", "m"].includes(unidade)) return Math.floor(emEstoque * Math.max(1, normalizarNumero(item.quantidadeEmbalagem)));
  return Math.floor(emEstoque);
}

export function quantidadeSelecionada(itemId) {
  return estadoOrcamento.carrinho.get(itemId)?.quantidade || 0;
}

export function definirQuantidade(item, valor) {
  const quantidade = Math.round(Math.max(0, normalizarNumero(valor)));
  const maximo = quantidadeDisponivel(item);
  if (quantidade > maximo) return { ok: false, quantidade: quantidadeSelecionada(item.id), maximo };
  if (quantidade === 0) estadoOrcamento.carrinho.delete(item.id);
  else estadoOrcamento.carrinho.set(item.id, { item, quantidade });
  return { ok: true, quantidade, maximo };
}

export function limitarCarrinhoAoEstoque() {
  estadoOrcamento.carrinho.forEach((registro, id) => {
    const itemAtual = estadoOrcamento.estoque.find((item) => item.id === id) || registro.item;
    const limite = quantidadeDisponivel(itemAtual);
    if (limite <= 0) estadoOrcamento.carrinho.delete(id);
    else estadoOrcamento.carrinho.set(id, { item: itemAtual, quantidade: Math.min(registro.quantidade, limite) });
  });
}

export function totaisItens() {
  let materiais = 0;
  let opcionais = 0;
  estadoOrcamento.carrinho.forEach(({ item, quantidade }) => {
    const subtotal = calcularCustoUnitario(item) * quantidade;
    if (item.categoria === CATEGORY_OPTIONAL) opcionais += subtotal;
    else materiais += subtotal;
  });
  return { materiais, opcionais, geral: materiais + opcionais };
}

export function totaisFinanceiros(valorHora, duracao, desconto, margem) {
  const itens = totaisItens();
  const maoObra = normalizarNumero(valorHora) * normalizarNumero(duracao);
  const subtotal = itens.geral + maoObra;
  const descontoValor = subtotal * normalizarNumero(desconto) / 100;
  return {
    materiais: itens.geral,
    opcionais: itens.opcionais,
    maoObra,
    subtotal,
    descontoValor,
    margemValor: subtotal * normalizarNumero(margem) / 100,
    valorFinal: Math.max(subtotal - descontoValor, 0)
  };
}

export function itemLegado(snapshot) {
  return {
    id: snapshot.itemEstoqueId,
    nome: snapshot.nomeItemSnapshot || "Item removido do estoque",
    categoria: snapshot.categoriaSnapshot || "Sem categoria",
    unidadeMedida: snapshot.unidadeMedidaSnapshot || "un",
    precoEmbalagem: snapshot.custoUnitarioSnapshot || 0,
    quantidadeEmbalagem: 1,
    quantidadeAtual: snapshot.quantidadeUsada || 0
  };
}

export function normalizarReferencias(orcamento) {
  if (Array.isArray(orcamento?.imagensReferencia)) return orcamento.imagensReferencia.filter((item) => item?.dataUrl);
  return orcamento?.imagemReferencia ? [{ id: "referencia-legada", nome: "Referência principal", tipo: "image/jpeg", dataUrl: orcamento.imagemReferencia }] : [];
}

export function totalDoRegistro(registro) {
  return calcularCustoUnitario(registro.item) * registro.quantidade;
}

export function resumoUnidade(item) {
  return getMeasureSuffix(item?.unidadeMedida);
}

export function formatarQuantidade(valor) {
  return String(Math.max(0, Math.round(normalizarNumero(valor))));
}
