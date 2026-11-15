// Catálogo de suspensión del Chevrolet Corvette Z06 2025 (sin Front Lift): 42 pieza-posición.
// Generado a partir de docs/catalogo-suspension-corvette-z06.md. Cada ID es una pieza independiente.
export type Eje = "DELANTERO" | "TRASERO";
export type Lado = "IZQUIERDO" | "DERECHO" | "CENTRAL";

export type PiezaCatalogo = { id: string; nombre: string; nombreTecnico: string; eje: Eje; lado: Lado; nota: string };

// Precios de referencia en pesos por tipo de pieza (los primeros 10 caracteres del ID, p. ej. "SUS-DEL-05"):
// pieza en OEM y en GM, y la mano de obra sugerida que el mecánico puede cambiar.
// Son los mismos valores del paso 10 de docs/base-de-datos.md: si cambias uno, cambia el otro.
// Se MUESTRAN estos precios, pero por CoDi cada orden cobra COBRO_PRUEBA_CENTAVOS (sección 5 del CLAUDE.md).
type PrecioReferencia = { OEM: number; GM: number; manoDeObra: number };
export const PRECIOS_REFERENCIA: Record<string, PrecioReferencia> = {
  "SUS-DEL-01": { OEM: 9800, GM: 7900, manoDeObra: 1400 },
  "SUS-DEL-02": { OEM: 12500, GM: 9900, manoDeObra: 1600 },
  "SUS-DEL-03": { OEM: 2900, GM: 2200, manoDeObra: 1200 },
  "SUS-DEL-04": { OEM: 14800, GM: 11900, manoDeObra: 2200 },
  "SUS-DEL-05": { OEM: 32500, GM: 26000, manoDeObra: 1800 },
  "SUS-DEL-06": { OEM: 3400, GM: 2700, manoDeObra: 1500 },
  "SUS-DEL-07": { OEM: 8900, GM: 7100, manoDeObra: 1900 },
  "SUS-DEL-08": { OEM: 1250, GM: 950, manoDeObra: 700 },
  "SUS-DEL-09": { OEM: 1850, GM: 1450, manoDeObra: 650 },
  "SUS-DEL-10": { OEM: 4600, GM: 3700, manoDeObra: 600 },
  "SUS-DEL-11": { OEM: 48000, GM: 39000, manoDeObra: 6500 },
  "SUS-TRA-01": { OEM: 9200, GM: 7400, manoDeObra: 1400 },
  "SUS-TRA-02": { OEM: 13200, GM: 10500, manoDeObra: 1700 },
  "SUS-TRA-03": { OEM: 2900, GM: 2200, manoDeObra: 1200 },
  "SUS-TRA-04": { OEM: 3600, GM: 2900, manoDeObra: 900 },
  "SUS-TRA-05": { OEM: 15900, GM: 12700, manoDeObra: 2400 },
  "SUS-TRA-06": { OEM: 32500, GM: 26000, manoDeObra: 1800 },
  "SUS-TRA-07": { OEM: 3400, GM: 2700, manoDeObra: 1500 },
  "SUS-TRA-08": { OEM: 8400, GM: 6700, manoDeObra: 1900 },
  "SUS-TRA-09": { OEM: 1250, GM: 950, manoDeObra: 700 },
  "SUS-TRA-10": { OEM: 1850, GM: 1450, manoDeObra: 650 },
  "SUS-TRA-11": { OEM: 4600, GM: 3700, manoDeObra: 600 },
  "SUS-TRA-12": { OEM: 52000, GM: 42000, manoDeObra: 7200 },
};

export function precioReferencia(idPieza: string): PrecioReferencia {
  return PRECIOS_REFERENCIA[idPieza.slice(0, 10)] ?? { OEM: 0, GM: 0, manoDeObra: 0 };
}

// Lo que de verdad se cobra por CoDi en cada orden: $0.01 (cobro de prueba del hackatón; los pagos no se devuelven).
// En la base lo decide monto_a_cobrar() (paso 10); esta constante solo es para mostrarlo antes de crear la orden.
export const COBRO_PRUEBA_CENTAVOS = 1;

export const CATALOGO: PiezaCatalogo[] = [
  { id: "SUS-DEL-01-IZQ", nombre: "Horquilla superior delantera izquierda", nombreTecnico: "Front Left Upper Control Arm", eje: "DELANTERO", lado: "IZQUIERDO", nota: "Aluminio forjado (incluye bujes y rótula integrada)" },
  { id: "SUS-DEL-01-DER", nombre: "Horquilla superior delantera derecha", nombreTecnico: "Front Right Upper Control Arm", eje: "DELANTERO", lado: "DERECHO", nota: "Aluminio forjado (incluye bujes y rótula integrada)" },
  { id: "SUS-DEL-02-IZQ", nombre: "Horquilla inferior delantera izquierda", nombreTecnico: "Front Left Lower Control Arm", eje: "DELANTERO", lado: "IZQUIERDO", nota: "Aluminio fundido en \"L\"" },
  { id: "SUS-DEL-02-DER", nombre: "Horquilla inferior delantera derecha", nombreTecnico: "Front Right Lower Control Arm", eje: "DELANTERO", lado: "DERECHO", nota: "Aluminio fundido en \"L\"" },
  { id: "SUS-DEL-03-IZQ", nombre: "Rótula inferior delantera izquierda", nombreTecnico: "Front Left Lower Ball Joint", eje: "DELANTERO", lado: "IZQUIERDO", nota: "Componente independiente prensado" },
  { id: "SUS-DEL-03-DER", nombre: "Rótula inferior delantera derecha", nombreTecnico: "Front Right Lower Ball Joint", eje: "DELANTERO", lado: "DERECHO", nota: "Componente independiente prensado" },
  { id: "SUS-DEL-04-IZQ", nombre: "Mango / Portamangueta delantero izquierdo", nombreTecnico: "Front Left Steering Knuckle", eje: "DELANTERO", lado: "IZQUIERDO", nota: "Aluminio; aloja maza/balero de rueda" },
  { id: "SUS-DEL-04-DER", nombre: "Mango / Portamangueta delantero derecho", nombreTecnico: "Front Right Steering Knuckle", eje: "DELANTERO", lado: "DERECHO", nota: "Aluminio; aloja maza/balero de rueda" },
  { id: "SUS-DEL-05-IZQ", nombre: "Coilover delantero izquierdo", nombreTecnico: "Front Left MagneRide Strut Assembly", eje: "DELANTERO", lado: "IZQUIERDO", nota: "Monotubo 46 mm magnético con resorte helicoidal" },
  { id: "SUS-DEL-05-DER", nombre: "Coilover delantero derecho", nombreTecnico: "Front Right MagneRide Strut Assembly", eje: "DELANTERO", lado: "DERECHO", nota: "Monotubo 46 mm magnético con resorte helicoidal" },
  { id: "SUS-DEL-06-IZQ", nombre: "Base superior de amortiguador delantera izquierda", nombreTecnico: "Front Left Upper Shock Mount", eje: "DELANTERO", lado: "IZQUIERDO", nota: "Soporte estructural de torre" },
  { id: "SUS-DEL-06-DER", nombre: "Base superior de amortiguador delantera derecha", nombreTecnico: "Front Right Upper Shock Mount", eje: "DELANTERO", lado: "DERECHO", nota: "Soporte estructural de torre" },
  { id: "SUS-DEL-07-CEN", nombre: "Barra estabilizadora delantera", nombreTecnico: "Front Sway Bar / Stabilizer Bar", eje: "DELANTERO", lado: "CENTRAL", nota: "Barra tubular de acero" },
  { id: "SUS-DEL-08-IZQ", nombre: "Buje y abrazadera estabilizadora delantera izquierda", nombreTecnico: "Front Left Sway Bar Bushing & Bracket", eje: "DELANTERO", lado: "IZQUIERDO", nota: "Fijación izquierda al subchasis delantero" },
  { id: "SUS-DEL-08-DER", nombre: "Buje y abrazadera estabilizadora delantera derecha", nombreTecnico: "Front Right Sway Bar Bushing & Bracket", eje: "DELANTERO", lado: "DERECHO", nota: "Fijación derecha al subchasis delantero" },
  { id: "SUS-DEL-09-IZQ", nombre: "Bieleta estabilizadora delantera izquierda", nombreTecnico: "Front Left Sway Bar End Link", eje: "DELANTERO", lado: "IZQUIERDO", nota: "Conecta extremo izquierdo de barra a suspensión" },
  { id: "SUS-DEL-09-DER", nombre: "Bieleta estabilizadora delantera derecha", nombreTecnico: "Front Right Sway Bar End Link", eje: "DELANTERO", lado: "DERECHO", nota: "Conecta extremo derecho de barra a suspensión" },
  { id: "SUS-DEL-10-IZQ", nombre: "Sensor de altura delantero izquierdo", nombreTecnico: "Front Left Ride Height Sensor", eje: "DELANTERO", lado: "IZQUIERDO", nota: "Sensor de recorrido para sistema MagneRide 4.0" },
  { id: "SUS-DEL-10-DER", nombre: "Sensor de altura delantero derecho", nombreTecnico: "Front Right Ride Height Sensor", eje: "DELANTERO", lado: "DERECHO", nota: "Sensor de recorrido para sistema MagneRide 4.0" },
  { id: "SUS-DEL-11-CEN", nombre: "Subchasis / Puente delantero", nombreTecnico: "Front Suspension Cradle / Crossmember", eje: "DELANTERO", lado: "CENTRAL", nota: "Estructura principal de aluminio fundido" },
  { id: "SUS-TRA-01-IZQ", nombre: "Horquilla superior trasera izquierda", nombreTecnico: "Rear Left Upper Control Arm", eje: "TRASERO", lado: "IZQUIERDO", nota: "Aluminio forjado (incluye bujes y rótula integrada)" },
  { id: "SUS-TRA-01-DER", nombre: "Horquilla superior trasera derecha", nombreTecnico: "Rear Right Upper Control Arm", eje: "TRASERO", lado: "DERECHO", nota: "Aluminio forjado (incluye bujes y rótula integrada)" },
  { id: "SUS-TRA-02-IZQ", nombre: "Horquilla inferior trasera izquierda", nombreTecnico: "Rear Left Lower Control Arm", eje: "TRASERO", lado: "IZQUIERDO", nota: "Aluminio fundido" },
  { id: "SUS-TRA-02-DER", nombre: "Horquilla inferior trasera derecha", nombreTecnico: "Rear Right Lower Control Arm", eje: "TRASERO", lado: "DERECHO", nota: "Aluminio fundido" },
  { id: "SUS-TRA-03-IZQ", nombre: "Rótula inferior trasera izquierda", nombreTecnico: "Rear Left Lower Ball Joint", eje: "TRASERO", lado: "IZQUIERDO", nota: "Componente independiente" },
  { id: "SUS-TRA-03-DER", nombre: "Rótula inferior trasera derecha", nombreTecnico: "Rear Right Lower Ball Joint", eje: "TRASERO", lado: "DERECHO", nota: "Componente independiente" },
  { id: "SUS-TRA-04-IZQ", nombre: "Brazo de control de convergencia trasero izquierdo", nombreTecnico: "Rear Left Toe Link", eje: "TRASERO", lado: "IZQUIERDO", nota: "Barra tensora ajustable para alineación trasera" },
  { id: "SUS-TRA-04-DER", nombre: "Brazo de control de convergencia trasero derecho", nombreTecnico: "Rear Right Toe Link", eje: "TRASERO", lado: "DERECHO", nota: "Barra tensora ajustable para alineación trasera" },
  { id: "SUS-TRA-05-IZQ", nombre: "Mango / Portamangueta trasero izquierdo", nombreTecnico: "Rear Left Knuckle / Upright", eje: "TRASERO", lado: "IZQUIERDO", nota: "Aluminio; soporta maza y paso de flecha homocinética" },
  { id: "SUS-TRA-05-DER", nombre: "Mango / Portamangueta trasero derecho", nombreTecnico: "Rear Right Knuckle / Upright", eje: "TRASERO", lado: "DERECHO", nota: "Aluminio; soporta maza y paso de flecha homocinética" },
  { id: "SUS-TRA-06-IZQ", nombre: "Coilover trasero izquierdo", nombreTecnico: "Rear Left MagneRide Strut Assembly", eje: "TRASERO", lado: "IZQUIERDO", nota: "Monotubo 46 mm magnético con resorte helicoidal" },
  { id: "SUS-TRA-06-DER", nombre: "Coilover trasero derecho", nombreTecnico: "Rear Right MagneRide Strut Assembly", eje: "TRASERO", lado: "DERECHO", nota: "Monotubo 46 mm magnético con resorte helicoidal" },
  { id: "SUS-TRA-07-IZQ", nombre: "Base superior de amortiguador trasera izquierda", nombreTecnico: "Rear Left Upper Shock Mount", eje: "TRASERO", lado: "IZQUIERDO", nota: "Soporte estructural superior" },
  { id: "SUS-TRA-07-DER", nombre: "Base superior de amortiguador trasera derecha", nombreTecnico: "Rear Right Upper Shock Mount", eje: "TRASERO", lado: "DERECHO", nota: "Soporte estructural superior" },
  { id: "SUS-TRA-08-CEN", nombre: "Barra estabilizadora trasera", nombreTecnico: "Rear Sway Bar / Stabilizer Bar", eje: "TRASERO", lado: "CENTRAL", nota: "Barra tubular de acero" },
  { id: "SUS-TRA-09-IZQ", nombre: "Buje y abrazadera estabilizadora trasera izquierda", nombreTecnico: "Rear Left Sway Bar Bushing & Bracket", eje: "TRASERO", lado: "IZQUIERDO", nota: "Fijación izquierda al subchasis trasero" },
  { id: "SUS-TRA-09-DER", nombre: "Buje y abrazadera estabilizadora trasera derecha", nombreTecnico: "Rear Right Sway Bar Bushing & Bracket", eje: "TRASERO", lado: "DERECHO", nota: "Fijación derecha al subchasis trasero" },
  { id: "SUS-TRA-10-IZQ", nombre: "Bieleta estabilizadora trasera izquierda", nombreTecnico: "Rear Left Sway Bar End Link", eje: "TRASERO", lado: "IZQUIERDO", nota: "Conecta extremo izquierdo de barra a horquilla" },
  { id: "SUS-TRA-10-DER", nombre: "Bieleta estabilizadora trasera derecha", nombreTecnico: "Rear Right Sway Bar End Link", eje: "TRASERO", lado: "DERECHO", nota: "Conecta extremo derecho de barra a horquilla" },
  { id: "SUS-TRA-11-IZQ", nombre: "Sensor de altura trasero izquierdo", nombreTecnico: "Rear Left Ride Height Sensor", eje: "TRASERO", lado: "IZQUIERDO", nota: "Sensor de recorrido para sistema MagneRide 4.0" },
  { id: "SUS-TRA-11-DER", nombre: "Sensor de altura trasero derecho", nombreTecnico: "Rear Right Ride Height Sensor", eje: "TRASERO", lado: "DERECHO", nota: "Sensor de recorrido para sistema MagneRide 4.0" },
  { id: "SUS-TRA-12-CEN", nombre: "Subchasis / Puente trasero", nombreTecnico: "Rear Suspension Cradle / Crossmember", eje: "TRASERO", lado: "CENTRAL", nota: "Estructura principal de aluminio (soporta suspensión y tren motriz LT6)" },
];
