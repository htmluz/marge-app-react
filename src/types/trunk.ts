export interface Trunk {
  id: number;
  ip: string;
  name: string;
  description?: string | null;
}

export interface TrunksResponse {
  gateways: Trunk[];
} 