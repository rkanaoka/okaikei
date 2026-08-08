export const PRINT_TEMPLATE_REPOSITORY_PORT = Symbol('PrintTemplateRepositoryPort');

export interface PrintTemplateRepositoryPort {
  findAll(): Promise<Array<{ type: string; enabled: boolean; config: any }>>;
  findByType(type: string): Promise<{ type: string; enabled: boolean; config: any } | null>;
  upsert(type: string, data: { enabled: boolean; config: any }): Promise<{ type: string; enabled: boolean; config: any }>;
}
