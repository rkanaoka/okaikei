import { OptionGroupsService } from '@/modules/option-groups/application/use-cases/option-groups.service';
export declare class OptionGroupsController {
    private readonly groups;
    constructor(groups: OptionGroupsService);
    findAll(): Promise<any[]>;
    create(body: {
        name: string;
        minSelect?: number;
        maxSelect?: number;
        options?: any[];
    }): Promise<any>;
    updateOption(optionId: string, body: {
        name?: string;
        price?: number;
        active?: boolean;
    }): Promise<any>;
    findOne(id: string): Promise<any>;
    update(id: string, body: any): Promise<any>;
    remove(id: string): Promise<{
        id: string;
    }>;
    setItems(id: string, body: {
        menuItemIds: string[];
    }): Promise<any>;
}
