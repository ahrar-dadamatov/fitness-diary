// Вызывается из Supabase Cron, когда у кого-то закончился отдых.
const crypto = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');
const webpush = require('web-push');

const SUPABASE_URL = 'https://qnnafmawwkxbrevxgfrk.supabase.co';
const VAPID_SUBJECT = 'https://fitness-diary-khaki.vercel.app';
const PAYLOAD = JSON.stringify({
  title: 'Отдых окончен! 🏋️‍♂️',
  body: 'Пора делать следующий подход!',
});
// Если телефон получит сигнал намного позже, он уже бесполезен
const PUSH_OPTIONS = { TTL: 120, urgency: 'high' };

function isAuthorized(req) {
  const secret = process.env.PUSH_CRON_SECRET;
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(req.headers.authorization || '');
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: subscriptions, error } = await supabase.rpc('claim_due_rest_pushes');
  if (error) {
    console.error('claim_due_rest_pushes failed:', error.message);
    return res.status(500).json({ error: 'Could not load due timers' });
  }

  webpush.setVapidDetails(
    VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  let sent = 0;
  let failed = 0;
  await Promise.all(
    subscriptions.map(async ({ endpoint, p256dh, auth_key: auth }) => {
      try {
        await webpush.sendNotification({ endpoint, keys: { p256dh, auth } }, PAYLOAD, PUSH_OPTIONS);
        sent += 1;
      } catch (pushError) {
        failed += 1;
        console.error('Push failed:', pushError.statusCode, pushError.body);
        // Подписка больше не действует: например, приложение удалили с телефона
        if (pushError.statusCode === 404 || pushError.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
        }
      }
    })
  );

  return res.status(200).json({ sent, failed });
};
