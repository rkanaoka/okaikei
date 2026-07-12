import { TablesService } from './tables.service';
export declare class TablesController {
    private readonly tables;
    constructor(tables: TablesService);
    findAll(): Promise<any[]>;
    create(b: any): Promise<{
        number: number;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        label: string;
        capacity: number;
        status: import(".prisma/client").$Enums.TableStatus;
    }>;
    update(id: string, b: any): Promise<{
        number: number;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        label: string;
        capacity: number;
        status: import(".prisma/client").$Enums.TableStatus;
    }>;
}
