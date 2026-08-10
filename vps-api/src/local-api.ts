import axios from 'axios';
import { config } from './config';
import { MenuData } from './cache';

const localApi = axios.create({
  baseURL: config.localBackendUrl,
  headers: {
    'x-api-key': config.localApiKey,
    'Content-Type': 'application/json',
  },
  timeout: 10_000,
});

export async function fetchMenu(): Promise<MenuData> {
  const response = await localApi.get<MenuData>('/cardapio/menu');
  return response.data;
}

export interface PedidoItem {
  menuItemId: number | string;
  qty: number;
  notes?: string;
}

export interface CreatePedidoBody {
  customerName: string;
  tableNumber: number | string;
  items: PedidoItem[];
}

export interface PedidoResponse {
  token: string;
  customerName: string;
  tableNumber: number | string;
  status: string;
  items: PedidoItem[];
  total: number;
  [key: string]: unknown;
}

export interface AddItemsBody {
  items: PedidoItem[];
}

export interface AddItemsResponse {
  token: string;
  items: PedidoItem[];
  [key: string]: unknown;
}

export async function createPedido(body: CreatePedidoBody): Promise<PedidoResponse> {
  const response = await localApi.post<PedidoResponse>('/cardapio/pedido', body);
  return response.data;
}

export async function getComanda(token: string): Promise<PedidoResponse> {
  const response = await localApi.get<PedidoResponse>(`/cardapio/comanda/${token}`);
  return response.data;
}

export async function addPedidoItems(token: string, body: AddItemsBody): Promise<AddItemsResponse> {
  const response = await localApi.post<AddItemsResponse>(`/cardapio/comanda/${token}/items`, body);
  return response.data;
}
