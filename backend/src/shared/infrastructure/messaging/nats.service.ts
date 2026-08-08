import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import {
  connect,
  NatsConnection,
  StringCodec,
  JSONCodec,
  Subscription,
  NatsError,
} from 'nats';

@Injectable()
export class NatsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NatsService.name);
  private nc: NatsConnection;
  private readonly jc = JSONCodec();
  private readonly sc = StringCodec();

  async onModuleInit() {
    try {
      this.nc = await connect({
        servers: process.env.NATS_URL ?? 'nats://localhost:4222',
        reconnect: true,
        maxReconnectAttempts: -1,
        reconnectTimeWait: 2000,
      });
      this.logger.log('NATS connected');
      this.monitorStatus();
    } catch (err) {
      this.logger.warn(`NATS unavailable — eventos locais desativados: ${err.message}`);
    }
  }

  async onModuleDestroy() {
    await this.nc?.drain();
  }

  private monitorStatus() {
    (async () => {
      for await (const s of this.nc.status()) {
        this.logger.debug(`NATS status: ${s.type}`);
      }
    })().catch(() => {});
  }

  /**
   * Publica um evento JSON em um tópico NATS.
   * Nunca lança exceção — se NATS não estiver disponível, silencia.
   */
  publish(subject: string, data: Record<string, any>): void {
    if (!this.nc || this.nc.isClosed()) return;
    try {
      this.nc.publish(subject, this.jc.encode(data));
    } catch (err) {
      this.logger.warn(`NATS publish failed [${subject}]: ${err.message}`);
    }
  }

  /**
   * Subscreve a um tópico e chama o handler com o payload deserializado.
   * Retorna a Subscription para que o caller possa cancelar.
   */
  subscribe(
    subject: string,
    handler: (data: any, subject: string) => void | Promise<void>,
  ): Subscription | null {
    if (!this.nc || this.nc.isClosed()) return null;

    const sub = this.nc.subscribe(subject);
    (async () => {
      for await (const msg of sub) {
        try {
          const data = this.jc.decode(msg.data);
          await handler(data, msg.subject);
        } catch (err) {
          this.logger.error(`NATS handler error [${subject}]: ${err.message}`);
        }
      }
    })();

    this.logger.debug(`NATS subscribed: ${subject}`);
    return sub;
  }

  isConnected(): boolean {
    return !!this.nc && !this.nc.isClosed();
  }
}
