export const NOME_BANCO_MISHIRO = "MiShiroBancoLocal";
export const VERSAO_BANCO_MISHIRO = 1;
export const VERSAO_ESQUEMA_MISHIRO = 1;

export const LOJAS = Object.freeze({
  itensEstoque: "itensEstoque",
  clientes: "clientes",
  orcamentos: "orcamentos",
  itensOrcamento: "itensOrcamento",
  agendamentos: "agendamentos",
  movimentosEstoque: "movimentosEstoque",
  perfilEstudio: "perfilEstudio",
  configuracoesAplicativo: "configuracoesAplicativo",
  metadadosBackup: "metadadosBackup"
});

export const STATUS_ORCAMENTO = Object.freeze({
  rascunho: "rascunho",
  exportado: "exportado",
  aguardandoCliente: "aguardando_cliente",
  aceito: "aceito",
  recusado: "recusado",
  agendado: "agendado",
  estoqueDescontado: "estoque_descontado",
  concluido: "concluido",
  arquivado: "arquivado"
});

export const STATUS_AGENDAMENTO = Object.freeze({
  agendado: "agendado",
  confirmado: "confirmado",
  realizado: "realizado",
  cancelado: "cancelado"
});

export const TIPO_MOVIMENTO_ESTOQUE = Object.freeze({
  estoqueInicial: "estoque_inicial",
  entradaManual: "entrada_manual",
  ajusteManual: "ajuste_manual",
  usoOrcamento: "uso_orcamento",
  desfazerUsoOrcamento: "desfazer_uso_orcamento",
  correcao: "correcao",
  perda: "perda"
});

export const DEFINICAO_LOJAS = [
  {
    nome: LOJAS.itensEstoque,
    opcoes: { keyPath: "id" },
    indices: [
      ["porCategoria", "categoria", { unique: false }],
      ["porNome", "nomeNormalizado", { unique: false }],
      ["porAtualizacao", "atualizadoEm", { unique: false }]
    ]
  },
  {
    nome: LOJAS.clientes,
    opcoes: { keyPath: "id" },
    indices: [
      ["porNome", "nomeNormalizado", { unique: false }],
      ["porAtualizacao", "atualizadoEm", { unique: false }]
    ]
  },
  {
    nome: LOJAS.orcamentos,
    opcoes: { keyPath: "id" },
    indices: [
      ["porStatus", "status", { unique: false }],
      ["porCliente", "clienteId", { unique: false }],
      ["porCriacao", "criadoEm", { unique: false }],
      ["porAgendamento", "agendadoEm", { unique: false }]
    ]
  },
  {
    nome: LOJAS.itensOrcamento,
    opcoes: { keyPath: "id" },
    indices: [
      ["porOrcamento", "orcamentoId", { unique: false }],
      ["porItemEstoque", "itemEstoqueId", { unique: false }]
    ]
  },
  {
    nome: LOJAS.agendamentos,
    opcoes: { keyPath: "id" },
    indices: [
      ["porOrcamento", "orcamentoId", { unique: true }],
      ["porCliente", "clienteId", { unique: false }],
      ["porData", "data", { unique: false }],
      ["porStatus", "status", { unique: false }]
    ]
  },
  {
    nome: LOJAS.movimentosEstoque,
    opcoes: { keyPath: "id" },
    indices: [
      ["porItemEstoque", "itemEstoqueId", { unique: false }],
      ["porOrcamento", "orcamentoId", { unique: false }],
      ["porTipo", "tipo", { unique: false }],
      ["porCriacao", "criadoEm", { unique: false }]
    ]
  },
  {
    nome: LOJAS.perfilEstudio,
    opcoes: { keyPath: "id" },
    indices: []
  },
  {
    nome: LOJAS.configuracoesAplicativo,
    opcoes: { keyPath: "id" },
    indices: []
  },
  {
    nome: LOJAS.metadadosBackup,
    opcoes: { keyPath: "id" },
    indices: []
  }
];

export function criarIdentificador(prefixo = "registro") {
  if (crypto?.randomUUID) {
    return `${prefixo}-${crypto.randomUUID()}`;
  }

  return `${prefixo}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function obterDataIso() {
  return new Date().toISOString();
}

export function normalizarTexto(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function normalizarNumero(valor) {
  if (typeof valor === "number" && Number.isFinite(valor)) {
    return valor;
  }

  const limpo = String(valor || "").replace(/\s/g, "").replace(/[^0-9,.-]/g, "");
  const convertido = limpo.includes(",") ? limpo.replace(/\./g, "").replace(",", ".") : limpo;
  const numero = Number.parseFloat(convertido);
  return Number.isFinite(numero) ? numero : 0;
}
