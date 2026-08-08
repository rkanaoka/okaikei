"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NatsComandaPublisher = void 0;
const common_1 = require("@nestjs/common");
const nats_service_1 = require("../../../../shared/infrastructure/messaging/nats.service");
let NatsComandaPublisher = class NatsComandaPublisher {
    constructor(nats) {
        this.nats = nats;
    }
    publishComandaOpened(comanda) { this.nats.publish('comanda.opened', comanda); }
    publishComandaUpdated(comanda) { this.nats.publish('comanda.updated', comanda); }
    publishComandaClosed(comanda) { this.nats.publish('comanda.closed', comanda); }
    publishComandaItemsAdded(data) { this.nats.publish('comanda.items_added', data); }
};
exports.NatsComandaPublisher = NatsComandaPublisher;
exports.NatsComandaPublisher = NatsComandaPublisher = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [nats_service_1.NatsService])
], NatsComandaPublisher);
//# sourceMappingURL=nats-comanda.publisher.js.map