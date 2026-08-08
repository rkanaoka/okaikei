export const MENU_REPOSITORY_PORT = Symbol('MenuRepositoryPort');

export interface MenuRepositoryPort {
  // Itens
  findAllItems(filter?: { available?: boolean }): Promise<any[]>;
  findItemById(id: string): Promise<any | null>;
  createItem(data: {
    id: string; name: string; description?: string; price: number;
    category: string; subcategory?: string; sortOrder?: number;
    categoryId?: string; printCategories?: string[];
    imageUrl?: string; chargeServiceFee?: boolean; availabilitySchedule?: any;
    optionGroupOrder?: string[];
    optionGroupIds?: string[];
  }): Promise<any>;
  updateItem(id: string, data: Partial<{
    name: string; description: string; price: number; category: string;
    subcategory: string; available: boolean; sortOrder: number;
    categoryId: string | null; printCategories: string[];
    imageUrl: string | null; chargeServiceFee: boolean; availabilitySchedule: any;
    optionGroupOrder: string[]; optionGroupIds: string[];
  }>): Promise<any>;
  deactivateItem(id: string): Promise<any>;

  // Categorias
  findAllCategories(): Promise<any[]>;
  findCategoryById(id: string): Promise<any | null>;
  createCategory(data: { id: string; name: string; sortOrder?: number }): Promise<any>;
  updateCategory(id: string, data: Partial<{ name: string; sortOrder: number }>): Promise<any>;
}
