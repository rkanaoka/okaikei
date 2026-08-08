export declare const COMANDA_EVENT_PUBLISHER_PORT: unique symbol;
export interface ComandaEventPublisherPort {
    publishComandaOpened(comanda: any): void;
    publishComandaUpdated(comanda: any): void;
    publishComandaClosed(comanda: any): void;
    publishComandaItemsAdded(data: {
        comanda: any;
        items: any[];
    }): void;
}
