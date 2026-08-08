export const OPTION_GROUP_REPOSITORY_PORT = Symbol('OptionGroupRepositoryPort');

export interface OptionGroupRepositoryPort {
  findAll(): Promise<any[]>;
  findById(id: string): Promise<any | null>;
  create(data: { id: string; name: string; options?: Array<{ id: string; name: string; price?: number; active?: boolean; sortOrder?: number }> }): Promise<any>;
  updateWithOptions(id: string, data: {
    name?: string; minSelect?: number; maxSelect?: number; active?: boolean;
    options?: Array<{ id?: string; name: string; price?: number; active?: boolean; sortOrder?: number }>;
  }): Promise<any>;
  remove(id: string): Promise<any>;
  setMenuItems(id: string, menuItemIds: string[]): Promise<any>;
  updateOption(optionId: string, data: Partial<{ name: string; price: number; active: boolean }>): Promise<any>;
  findOptionById(optionId: string): Promise<any | null>;
}
