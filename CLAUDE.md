# CLAUDE.md — TallerToGo

Este archivo da contexto a Claude (y al equipo) en cada sesión. **Es la fuente de verdad del proyecto: si algo aquí contradice otro documento, este archivo manda.** Si cambia una decisión, se actualiza aquí primero y se avisa al otro integrante.

Responde siempre en español.

**Etapa actual:** ya empezó el desarrollo del **frontend**. Las pantallas que existen usan datos de ejemplo y **todavía no están conectadas a Supabase ni a pey** (lo que falta está marcado con `TODO` en el código). No propongas ni generes código salvo que te lo pidan explícitamente. El código de ejemplo que aparece en `docs/contexto-proyecto.md` **se ignora**.

### Lo que hay en el repo

- `CLAUDE.md` (este archivo) y `README.md`.
- `docs/`: `catalogo-suspension-corvette-z06.md`, `contexto-proyecto.md` y `base-de-datos.md` (ver sección 2).
- `frontend/`: app en **Next.js 16** (App Router) + TypeScript + Tailwind CSS 4. Para correrla: `cd frontend`, `npm install` y `npm run dev` (abre en http://localhost:3000).
  - `app/page.tsx`: redirige a `/login`.
  - `app/login/page.tsx` (pantalla 1, login): conectada a Supabase Auth; manda al cliente con autos a `/autos`, al cliente sin autos a `/inicio` y al mecánico a `/taller`.
  - `app/registro/page.tsx` (pantalla 2, registro de **Cliente** o **Trabajador**): conectada a Supabase Auth y a `perfil`. Pide nombre, apellidos, correo, teléfono y contraseña; "Trabajador" se guarda como `rol = 'mecanico'`.
  - `app/inicio/page.tsx` (pantalla 3, inicio del cliente): lee el usuario y sus autos de Supabase, busca el modelo con un combo con buscador, registra hasta 20 autos (el formulario solo se abre si el cliente elige "Agregar otro auto") y elimina autos sin diagnóstico. Con al menos un auto, "Terminar registro" lleva a `/autos`. El seguimiento en vivo ya no está aquí: se ve en el diagnóstico de cada auto.
  - `app/(cliente)/` (pantallas del cliente, con pestañas **Mis autos | Carrito | Pagos** y el estado compartido en `components/cliente/EstadoCliente.tsx`):
    - `autos/page.tsx`: grid de autos (imagen, color, modelo, placa con formato de placa y seguimiento en vivo).
    - `autos/[id]/`: diagnóstico de un auto (`id` = `id_carro`). Para ver otro auto se regresa a la grid.
    - `carrito/page.tsx`: carrito agrupado por auto; avisa cuántos QR se generarán antes de confirmar.
    - `pagos/`: pedidos pendientes y pagados, con todos sus QR (también los vencidos) y el ticket.
    - `perfil/page.tsx`: Mi perfil del cliente (se abre desde su nombre en la barra superior); para guardar necesita el **paso 8** de `docs/base-de-datos.md`.
  - `lib/cliente/`: capa de datos del cliente. `tipos.ts` (forma de la base), `formato.ts`, `fuenteSupabase.ts` (consultas reales) y `fuente.ts`, que elige la fuente: con `NEXT_PUBLIC_DATOS_CLIENTE=supabase` en `.env.local` usa Supabase (requiere el **paso 9** de `docs/base-de-datos.md`); si no, usa la demo en memoria de `lib/clienteDemo.ts`.
  - `app/carrito/[id]/`: ruta vieja (un carrito por auto); redirige a `/carrito`. `Carrito.tsx` ya no se usa y se puede borrar.
  - `app/taller/page.tsx` (pantalla 4, autos por atender del mecánico): usa datos de ejemplo; falta leerlos de Supabase y guardar los cambios de etapa.
  - `components/BarraSuperior.tsx`: barra superior común.
  - `components/Aviso.tsx`: mensajes de confirmación y de error que usan todas las pantallas.
  - `components/BuscadorOpciones.tsx`: combo box con buscador (se usa para elegir el modelo del auto).
  - `lib/supabase/`: clientes de Supabase (`cliente.ts` navegador, `servidor.ts` servidor con sesión, `admin.ts` solo servidor con la llave secreta).
  - `components/SeguimientoEnVivo.tsx`: franja de seguimiento por auto (pastillas con las placas); después se conectará a Supabase Realtime.
  - `AGENTS.md`: Next.js 16 trae cambios; antes de escribir código hay que leer las guías en `node_modules/next/dist/docs/`.
- **Faltan:** conectar las pantallas del mecánico con Supabase, correr el paso 9 en Supabase para activar los datos reales del cliente, y la conexión con pey (pedir el QR y el webhook).
- Algunos `TODO` del código nombran tablas en inglés (`profiles`, `vehicles`, `customer_id`). En la base se llaman `perfil`, `carro` e `id_cliente`: usa siempre los nombres de `docs/base-de-datos.md`.

## 1. Qué es

Proyecto para un hackatón que usa la **API de pey en su modalidad CoDi**. Somos 2 integrantes (Miguel Ángel y Rafael) y tenemos un plazo de ~20 h a partir del sáb 14 nov 2026, 13:30. El trabajo se divide **por actor del sistema**:

- **Rafael:** lado del **mecánico**.
- **Miguel Ángel:** lado del **usuario (cliente)**.

TallerToGo es una página web para un taller mecánico especializado **solo en suspensión** de auto **Chevrolet Corvette Z06 2025**. El taller trabaja con **solo dos marcas de refacciones: OEM y GM**. El flujo es así:

1. El mecánico diagnostica el auto y registra cada falla como una **pieza en una posición concreta**, con la mano de obra de esa falla.
2. Envía el diagnóstico al cliente.
3. El cliente ve las fallas, elige cuáles reparar y elige la marca (OEM o GM) de cada pieza.
4. Manda lo elegido al carrito, con la mano de obra incluida, y paga con **CoDi por QR a través de pey**. Puede comprar solo una parte y pagar las fallas restantes después, en otra orden (**compras parciales**).
5. Cuando pey confirma el pago, esa orden queda pagada (es el ticket) y el cliente sigue la reparación **en vivo**.

## 2. Documentos de referencia (`docs/`)

- `docs/catalogo-suspension-corvette-z06.md`: catálogo del **auto de la demo** (Corvette Z06 2025), pieza por pieza y posición por posición. De ahí salen los datos hardcodeados.
- `docs/base-de-datos.md`: **modelo de la base de datos** (E-R, tablas, diccionario de datos, llaves foráneas, mapa de qué dato usa cada pantalla y el SQL para Supabase). Consúltalo antes de conectar cualquier pantalla con la base.
- `docs/contexto-proyecto.md`: antecedente con la idea original. Ya está **superado por este archivo** en tres puntos: marcas, granularidad de las piezas y la sección de código, que se ignora.

## 3. Stack

Next.js (App Router) + TypeScript + Tailwind CSS · Supabase (Postgres, Auth, Realtime, RLS) · Vercel · pey CoDi por QR · Figma para el diseño.

No se agregan otros lenguajes ni frameworks. Se descartó Python/Django para no usar dos lenguajes.

## 4. Reglas de negocio

- **Login con rol:** cada usuario es `cliente` o `mecanico`. Los dos se registran en la pantalla de registro (el botón "Trabajador" corresponde a `mecanico`). Solo los clientes registran autos.
- **Solo Chevrolet 2025.**
- **Hasta 20 autos por cliente.** Cada auto se registra con sus placas (únicas) y uno de los **10 colores de fábrica** del Corvette Z06 2025: Arctic White, Black, Competition Yellow Tintcoat Metallic, Hysteria Purple Metallic, Rapid Blue, Red Mist Metallic Tintcoat, Riptide Blue Metallic, Sea Wolf Gray Tricoat, Sebring Orange Tintcoat y Torch Red. No se pide el número de serie (VIN).
- **Eliminar un auto:** el cliente puede eliminar un auto **solo si el mecánico todavía no empieza su diagnóstico** (ni siquiera un borrador), así que ese auto no tiene órdenes de pago ni tickets. Lo valida la base con la función `eliminar_carro` (ver `docs/base-de-datos.md`).
- **Cada auto tiene su propio diagnóstico, recibo y seguimiento.** Un auto puede estar en reparación mientras otro sigue en diagnóstico.
- **Solo 2 marcas: OEM y GM.** Cada pieza-posición del catálogo existe en las dos marcas, cada una con su nombre y su precio. **No** se etiquetan como "económica" o "premium".
- **Granularidad 1 a 1 (pieza-posición):** cada combinación de pieza y posición del catálogo es un **dato independiente**, con su propio ID. Por ejemplo, `SUS-DEL-05-IZQ` (coilover delantero izquierdo) y `SUS-DEL-05-DER` (coilover delantero derecho) son dos piezas distintas, sin relación entre sí en la lógica de la app. No existe "ambos lados": si fallan los dos coilovers, se registran como dos fallas.
- **Posición:**
  - `eje`: `DELANTERO` o `TRASERO`.
  - `lado`: `IZQUIERDO` (lado del conductor, LH), `DERECHO` (lado del pasajero, RH) o `CENTRAL`.
- **Unicidad:** cada pieza-posición existe **una sola vez** por vehículo. Por eso, la cantidad de cada falla siempre es 1, y en un mismo diagnóstico no se repite la misma pieza-posición.
- **Mano de obra por falla**, no un total único. Solo se cobra si el cliente compra la pieza de esa falla.
- **Turnos del taller:** el mecánico **diagnostica por orden de llegada** (hora de registro del auto, `carro.fecha_registro`) y **repara por orden de pago** (`orden.fecha_pago`). En la lista del mecánico, el turno 1 de diagnóstico lleva el botón amarillo y el turno 1 de reparación la etiqueta "Siguiente".
- **Descripción general:** el mecánico escribe una sola descripción por diagnóstico (`diagnostico.descripcion`), obligatoria para enviarlo. La línea de tiempo guarda la hora de cada etapa (`fecha_envio`, `fecha_reparacion`, `fecha_listo`, `fecha_entrega`).
- **El cliente solo puede comprar las piezas que diagnosticó el mecánico.** No puede agregar piezas por su cuenta.
- **Carrito:** cuando el mecánico envía el diagnóstico, **todas sus fallas entran solas al carrito** con OEM. El cliente cambia la marca de cada pieza u **omite** las que no quiere reparar. El carrito y las omisiones viven solo en el navegador; en la base solo existen las órdenes.
- **Compras parciales:** el cliente puede pagar un diagnóstico en **varias órdenes** (mientras esté en `enviado` o `pagado`), pero **cada falla se compra una sola vez**. Si deja fallas sin comprar, la app muestra un modal de confirmación ("Aún te faltan piezas del diagnóstico por comprar; podrás pagarlas después"). Las piezas que compra después generan **un QR aparte**: un QR nuevo **no cancela** a otro que siga vigente. Con el diagnóstico en `en_reparacion`, las fallas sin comprar quedan como no compradas.
- **Un QR por auto:** cada diagnóstico se paga con sus propias órdenes, así que un carrito con varios autos genera un QR por auto. El carrito lo avisa antes de confirmar.
- **Cerrar / reabrir diagnóstico (cliente):** con el diagnóstico en `enviado` o `pagado`, el cliente puede **cerrarlo**: las piezas que omitió quedan sin comprar y ya no se le ofrecen. Puede **reabrirlo** para comprarlas después (vuelven a su carrito y se pagan en un QR aparte). Se guarda en `diagnostico.cerrado` con la función `cambiar_cierre_diagnostico`; no cambia el estado del diagnóstico ni lo que ve el mecánico.
- **Historial de QR (pedido):** un QR vence a los 10 min. Al generar uno nuevo para las mismas piezas (`regenerar_qr`), la orden nueva guarda en `id_pedido` la orden original. En Pagos se muestran **todos los QR de cada pedido**, también los vencidos. Las líneas de una orden vencida o rechazada no se borran: se marcan `activa = false`.
- El cliente **solo ve diagnósticos enviados** (no los borradores) y solo de sus autos.
- **El servidor calcula el total.** Nunca se confía en precios ni cantidades que vengan del navegador.
- **Solo la confirmación de pey (webhook) marca una orden como pagada**, después de verificar firma, monto y vigencia. Un pago repetido se ignora. **No hay reembolsos:** un pago a un QR cancelado o vencido, tardío o con un monto distinto se marca como `rechazado` (queda registrado, pero no se aplica).
- **Pago solo con CoDi vía pey.** Nada de tarjetas ni payment links.

### Estados

| Entidad | Flujo | Quién lo cambia |
| --- | --- | --- |
| Diagnóstico | borrador → enviado → pagado → en_reparacion → listo → entregado | El mecánico; `pagado` lo pone solo la confirmación de pey (con el primer pago) |
| Orden | pendiente → pagado / expirado / rechazado | Solo el servidor. `expirado` = el QR venció (10 min) o se reemplazó con `regenerar_qr` |

El **seguimiento en vivo** que ve el cliente es el estado del diagnóstico desde `enviado`, actualizado en tiempo real con Supabase Realtime. Se muestra **por auto**: en la franja de seguimiento, el cliente elige con pastillas (las placas) de qué auto ve el avance.

### Fuera de alcance

Fotos del diagnóstico, inventario, facturación, notificaciones por correo o WhatsApp, pantalla para administrar el catálogo (se carga como datos fijos) y otros métodos de pago.

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

- **Acceso:** login, registro de cliente y registro de sus autos (hasta 20 Corvette Z06 2025).
- **Mecánico:**
  - Lista de autos y diagnósticos.
  - Formulario de diagnóstico: una **descripción general de la falla** por diagnóstico; se eligen pieza-posición del catálogo (con buscador y filtros por eje y lado) y se captura la **mano de obra de cada falla**.
  - Cada diagnóstico tiene un **folio** (`DG-00000`) que se asigna al empezar. Las pantallas del mecánico muestran placas, color y folio, **no** los datos del cliente.
  - Botón "Enviar diagnóstico" y botones para avanzar el estado de la reparación.
- **Cliente** (pestañas Mis autos | Carrito | Pagos):
  - **Mis autos:** grid con imagen, color, modelo, placa y seguimiento en vivo de cada auto, y un botón para registrar otro.
  - **Diagnóstico** de un auto: mecánico que lo hizo, seguimiento en vivo, descripción general y cada falla como pestaña colapsable con su ubicación, su mano de obra y los proveedores (OEM y GM) con su precio. Botones "Omitir esta pieza" y "Cerrar / Reabrir diagnóstico".
  - **Carrito** agrupado por auto, con selector OEM/GM por pieza, total de piezas, total de mano de obra y total a pagar. Antes de confirmar avisa cuántos QR se generarán.
- **Pago:** el QR CoDi se genera al confirmar el carrito y se ve en la pestaña Pagos con su cuenta regresiva. Si vence, se genera otro desde ahí.
- **Pagos:** secciones Pendientes y Pagados, con todos los QR de cada pedido (también los vencidos). El ticket (solo órdenes pagadas) lleva cliente, mecánico, auto, piezas por proveedor con su precio, subtotal de piezas, subtotal de mano de obra y total.
- **Seguimiento:** estado de la reparación en vivo, dentro del diagnóstico de cada auto.

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
- Antes de generar código, confirma que te lo pidieron. Para conectar una pantalla con la base, usa `docs/base-de-datos.md`.
- Si una decisión cambia, propón la edición a este `CLAUDE.md` en el mismo cambio.
- Para cualquier pantalla, usa solo los colores y la tipografía de la sección 11.

## 11. Diseño visual

Estilo **minimalista con aire automotriz**: base clara y neutra, con **un solo color de acento** (amarillo Accelerate del Corvette).

### Paleta "Pista"

| Uso | Color |
| --- | --- |
| Fondo de pantalla | `#F5F5F4` |
| Tarjetas (cada falla, carrito) | `#FFFFFF` |
| Bordes y divisiones | `#E2E2E0` |
| Texto secundario (eje, lado, notas) | `#6B6F76` |
| Texto principal | `#111214` |
| Acento | `#F2B705` (amarillo Accelerate) |

- **Un solo botón de acento por pantalla** (por ejemplo "Pagar con CoDi", "Enviar diagnóstico" o "Entrar"), con fondo `#F2B705` y texto `#111214`. Los demás botones van solo con borde.
- La opción elegida en el selector OEM/GM se marca con fondo `#111214` y texto `#F2B705`.
- Estados del seguimiento: verde tenue para "Pagado" y "Listo"; gris para "En reparación" y "Entregado". No compiten con el acento.
- Los errores llevan siempre ícono y texto claro (por ejemplo "No se pudo generar el QR").

### Tipografía: Barlow

Una sola familia, de Google Fonts, cargada con `next/font/google`: **Barlow Condensed** para títulos, precios y botones; **Barlow** para el texto. Opcional: **JetBrains Mono** solo para los ID de pieza.

| Elemento | Letra | Tamaño | Peso |
| --- | --- | --- | --- |
| Título de pantalla | Barlow Condensed | 24 px | 600 |
| Precios y total | Barlow Condensed | 22 px | 600 |
| Botones | Barlow Condensed | 17 px | 600 |
| Nombre de la pieza | Barlow | 16 px | 600 |
| Texto normal | Barlow | 16 px | 400 |
| Texto secundario (eje, lado, notas) | Barlow | 14 px | 400 |
| ID de la pieza (`SUS-DEL-05-IZQ`) | JetBrains Mono | 12 px | 400 |

- Máximo dos pesos por pantalla: 400 y 600.
- En celular, los botones miden al menos 44 px de alto y ningún texto baja de 14 px (salvo el ID de pieza).
