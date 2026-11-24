export const IMAGE_PROCESSOR_PORT = Symbol('ImageProcessorPort');

export interface ImageProcessorPort {
  /**
   * Padroniza a foto de um item do cardápio. Recebe o valor de `imageUrl` como
   * veio do admin e devolve o que deve ser gravado:
   * - vazio → null
   * - URL http(s) → inalterada (imagem hospedada fora)
   * - data URL de imagem → reprocessada (WebP, ≤ 800px, sem metadados)
   * Lança BadRequestException para conteúdo que não é imagem ou é grande demais.
   */
  normalizeMenuPhoto(imageUrl: string | null | undefined): Promise<string | null>;
}
