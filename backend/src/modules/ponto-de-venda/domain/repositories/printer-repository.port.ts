export const PRINTER_REPOSITORY_PORT = Symbol('PrinterRepositoryPort');

export interface PrinterRepositoryPort {
  findByCategory(category: string): Promise<{ ip: string; port: number; label?: string | null; enabled: boolean } | null>;
}
