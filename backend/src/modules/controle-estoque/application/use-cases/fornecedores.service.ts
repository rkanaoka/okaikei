import { Inject, Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import {
  FORNECEDOR_REPOSITORY_PORT, FornecedorRepositoryPort, FornecedorDadosOpcionais,
} from '@/modules/controle-estoque/domain/repositories/fornecedor-repository.port';
import { NFE_XML_PARSER_PORT, NfeXmlParserPort } from '@/modules/controle-estoque/application/contracts/nfe-xml-parser.port';
import { uuidv7 } from 'uuidv7';

const CAMPOS_OPCIONAIS = [
  'nomeFantasia', 'ie', 'telefone', 'email',
  'logradouro', 'numero', 'complemento', 'bairro', 'municipio', 'uf', 'cep',
  'representanteNome', 'representanteTelefone', 'representanteEmail',
] as const;

function somenteDefinidos(dto: Partial<Record<(typeof CAMPOS_OPCIONAIS)[number], string | null | undefined>>) {
  const out: FornecedorDadosOpcionais = {};
  for (const campo of CAMPOS_OPCIONAIS) {
    if (dto[campo] !== undefined) out[campo] = dto[campo] || null;
  }
  return out;
}

@Injectable()
export class FornecedoresService {
  constructor(
    @Inject(FORNECEDOR_REPOSITORY_PORT) private readonly repo: FornecedorRepositoryPort,
    @Inject(NFE_XML_PARSER_PORT) private readonly nfeParser: NfeXmlParserPort,
  ) {}

  list(includeInactive = false) {
    return this.repo.findAll(includeInactive);
  }

  async create(dto: { nome: string; cnpj?: string | null } & FornecedorDadosOpcionais) {
    if (!dto.nome?.trim()) throw new BadRequestException('Nome do fornecedor é obrigatório.');
    const cnpj = dto.cnpj?.replace(/\D/g, '') || null;
    if (cnpj) {
      const existing = await this.repo.findByCnpj(cnpj);
      if (existing) throw new BadRequestException('Já existe um fornecedor cadastrado com esse CNPJ.');
    }
    return this.repo.create({
      id: uuidv7(), nome: dto.nome.trim(), cnpj,
      ...somenteDefinidos(dto),
    });
  }

  async update(id: string, dto: Partial<{ nome: string; cnpj: string | null; active: boolean } & FornecedorDadosOpcionais>) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException('Fornecedor não encontrado.');
    if (dto.nome !== undefined && !dto.nome.trim()) throw new BadRequestException('Nome do fornecedor é obrigatório.');
    return this.repo.update(id, {
      ...(dto.nome !== undefined   && { nome: dto.nome.trim() }),
      ...(dto.cnpj !== undefined   && { cnpj: dto.cnpj ? dto.cnpj.replace(/\D/g, '') : null }),
      ...(dto.active !== undefined && { active: dto.active }),
      ...somenteDefinidos(dto),
    });
  }

  async remove(id: string) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException('Fornecedor não encontrado.');
    return this.repo.update(id, { active: false });
  }

  /** Lê o XML de uma NF-e e devolve os dados do emitente para pré-preencher o formulário —
   *  não grava nada, o usuário confirma/edita antes de salvar. */
  parseNfeEmitente(xml: string) {
    return this.nfeParser.parse(xml).fornecedor;
  }
}
