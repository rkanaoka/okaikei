// Geração e validação de código de barras EAN-8 (padrão GS1) para insumos.
// Não importa nada externo (Prisma, NestJS) — ver regras de dependência em
// backend/src/modules/CLAUDE.md.

/** Calcula o dígito verificador EAN-8 para 7 dígitos de dados (pesos 3,1,3,1,3,1,3). */
export function calcularDigitoVerificadorEAN8(digits7: string): number {
  if (!/^\d{7}$/.test(digits7)) {
    throw new Error('EAN-8 requer exatamente 7 dígitos para calcular o dígito verificador.');
  }
  let soma = 0;
  for (let i = 0; i < 7; i++) {
    const peso = i % 2 === 0 ? 3 : 1;
    soma += Number(digits7[i]) * peso;
  }
  return (10 - (soma % 10)) % 10;
}

/** Gera 7 dígitos aleatórios (payload de dados do EAN-8, sem o dígito verificador). */
export function gerarPayloadEAN8(): string {
  return Math.floor(Math.random() * 10_000_000).toString().padStart(7, '0');
}

/** Monta o código EAN-8 completo (8 dígitos) a partir de um payload de 7 dígitos. */
export function montarEAN8(payload7: string): string {
  return payload7 + calcularDigitoVerificadorEAN8(payload7);
}
