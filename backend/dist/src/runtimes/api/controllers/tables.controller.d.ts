import { TablesService } from '@/modules/tables/application/use-cases/tables.service';
export declare class TablesController {
    private readonly tables;
    constructor(tables: TablesService);
    findAll(): Promise<any[]>;
    create(b: any): Promise<any>;
    update(id: string, b: any): Promise<any>;
}
