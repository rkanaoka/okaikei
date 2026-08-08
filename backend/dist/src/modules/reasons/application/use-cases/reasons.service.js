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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReasonsService = void 0;
const common_1 = require("@nestjs/common");
const reasons_repository_port_1 = require("../../domain/repositories/reasons-repository.port");
const uuidv7_1 = require("uuidv7");
let ReasonsService = class ReasonsService {
    constructor(repo) {
        this.repo = repo;
    }
    async listCancellationReasons() {
        const [reasons, counts] = await Promise.all([
            this.repo.findAllCancellationReasons(),
            this.repo.findCancellationUsageCounts(),
        ]);
        const countMap = new Map(counts.map((c) => [c.reasonId, c.count]));
        return reasons.map((r) => ({ ...r, usageCount: countMap.get(r.id) ?? 0 }));
    }
    async createCancellationReason(dto) {
        if (!dto.label?.trim())
            throw new common_1.BadRequestException('Nome do motivo é obrigatório');
        return this.repo.createCancellationReason({ id: (0, uuidv7_1.uuidv7)(), label: dto.label.trim() });
    }
    async listCancellationHistory() {
        return this.repo.findCancellationHistory();
    }
    async listDiscountReasons() {
        return this.repo.findAllDiscountReasons();
    }
    async createDiscountReason(dto) {
        if (!dto.label?.trim())
            throw new common_1.BadRequestException('Nome do motivo é obrigatório');
        if (!dto.value || dto.value <= 0)
            throw new common_1.BadRequestException('Valor inválido');
        if (dto.type !== 'percent' && dto.type !== 'fixed')
            throw new common_1.BadRequestException('Tipo inválido');
        return this.repo.createDiscountReason({ id: (0, uuidv7_1.uuidv7)(), label: dto.label.trim(), type: dto.type, value: dto.value });
    }
};
exports.ReasonsService = ReasonsService;
exports.ReasonsService = ReasonsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(reasons_repository_port_1.REASONS_REPOSITORY_PORT)),
    __metadata("design:paramtypes", [Object])
], ReasonsService);
//# sourceMappingURL=reasons.service.js.map