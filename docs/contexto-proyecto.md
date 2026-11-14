# Taller de suspensión Chevrolet 2025

Contexto del proyecto para el equipo y para cualquier sesión de Claude que trabaje en él. Estado al 14 de noviembre de 2026. Proyecto de hackathon con la API de pagos pey (CoDi); la entrega es en un día.

[Resumen](#resumen)[Diagrama](#diagrama)[Reglas de negocio](#reglas)[Stack y equipo](#stack)[Modelo de datos](#datos)[Pagos con pey](#pagos)[Decisiones](#decisiones)[Recortes](#recortes)[Pendientes](#pendientes)[Código actual](#codigo)[Para Claude](#claude)

## Resumen

Página web para un taller mecánico especializado **solo en suspensión** de autos **Chevrolet modelo 2025**. El taller trabaja con **solo dos marcas de refacciones**.

1. El mecánico diagnostica el auto y registra cada falla: qué pieza se quita, **dónde está** (eje delantero/trasero y lado izquierdo/derecho/ambos), **cuántas piezas faltan** y la **mano de obra de esa falla**.
2. Al terminar, envía el diagnóstico al cliente.
3. El cliente ve las fallas y los componentes a cambiar, elige una de las dos marcas por pieza y solo puede agregar las piezas que faltan (con tope en la cantidad diagnosticada).
4. Envía todo al carrito, mano de obra incluida, y paga con **CoDi a través de la API de pey**.
5. Cuando pey confirma el pago, la orden queda pagada y el cliente sigue la reparación **en vivo**.

## Diagrama de flujo

## Reglas de negocio

- **Login con rol:** cada usuario es `cliente` o `mecanico` (Supabase Auth + tabla `profiles`).
- **Solo Chevrolet 2025:** `vehicles.year` tiene un check `= 2025`. Las piezas guardan en `models` los modelos compatibles.
- **Solo dos marcas:** tabla `brands` con 2 filas. Cada tipo de pieza existe una vez por marca (`unique (part_type, brand_id)`). Las marcas del seed (Monroe y KYB) son de ejemplo; el equipo pondrá las reales.
- **Cada falla guarda su ubicación:** `axle` (delantero / trasero) y `side` (izquierdo / derecho / ambos). Si es "ambos", `qty_required` debe ser 2 o más.
- **Mano de obra por falla, no un total único:** `diagnosis_items.labor_cost`. Solo se cobra si el cliente compra la pieza de esa falla.
- **Tope de piezas:** el cliente no puede comprar más piezas de las que indicó el mecánico (`qty ≤ qty_required`). Se valida en el servidor.
- **El cliente solo ve diagnósticos enviados** (no los borradores) y solo de sus autos (RLS).
- **El servidor recalcula el total.** Nunca se confía en precios ni cantidades del navegador.
- **Solo el webhook marca una orden como pagada,** después de verificar firma, monto y tiempo. Un pago repetido se ignora y un pago tardío o con monto distinto se marca para reembolso.
- **Pago solo con CoDi vía pey.** Sin tarjetas ni otros métodos.

### Estados

| Tabla | Estados | Quién los cambia |
| --- | --- | --- |
| `diagnoses.status` | borrador → enviado → pagado → en_reparacion → listo → entregado | Mecánico (borrador, enviado y del pagado en adelante); el webhook pone `pagado` |
| `orders.status` | pendiente → pagado / expirado / reembolso | Servidor (checkout y webhook) |

El **seguimiento en vivo** que ve el cliente es `diagnoses.status` desde `enviado`, escuchado con Supabase Realtime (hook `useSeguimiento`).

## Stack y equipo

| Capa | Herramienta |
| --- | --- |
| Frontend y backend | Next.js (App Router) + TypeScript; endpoints en `app/api/*/route.ts` |
| Estilos | Tailwind CSS |
| Diseño | Figma (o Stitch) |
| Base de datos, login y tiempo real | Supabase (Postgres, Auth, Realtime, RLS) |
| Hosting | Vercel |
| Pagos | API de pey, CoDi por QR |

Se descartó Python/Django para no usar dos lenguajes en un día.

| Persona | Experiencia | Tarea sugerida |
| --- | --- | --- |
| Maik | React, TypeScript, Supabase, bots | Supabase, endpoints de pey, despliegue |
| Miguel Ángel | Next.js + Vercel (ya hizo una tienda con carrito y dashboard), Python, algo de TS, Figma | Vista del cliente: diagnóstico, selector de marca, carrito |
| Rafael | HTML, CSS, JavaScript, Java, Figma, diseño de pantallas | Diseño en Figma y panel del mecánico |

## Modelo de datos (Supabase)

| Tabla | Para qué | Campos clave |
| --- | --- | --- |
| `profiles` | Rol del usuario | id (= auth.users), full_name, role |
| `vehicles` | Autos del cliente | customer_id, model, year = 2025, plate |
| `brands` | Las 2 marcas | name |
| `parts` | Catálogo: tipo de pieza × marca | part_type, brand_id, name, price, models\[\] |
| `diagnoses` | Diagnóstico y seguimiento | vehicle_id, mechanic_id, status, notes, sent_at |
| `diagnosis_items` | Una falla | failure, part_type, axle, side, qty_required, labor_cost |
| `orders` | Compra del cliente | diagnosis_id, total, status, num_ref (7 dígitos), codi_qr_id, expires_at, paid_at |
| `order_items` | Piezas compradas | diagnosis_item_id, part_id, qty, unit_price, labor_cost |
| `payment_events` | Idempotencia de webhooks | transaction_id (PK), order_id, payload |

RLS activado en todas. El cliente solo lee lo suyo; crear órdenes y marcarlas pagadas lo hace el servidor con la service role key. Realtime publica `diagnoses` y `orders`.

## Pagos con pey (CoDi)

**Lo que dice la documentación** ([docs.pey.mx](https://docs.pey.mx/)):

- Autenticación con `Authorization: Bearer <API key>`. La key se crea en [portal.mipey.mx](https://portal.mipey.mx).
- Crear QR: `POST https://api.pey.mx/codi/qr` con `amount`, `concept`, `expiration` y `numRef`.
- Webhook de pago: evento `codi.qr.payment_received`, con campos como `amount`, `codiQrId`, `numRef`, `transactionId`, `datePaid`, `type`.
- Firma con **Standard Webhooks** (header `webhook-signature`); el código usa la librería npm `standardwebhooks`.
- Una API key solo puede tener un webhook. El secreto se muestra al crearlo en el portal (sección Desarrollador).
- **No hay sandbox:** se prueba en producción con montos chicos (por ejemplo $0.01). Usar precios de centavos en la demo.

**Por confirmar:** los nombres exactos de los campos que regresa `POST /codi/qr` (id del QR, imagen o cadena) y si `expiration` va en segundos. Revisar [openapi.json](https://docs.pey.mx/openapi.json) o hacer `console.log` de la primera respuesta. El código asume segundos y busca `codiQrId` o `id`.

### Flujo técnico del pago

1. El frontend manda a `POST /api/checkout` el `diagnosisId` y por cada falla elegida `{ diagnosisItemId, partId, qty }`, con el token de Supabase en `Authorization`.
2. El servidor valida (dueño del auto, diagnóstico en `enviado`, pieza del tipo correcto y compatible, tope de cantidad), calcula `Σ(precio × qty + mano de obra)`, crea la orden `pendiente` y pide el QR a pey con `numRef = orders.num_ref`.
3. El frontend muestra el QR; el cliente paga desde la app de su banco.
4. pey llama a `POST /api/webhooks/pey`. Se verifica la firma con el cuerpo crudo, se registra el `transactionId` en `payment_events` (si ya existía, se ignora), se busca la orden por `codiQrId` o `numRef` y se revisan monto y vigencia.
5. Si todo cuadra: `orders.status = pagado` y `diagnoses.status = pagado`. Realtime avisa al cliente y al mecánico.

### Variables de entorno

```
# Copien este archivo como .env.local y pónganlo también en Vercel → Settings → Environment Variables
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # solo servidor, nunca en el frontend
PEY_API_KEY=                      # portal.mipey.mx → Desarrollador
PEY_WEBHOOK_SECRET=               # se muestra al crear el webhook en el portal
```

## Decisiones tomadas

| Tema | Decisión |
| --- | --- |
| Marcas | Se muestran solo como las dos marcas, con su nombre y precio. **No** se etiquetan como "económica" y "premium". |
| Mano de obra | Por cada falla, no un total único. |
| Ubicación | Cada falla dice eje (delantero/trasero) y lado (izquierdo/derecho/ambos). |
| Fotos del diagnóstico | **No** se incluyen. |
| Métodos de pago | Solo CoDi con pey. **Sin** tarjeta ni payment links. |
| Seguimiento | Sí, en vivo con Supabase Realtime. |
| Login | Sí, con rol cliente o mecánico. |
| Cantidades en par | Idea opcional: si el mecánico puso 2 amortiguadores y el cliente elige 1, mostrar una advertencia. Pendiente si sobra tiempo. |

## Recortes para entregar en un día

- Mecánicos: una cuenta fija creada a mano en Supabase, sin pantalla de registro de mecánicos.
- Catálogo cargado desde `schema.sql`, sin pantalla para administrarlo.
- Sin inventario.
- Sin facturación.
- Sin notificaciones por WhatsApp ni correo: diagnóstico y seguimiento se ven en la página del cliente.
- Precios de prueba en centavos para la demo.

## Pendientes

| Estado | Tarea |
| --- | --- |
| Hecho | Esquema SQL con RLS, Realtime y datos de ejemplo |
| Hecho | `/api/checkout` (validaciones, total y QR de pey) |
| Hecho | `/api/webhooks/pey` (firma, idempotencia, monto, vigencia) |
| Hecho | Hook `useSeguimiento` |
| Falta | Crear el proyecto Next.js (`create-next-app` con TypeScript y Tailwind) y copiar los archivos con estas rutas |
| Falta | Pantallas de login y registro de cliente, y registro del auto |
| Falta | Panel del mecánico: lista de autos, formulario de fallas (pieza, eje, lado, cantidad, mano de obra), botón "Enviar diagnóstico", cambio de estado de la reparación |
| Falta | Vista del cliente: fallas con ubicación, selector de las dos marcas con tope de cantidad, carrito con total |
| Falta | Pantalla del QR CoDi (mostrar el QR que regresa pey y esperar el cambio a `pagado`) |
| Falta | Pantalla de seguimiento en vivo con `useSeguimiento` |
| Falta | API key y webhook en el portal de pey, variables en Vercel, prueba con $0.01 |
| Falta | Confirmar campos de respuesta de `/codi/qr` y la unidad de `expiration` |

## Código actual

Ya pasó la revisión de tipos con `tsc --noEmit`. Rutas dentro del proyecto Next.js (con alias `@/*` a la raíz). Dependencias: `next`, `react`, `@supabase/supabase-js`, `standardwebhooks`.

supabase/schema.sql

```
-- Taller de suspensión Chevrolet 2025 — esquema para Supabase (Postgres)
-- Pégalo en el SQL Editor de Supabase y ejecútalo una vez.

create extension if not exists pgcrypto;

-- Perfiles: cada usuario de Supabase Auth es cliente o mecánico
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null,
  role text not null default 'cliente' check (role in ('cliente', 'mecanico'))
);

-- Solo Chevrolet 2025
create table vehicles (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references profiles(id),
  model text not null,                         -- p. ej. 'Aveo', 'Onix', 'Tracker'
  year int not null default 2025 check (year = 2025),
  plate text
);

-- Solo 2 marcas de refacciones (se cargan en el seed de abajo)
create table brands (
  id serial primary key,
  name text not null unique
);

-- Catálogo: cada pieza es un TIPO (amortiguador delantero, rótula...) en UNA marca
create table parts (
  id serial primary key,
  part_type text not null,                     -- 'amortiguador_delantero', 'buje_horquilla', ...
  brand_id int not null references brands(id),
  name text not null,
  price numeric(10,2) not null check (price > 0),
  models text[] not null,                      -- modelos 2025 compatibles
  unique (part_type, brand_id)
);

-- Diagnóstico que hace el mecánico
create table diagnoses (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id),
  mechanic_id uuid not null references profiles(id),
  -- Seguimiento en vivo: el mecánico avanza el estado y el cliente lo ve al instante
  status text not null default 'borrador'
    check (status in ('borrador', 'enviado', 'pagado', 'en_reparacion', 'listo', 'entregado')),
  notes text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

-- Cada renglón: una falla, qué pieza se quita, DÓNDE está, cuántas faltan
-- y la mano de obra de ESA falla (no hay un total único de mano de obra)
create table diagnosis_items (
  id uuid primary key default gen_random_uuid(),
  diagnosis_id uuid not null references diagnoses(id) on delete cascade,
  failure text not null,                       -- 'Amortiguador con fuga de aceite'
  part_type text not null,                     -- 'amortiguador_delantero'
  axle text not null check (axle in ('delantero', 'trasero')),
  side text not null check (side in ('izquierdo', 'derecho', 'ambos')),
  qty_required int not null check (qty_required between 1 and 8),
  labor_cost numeric(10,2) not null check (labor_cost >= 0),
  -- si es de ambos lados, son al menos 2 piezas
  check (side <> 'ambos' or qty_required >= 2)
);

-- Referencia numérica para CoDi (numRef). Empieza en 1000000 para que siempre tenga 7 dígitos.
create sequence order_num_ref_seq start 1000000;

create table orders (
  id uuid primary key default gen_random_uuid(),
  diagnosis_id uuid not null references diagnoses(id),
  customer_id uuid not null references profiles(id),
  total numeric(10,2) not null,
  status text not null default 'pendiente'
    check (status in ('pendiente', 'pagado', 'expirado', 'reembolso')),
  num_ref int not null unique default nextval('order_num_ref_seq'),
  codi_qr_id text unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  diagnosis_item_id uuid not null references diagnosis_items(id),
  part_id int not null references parts(id),
  qty int not null check (qty > 0),
  unit_price numeric(10,2) not null,
  labor_cost numeric(10,2) not null
);

-- Idempotencia: si pey reenvía el mismo pago, la llave primaria lo rechaza
create table payment_events (
  transaction_id text primary key,
  order_id uuid references orders(id),
  payload jsonb not null,
  received_at timestamptz not null default now()
);

-- ===== Seguridad (RLS) =====
alter table profiles enable row level security;
alter table vehicles enable row level security;
alter table brands enable row level security;
alter table parts enable row level security;
alter table diagnoses enable row level security;
alter table diagnosis_items enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table payment_events enable row level security;  -- sin políticas: solo el servidor (service role)

create or replace function is_mecanico() returns boolean
language sql stable security definer as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'mecanico')
$$;

create policy "perfil propio" on profiles for select using (id = auth.uid() or is_mecanico());
create policy "catalogo publico marcas" on brands for select using (true);
create policy "catalogo publico piezas" on parts for select using (true);

create policy "cliente ve sus autos" on vehicles for select using (customer_id = auth.uid() or is_mecanico());
create policy "cliente registra su auto" on vehicles for insert with check (customer_id = auth.uid());

-- El cliente solo ve diagnósticos ya ENVIADOS de sus autos; el mecánico ve y edita todo
create policy "ver diagnosticos" on diagnoses for select using (
  is_mecanico() or (status <> 'borrador' and vehicle_id in (select id from vehicles where customer_id = auth.uid()))
);
create policy "mecanico escribe diagnosticos" on diagnoses for all using (is_mecanico()) with check (is_mecanico());

create policy "ver renglones" on diagnosis_items for select using (
  diagnosis_id in (select id from diagnoses)   -- hereda el filtro de la política de diagnoses
);
create policy "mecanico escribe renglones" on diagnosis_items for all using (is_mecanico()) with check (is_mecanico());

-- Órdenes: el cliente solo LEE las suyas. Crearlas y marcarlas pagadas lo hace el servidor.
create policy "ver ordenes" on orders for select using (customer_id = auth.uid() or is_mecanico());
create policy "ver items de orden" on order_items for select using (order_id in (select id from orders));

-- ===== Seguimiento en vivo (Supabase Realtime) =====
alter publication supabase_realtime add table diagnoses, orders;

-- ===== Datos de ejemplo (cambien marcas, piezas y precios por los reales) =====
insert into brands (name) values ('Monroe'), ('KYB');

insert into parts (part_type, brand_id, name, price, models) values
  ('amortiguador_delantero', 1, 'Amortiguador delantero Monroe', 1450, array['Aveo','Onix','Tracker']),
  ('amortiguador_delantero', 2, 'Amortiguador delantero KYB',    1690, array['Aveo','Onix','Tracker']),
  ('amortiguador_trasero',   1, 'Amortiguador trasero Monroe',   1190, array['Aveo','Onix','Tracker']),
  ('amortiguador_trasero',   2, 'Amortiguador trasero KYB',      1390, array['Aveo','Onix','Tracker']),
  ('base_amortiguador',      1, 'Base de amortiguador Monroe',    520, array['Aveo','Onix','Tracker']),
  ('base_amortiguador',      2, 'Base de amortiguador KYB',       610, array['Aveo','Onix','Tracker']);
```

lib/server.ts

```
// Solo se usa en el SERVIDOR (route handlers). Nunca lo importes en un componente de cliente.
import { createClient } from "@supabase/supabase-js";

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // salta RLS: solo en el servidor
  { auth: { persistSession: false } }
);

// Segundos que dura vivo el QR. pey no documenta la unidad en su página;
// confírmenlo en https://docs.pey.mx/openapi.json (campo "expiration").
export const QR_EXPIRATION = 600;

export async function crearQrCodi(params: { amount: number; concept: string; numRef: number }) {
  const res = await fetch("https://api.pey.mx/codi/qr", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PEY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: params.amount,
      concept: params.concept.slice(0, 40), // CoDi limita el concepto; mantenlo corto
      expiration: QR_EXPIRATION,
      numRef: params.numRef,
    }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`pey respondió ${res.status}: ${JSON.stringify(data)}`);
  }
  // La respuesta trae el id del QR y la imagen/cadena del QR.
  // Hagan un console.log(data) la primera vez para ver los nombres exactos.
  return data as Record<string, unknown>;
}
```

app/api/checkout/route.ts

```
// POST /api/checkout
// El cliente manda QUÉ pieza (marca) eligió por cada renglón del diagnóstico y cuántas.
// El servidor recalcula TODO: nunca confiamos en precios ni cantidades que vengan del navegador.
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin, crearQrCodi, QR_EXPIRATION } from "@/lib/server";

type ItemCarrito = { diagnosisItemId: string; partId: number; qty: number };

export async function POST(req: Request) {
  // 1) ¿Quién es? (token de Supabase Auth que manda el frontend)
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Sin sesión" }, { status: 401 });

  const supabaseUser = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  const { data: userData } = await supabaseUser.auth.getUser();
  const user = userData.user;
  if (!user) return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });

  const { diagnosisId, items } = (await req.json()) as { diagnosisId: string; items: ItemCarrito[] };
  if (!diagnosisId || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Carrito vacío" }, { status: 400 });
  }

  // 2) El diagnóstico debe estar ENVIADO y ser de un auto de este cliente
  const { data: diag } = await supabaseAdmin
    .from("diagnoses")
    .select("id, status, vehicles!inner(customer_id, model)")
    .eq("id", diagnosisId)
    .single();

  const vehicle = diag?.vehicles as unknown as { customer_id: string; model: string } | undefined;
  if (!diag || !vehicle || vehicle.customer_id !== user.id) {
    return NextResponse.json({ error: "Diagnóstico no encontrado" }, { status: 404 });
  }
  if (diag.status !== "enviado") {
    return NextResponse.json({ error: "Este diagnóstico ya se pagó o aún no se envía" }, { status: 409 });
  }

  // 3) Cargar los renglones del diagnóstico y las piezas elegidas
  const { data: diagItems } = await supabaseAdmin
    .from("diagnosis_items")
    .select("id, part_type, qty_required, labor_cost")
    .eq("diagnosis_id", diagnosisId);

  const { data: parts } = await supabaseAdmin
    .from("parts")
    .select("id, part_type, price, models")
    .in("id", items.map((i) => i.partId));

  // 4) Validar cada renglón del carrito
  const vistos = new Set<string>();
  let total = 0;
  const renglones: { diagnosis_item_id: string; part_id: number; qty: number; unit_price: number; labor_cost: number }[] = [];

  for (const it of items) {
    const di = diagItems?.find((d) => d.id === it.diagnosisItemId);
    const part = parts?.find((p) => p.id === it.partId);

    if (!di || !part) return NextResponse.json({ error: "Pieza no válida" }, { status: 400 });
    if (vistos.has(di.id)) return NextResponse.json({ error: "Renglón repetido" }, { status: 400 });
    vistos.add(di.id);

    if (part.part_type !== di.part_type) {
      return NextResponse.json({ error: "Esa pieza no corresponde a la falla" }, { status: 400 });
    }
    if (!part.models.includes(vehicle.model)) {
      return NextResponse.json({ error: `La pieza no es compatible con ${vehicle.model} 2025` }, { status: 400 });
    }
    // Regla clave: no puede comprar MÁS de lo que diagnosticó el mecánico
    if (!Number.isInteger(it.qty) || it.qty < 1 || it.qty > di.qty_required) {
      return NextResponse.json({ error: `Máximo ${di.qty_required} pieza(s) para esta falla` }, { status: 400 });
    }

    const price = Number(part.price);
    const labor = Number(di.labor_cost);
    total += price * it.qty + labor; // la mano de obra entra sola con cada trabajo
    renglones.push({ diagnosis_item_id: di.id, part_id: part.id, qty: it.qty, unit_price: price, labor_cost: labor });
  }
  total = Math.round(total * 100) / 100;

  // 5) Crear la orden pendiente
  const { data: order, error: orderErr } = await supabaseAdmin
    .from("orders")
    .insert({
      diagnosis_id: diagnosisId,
      customer_id: user.id,
      total,
      expires_at: new Date(Date.now() + QR_EXPIRATION * 1000).toISOString(),
    })
    .select("id, num_ref, total")
    .single();
  if (orderErr || !order) return NextResponse.json({ error: "No se pudo crear la orden" }, { status: 500 });

  await supabaseAdmin.from("order_items").insert(renglones.map((r) => ({ ...r, order_id: order.id })));

  // 6) Pedir el QR CoDi a pey
  try {
    const qr = await crearQrCodi({
      amount: total,
      concept: `Suspension orden ${order.num_ref}`,
      numRef: order.num_ref,
    });
    const codiQrId = (qr.codiQrId ?? qr.id) as string | undefined; // ajusten al nombre real
    if (codiQrId) await supabaseAdmin.from("orders").update({ codi_qr_id: codiQrId }).eq("id", order.id);

    return NextResponse.json({ orderId: order.id, total, qr });
  } catch (e) {
    await supabaseAdmin.from("orders").update({ status: "expirado" }).eq("id", order.id);
    return NextResponse.json({ error: "No se pudo generar el QR", detalle: String(e) }, { status: 502 });
  }
}
```

app/api/webhooks/pey/route.ts

```
// POST /api/webhooks/pey
// Esta URL la registran en portal.mipey.mx → Desarrollador → engrane de la API key → "Crear Webhook".
// pey firma con Standard Webhooks; el secreto que te muestra el portal va en PEY_WEBHOOK_SECRET.
import { NextResponse } from "next/server";
import { Webhook } from "standardwebhooks";
import { supabaseAdmin } from "@/lib/server";

type PagoQr = {
  type: string;            // 'codi.qr.payment_received'
  amount: number;
  codiQrId: string;
  numRef: number;
  transactionId: string;
  datePaid: string;
  concept: string;
};

export async function POST(req: Request) {
  // 1) Verificar la firma con el cuerpo CRUDO (si lo parseas antes, la firma no cuadra)
  const body = await req.text();
  const headers = {
    "webhook-id": req.headers.get("webhook-id") ?? "",
    "webhook-timestamp": req.headers.get("webhook-timestamp") ?? "",
    "webhook-signature": req.headers.get("webhook-signature") ?? "",
  };

  let evt: PagoQr;
  try {
    evt = new Webhook(process.env.PEY_WEBHOOK_SECRET!).verify(body, headers) as PagoQr;
  } catch {
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  if (evt.type !== "codi.qr.payment_received") {
    return NextResponse.json({ ok: true, ignorado: evt.type });
  }

  // 2) Buscar la orden por el id del QR (o por la referencia numérica)
  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("id, diagnosis_id, total, status, expires_at")
    .or(`codi_qr_id.eq.${evt.codiQrId},num_ref.eq.${Number(evt.numRef) || 0}`)
    .maybeSingle();

  // 3) Idempotencia: el mismo transactionId solo se procesa una vez
  const { data: nuevo } = await supabaseAdmin
    .from("payment_events")
    .upsert(
      { transaction_id: evt.transactionId, order_id: order?.id ?? null, payload: evt },
      { onConflict: "transaction_id", ignoreDuplicates: true }
    )
    .select("transaction_id");

  if (!nuevo || nuevo.length === 0) {
    return NextResponse.json({ ok: true, duplicado: true }); // 200 para que pey no reintente
  }
  if (!order) {
    return NextResponse.json({ ok: true, sinOrden: true }); // queda guardado en payment_events para revisarlo
  }

  // 4) ¿Pagó lo que debía y a tiempo?
  const montoCorrecto = Math.abs(Number(evt.amount) - Number(order.total)) < 0.01;
  const aTiempo = order.status === "pendiente" && new Date(order.expires_at).getTime() > Date.now() - 60_000; // 1 min de gracia

  if (!montoCorrecto || !aTiempo) {
    await supabaseAdmin.from("orders").update({ status: "reembolso" }).eq("id", order.id);
    return NextResponse.json({ ok: true, reembolso: true });
  }

  // 5) Pagado: la orden y el diagnóstico cambian de estado (Realtime avisa al mecánico y al cliente)
  await supabaseAdmin
    .from("orders")
    .update({ status: "pagado", paid_at: evt.datePaid ?? new Date().toISOString() })
    .eq("id", order.id)
    .eq("status", "pendiente");
  await supabaseAdmin.from("diagnoses").update({ status: "pagado" }).eq("id", order.diagnosis_id);

  return NextResponse.json({ ok: true });
}
```

lib/useSeguimiento.ts

```
"use client";
// Hook de seguimiento en vivo: el cliente ve cómo avanza su servicio sin recargar.
// Uso: const estado = useSeguimiento(supabase, diagnosisId)
import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

export type EstadoServicio = "enviado" | "pagado" | "en_reparacion" | "listo" | "entregado";

export const PASOS: { estado: EstadoServicio; texto: string }[] = [
  { estado: "enviado", texto: "Diagnóstico listo" },
  { estado: "pagado", texto: "Pagado con CoDi" },
  { estado: "en_reparacion", texto: "En reparación" },
  { estado: "listo", texto: "Listo para recoger" },
  { estado: "entregado", texto: "Entregado" },
];

export function useSeguimiento(supabase: SupabaseClient, diagnosisId: string) {
  const [estado, setEstado] = useState<EstadoServicio | null>(null);

  useEffect(() => {
    // 1) Estado actual
    supabase
      .from("diagnoses")
      .select("status")
      .eq("id", diagnosisId)
      .single()
      .then(({ data }) => data && setEstado(data.status as EstadoServicio));

    // 2) Cambios en vivo (cuando el webhook marca pagado o el mecánico avanza el estado)
    const canal = supabase
      .channel(`seguimiento-${diagnosisId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "diagnoses", filter: `id=eq.${diagnosisId}` },
        (payload) => setEstado((payload.new as { status: EstadoServicio }).status)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [supabase, diagnosisId]);

  return estado;
}
```

## Instrucciones para la sesión de Claude

- Esta página es la fuente de verdad del proyecto. Respeta las [reglas de negocio](#reglas) y las [decisiones tomadas](#decisiones); no reintroduzcas lo descartado (etiquetas económica/premium, fotos del diagnóstico, pago con tarjeta).
- Usa el stack de la sección [Stack](#stack): Next.js App Router + TypeScript + Tailwind + Supabase + Vercel + pey. No agregues otros lenguajes ni frameworks.
- No cambies nombres de tablas, columnas ni estados sin avisar: el código de pagos depende de ellos. Si hace falta un cambio, propón la migración SQL y actualiza los dos endpoints.
- Los precios y totales se calculan solo en el servidor. Solo el webhook marca órdenes como pagadas.
- Para datos de pey, consulta [docs.pey.mx](https://docs.pey.mx/); no inventes campos. Lo no confirmado está en la nota de [Pagos](#pagos).
- La entrega es en un día: prioriza la tabla de [Pendientes](#pendientes) en orden y respeta los [recortes](#recortes).
- Responde en español.