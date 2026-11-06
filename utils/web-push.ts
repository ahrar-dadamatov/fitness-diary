import { Platform } from 'react-native';

import { supabase } from '@/supabase';

// Публичная часть ключа: её и должен знать браузер
const VAPID_PUBLIC_KEY =
  'BNnkalUK8mEGQPE7ahCntArTQmDEHapTHOoXrmeGWQFLqKw_WNTiRibsHVmKm7H8mKlbKDYjPmdKjrs8c2xvQJk';

export type PushState = 'unsupported' | 'available' | 'enabled' | 'denied';

function isPushSupported() {
  // В обычном Safari на iPhone PushManager нет: он появляется только после установки на экран «Домой»
  return (
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

function canSendPush() {
  return isPushSupported() && Notification.permission === 'granted';
}

export function getPushState(): PushState {
  if (!isPushSupported()) return 'unsupported';
  if (Notification.permission === 'granted') return 'enabled';
  return Notification.permission === 'denied' ? 'denied' : 'available';
}

function base64UrlToBytes(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

async function saveSubscription(subscription: PushSubscription) {
  const { endpoint, keys } = subscription.toJSON();
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    throw new Error('Браузер вернул неполную подписку на уведомления');
  }
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({ endpoint, p256dh: keys.p256dh, auth_key: keys.auth }, { onConflict: 'endpoint' });
  if (error) throw new Error(error.message);
}

async function subscribe(registration: ServiceWorkerRegistration) {
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToBytes(VAPID_PUBLIC_KEY),
    }));
  await saveSubscription(subscription);
}

// iOS разрешает запрос только в ответ на нажатие пользователя
export async function enablePush(): Promise<PushState> {
  if (!isPushSupported()) return 'unsupported';
  await Notification.requestPermission();
  if (Notification.permission === 'granted') {
    await subscribe(await navigator.serviceWorker.ready);
  }
  return getPushState();
}

// Подписка может обновиться сама, поэтому сверяем её при каждом входе
export async function syncPushSubscription() {
  if (!canSendPush()) return;
  const registration = await navigator.serviceWorker.getRegistration();
  if (registration) await subscribe(registration);
}

// После выхода из аккаунта этот телефон не должен получать чужие уведомления
export async function removePushRegistration() {
  if (!canSendPush()) return;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription) {
    await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint);
  }
  await supabase.from('rest_timer_pushes').delete().not('user_id', 'is', null);
}

let pendingTimerUpdate: Promise<void> = Promise.resolve();

// Записи идут строго по очереди, чтобы быстрые нажатия +30/-30 не перепутались в базе
export function scheduleRestPush(fireAt: number | null) {
  if (!canSendPush()) return;
  pendingTimerUpdate = pendingTimerUpdate.then(async () => {
    try {
      const { error } = fireAt
        ? await supabase
            .from('rest_timer_pushes')
            .upsert({ fire_at: new Date(fireAt).toISOString() }, { onConflict: 'user_id' })
        : await supabase.from('rest_timer_pushes').delete().not('user_id', 'is', null);
      if (error) console.warn('Не удалось обновить таймер на сервере:', error.message);
    } catch (e) {
      console.warn('Не удалось обновить таймер на сервере:', e);
    }
  });
}
