export const REASONS_REPOSITORY_PORT = Symbol('ReasonsRepositoryPort');

export interface ReasonsRepositoryPort {
  findAllCancellationReasons(): Promise<any[]>;
  findCancellationUsageCounts(): Promise<Array<{ reasonId: string; count: number }>>;
  createCancellationReason(data: { id: string; label: string }): Promise<any>;
  deleteCancellationReason(id: string): Promise<any>;
  findCancellationHistory(): Promise<any[]>;

  findAllDiscountReasons(): Promise<any[]>;
  findDiscountUsageCounts(): Promise<Array<{ reasonId: string; count: number }>>;
  createDiscountReason(data: { id: string; label: string; type: string; value: number }): Promise<any>;
  deleteDiscountReason(id: string): Promise<any>;
}
