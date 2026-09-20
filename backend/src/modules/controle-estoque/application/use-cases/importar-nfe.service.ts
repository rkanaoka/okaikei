import { Inject, Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import {
  NFE_XML_PARSER_PORT, NfeXmlParserPort, NfeParseada,
} from '@/modules/controle-estoque/application/contracts/nfe-xml-parser.port';
import {
  INSUMO_REPOSITORY_PORT, InsumoRepositoryPort,
} from '@/modules/controle-estoque/domain/repositories/insumo-repository.port';
import {
  FORNECEDOR_REPOSITORY_PORT, FornecedorRepositoryPort,
} from '@/modules/controle-estoque/domain/repositories/fornecedor-repository.port';
import {
  NOTA_FISCAL_REPOSITORY_PORT, NotaFiscalRepositoryPort,
} from '@/modules/controle-estoque/domain/repositories/nota-fiscal-repository.port';
import {
  UnidadeBase, UnidadeMedida, inferirUnidadeMedida, resolverFatorConversao,
} from '@/modules/controle-estoque/domain/value-objects/unidade-conversao';
import { gerarCodigoBarrasUnico } from '@/modules/controle-estoque/application/use-cases/insumo-codigo-barras.util';
import { uuidv7 } from 'uuidv7';

export interface NfeItemPreview {
  codigoFornecedor: string;
  descricao: string;
  unidadeComercial: string;
  unidadeSugerida: UnidadeMedida | null;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  /** true quando já existe uma "SKU" cadastrada (mesmo fornecedor + código) — dispensa nova vinculação. */
  vinculado: boolean;
  fornecedorItemId?: string;
  insumoId?: string;
  insumoNome?: string;
  unidadeBaseInsumo?: UnidadeBase;
}

export interface NfePreviewResult {
  chaveAcesso: string;
  numero: string | null;
  serie: string | null;
  dataEmissao: string | null;
  valorTotal: number | null;
  fornecedor: NfeParseada['fornecedor'];
  fornecedorCadastrado: boolean;
  jaImportada: boolean;
  itens: NfeItemPreview[];
}

export interface ItemConfirmacao {
  codigoFornecedor: string;
  descricao: string;
  unidadeComercial: string;
  quantidade: number;
  valorUnitario: number;
  /** Vincula a um insumo já existente. */
  insumoId?: string;
  /** Ou cria um insumo novo para este item. */
  criarInsumo?: { name: string; categoria?: string; unidadeBase: UnidadeBase; estoqueMinimo?: number | null };
  /** Reaproveita uma "SKU" de fornecedor já cadastrada (pula criação de uma nova). */
  fornecedorItemId?: string;
  /** Obrigatório quando não há fornecedorItemId — unidade em que este item foi comprado. */
  unidadeCompra?: UnidadeMedida;
  /** Obrigatório quando a unidadeCompra é uma embalagem sem tamanho padrão (caixa/pacote/fardo/outro). */
  fatorConversao?: number;
  marca?: string;
}

@Injectable()
export class ImportarNfeService {
  constructor(
    @Inject(NFE_XML_PARSER_PORT) private readonly parser: NfeXmlParserPort,
    @Inject(INSUMO_REPOSITORY_PORT) private readonly insumoRepo: InsumoRepositoryPort,
    @Inject(FORNECEDOR_REPOSITORY_PORT) private readonly fornecedorRepo: FornecedorRepositoryPort,
    @Inject(NOTA_FISCAL_REPOSITORY_PORT) private readonly notaRepo: NotaFiscalRepositoryPort,
  ) {}

  /** Lê o XML e mostra o que seria importado, sem gravar nada — usado pela tela de conferência. */
  async preview(xml: string): Promise<NfePreviewResult> {
    const nfe = this.parser.parse(xml);
    const jaImportada = !!(await this.notaRepo.findByChave(nfe.chaveAcesso));
    const fornecedor = nfe.fornecedor.cnpj ? await this.fornecedorRepo.findByCnpj(nfe.fornecedor.cnpj) : null;

    const itens: NfeItemPreview[] = [];
    for (const det of nfe.itens) {
      const match = fornecedor
        ? await this.insumoRepo.findFornecedorItemByCodigo(fornecedor.id, det.codigoFornecedor)
        : null;
      itens.push({
        codigoFornecedor: det.codigoFornecedor,
        descricao: det.descricao,
        unidadeComercial: det.unidadeComercial,
        unidadeSugerida: inferirUnidadeMedida(det.unidadeComercial),
        quantidade: det.quantidade,
        valorUnitario: det.valorUnitario,
        valorTotal: det.valorTotal,
        vinculado: !!match,
        fornecedorItemId: match?.id,
        insumoId: match?.insumoId,
        insumoNome: match?.insumo?.name,
        unidadeBaseInsumo: match?.insumo?.unidadeBase,
      });
    }

    return {
      chaveAcesso: nfe.chaveAcesso,
      numero: nfe.numero,
      serie: nfe.serie,
      dataEmissao: nfe.dataEmissao,
      valorTotal: nfe.valorTotal,
      fornecedor: nfe.fornecedor,
      fornecedorCadastrado: !!fornecedor,
      jaImportada,
      itens,
    };
  }

  /** Confirma a importação: cria/atualiza fornecedor, insumos e SKUs conforme mapeado pelo usuário,
   *  lança as entradas de estoque e registra a nota fiscal (impedindo reimportação da mesma chave). */
  async confirmar(xml: string, itensConfirmados: ItemConfirmacao[]) {
    const nfe = this.parser.parse(xml);

    const jaImportada = await this.notaRepo.findByChave(nfe.chaveAcesso);
    if (jaImportada) throw new ConflictException('Esta NF-e já foi importada anteriormente.');

    const fornecedor = nfe.fornecedor.cnpj ? await this.fornecedorOuCriar(nfe.fornecedor) : null;

    const nota = await this.notaRepo.create({
      id: uuidv7(),
      chaveAcesso: nfe.chaveAcesso,
      numero: nfe.numero,
      serie: nfe.serie,
      fornecedorId: fornecedor?.id ?? null,
      dataEmissao: nfe.dataEmissao ? new Date(nfe.dataEmissao) : null,
      valorTotal: nfe.valorTotal,
      status: 'PROCESSADA',
      xmlRaw: xml,
    });

    const resumo: Array<{ insumoId: string; insumoNome: string; quantidadeBase: number }> = [];

    for (const item of itensConfirmados) {
      let insumoId = item.insumoId ?? null;

      if (!insumoId) {
        if (!item.criarInsumo?.name?.trim()) {
          throw new BadRequestException(`O item "${item.descricao}" não foi vinculado a nenhum insumo — escolha um existente ou informe o nome do novo insumo.`);
        }
        const codigoBarras = await gerarCodigoBarrasUnico(this.insumoRepo);
        const criado = await this.insumoRepo.create({
          id: uuidv7(),
          name: item.criarInsumo.name.trim(),
          categoria: item.criarInsumo.categoria || null,
          codigoBarras,
          unidadeBase: item.criarInsumo.unidadeBase,
          estoqueMinimo: item.criarInsumo.estoqueMinimo ?? null,
        });
        insumoId = criado.id;
      }

      const insumo = await this.insumoRepo.findById(insumoId);
      if (!insumo) throw new BadRequestException(`Insumo ${insumoId} não encontrado.`);

      let fornecedorItem = item.fornecedorItemId
        ? await this.insumoRepo.findFornecedorItemById(item.fornecedorItemId)
        : null;

      if (fornecedorItem) {
        await this.insumoRepo.updateFornecedorItem(fornecedorItem.id, { ultimoPrecoUnitario: item.valorUnitario });
      } else {
        if (!item.unidadeCompra) {
          throw new BadRequestException(`Informe a unidade de compra do item "${item.descricao}".`);
        }
        let fator: number;
        try {
          fator = resolverFatorConversao(item.unidadeCompra, insumo.unidadeBase, item.fatorConversao);
        } catch (e: any) {
          throw new BadRequestException(`Item "${item.descricao}": ${e.message}`);
        }
        fornecedorItem = await this.insumoRepo.addFornecedorItem({
          id: uuidv7(),
          insumoId,
          fornecedorId: fornecedor?.id ?? null,
          marca: item.marca || null,
          codigoFornecedor: item.codigoFornecedor || null,
          unidadeCompra: item.unidadeCompra,
          fatorConversao: fator,
          ultimoPrecoUnitario: item.valorUnitario,
        });
      }

      const quantidadeBase = Number(item.quantidade) * Number(fornecedorItem.fatorConversao);

      await this.insumoRepo.registrarMovimentacao({
        id: uuidv7(),
        insumoId,
        fornecedorItemId: fornecedorItem.id,
        tipo: 'ENTRADA',
        origem: 'NFE',
        quantidade: quantidadeBase,
        precoUnitario: item.valorUnitario,
        notaFiscalId: nota.id,
        observacao: `NF-e ${nfe.numero ?? ''} — ${item.descricao}`.trim(),
      });
      await this.insumoRepo.ajustarEstoque(insumoId, quantidadeBase);

      resumo.push({ insumoId, insumoNome: insumo.name, quantidadeBase });
    }

    return { notaFiscalId: nota.id, numero: nfe.numero, itensProcessados: resumo.length, itens: resumo };
  }

  private async fornecedorOuCriar(dadosEmitente: NfeParseada['fornecedor']) {
    const cnpj = (dadosEmitente.cnpj ?? '').replace(/\D/g, '');
    const existing = await this.fornecedorRepo.findByCnpj(cnpj);
    if (existing) return existing;
    return this.fornecedorRepo.create({
      id: uuidv7(),
      nome: dadosEmitente.nome?.trim() || cnpj,
      cnpj,
      nomeFantasia: dadosEmitente.nomeFantasia,
      ie: dadosEmitente.ie,
      telefone: dadosEmitente.telefone,
      logradouro: dadosEmitente.logradouro,
      numero: dadosEmitente.numero,
      complemento: dadosEmitente.complemento,
      bairro: dadosEmitente.bairro,
      municipio: dadosEmitente.municipio,
      uf: dadosEmitente.uf,
      cep: dadosEmitente.cep,
    });
  }
}
