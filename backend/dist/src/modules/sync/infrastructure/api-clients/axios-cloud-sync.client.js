"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AxiosCloudSyncClient_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AxiosCloudSyncClient = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("axios");
let AxiosCloudSyncClient = AxiosCloudSyncClient_1 = class AxiosCloudSyncClient {
    constructor() {
        this.logger = new common_1.Logger(AxiosCloudSyncClient_1.name);
    }
    async sendBatch(cloudUrl, events) {
        try {
            const response = await axios_1.default.post(`${cloudUrl}/ingest`, {
                events: events.map((e) => ({
                    id: e.id,
                    type: e.eventType,
                    entity: e.entityType,
                    entityId: e.entityId,
                    payload: e.payload,
                    createdAt: e.createdAt,
                })),
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Api-Key': process.env.CLOUD_API_KEY ?? '',
                    'X-Restaurant': 'bodogami-sp',
                },
                timeout: 8000,
            });
            return response.status >= 200 && response.status < 300;
        }
        catch (err) {
            this.logger.warn(`Cloud API unreachable: ${err.message}`);
            return false;
        }
    }
    async checkHealth(cloudUrl) {
        try {
            await axios_1.default.get(`${cloudUrl}/health`, { timeout: 3000 });
            return true;
        }
        catch {
            return false;
        }
    }
};
exports.AxiosCloudSyncClient = AxiosCloudSyncClient;
exports.AxiosCloudSyncClient = AxiosCloudSyncClient = AxiosCloudSyncClient_1 = __decorate([
    (0, common_1.Injectable)()
], AxiosCloudSyncClient);
//# sourceMappingURL=axios-cloud-sync.client.js.map