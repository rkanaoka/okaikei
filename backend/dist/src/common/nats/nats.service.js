"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var NatsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NatsService = void 0;
const common_1 = require("@nestjs/common");
const nats_1 = require("nats");
let NatsService = NatsService_1 = class NatsService {
    constructor() {
        this.logger = new common_1.Logger(NatsService_1.name);
        this.jc = (0, nats_1.JSONCodec)();
        this.sc = (0, nats_1.StringCodec)();
    }
    async onModuleInit() {
        try {
            this.nc = await (0, nats_1.connect)({
                servers: process.env.NATS_URL ?? 'nats://localhost:4222',
                reconnect: true,
                maxReconnectAttempts: -1,
                reconnectTimeWait: 2000,
            });
            this.logger.log('NATS connected');
            this.monitorStatus();
        }
        catch (err) {
            this.logger.warn(`NATS unavailable — eventos locais desativados: ${err.message}`);
        }
    }
    async onModuleDestroy() {
        await this.nc?.drain();
    }
    monitorStatus() {
        (async () => {
            for await (const s of this.nc.status()) {
                this.logger.debug(`NATS status: ${s.type}`);
            }
        })().catch(() => { });
    }
    publish(subject, data) {
        if (!this.nc || this.nc.isClosed())
            return;
        try {
            this.nc.publish(subject, this.jc.encode(data));
        }
        catch (err) {
            this.logger.warn(`NATS publish failed [${subject}]: ${err.message}`);
        }
    }
    subscribe(subject, handler) {
        if (!this.nc || this.nc.isClosed())
            return null;
        const sub = this.nc.subscribe(subject);
        (async () => {
            for await (const msg of sub) {
                try {
                    const data = this.jc.decode(msg.data);
                    await handler(data, msg.subject);
                }
                catch (err) {
                    this.logger.error(`NATS handler error [${subject}]: ${err.message}`);
                }
            }
        })();
        this.logger.debug(`NATS subscribed: ${subject}`);
        return sub;
    }
    isConnected() {
        return !!this.nc && !this.nc.isClosed();
    }
};
exports.NatsService = NatsService;
exports.NatsService = NatsService = NatsService_1 = __decorate([
    (0, common_1.Injectable)()
], NatsService);
//# sourceMappingURL=nats.service.js.map