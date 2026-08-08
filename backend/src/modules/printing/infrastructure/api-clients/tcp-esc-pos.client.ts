import { Injectable, Logger } from '@nestjs/common';
import * as net from 'net';
import { EscPosClientPort } from '@/modules/printing/application/contracts/esc-pos-client.port';

@Injectable()
export class TcpEscPosClient implements EscPosClientPort {
  private readonly logger = new Logger(TcpEscPosClient.name);

  send(ip: string, port: number, data: Buffer, timeoutMs = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      socket.setTimeout(timeoutMs);
      socket.connect(port, ip, () => {
        socket.write(data, (err) => {
          socket.end();
          if (err) {
            this.logger.error(`Erro ao escrever em ${ip}:${port} — ${err.message}`);
            reject(err);
          } else {
            resolve();
          }
        });
      });
      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error(`Timeout conectando a ${ip}:${port}`));
      });
      socket.on('error', (err) => {
        socket.destroy();
        reject(err);
      });
    });
  }
}
