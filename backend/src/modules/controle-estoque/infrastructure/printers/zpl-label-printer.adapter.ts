import { Injectable, Logger } from '@nestjs/common';
import * as net from 'net';
import * as fs from 'fs';
import { LabelPrinterPort } from '@/modules/controle-estoque/domain/repositories/label-printer.port';

/**
 * Adapter para a Elgin L42 Pro Full — impressora térmica de etiquetas ZPL.
 *
 * Suporta dois modos de conexão (via env vars):
 *   LABEL_PRINTER_TYPE = 'usb'      → grava em LABEL_PRINTER_USB_PATH (/dev/usb/lp0)
 *   LABEL_PRINTER_TYPE = 'ethernet' → TCP para LABEL_PRINTER_HOST:LABEL_PRINTER_PORT (default: 9100)
 *
 * Padrão: ethernet.
 */
@Injectable()
export class ZplLabelPrinterAdapter implements LabelPrinterPort {
  private readonly logger = new Logger(ZplLabelPrinterAdapter.name);

  private get type(): 'usb' | 'ethernet' {
    return (process.env.LABEL_PRINTER_TYPE ?? 'ethernet') === 'usb' ? 'usb' : 'ethernet';
  }
  private get host(): string  { return process.env.LABEL_PRINTER_HOST ?? '192.168.1.100'; }
  private get port(): number  { return parseInt(process.env.LABEL_PRINTER_PORT ?? '9100', 10); }
  private get usbPath(): string { return process.env.LABEL_PRINTER_USB_PATH ?? '/dev/usb/lp0'; }

  async print(zpl: string): Promise<void> {
    this.logger.log(`Impressão ZPL via ${this.type}`);
    if (this.type === 'usb') {
      await this.writeUsb(zpl);
    } else {
      await this.writeTcp(zpl);
    }
  }

  async isConnected(): Promise<boolean> {
    try {
      if (this.type === 'usb') {
        return fs.existsSync(this.usbPath);
      }
      return await this.tcpPing();
    } catch {
      return false;
    }
  }

  // ── USB ──────────────────────────────────────────────────────────────────────

  private writeUsb(zpl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.writeFile(this.usbPath, zpl, (err) => {
        if (err) {
          this.logger.error(`Erro ao escrever no dispositivo USB ${this.usbPath}: ${err.message}`);
          reject(new Error(`Impressora USB não acessível: ${err.message}`));
        } else {
          resolve();
        }
      });
    });
  }

  // ── Ethernet (TCP/IP, porta 9100) ─────────────────────────────────────────────

  private writeTcp(zpl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      const timeout = parseInt(process.env.LABEL_PRINTER_TIMEOUT_MS ?? '5000', 10);

      socket.setTimeout(timeout);

      socket.connect(this.port, this.host, () => {
        socket.write(zpl, 'utf8', (err) => {
          if (err) {
            socket.destroy();
            reject(new Error(`Falha ao enviar ZPL: ${err.message}`));
          } else {
            socket.end();
            resolve();
          }
        });
      });

      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error(`Timeout ao conectar na impressora ${this.host}:${this.port}`));
      });

      socket.on('error', (err) => {
        reject(new Error(`Erro TCP na impressora: ${err.message}`));
      });
    });
  }

  private tcpPing(): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(2000);
      socket.connect(this.port, this.host, () => {
        socket.destroy();
        resolve(true);
      });
      socket.on('timeout', () => { socket.destroy(); resolve(false); });
      socket.on('error',   () => { resolve(false); });
    });
  }
}
