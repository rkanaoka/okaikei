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
exports.TablesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const redis_service_1 = require("../../common/redis/redis.service");
const sync_service_1 = require("../sync/sync.service");
const uuidv7_1 = require("uuidv7");
let TablesService = class TablesService {
    constructor(prisma, redis, sync) {
        this.prisma = prisma;
        this.redis = redis;
        this.sync = sync;
    }
    async findAll() {
        const cached = await this.redis.getTables();
        if (cached)
            return cached;
        const tables = await this.prisma.table.findMany({
            include: { comandas: { where: { status: { in: ['OPEN', 'PREPARING'] } } } },
            orderBy: { number: 'asc' },
        });
        await this.redis.cacheTables(tables);
        return tables;
    }
    async create(dto) {
        const table = await this.prisma.table.create({
            data: { id: (0, uuidv7_1.uuidv7)(), ...dto },
        });
        await this.redis.invalidateTables();
        await this.sync.enqueue('table.created', 'Table', table.id, table);
        return table;
    }
    async update(id, dto) {
        const table = await this.prisma.table.update({ where: { id }, data: dto });
        await this.redis.invalidateTables();
        return table;
    }
};
exports.TablesService = TablesService;
exports.TablesService = TablesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        redis_service_1.RedisService,
        sync_service_1.SyncService])
], TablesService);
//# sourceMappingURL=tables.service.js.map