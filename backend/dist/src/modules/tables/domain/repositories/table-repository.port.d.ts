export declare const TABLE_REPOSITORY_PORT: unique symbol;
export interface TableRepositoryPort {
    findAll(): Promise<any[]>;
    findById(id: string): Promise<any | null>;
    create(data: {
        id: string;
        number: number;
        label: string;
        capacity?: number;
    }): Promise<any>;
    update(id: string, data: Partial<{
        number: number;
        label: string;
        capacity: number;
        status: string;
    }>): Promise<any>;
    remove(id: string): Promise<any>;
    setStatus(id: string, status: string): Promise<any>;
}
