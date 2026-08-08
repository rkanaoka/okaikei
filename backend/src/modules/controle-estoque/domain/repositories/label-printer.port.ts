export const LABEL_PRINTER_PORT = Symbol('LabelPrinterPort');

export interface EtiquetaValidade {
  produto:       string;
  fabricante:    string;
  lote:          string;
  sif:           string;
  dataManip:     string; // DD/MM/AAAA
  dataValidade:  string; // DD/MM/AAAA
  responsavel:   string;
  quantidade:    number; // 1–100
}

export interface LabelPrinterPort {
  /**
   * Envia o ZPL gerado para a impressora de etiquetas.
   * Suporta Elgin L42 Pro Full via USB ou Ethernet (porta 9100).
   */
  print(zpl: string): Promise<void>;

  /** Retorna true se a impressora está acessível no momento. */
  isConnected(): Promise<boolean>;
}
