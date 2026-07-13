export declare const TEMPLATE_TYPES: readonly ["kitchen", "bar", "receipt", "fiscal"];
export type TemplateType = typeof TEMPLATE_TYPES[number];
export declare const TEMPLATE_LABELS: Record<TemplateType, string>;
export declare const DEFAULT_ENABLED: Record<TemplateType, boolean>;
export declare const DEFAULT_CONFIGS: Record<TemplateType, Record<string, any>>;
export declare function isTemplateType(v: string): v is TemplateType;
