import { Injectable, BadRequestException } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';
import {
  NfeXmlParserPort, NfeParseada, NfeItemParseado,
} from '@/modules/controle-estoque/application/contracts/nfe-xml-parser.port';

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

function toArray<T>(v: T | T[] | undefined | null): T[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

function num(v: any): number {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

/** Lê o XML de uma NF-e (padrão nfeProc/NFe da SEFAZ) e extrai os dados de interesse
 *  para a entrada de estoque: chave de acesso, emitente e itens (det/prod). */
@Injectable()
export class FastXmlNfeParserAdapter implements NfeXmlParserPort {
  parse(xml: string): NfeParseada {
    let json: any;
    try {
      json = parser.parse(xml);
    } catch {
      throw new BadRequestException('Arquivo XML inválido — não foi possível interpretar o conteúdo.');
    }

    // Aceita tanto o envelope completo <nfeProc> quanto um XML só com <NFe>.
    const nfeProc = json?.nfeProc ?? json;
    const nfe = nfeProc?.NFe ?? nfeProc?.nfe ?? json?.NFe;
    const infNFe = nfe?.infNFe;
    if (!infNFe) {
      throw new BadRequestException('O XML enviado não parece ser uma NF-e (tag <infNFe> não encontrada).');
    }

    const idAttr = infNFe['@_Id'] || infNFe['@_id'] || '';
    const chaveProt = nfeProc?.protNFe?.infProt?.chNFe;
    const chaveAcesso = String(idAttr || chaveProt || '').replace(/^NFe/i, '').trim();
    if (!/^\d{44}$/.test(chaveAcesso)) {
      throw new BadRequestException('Não foi possível identificar a chave de acesso (44 dígitos) no XML.');
    }

    const ide = infNFe.ide ?? {};
    const emit = infNFe.emit ?? {};
    const total = infNFe.total?.ICMSTot ?? {};
    const dets = toArray(infNFe.det);

    const itens: NfeItemParseado[] = dets.map((det: any) => {
      const prod = det.prod ?? {};
      return {
        codigoFornecedor: String(prod.cProd ?? '').trim(),
        descricao: String(prod.xProd ?? '').trim(),
        ncm: prod.NCM !== undefined ? String(prod.NCM) : undefined,
        unidadeComercial: String(prod.uCom ?? '').trim(),
        quantidade: num(prod.qCom),
        valorUnitario: num(prod.vUnCom),
        valorTotal: num(prod.vProd),
      };
    });

    if (!itens.length) {
      throw new BadRequestException('A NF-e não contém itens (tag <det>) para importar.');
    }

    return {
      chaveAcesso,
      numero: ide.nNF != null ? String(ide.nNF) : null,
      serie: ide.serie != null ? String(ide.serie) : null,
      dataEmissao: ide.dhEmi ? String(ide.dhEmi) : (ide.dEmi ? String(ide.dEmi) : null),
      valorTotal: total.vNF != null ? num(total.vNF) : null,
      fornecedor: {
        cnpj: emit.CNPJ ? String(emit.CNPJ).replace(/\D/g, '') : null,
        nome: emit.xNome ? String(emit.xNome).trim() : null,
      },
      itens,
    };
  }
}
