# Contexto Técnico y Reglas de Negocio: Sistema de Suspensión

## Vehículo: Chevrolet Corvette Z06 (Generación C8 / Año-Modelo 2025)

Este documento define la estructura, catálogo desglosado por instancia individual y restricciones de unicidad del sistema de suspensión para el **Chevrolet Corvette Z06 2025**, diseñado para ser utilizado como fuente de verdad en el modelado y validación 1 a 1 de la base de datos.

## 1. Arquitectura General del Sistema

* **Tipo de suspensión (Delantera y Trasera):** Independiente de doble horquilla (Short/Long Arm - SLA).
* **Amortiguación:** Coilover monotubo de 46 mm con sistema adaptativo *Magnetic Selective Ride Control 4.0* (MagneRide).
* **Total de instancias de piezas por vehículo:** `42` piezas base (`44` si cuenta con el paquete opcional de elevación frontal *Front Lift*).

## 2. Reglas de Restricción para la Base de Datos (Constraints)

1. **Unicidad por Vehículo (`UNIQUE(vin, id_catalogo)`):** Cada registro del catálogo maestro representa exactamente **1 instancia física** (`cantidad_maxima = 1` por cada `id_catalogo` dentro de un mismo vehículo). No pueden existir dos piezas con el mismo `id_catalogo` asignadas al mismo `VIN`.
2. **Normalización de Posición (`eje` y `lado`):**
   * `eje`: Enumeración estricta `['DELANTERO', 'TRASERO']`.
   * `lado`: Enumeración estricta `['IZQUIERDO', 'DERECHO', 'CENTRAL']`.
   * Convención automotriz estándar: `IZQUIERDO` corresponde al lado del conductor (LH) y `DERECHO` al lado del pasajero (RH).
3. **Componentes Opcionales Condicionales:** Las instancias `SUS-DEL-12-IZQ` y `SUS-DEL-12-DER` (*Front Lift*) solo pueden instanciarse en el vehículo si `has_front_lift = TRUE` (ambas deben existir en par, nunca una sola).

## 3. Catálogo Maestro de Instancias Individuales (1 a 1)

### A. Eje Delantero (`DELANTERO`) — Total: 20 instancias base (+2 opcionales)

| ID Catálogo | Nombre de la Instancia | Nombre Técnico (Inglés / OEM) | Eje | Lado | Cant. Máx. | Notas Técnicas / Material |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| `SUS-DEL-01-IZQ` | Horquilla superior delantera izquierda | Front Left Upper Control Arm | `DELANTERO` | `IZQUIERDO` | 1 | Aluminio forjado (incluye bujes y rótula integrada) |
| `SUS-DEL-01-DER` | Horquilla superior delantera derecha | Front Right Upper Control Arm | `DELANTERO` | `DERECHO` | 1 | Aluminio forjado (incluye bujes y rótula integrada) |
| `SUS-DEL-02-IZQ` | Horquilla inferior delantera izquierda | Front Left Lower Control Arm | `DELANTERO` | `IZQUIERDO` | 1 | Aluminio fundido en "L" |
| `SUS-DEL-02-DER` | Horquilla inferior delantera derecha | Front Right Lower Control Arm | `DELANTERO` | `DERECHO` | 1 | Aluminio fundido en "L" |
| `SUS-DEL-03-IZQ` | Rótula inferior delantera izquierda | Front Left Lower Ball Joint | `DELANTERO` | `IZQUIERDO` | 1 | Componente independiente prensado |
| `SUS-DEL-03-DER` | Rótula inferior delantera derecha | Front Right Lower Ball Joint | `DELANTERO` | `DERECHO` | 1 | Componente independiente prensado |
| `SUS-DEL-04-IZQ` | Mango / Portamangueta delantero izquierdo | Front Left Steering Knuckle | `DELANTERO` | `IZQUIERDO` | 1 | Aluminio; aloja maza/balero de rueda |
| `SUS-DEL-04-DER` | Mango / Portamangueta delantero derecho | Front Right Steering Knuckle | `DELANTERO` | `DERECHO` | 1 | Aluminio; aloja maza/balero de rueda |
| `SUS-DEL-05-IZQ` | Coilover delantero izquierdo | Front Left MagneRide Strut Assembly | `DELANTERO` | `IZQUIERDO` | 1 | Monotubo 46 mm magnético con resorte helicoidal |
| `SUS-DEL-05-DER` | Coilover delantero derecho | Front Right MagneRide Strut Assembly | `DELANTERO` | `DERECHO` | 1 | Monotubo 46 mm magnético con resorte helicoidal |
| `SUS-DEL-06-IZQ` | Base superior de amortiguador delantera izquierda | Front Left Upper Shock Mount | `DELANTERO` | `IZQUIERDO` | 1 | Soporte estructural de torre |
| `SUS-DEL-06-DER` | Base superior de amortiguador delantera derecha | Front Right Upper Shock Mount | `DELANTERO` | `DERECHO` | 1 | Soporte estructural de torre |
| `SUS-DEL-07-CEN` | Barra estabilizadora delantera | Front Sway Bar / Stabilizer Bar | `DELANTERO` | `CENTRAL` | 1 | Barra tubular de acero |
| `SUS-DEL-08-IZQ` | Buje y abrazadera estabilizadora delantera izquierda | Front Left Sway Bar Bushing & Bracket | `DELANTERO` | `IZQUIERDO` | 1 | Fijación izquierda al subchasis delantero |
| `SUS-DEL-08-DER` | Buje y abrazadera estabilizadora delantera derecha | Front Right Sway Bar Bushing & Bracket | `DELANTERO` | `DERECHO` | 1 | Fijación derecha al subchasis delantero |
| `SUS-DEL-09-IZQ` | Bieleta estabilizadora delantera izquierda | Front Left Sway Bar End Link | `DELANTERO` | `IZQUIERDO` | 1 | Conecta extremo izquierdo de barra a suspensión |
| `SUS-DEL-09-DER` | Bieleta estabilizadora delantera derecha | Front Right Sway Bar End Link | `DELANTERO` | `DERECHO` | 1 | Conecta extremo derecho de barra a suspensión |
| `SUS-DEL-10-IZQ` | Sensor de altura delantero izquierdo | Front Left Ride Height Sensor | `DELANTERO` | `IZQUIERDO` | 1 | Sensor de recorrido para sistema MagneRide 4.0 |
| `SUS-DEL-10-DER` | Sensor de altura delantero derecho | Front Right Ride Height Sensor | `DELANTERO` | `DERECHO` | 1 | Sensor de recorrido para sistema MagneRide 4.0 |
| `SUS-DEL-11-CEN` | Subchasis / Puente delantero | Front Suspension Cradle / Crossmember | `DELANTERO` | `CENTRAL` | 1 | Estructura principal de aluminio fundido |
| `SUS-DEL-12-IZQ` | *(Opcional)* Actuador Front Lift izquierdo | Front Left Lift Hydraulic Actuator | `DELANTERO` | `IZQUIERDO` | 1 | Condicional: solo si `has_front_lift = TRUE` |
| `SUS-DEL-12-DER` | *(Opcional)* Actuador Front Lift derecho | Front Right Lift Hydraulic Actuator | `DELANTERO` | `DERECHO` | 1 | Condicional: solo si `has_front_lift = TRUE` |

### B. Eje Trasero (`TRASERO`) — Total: 22 instancias base

| ID Catálogo | Nombre de la Instancia | Nombre Técnico (Inglés / OEM) | Eje | Lado | Cant. Máx. | Notas Técnicas / Material |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| `SUS-TRA-01-IZQ` | Horquilla superior trasera izquierda | Rear Left Upper Control Arm | `TRASERO` | `IZQUIERDO` | 1 | Aluminio forjado (incluye bujes y rótula integrada) |
| `SUS-TRA-01-DER` | Horquilla superior trasera derecha | Rear Right Upper Control Arm | `TRASERO` | `DERECHO` | 1 | Aluminio forjado (incluye bujes y rótula integrada) |
| `SUS-TRA-02-IZQ` | Horquilla inferior trasera izquierda | Rear Left Lower Control Arm | `TRASERO` | `IZQUIERDO` | 1 | Aluminio fundido |
| `SUS-TRA-02-DER` | Horquilla inferior trasera derecha | Rear Right Lower Control Arm | `TRASERO` | `DERECHO` | 1 | Aluminio fundido |
| `SUS-TRA-03-IZQ` | Rótula inferior trasera izquierda | Rear Left Lower Ball Joint | `TRASERO` | `IZQUIERDO` | 1 | Componente independiente |
| `SUS-TRA-03-DER` | Rótula inferior trasera derecha | Rear Right Lower Ball Joint | `TRASERO` | `DERECHO` | 1 | Componente independiente |
| `SUS-TRA-04-IZQ` | Brazo de control de convergencia trasero izquierdo | Rear Left Toe Link | `TRASERO` | `IZQUIERDO` | 1 | Barra tensora ajustable para alineación trasera |
| `SUS-TRA-04-DER` | Brazo de control de convergencia trasero derecho | Rear Right Toe Link | `TRASERO` | `DERECHO` | 1 | Barra tensora ajustable para alineación trasera |
| `SUS-TRA-05-IZQ` | Mango / Portamangueta trasero izquierdo | Rear Left Knuckle / Upright | `TRASERO` | `IZQUIERDO` | 1 | Aluminio; soporta maza y paso de flecha homocinética |
| `SUS-TRA-05-DER` | Mango / Portamangueta trasero derecho | Rear Right Knuckle / Upright | `TRASERO` | `DERECHO` | 1 | Aluminio; soporta maza y paso de flecha homocinética |
| `SUS-TRA-06-IZQ` | Coilover trasero izquierdo | Rear Left MagneRide Strut Assembly | `TRASERO` | `IZQUIERDO` | 1 | Monotubo 46 mm magnético con resorte helicoidal |
| `SUS-TRA-06-DER` | Coilover trasero derecho | Rear Right MagneRide Strut Assembly | `TRASERO` | `DERECHO` | 1 | Monotubo 46 mm magnético con resorte helicoidal |
| `SUS-TRA-07-IZQ` | Base superior de amortiguador trasera izquierda | Rear Left Upper Shock Mount | `TRASERO` | `IZQUIERDO` | 1 | Soporte estructural superior |
| `SUS-TRA-07-DER` | Base superior de amortiguador trasera derecha | Rear Right Upper Shock Mount | `TRASERO` | `DERECHO` | 1 | Soporte estructural superior |
| `SUS-TRA-08-CEN` | Barra estabilizadora trasera | Rear Sway Bar / Stabilizer Bar | `TRASERO` | `CENTRAL` | 1 | Barra tubular de acero |
| `SUS-TRA-09-IZQ` | Buje y abrazadera estabilizadora trasera izquierda | Rear Left Sway Bar Bushing & Bracket | `TRASERO` | `IZQUIERDO` | 1 | Fijación izquierda al subchasis trasero |
| `SUS-TRA-09-DER` | Buje y abrazadera estabilizadora trasera derecha | Rear Right Sway Bar Bushing & Bracket | `TRASERO` | `DERECHO` | 1 | Fijación derecha al subchasis trasero |
| `SUS-TRA-10-IZQ` | Bieleta estabilizadora trasera izquierda | Rear Left Sway Bar End Link | `TRASERO` | `IZQUIERDO` | 1 | Conecta extremo izquierdo de barra a horquilla |
| `SUS-TRA-10-DER` | Bieleta estabilizadora trasera derecha | Rear Right Sway Bar End Link | `TRASERO` | `DERECHO` | 1 | Conecta extremo derecho de barra a horquilla |
| `SUS-TRA-11-IZQ` | Sensor de altura trasero izquierdo | Rear Left Ride Height Sensor | `TRASERO` | `IZQUIERDO` | 1 | Sensor de recorrido para sistema MagneRide 4.0 |
| `SUS-TRA-11-DER` | Sensor de altura trasero derecho | Rear Right Ride Height Sensor | `TRASERO` | `DERECHO` | 1 | Sensor de recorrido para sistema MagneRide 4.0 |
| `SUS-TRA-12-CEN` | Subchasis / Puente trasero | Rear Suspension Cradle / Crossmember | `TRASERO` | `CENTRAL` | 1 | Estructura principal de aluminio (soporta suspensión y tren motriz LT6) |

## 4. Resumen de Validación (Checksums para Lógica de Aplicación)

```json
{
  "modelo": "Chevrolet Corvette Z06",
  "anio": 2025,
  "generacion": "C8",
  "sistema": "Suspension",
  "granularidad": "instancia_individual_por_posicion",
  "conteo_instancias": {
    "eje_delantero_base": 20,
    "eje_delantero_con_front_lift": 22,
    "eje_trasero_base": 22,
    "total_vehiculo_base": 42,
    "total_vehiculo_maximo": 44
  },
  "distribucion_por_lado_base": {
    "IZQUIERDO": 19,
    "DERECHO": 19,
    "CENTRAL": 4
  },
  "marcas_aftermarket_referencia": [
    "OEM GM",
    "MOOG",
    "SYD"
  ]
}
```