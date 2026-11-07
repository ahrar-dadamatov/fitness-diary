import { Platform } from 'react-native';
import { supabase } from '@/supabase';

// Фото и видео упражнений лежат в закрытом бакете Supabase Storage, каждый файл в папке своего пользователя.
// В поле image_url упражнения хранится либо обычная ссылка (https://…), либо `storage:<путь в бакете>`.

const BUCKET = 'exercise-media';
const STORAGE_PREFIX = 'storage:';
// Ограничение бесплатного тарифа Supabase на один файл
export const MAX_MEDIA_BYTES = 50 * 1024 * 1024;
const MAX_IMAGE_SIDE = 1600;
const SIGNED_URL_SECONDS = 60 * 60 * 24;

const VIDEO_EXTENSIONS = ['mp4', 'mov', 'm4v', 'webm', 'qt'];

export type MediaKind = 'image' | 'video';

export function canPickMedia() {
  return Platform.OS === 'web' && typeof document !== 'undefined';
}

export function mediaKind(value: string): MediaKind {
  const clean = value.split(/[?#]/)[0].toLowerCase();
  const ext = clean.split('.').pop() ?? '';
  return VIDEO_EXTENSIONS.includes(ext) ? 'video' : 'image';
}

// Открывает выбор файла. На iPhone предлагает медиатеку, камеру и «Файлы».
export function pickMediaFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*';
    input.style.display = 'none';
    let settled = false;
    const finish = (file: File | null) => {
      if (settled) return;
      settled = true;
      input.remove();
      resolve(file);
    };
    input.addEventListener('change', () => finish(input.files?.[0] ?? null));
    // Safari 16.4+ сообщает об отмене выбора
    input.addEventListener('cancel', () => finish(null));
    document.body.appendChild(input);
    input.click();
  });
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Не удалось прочитать фото'));
    img.src = url;
  });
}

// Уменьшает фото с телефона (обычно 3–5 МБ) до ~300 КБ, чтобы не забивать хранилище и быстро грузилось.
async function compressImage(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    // Формат, который браузер не умеет рисовать: загружаем как есть
    return file;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function randomId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

function extensionFor(file: File, kind: MediaKind) {
  const fromName = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : '';
  if (kind === 'video') {
    if (VIDEO_EXTENSIONS.includes(fromName)) return fromName;
    return file.type.includes('quicktime') ? 'mov' : file.type.includes('webm') ? 'webm' : 'mp4';
  }
  return 'jpg';
}

// Загружает файл и возвращает значение для поля imageUrl упражнения.
export async function uploadExerciseMedia(userId: string, file: File): Promise<string> {
  const kind: MediaKind = file.type.startsWith('video/') ? 'video' : 'image';
  const body = kind === 'image' ? await compressImage(file) : file;
  if (body.size > MAX_MEDIA_BYTES) {
    throw new Error(
      kind === 'video'
        ? 'Видео больше 50 МБ. Обрежьте его до 20–30 секунд и попробуйте снова.'
        : 'Файл больше 50 МБ.'
    );
  }

  let ext = extensionFor(file, kind);
  let contentType = body.type || (kind === 'video' ? 'video/mp4' : 'image/jpeg');
  if (kind === 'image' && body === file && file.type && file.type !== 'image/jpeg') {
    ext = file.type.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
    contentType = file.type;
  }

  const path = `${userId}/${randomId()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, body, {
    contentType,
    cacheControl: '31536000',
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return STORAGE_PREFIX + path;
}

export async function deleteExerciseMedia(value?: string) {
  if (!value?.startsWith(STORAGE_PREFIX)) return;
  const path = value.slice(STORAGE_PREFIX.length);
  signedUrls.delete(path);
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) console.warn('Не удалось удалить файл упражнения:', error.message);
}

const signedUrls = new Map<string, { url: string; expiresAt: number }>();

// Ссылка, по которой можно показать фото или видео. Для закрытого бакета — временная подписанная ссылка.
export async function resolveMediaUrl(value: string): Promise<string> {
  if (!value.startsWith(STORAGE_PREFIX)) return value;
  const path = value.slice(STORAGE_PREFIX.length);
  const cached = signedUrls.get(path);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.url;

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_SECONDS);
  if (error || !data) throw new Error(error?.message ?? 'Нет ссылки на файл');
  signedUrls.set(path, { url: data.signedUrl, expiresAt: Date.now() + SIGNED_URL_SECONDS * 1000 });
  return data.signedUrl;
}
