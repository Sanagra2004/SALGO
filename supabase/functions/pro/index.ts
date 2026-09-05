// SALGO — cobro de la suscripción Pro (Mercado Pago).
//
// Esta función corre en el SERVIDOR (Supabase Edge Functions), no en el
// navegador. Es la única parte del proyecto que conoce el Access Token de
// Mercado Pago.
//
// ── POR QUÉ NO PUEDE ESTAR EN LA APP ─────────────────────────────────────
// El Access Token permite cobrar y mover plata en nombre de la cuenta. Si
// estuviera en el código de la app, cualquiera lo leería abriendo las
// herramientas del navegador. Por eso vive acá, guardado en los secretos de
// Supabase (ver docs/MERCADOPAGO.md).
//
// ── EL INTERRUPTOR ───────────────────────────────────────────────────────
// Mientras PRO_COBRO_ACTIVO no esté en "true", esta función responde que el
// cobro está apagado y no crea ninguna suscripción. Es a propósito: los
// beneficios de Pro dependen de acuerdos con los locales que todavía no
// existen, y cobrar antes de poder cumplirlos genera reembolsos y desconfianza.
//
// Rutas:
//   POST /pro/suscribir   crea la suscripción y devuelve el link de pago
//   POST /pro/webhook     lo llama Mercado Pago cuando algo cambia
//   POST /pro/cancelar    da de baja el débito automático

import { createClient } from 'jsr:@supabase/supabase-js@2';

const MP_API = 'https://api.mercadopago.com';

const env = (k: string) => Deno.env.get(k) ?? '';
const cobroActivo = () => env('PRO_COBRO_ACTIVO') === 'true';

// Cliente con service_role: saltea RLS. Es la única forma de escribir en
// `subscriptions`, que a propósito no acepta escrituras desde la app.
const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false },
});

const CORS = {
  'Access-Control-Allow-Origin': env('APP_ORIGIN') || '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

/** Precio según el plan. Vive acá, en el servidor: si estuviera en la app, se podría cambiar desde el navegador. */
const PRECIOS: Record<number, number> = { 1: 1500, 3: 1350, 12: 1200 };

// ─────────────────────────────────────────────────────────────
// Quién está llamando
// ─────────────────────────────────────────────────────────────
async function usuarioDelToken(req: Request) {
  const auth = req.headers.get('Authorization') ?? '';
  const token = auth.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await db.auth.getUser(token);
  return error ? null : data.user;
}

// ─────────────────────────────────────────────────────────────
// POST /pro/suscribir
// ─────────────────────────────────────────────────────────────
async function suscribir(req: Request) {
  if (!cobroActivo()) {
    return json({
      cobro_activo: false,
      mensaje: 'El cobro todavía no está habilitado. Anotate en la lista de espera.',
    }, 503);
  }

  const user = await usuarioDelToken(req);
  if (!user) return json({ error: 'Necesitás iniciar sesión' }, 401);

  const body = await req.json().catch(() => ({}));
  const meses = Number(body.plan_months) || 1;
  const monto = PRECIOS[meses];
  const email = String(body.email ?? user.email ?? '').trim();

  if (!monto) return json({ error: 'Plan inválido' }, 400);
  if (!email.includes('@')) return json({ error: 'Hace falta un email válido' }, 400);

  // Débito automático: Mercado Pago cobra solo cada N meses hasta que se
  // cancele. En su API esto se llama "preapproval".
  const res = await fetch(`${MP_API}/preapproval`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env('MP_ACCESS_TOKEN')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      reason: `SALGO Pro — plan de ${meses} ${meses === 1 ? 'mes' : 'meses'}`,
      external_reference: user.id,          // así el webhook sabe de quién es
      payer_email: email,
      back_url: `${env('APP_ORIGIN')}/index.html?pro=ok`,
      status: 'pending',
      auto_recurring: {
        frequency: meses,
        frequency_type: 'months',
        transaction_amount: monto,
        currency_id: 'ARS',
      },
    }),
  });

  const mp = await res.json();
  if (!res.ok) {
    console.error('[pro] Mercado Pago rechazó la suscripción:', mp);
    return json({ error: 'No pude crear la suscripción', detalle: mp?.message }, 502);
  }

  // Queda 'pending' hasta que Mercado Pago confirme el primer cobro. Nunca se
  // marca como activa acá: eso solo pasa en el webhook, con datos de MP.
  await db.from('subscriptions').upsert({
    user_id: user.id,
    status: 'pending',
    plan_months: meses,
    amount: monto,
    mp_preapproval_id: mp.id,
    current_period_end: null,
  });

  return json({ init_point: mp.init_point, preapproval_id: mp.id });
}

// ─────────────────────────────────────────────────────────────
// POST /pro/webhook
// ─────────────────────────────────────────────────────────────

/**
 * Verifica que el aviso venga de verdad de Mercado Pago.
 *
 * Sin esto, cualquiera podría mandar un POST diciendo "el usuario X pagó" y
 * volverse Pro gratis. MP firma cada aviso con un secreto compartido.
 *
 * Se compara en tiempo constante para no filtrar información por el tiempo
 * que tarda la comparación.
 */
async function firmaValida(req: Request, dataId: string): Promise<boolean> {
  const secreto = env('MP_WEBHOOK_SECRET');
  if (!secreto) {
    console.error('[pro] falta MP_WEBHOOK_SECRET: rechazo el aviso por las dudas');
    return false;
  }

  const firma = req.headers.get('x-signature') ?? '';
  const requestId = req.headers.get('x-request-id') ?? '';
  const ts = firma.match(/ts=([^,]+)/)?.[1]?.trim();
  const v1 = firma.match(/v1=([^,]+)/)?.[1]?.trim();
  if (!ts || !v1) return false;

  // Ventana de 5 minutos: un aviso viejo interceptado no sirve para reenviarlo.
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) {
    console.error('[pro] aviso con fecha fuera de rango');
    return false;
  }

  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secreto),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(manifest));
  const esperado = [...new Uint8Array(mac)]
    .map((b) => b.toString(16).padStart(2, '0')).join('');

  if (esperado.length !== v1.length) return false;
  let dif = 0;
  for (let i = 0; i < esperado.length; i++) dif |= esperado.charCodeAt(i) ^ v1.charCodeAt(i);
  return dif === 0;
}

async function webhook(req: Request) {
  const body = await req.json().catch(() => ({}));
  const tipo = body?.type ?? body?.topic;
  const dataId = String(body?.data?.id ?? body?.id ?? '');

  if (!dataId) return json({ ok: true, ignorado: 'sin id' });
  if (!(await firmaValida(req, dataId))) {
    return json({ error: 'Firma inválida' }, 401);
  }

  // Solo nos interesan los avisos de suscripción.
  if (tipo !== 'subscription_preapproval' && tipo !== 'preapproval') {
    return json({ ok: true, ignorado: tipo });
  }

  // IMPORTANTE: no confiamos en lo que dice el cuerpo del aviso, ni siquiera
  // con la firma verificada. Volvemos a preguntarle a Mercado Pago cuál es el
  // estado real de la suscripción y guardamos ESA respuesta.
  const res = await fetch(`${MP_API}/preapproval/${dataId}`, {
    headers: { Authorization: `Bearer ${env('MP_ACCESS_TOKEN')}` },
  });
  if (!res.ok) {
    console.error('[pro] no pude consultar la suscripción', dataId, res.status);
    return json({ error: 'No pude verificar con Mercado Pago' }, 502);
  }
  const sub = await res.json();

  const userId = sub.external_reference;
  if (!userId) return json({ ok: true, ignorado: 'sin usuario' });

  // MP usa: authorized | paused | cancelled | pending
  const estado = ['authorized', 'paused', 'cancelled', 'pending'].includes(sub.status)
    ? sub.status : 'pending';

  // Hasta cuándo está paga. MP informa la fecha del próximo cobro; si no viene
  // (por ejemplo cuando se cancela), dejamos la que ya estaba.
  const proximo = sub.next_payment_date ? new Date(sub.next_payment_date).toISOString() : null;

  const fila: Record<string, unknown> = {
    user_id: userId,
    status: estado,
    mp_preapproval_id: sub.id,
    amount: sub.auto_recurring?.transaction_amount ?? 1500,
    plan_months: sub.auto_recurring?.frequency ?? 1,
  };
  if (proximo) fila.current_period_end = proximo;

  const { error } = await db.from('subscriptions').upsert(fila);
  if (error) {
    console.error('[pro] no pude guardar la suscripción:', error);
    return json({ error: 'Error al guardar' }, 500);
  }

  console.log(`[pro] suscripción ${sub.id} → ${estado} (usuario ${userId})`);
  return json({ ok: true });
}

// ─────────────────────────────────────────────────────────────
// POST /pro/cancelar
// ─────────────────────────────────────────────────────────────
async function cancelar(req: Request) {
  const user = await usuarioDelToken(req);
  if (!user) return json({ error: 'Necesitás iniciar sesión' }, 401);

  const { data: sub } = await db.from('subscriptions')
    .select('mp_preapproval_id').eq('user_id', user.id).single();

  if (!sub?.mp_preapproval_id) return json({ error: 'No tenés una suscripción activa' }, 404);

  const res = await fetch(`${MP_API}/preapproval/${sub.mp_preapproval_id}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${env('MP_ACCESS_TOKEN')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status: 'cancelled' }),
  });
  if (!res.ok) return json({ error: 'No pude cancelar en Mercado Pago' }, 502);

  // No se toca current_period_end: si ya pagó el mes, sigue siendo Pro hasta
  // que termine el período. Cancelar no es lo mismo que perder lo pagado.
  await db.from('subscriptions').update({ status: 'cancelled' }).eq('user_id', user.id);
  return json({ ok: true });
}

// ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const ruta = new URL(req.url).pathname.split('/').filter(Boolean).pop();
  try {
    if (ruta === 'suscribir') return await suscribir(req);
    if (ruta === 'webhook') return await webhook(req);
    if (ruta === 'cancelar') return await cancelar(req);
    if (ruta === 'estado') return json({ cobro_activo: cobroActivo() });
    return json({ error: 'Ruta desconocida' }, 404);
  } catch (err) {
    console.error('[pro] error inesperado:', err);
    return json({ error: 'Error del servidor' }, 500);
  }
});
