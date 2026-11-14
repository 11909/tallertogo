# CLAUDE.md — TallerToGo

Este archivo da contexto a Claude (y al equipo) en cada sesión. **Es la fuente de verdad del proyecto: si algo aquí contradice otro documento, este archivo manda.** Si cambia una decisión, se actualiza aquí primero y se avisa al otro integrante.

Responde siempre en español.

**Etapa actual:** estamos **delimitando el proyecto**. Todavía no hay código. No propongas ni generes código salvo que te lo pidan explícitamente. El código de ejemplo que aparece en `docs/contexto-proyecto.md` **se ignora**.

## 1. Qué es

Proyecto para un hackatón que usa la **API de pey en su modalidad CoDi**. Somos 2 integrantes (Miguel Ángel y Rafael) y tenemos un plazo de ~20 h a partir del sáb 14 nov 2026, 13:30. El reparto de tareas lo acordamos entre nosotros y no se define aquí.

TallerToGo es una página web para un taller mecánico especializado **solo en suspensión** de autos **Chevrolet 2025**. El taller trabaja con **solo dos marcas de refacciones: OEM y GM**. El flujo es así:

1. El mecánico diagnostica el auto y registra cada falla como una **pieza en una posición concreta**, con la mano de obra de esa falla.
2. Envía el diagnóstico al cliente.
3. El cliente ve las fallas, elige cuáles reparar y elige la marca (OEM o GM) de cada pieza.
4. Manda todo al carrito, con la mano de obra incluida, y paga con **CoDi por QR a través de pey**.
5. Cuando pey confirma el pago, la orden queda pagada y el cliente sigue la reparación **en vivo**.

## 2. Documentos de referencia (`docs/`)

- `docs/catalogo-suspension-corvette-z06.md`: catálogo del **auto de la demo** (Corvette Z06 2025), pieza por pieza y posición por posición. De ahí salen los datos hardcodeados.
- `docs/contexto-proyecto.md`: antecedente con la idea original. Ya está **superado por este archivo** en tres puntos: marcas, granularidad de las piezas y la sección de código, que se ignora.

## 3. Stack

Next.js (App Router) + TypeScript + Tailwind CSS · Supabase (Postgres, Auth, Realtime, RLS) · Vercel · pey CoDi por QR · Figma para el diseño.

No se agregan otros lenguajes ni frameworks. Se descartó Python/Django para no usar dos lenguajes.

## 4. Reglas de negocio

- **Login con rol:** cada usuario es `cliente` o `mecanico`. Solo hay una cuenta de mecánico, creada a mano.
- **Solo Chevrolet 2025.**
- **Solo 2 marcas: OEM y GM.** Cada pieza-posición del catálogo existe en las dos marcas, cada una con su nombre y su precio. **No** se etiquetan como "económica" o "premium".
- **Granularidad 1 a 1 (pieza-posición):** cada combinación de pieza y posición del catálogo es un **dato independiente**, con su propio ID. Por ejemplo, `SUS-DEL-05-IZQ` (coilover delantero izquierdo) y `SUS-DEL-05-DER` (coilover delantero derecho) son dos piezas distintas, sin relación entre sí en la lógica de la app. No existe "ambos lados": si fallan los dos coilovers, se registran como dos fallas.
- **Posición:**
  - `eje`: `DELANTERO` o `TRASERO`.
  - `lado`: `IZQUIERDO` (lado del conductor, LH), `DERECHO` (lado del pasajero, RH) o `CENTRAL`.
- **Unicidad:** cada pieza-posición existe **una sola vez** por vehículo. Por eso, la cantidad de cada falla siempre es 1, y en un mismo diagnóstico no se repite la misma pieza-posición.
- **Mano de obra por falla**, no un total único. Solo se cobra si el cliente compra la pieza de esa falla.
- **El cliente solo puede comprar las piezas que diagnosticó el mecánico.** No puede agregar piezas por su cuenta.
- El cliente **solo ve diagnósticos enviados** (no los borradores) y solo de sus autos.
- **El servidor calcula el total.** Nunca se confía en precios ni cantidades que vengan del navegador.
- **Solo la confirmación de pey (webhook) marca una orden como pagada**, después de verificar firma, monto y vigencia. Un pago repetido se ignora. Un pago tardío o con un monto distinto se marca para reembolso.
- **Pago solo con CoDi vía pey.** Nada de tarjetas ni payment links.

### Estados

| Entidad | Flujo | Quién lo cambia |
| --- | --- | --- |
| Diagnóstico | borrador → enviado → pagado → en_reparacion → listo → entregado | El mecánico; `pagado` lo pone solo la confirmación de pey |
| Orden | pendiente → pagado / expirado / reembolso | Solo el servidor |

El **seguimiento en vivo** que ve el cliente es el estado del diagnóstico desde `enviado`, actualizado en tiempo real con Supabase Realtime.

### Fuera de alcance

Fotos del diagnóstico, inventario, facturación, notificaciones por correo o WhatsApp, pantalla de registro de mecánicos, pantalla para administrar el catálogo (se carga como datos fijos) y otros métodos de pago.

## 5. Datos de la demo (hardcodeados)

- **Vehículo:** Chevrolet **Corvette Z06 2025** (C8), **sin** el paquete opcional Front Lift. Por eso, las piezas `SUS-DEL-12-IZQ` y `SUS-DEL-12-DER` no se cargan.
- **Catálogo:** las **42 pieza-posición base** de `docs/catalogo-suspension-corvette-z06.md`: 20 del eje delantero y 22 del trasero, que se reparten en 19 IZQUIERDO, 19 DERECHO y 4 CENTRAL. Se usan los mismos ID, nombres en español, eje y lado del documento.
- **Marcas:** cada una de las 42 pieza-posición existe en OEM y en GM, así que el catálogo de precios tiene 84 registros.
- **Precios en centavos**, para poder probar en producción: pieza OEM = $0.02, pieza GM = $0.01, mano de obra = $0.01 por falla.

## 6. API de pey (CoDi): condiciones del hackatón

**Condiciones de los organizadores:**

- La alta propia ante Banxico tarda aprox. **5 días**. Para probar hoy se usan las **CLABEs preautorizadas** que entregaron los organizadores.
  - Esas CLABEs **no se suben al repo**: el repo es público. Se consultan en la hoja del hackatón.
- Hay que **dar de alta las CLABEs en el portal de pey** (`portal.pey.mx` y `portal.mipey.mx` son el mismo portal) y empezar a usar la API el mismo día.
- Las transacciones de prueba son de **$0.01**. **Los pagos de prueba no se devuelven.**
- Cada equipo registra sus propias cuentas CLABE para publicar el proyecto cuando estén activas.
- Documentación: https://docs.pey.mx

**Lo que dice la documentación (revisada el 14 nov):**

- Autenticación: `Authorization: Bearer <API key>`. La API key se crea en el portal, en la sección Desarrollador. **No hay sandbox:** se prueba en producción con montos chicos.
- **Crear QR:** `POST https://api.pey.mx/codi/qr`. Campos del request:
  - `amount` (MXN, obligatorio).
  - `concept`.
  - `expiration`: en **segundos**, mínimo 360.
  - `numRef`: **texto** de solo dígitos, máximo 7.
  - `generateImage: true`, para que la respuesta incluya la imagen.
  - `bankAccountId` (opcional): la cuenta CoDi que recibe el pago.
  - `metadata` (opcional).
- **Respuesta 201** del QR: `id` (el identificador del QR que asigna Banxico), `qrString` y `qrImage` (PNG en base64, o `null`).
- **Webhook** `codi.qr.payment_received`, con estos campos:
  - `amount` (number)
  - `codiQrId` (string)
  - `numRef` (string)
  - `transactionId`
  - `datePaid` (number, Unix en segundos)
  - `concept`, `apiKeyId`, `bankAccountId`, `metadata`
- La firma del webhook usa **Standard Webhooks** (headers `webhook-id`, `webhook-timestamp` y `webhook-signature`) y se verifica con el cuerpo crudo. Solo se permite **un webhook por API key**. El secreto se muestra al crear el webhook en el portal.
- Las llaves y secretos van en variables de entorno, **nunca en el repo**.

## 7. Entregables del hackatón

- [ ] Descripción del proyecto
- [ ] Repositorio de código **público** (obligatorio)
- [ ] Link de la app en vivo (preferido)
- [ ] Video demo (opcional)
- [ ] Correos de los integrantes del equipo

Los ganadores se anuncian por correo.

## 8. Alcance funcional (pantallas)

- **Acceso:** login, registro de cliente y registro de su auto (Corvette Z06 2025).
- **Mecánico:**
  - Lista de autos y diagnósticos.
  - Formulario de fallas: se elige una pieza-posición del catálogo y se captura la descripción de la falla y la mano de obra.
  - Botón "Enviar diagnóstico" y botones para avanzar el estado de la reparación.
- **Cliente:**
  - Diagnóstico con las fallas y la ubicación de cada pieza.
  - Selector OEM/GM por pieza y carrito con el total (piezas + mano de obra).
- **Pago:** pantalla con el QR CoDi, que espera la confirmación del pago.
- **Seguimiento:** estado de la reparación en vivo.

## 9. Flujo de Git

- `main` siempre debe funcionar. Trabajen en ramas `feat/<nombre>-<tarea>`.
- Hagan `git pull --rebase origin main` antes de empezar y antes de hacer push. Prefieran commits pequeños y merges frecuentes.
- Mensajes de commit en español: `feat: ...`, `fix: ...`, `docs: ...`, `chore: ...`.
- La carpeta de arriba (`Taller-Mecanico/`) también es un repo de Git vacío. Trabajen siempre **dentro de `TallerToGo/`**.

## 10. Instrucciones para Claude

- Respeta las reglas de negocio (sección 4) y los datos de la demo (sección 5). No reintroduzcas lo que está fuera de alcance.
- Trata cada pieza-posición como un dato independiente. Nunca agrupes izquierda y derecha en un solo registro.
- Para pey, usa solo lo que está en la sección 6 o en docs.pey.mx. No inventes campos.
- No escribas CLABEs, API keys ni secretos en ningún archivo del repo.
- Estamos en la etapa de delimitación: antes de generar código, confirma que te lo pidieron.
- Si una decisión cambia, propón la edición a este `CLAUDE.md` en el mismo cambio.
