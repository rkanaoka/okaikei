import { Module } from '@nestjs/common';

// Domain — Repository Ports (tokens)
import { LABEL_PRINTER_PORT }              from './domain/repositories/label-printer.port';
import { ETIQUETA_LAYOUT_REPOSITORY_PORT } from './domain/repositories/etiqueta-layout-repository.port';
import { INSUMO_REPOSITORY_PORT }          from './domain/repositories/insumo-repository.port';
import { FORNECEDOR_REPOSITORY_PORT }      from './domain/repositories/fornecedor-repository.port';
import { NOTA_FISCAL_REPOSITORY_PORT }     from './domain/repositories/nota-fiscal-repository.port';

// Application — Contracts (tokens)
import { NFE_XML_PARSER_PORT } from './application/contracts/nfe-xml-parser.port';

// Application — Use Cases (Services)
import { GerarEtiquetasValidadeService } from './application/use-cases/gerar-etiquetas-validade.service';
import { InsumosService }                from './application/use-cases/insumos.service';
import { FornecedoresService }           from './application/use-cases/fornecedores.service';
import { ImportarNfeService }            from './application/use-cases/importar-nfe.service';

// Infrastructure — Adapters
import { ZplLabelPrinterAdapter }         from './infrastructure/printers/zpl-label-printer.adapter';
import { PrismaEtiquetaLayoutRepository } from './infrastructure/repositories/prisma-etiqueta-layout.repository';
import { PrismaInsumoRepository }         from './infrastructure/repositories/prisma-insumo.repository';
import { PrismaFornecedorRepository }     from './infrastructure/repositories/prisma-fornecedor.repository';
import { PrismaNotaFiscalRepository }     from './infrastructure/repositories/prisma-nota-fiscal.repository';
import { FastXmlNfeParserAdapter }        from './infrastructure/parsers/fast-xml-nfe-parser.adapter';

// Controllers
import { EtiquetasController }    from '@/runtimes/api/controllers/etiquetas.controller';
import { InsumosController }      from '@/runtimes/api/controllers/insumos.controller';
import { FornecedoresController } from '@/runtimes/api/controllers/fornecedores.controller';
import { NfeImportController }    from '@/runtimes/api/controllers/nfe-import.controller';

@Module({
  controllers: [EtiquetasController, InsumosController, FornecedoresController, NfeImportController],
  providers: [
    // Services
    GerarEtiquetasValidadeService,
    InsumosService,
    FornecedoresService,
    ImportarNfeService,

    // Repository Port → Adapter bindings
    { provide: LABEL_PRINTER_PORT, useClass: ZplLabelPrinterAdapter },
    { provide: ETIQUETA_LAYOUT_REPOSITORY_PORT, useClass: PrismaEtiquetaLayoutRepository },
    { provide: INSUMO_REPOSITORY_PORT, useClass: PrismaInsumoRepository },
    { provide: FORNECEDOR_REPOSITORY_PORT, useClass: PrismaFornecedorRepository },
    { provide: NOTA_FISCAL_REPOSITORY_PORT, useClass: PrismaNotaFiscalRepository },

    // Contract → Adapter bindings
    { provide: NFE_XML_PARSER_PORT, useClass: FastXmlNfeParserAdapter },
  ],
  exports: [GerarEtiquetasValidadeService, InsumosService, FornecedoresService, ImportarNfeService],
})
export class ControleEstoqueModule {}
