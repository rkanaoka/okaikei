# CLAUDE.md — domain/repositories/ (padrão para todos os módulos)

## O que é
Interface (Port) que define o contrato de acesso a dados deste módulo.
Pertence à camada de domínio — não conhece nenhum framework ou ORM.

## Regras
- Apenas assinaturas de método: nenhuma implementação aqui
- Tipos permitidos: primitivos TypeScript, enums do domínio, `any` quando o schema Prisma ainda não foi tipado
- Proibido: imports de `@prisma/client` (exceto enums de domínio), `PrismaService`, `@nestjs/*`

## Nomenclatura obrigatória
- Port:          `MenuRepositoryPort`
- Token DI:      `MENU_REPOSITORY_PORT` (Symbol exportado no mesmo arquivo)
- Implementação: `PrismaMenuRepository` (em `infrastructure/repositories/`)

## Exemplo correto
```typescript
export const MENU_REPOSITORY_PORT = Symbol('MenuRepositoryPort');
export interface MenuRepositoryPort {
  findItemById(id: string): Promise<any | null>;
  createItem(data: CreateMenuItemData): Promise<any>;
}
```

## Exemplo ERRADO
```typescript
// ❌ Nunca importar Prisma no domínio
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
```
