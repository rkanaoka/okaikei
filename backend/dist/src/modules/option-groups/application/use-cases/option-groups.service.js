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
exports.OptionGroupsService = void 0;
const common_1 = require("@nestjs/common");
const option_group_repository_port_1 = require("../../domain/repositories/option-group-repository.port");
const redis_service_1 = require("../../../../shared/infrastructure/cache/redis.service");
const uuidv7_1 = require("uuidv7");
let OptionGroupsService = class OptionGroupsService {
    constructor(repo, redis) {
        this.repo = repo;
        this.redis = redis;
    }
    async findAll() {
        return this.repo.findAll();
    }
    async findOne(id) {
        const group = await this.repo.findById(id);
        if (!group)
            throw new common_1.NotFoundException(`Grupo de opções ${id} não encontrado`);
        return group;
    }
    async create(dto) {
        if (!dto.name?.trim())
            throw new common_1.BadRequestException('Nome do grupo é obrigatório');
        const options = (dto.options ?? []).map((o, i) => ({
            id: (0, uuidv7_1.uuidv7)(), name: o.name.trim(), price: o.price ?? 0, active: o.active ?? true, sortOrder: i,
        }));
        const group = await this.repo.create({ id: (0, uuidv7_1.uuidv7)(), name: dto.name.trim(), options });
        await this.redis.invalidateMenu();
        return group;
    }
    async update(id, dto) {
        await this.findOne(id);
        if (dto.name !== undefined && !dto.name.trim())
            throw new common_1.BadRequestException('Nome do grupo é obrigatório');
        const group = await this.repo.updateWithOptions(id, {
            ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
            ...(dto.minSelect !== undefined ? { minSelect: dto.minSelect } : {}),
            ...(dto.maxSelect !== undefined ? { maxSelect: dto.maxSelect } : {}),
            ...(dto.active !== undefined ? { active: dto.active } : {}),
            ...(dto.options !== undefined ? { options: dto.options } : {}),
        });
        await this.redis.invalidateMenu();
        return group;
    }
    async remove(id) {
        await this.findOne(id);
        await this.repo.remove(id);
        await this.redis.invalidateMenu();
        return { id };
    }
    async setItems(id, menuItemIds) {
        await this.findOne(id);
        const group = await this.repo.setMenuItems(id, menuItemIds);
        await this.redis.invalidateMenu();
        return group;
    }
    async updateOption(optionId, dto) {
        const option = await this.repo.findOptionById(optionId);
        if (!option)
            throw new common_1.NotFoundException(`Opção ${optionId} não encontrada`);
        const updated = await this.repo.updateOption(optionId, {
            ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
            ...(dto.price !== undefined ? { price: dto.price } : {}),
            ...(dto.active !== undefined ? { active: dto.active } : {}),
        });
        await this.redis.invalidateMenu();
        return updated;
    }
};
exports.OptionGroupsService = OptionGroupsService;
exports.OptionGroupsService = OptionGroupsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(option_group_repository_port_1.OPTION_GROUP_REPOSITORY_PORT)),
    __metadata("design:paramtypes", [Object, redis_service_1.RedisService])
], OptionGroupsService);
//# sourceMappingURL=option-groups.service.js.map