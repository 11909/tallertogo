// Catálogo de suspensión del Chevrolet Corvette Z06 2025 (sin Front Lift): 42 pieza-posición.
// Generado a partir de docs/catalogo-suspension-corvette-z06.md. Cada ID es una pieza independiente.
export type Eje = "DELANTERO" | "TRASERO";
export type Lado = "IZQUIERDO" | "DERECHO" | "CENTRAL";

export type PiezaCatalogo = { id: string; nombre: string; nombreTecnico: string; eje: Eje; lado: Lado; nota: string };

// Precios de la demo en pesos (sección 5 del CLAUDE.md)
export const PRECIO_DEMO = { OEM: 0.02, GM: 0.01, manoDeObra: 0.01 };

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
