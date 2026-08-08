import { MenuService } from '@/modules/menu/application/use-cases/menu.service';
export declare class MenuController {
    private readonly menu;
    constructor(menu: MenuService);
    findAllCategories(): Promise<any[]>;
    createCategory(body: {
        name: string;
        sortOrder?: number;
    }): Promise<any>;
    updateCategory(id: string, body: {
        name?: string;
        sortOrder?: number;
    }): Promise<any>;
    findAll(all?: string): Promise<any[]>;
    findOne(id: string): Promise<any>;
    create(body: {
        name: string;
        description?: string;
        price: number;
        category: string;
        subcategory?: string;
        sortOrder?: number;
        categoryId?: string;
        printCategories?: string[];
        imageUrl?: string;
        chargeServiceFee?: boolean;
        availabilitySchedule?: any;
        optionGroupIds?: string[];
    }): Promise<any>;
    update(id: string, body: any): Promise<any>;
    remove(id: string): Promise<any>;
}
