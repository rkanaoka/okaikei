"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var TcpEscPosClient_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TcpEscPosClient = void 0;
const common_1 = require("@nestjs/common");
const net = require("net");
let TcpEscPosClient = TcpEscPosClient_1 = class TcpEscPosClient {
    constructor() {
        this.logger = new common_1.Logger(TcpEscPosClient_1.name);
    }
    send(ip, port, data, timeoutMs = 5000) {
        return new Promise((resolve, reject) => {
            const socket = new net.Socket();
            socket.setTimeout(timeoutMs);
            socket.connect(port, ip, () => {
                socket.write(data, (err) => {
                    socket.end();
                    if (err) {
                        this.logger.error(`Erro ao escrever em ${ip}:${port} — ${err.message}`);
                        reject(err);
                    }
                    else {
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
};
exports.TcpEscPosClient = TcpEscPosClient;
exports.TcpEscPosClient = TcpEscPosClient = TcpEscPosClient_1 = __decorate([
    (0, common_1.Injectable)()
], TcpEscPosClient);
//# sourceMappingURL=tcp-esc-pos.client.js.map