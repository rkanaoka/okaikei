"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONFIGS = exports.DEFAULT_ENABLED = exports.TEMPLATE_LABELS = exports.TEMPLATE_TYPES = void 0;
exports.isTemplateType = isTemplateType;
exports.TEMPLATE_TYPES = ['kitchen', 'bar', 'receipt', 'fiscal'];
exports.TEMPLATE_LABELS = {
    kitchen: 'Pedido — Cozinha',
    bar: 'Pedido — Bar',
    receipt: 'Fechamento de Conta',
    fiscal: 'Cupom Fiscal',
};
exports.DEFAULT_ENABLED = {
    kitchen: true,
    bar: true,
    receipt: true,
    fiscal: false,
};
exports.DEFAULT_CONFIGS = {
    kitchen: {
        footerText: '',
        cutMode: 'partial',
        showComanda: true,
        showCliente: true,
        showObservacoes: true,
        showGarcom: true,
    },
    bar: {
        footerText: '',
        cutMode: 'partial',
        showComanda: true,
        showCliente: true,
        showObservacoes: true,
        showGarcom: true,
    },
    receipt: {
        storeName: 'BODOGAMI',
        headerText: 'Restaurante Japonês',
        showEndereco: false,
        endereco: '',
        showTaxaServico: true,
        showDesconto: true,
        showAssinatura: false,
        footerText: 'Obrigado pela visita! @bodogami',
        cutMode: 'full',
    },
    fiscal: {
        razaoSocial: 'Bodogami Ltda',
        cnpj: '00.000.000/0001-00',
        endereco: '',
        footerText: 'Documento sem valor fiscal — emissão simplificada',
        cutMode: 'full',
    },
};
function isTemplateType(v) {
    return exports.TEMPLATE_TYPES.includes(v);
}
//# sourceMappingURL=print-template-defaults.js.map