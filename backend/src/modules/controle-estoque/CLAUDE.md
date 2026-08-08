# CLAUDE.md — modules/controle-estoque/

## Responsabilidade
Bounded Context de Controle de Estoque. Atualmente expõe o caso de uso de
impressão de etiquetas de validade via impressora térmica ZPL (Elgin L42 Pro Full).

## Estrutura
```
domain/repositories/
  label-printer.port.ts          # Port: contrato LabelPrinterPort + tipo EtiquetaValidade
application/use-cases/
  gerar-etiquetas-validade.service.ts  # Use case: valida, gera ZPL, aciona impressora
infrastructure/printers/
  zpl-label-printer.adapter.ts   # Adapter: USB (/dev/usb/lp0) ou Ethernet TCP:9100
controle-estoque.module.ts
```

## Impressora
- **Modelo**: Elgin L42 Pro Full
- **Linguagem**: ZPL II
- **Etiqueta**: BOPP branco 60×30 mm (480×240 dots a 203 DPI)
- **Conexões suportadas**: USB (device file) ou Ethernet (TCP porta 9100)

## Variáveis de ambiente
| Variável                   | Padrão          | Descrição                    |
|----------------------------|-----------------|------------------------------|
| LABEL_PRINTER_TYPE         | ethernet        | `usb` ou `ethernet`          |
| LABEL_PRINTER_HOST         | 192.168.1.100   | IP da impressora (ethernet)  |
| LABEL_PRINTER_PORT         | 9100            | Porta TCP (ethernet)         |
| LABEL_PRINTER_USB_PATH     | /dev/usb/lp0    | Device file (USB)            |
| LABEL_PRINTER_TIMEOUT_MS   | 5000            | Timeout de conexão TCP       |

## Endpoint
`POST /estoque/etiquetas/print` — imprime etiquetas de validade
`GET  /estoque/etiquetas/status` — verifica se a impressora está online
