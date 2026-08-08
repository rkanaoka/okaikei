import { EscPosClientPort } from '@/modules/printing/application/contracts/esc-pos-client.port';
export declare class TcpEscPosClient implements EscPosClientPort {
    private readonly logger;
    send(ip: string, port: number, data: Buffer, timeoutMs?: number): Promise<void>;
}
