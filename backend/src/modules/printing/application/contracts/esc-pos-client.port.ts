export const ESC_POS_CLIENT_PORT = Symbol('EscPosClientPort');

export interface EscPosClientPort {
  send(ip: string, port: number, data: Buffer, timeoutMs?: number): Promise<void>;
}
