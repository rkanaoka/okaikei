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
exports.TablesService = void 0;
const common_1 = require("@nestjs/common");
const table_repository_port_1 = require("../../domain/repositories/table-repository.port");
const redis_service_1 = require("../../../../shared/infrastructure/cache/redis.service");
const sync_service_1 = require("../../../sync/application/use-cases/sync.service");
const uuidv7_1 = require("uuidv7");
let TablesService = class TablesService {
    constructor(repo, redis, sync) {
        this.repo = repo;
        this.redis = redis;
        this.sync = sync;
    }
    async findAll() {
        const cached = await this.redis.getTables();
        if (cached)
            return cached;
        const tables = await this.repo.findAll();
        await this.redis.cacheTables(tables);
        return tables;
    }
    async create(dto) {
        const table = await this.repo.create({ id: (0, uuidv7_1.uuidv7)(), ...dto });
        await this.redis.invalidateTables();
        await this.sync.enqueue('table.created', 'Table', table.id, table);
        return table;
    }
    async update(id, dto) {
        const existing = await this.repo.findById(id);
        if (!existing)
            throw new common_1.NotFoundException(`Mesa ${id} não encontrada`);
        const table = await this.repo.update(id, dto);
        await this.redis.invalidateTables();
        return table;
    }
};
exports.TablesService = TablesService;
exports.TablesService = TablesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(table_repository_port_1.TABLE_REPOSITORY_PORT)),
    __metadata("design:paramtypes", [Object, redis_service_1.RedisService,
        sync_service_1.SyncService])
], TablesService);
//# sourceMappingURL=tables.service.js.map