export type UserRole = 'ADMIN' | 'OPERADOR' | 'CLIENTE' | 'ADMINISTRATIVO';
export type TruckStatus = 'DISPONIBLE' | 'EN_SERVICIO' | 'MANTENIMIENTO';
export type FosaType = 'SEPTICA' | 'AGUAS_GRISES' | 'INDUSTRIAL';
export type ClientType = 'PERSONA_NATURAL' | 'EMPRESA';
export type ServiceProgress = 'PENDIENTE' | 'EN_CAMINO' | 'OPERANDO' | 'COMPLETADO' | 'FACTURACION_PENDIENTE' | 'FACTURACION_TERMINADA' | 'TERMINADA_CONTABILIZADA' | 'PAGO_REALIZADO_Y_CONTABILIZADO';
export type PaymentMethod = 'EFECTIVO' | 'TRANSFERENCIA' | 'PAGO_ELECTRONICO' | 'FACTURACION';

export interface User {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Truck {
  id: string;
  placa: string;
  capacidad: number;
  cargaActual: number;
  estado: TruckStatus;
  currentLat?: number;
  currentLng?: number;
  currentHeading?: number;
  currentSpeed?: number;
  lastLocationUpdate?: string | Date;
  createdAt: string;
  updatedAt: string;
  serviceOrders?: ServiceOrder[];
}

export interface Client {
  id: string;
  nombre: string;
  telefono: string;
  email: string | null;
  direccion: string;
  latitud: number | null;
  longitud: number | null;
  tipoFosa: FosaType;
  tipoCliente: ClientType;
  rut: string | null;
  observaciones: string | null;
  volumen: number | null;
  precio: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceOrder {
  id: string;
  truckId: string;
  truck?: Truck;
  clientId: string;
  client?: Client;
  volumen: number;
  precio: number;
  comision?: number | null;
  comisionPagada?: boolean;
  telefono: string | null;
  direccion: string | null;
  latitud: number | null;
  longitud: number | null;
  tipoFosa: FosaType | null;
  observaciones: string | null;
  progreso: ServiceProgress;
  pagado: boolean;
  formaPago: PaymentMethod | null;
  referencia: string | null;
  facturaNombre?: string | null;
  facturaSubidaAt?: string | null;
  fechaProgramada: string;
  createdAt: string;
  updatedAt: string;
  logs?: ServiceOrderLog[];
}

export interface ServiceOrderLog {
  id: string;
  serviceOrderId: string;
  previousStatus: ServiceProgress;
  newStatus: ServiceProgress;
  userId: string;
  user?: {
    name: string | null;
    email: string;
  };
  timestamp: string;
  metadata: string | null;
}
