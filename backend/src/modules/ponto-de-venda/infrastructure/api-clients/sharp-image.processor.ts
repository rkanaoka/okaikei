import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as sharp from 'sharp';
import { ImageProcessorPort } from '@/modules/ponto-de-venda/application/contracts/image-processor.port';

const MAX_SIDE = 800;                   // mesmo tamanho gerado pelo editor do admin
const WEBP_QUALITY = 80;
const MAX_INPUT_BYTES = 5 * 1024 * 1024;
const DATA_URL = /^data:image\/[a-z0-9.+-]+;base64,/i;

/**
 * Etapa final da foto do cardápio, no servidor. O admin já recorta e reduz a foto
 * no navegador (necessário para o enquadramento e para caber no limite de 1 MB do
 * nginx/Fastify); aqui o sharp padroniza o resultado independentemente do navegador:
 * WebP, no máximo 800px, rotação EXIF aplicada e metadados (EXIF/GPS) removidos.
 */
@Injectable()
export class SharpImageProcessor implements ImageProcessorPort {
  private readonly logger = new Logger(SharpImageProcessor.name);

  async normalizeMenuPhoto(imageUrl: string | null | undefined): Promise<string | null> {
    const value = imageUrl?.trim();
    if (!value) return null;
    if (/^https?:\/\//i.test(value)) return value;
    if (!DATA_URL.test(value)) throw new BadRequestException('Foto inválida: envie uma imagem JPG, PNG ou WebP.');

    const input = Buffer.from(value.slice(value.indexOf(',') + 1), 'base64');
    if (input.length > MAX_INPUT_BYTES) {
      throw new BadRequestException('Foto muito grande. Use o editor de foto do cadastro para otimizá-la.');
    }

    let output: Buffer;
    try {
      output = await sharp(input, { limitInputPixels: 50_000_000 })
        .rotate()                                                        // aplica a orientação EXIF
        .resize(MAX_SIDE, MAX_SIDE, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY, effort: 4 })                      // sem withMetadata → EXIF/GPS removidos
        .toBuffer();
    } catch (err) {
      this.logger.warn(`Foto do cardápio rejeitada: ${(err as Error).message}`);
      throw new BadRequestException('Não foi possível ler a foto. Envie uma imagem JPG, PNG ou WebP.');
    }

    // A foto do editor do admin já chega no padrão (WebP ≤ 800px, sem metadados); se ela
    // for menor que a reprocessada, mantém a original para não recomprimir à toa
    const meta = await sharp(input).metadata();
    const alreadyStandard = meta.format === 'webp' && (meta.width ?? 0) <= MAX_SIDE && (meta.height ?? 0) <= MAX_SIDE
      && !meta.exif && !meta.xmp && !meta.icc;
    const result = alreadyStandard && input.length <= output.length ? input : output;
    return `data:image/webp;base64,${result.toString('base64')}`;
  }
}
