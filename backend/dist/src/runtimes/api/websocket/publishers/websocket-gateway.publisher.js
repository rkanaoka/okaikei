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
exports.WebSocketGatewayPublisher = void 0;
const common_1 = require("@nestjs/common");
const events_gateway_1 = require("../events.gateway");
let WebSocketGatewayPublisher = class WebSocketGatewayPublisher {
    constructor(gateway) {
        this.gateway = gateway;
    }
    emitComandaCreated(data) { this.gateway.emitComandaCreated(data); }
    emitComandaUpdated(data) { this.gateway.emitComandaUpdated(data); }
    emitComandaClosed(data) { this.gateway.emitComandaClosed(data); }
    emitSyncStatus(data) { this.gateway.emitSyncStatus(data); }
};
exports.WebSocketGatewayPublisher = WebSocketGatewayPublisher;
exports.WebSocketGatewayPublisher = WebSocketGatewayPublisher = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [events_gateway_1.EventsGateway])
], WebSocketGatewayPublisher);
//# sourceMappingURL=websocket-gateway.publisher.js.map