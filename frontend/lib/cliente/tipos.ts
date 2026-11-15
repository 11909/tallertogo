// Tipos de los datos del cliente, con la misma forma que la base (docs/base-de-datos.md).
// Montos siempre en centavos. Los nombres de campo siguen a las columnas de las vistas.

export type Marca = "OEM" | "GM";
export type EstadoDiagnostico = "enviado" | "pagado" | "en_reparacion" | "listo" | "entregado";
export type EstadoFallaBase = "disponible" | "en_pago" | "pagada" | "no_comprada"; // v_diagnostico_cliente.estado_falla
export type EstadoOrden = "pendiente" | "pagado" | "expirado" | "rechazado";

// Una marca disponible para una falla (una fila de v_diagnostico_cliente)
export type OpcionMarca = { idMarca: number; marca: Marca; nombreComercial: string; precio: number };

export type Falla = {
  idFalla: number;
  idPieza: string;
  pieza: string;
  eje: string; // DELANTERO | TRASERO
  lado: string; // IZQUIERDO | DERECHO | CENTRAL
  manoObra: number;
  opciones: OpcionMarca[]; // OEM y GM
  estado: EstadoFallaBase;
};

export type Diagnostico = {
  folio: number;
  estado: EstadoDiagnostico;
  descripcion: string;
  mecanico: string;
  cerrado: boolean; // el cliente cerró el diagnóstico (columna nueva, paso 9)
  fechaEnvio: string | null;
  fechaReparacion: string | null;
  fechaListo: string | null;
  fechaEntrega: string | null;
  fallas: Falla[];
};

export type AutoCliente = {
  idCarro: number;
  placa: string;
  color: string; // nombre oficial del color de fábrica
  fechaRegistro: string;
  diagnostico: Diagnostico | null; // el último que el cliente puede ver (sin borradores)
};

export type LineaOrden = {
  idFalla: number;
  idPieza: string;
  pieza: string;
  eje: string;
  lado: string;
  idMarca: number;
  marca: Marca;
  precio: number;
  manoObra: number;
};

// Una orden es un QR CoDi. Las órdenes que se generan de nuevo al vencer comparten idPedido.
export type OrdenCliente = {
  idOrden: number;
  idPedido: number;
  folio: number;
  idCarro: number;
  placa: string;
  color: string;
  estado: EstadoOrden;
  monto: number; // total que se muestra (piezas + mano de obra)
  cobro: number; // lo que se cobra por CoDi: $0.01 en el hackatón (orden.monto_cobro_centavos)
  qrString: string | null;
  expiraEn: string;
  creadaEn: string;
  pagadaEn: string | null;
  transactionId: string | null;
  lineas: LineaOrden[];
};

export type Usuario = { nombre: string; iniciales: string };
export type DatosCliente = { usuario: Usuario; autos: AutoCliente[]; ordenes: OrdenCliente[] };
export type LineaCompra = { idFalla: number; idMarca: number };

// De dónde salen los datos: la demo (en memoria) o Supabase. Las pantallas solo usan esta interfaz.
export interface FuenteCliente {
  nombre: "demo" | "supabase";
  cargar(): Promise<DatosCliente | "sin_sesion">;
  crearOrden(folio: number, lineas: LineaCompra[]): Promise<number>; // RPC crear_orden → id_orden
  regenerarQR(idOrden: number): Promise<number>; // RPC regenerar_qr → id_orden nuevo (mismo pedido)
  generarQR?(idOrden: number): Promise<void>; // solicita o recupera el QR de una orden pendiente
  cambiarCierre(folio: number, cerrado: boolean): Promise<void>; // RPC cambiar_cierre_diagnostico
  escuchar(alCambiar: () => void): () => void; // Supabase Realtime (diagnostico y orden)
  salir(): Promise<void>;
  simularPago?(idOrden: number): Promise<void>; // solo la demo; en producción lo hace el webhook de pey
}
