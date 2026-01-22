
export interface Socio {
  codigo: string;
  nombre: string;
  movil: string;
  direccion: string;
  poblacion: string;
  provincia: string;
}

export interface Envase {
  codigo: string;
  nombre: string;
  familia: string;
  caracteristicas: string;
  almacen: string;
  imagen: string;
}

export interface Devolucion {
  timestamp: string;
  socioCodigo: string;
  socioNombre: string;
  envaseCodigo: string;
  envaseNombre: string;
  cantidad: number;
}

export enum AppStatus {
  ABIERTO = 'ABIERTO',
  CERRADO = 'CERRADO'
}

export type ViewState = 'LOGIN' | 'INVENTORY' | 'ADMIN' | 'MAINTENANCE';
