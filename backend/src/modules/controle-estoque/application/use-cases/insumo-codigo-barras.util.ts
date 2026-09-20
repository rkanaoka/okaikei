import { InsumoRepositoryPort } from '@/modules/controle-estoque/domain/repositories/insumo-repository.port';
import { gerarPayloadEAN8, montarEAN8 } from '@/modules/controle-estoque/domain/value-objects/ean8';

const MAX_TENTATIVAS = 10;

/** Gera um código de barras EAN-8 garantidamente único entre os insumos cadastrados.
 *  Usado tanto na criação manual de insumo quanto na criação via importação de NF-e. */
export async function gerarCodigoBarrasUnico(repo: InsumoRepositoryPort): Promise<string> {
  for (let tentativa = 0; tentativa < MAX_TENTATIVAS; tentativa++) {
    const codigo = montarEAN8(gerarPayloadEAN8());
    const existente = await repo.findByCodigoBarras(codigo);
    if (!existente) return codigo;
  }
  throw new Error('Não foi possível gerar um código de barras único após várias tentativas.');
}
