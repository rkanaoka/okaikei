export declare const ESC_POS_CLIENT_PORT: unique symbol;
export interface EscPosClientPort {
    send(ip: string, port: number, data: Buffer, timeoutMs?: number): Promise<void>;
}
