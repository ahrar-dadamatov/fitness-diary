import { Image } from 'expo-image';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useWorkoutStore } from '@/store';
import { canPickMedia, mediaKind, pickMediaFile, resolveMediaUrl, uploadExerciseMedia } from '@/utils/exercise-media';

// Фото или видео техники в карточке упражнения и кнопки, чтобы его добавить, заменить или убрать.
export default function ExerciseMedia({ exerciseId, value: rawValue }: { exerciseId: string; value?: string }) {
  // Стоковые картинки из шаблонов программ не показывают технику, поэтому их не выводим
  const value = rawValue && !rawValue.includes('images.unsplash.com') ? rawValue : undefined;
  const userId = useWorkoutStore((state) => state.user?.id);
  const setExerciseMedia = useWorkoutStore((state) => state.setExerciseMedia);
  const [url, setUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    setLoadError(false);
    if (!value) return;
    resolveMediaUrl(value)
      .then((resolved) => !cancelled && setUrl(resolved))
      .catch(() => !cancelled && setLoadError(true));
    return () => {
      cancelled = true;
    };
  }, [value]);

  const handlePick = async () => {
    if (!userId) {
      Alert.alert('Нужен вход', 'Войдите в аккаунт, чтобы сохранять фото и видео.');
      return;
    }
    const file = await pickMediaFile();
    if (!file) return;
    setUploading(true);
    try {
      const stored = await uploadExerciseMedia(userId, file);
      await setExerciseMedia(exerciseId, stored);
    } catch (error: any) {
      Alert.alert('Не получилось загрузить', error?.message ?? 'Проверьте интернет и попробуйте ещё раз.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    Alert.alert('Убрать фото/видео?', 'Файл будет удалён из упражнения.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Убрать',
        style: 'destructive',
        onPress: () => {
          setExerciseMedia(exerciseId, undefined).catch((error: any) =>
            Alert.alert('Не получилось убрать', error?.message ?? 'Попробуйте ещё раз.')
          );
        },
      },
    ]);
  };

  const kind = value ? mediaKind(value) : null;

  return (
    <View style={styles.wrap}>
      {value && (
        <View style={styles.frame}>
          {loadError ? (
            <Text style={styles.placeholder}>Не удалось загрузить. Нужен интернет.</Text>
          ) : !url ? (
            <ActivityIndicator color="#38BDF8" />
          ) : kind === 'video' ? (
            Platform.OS === 'web' ? (
              React.createElement('video', {
                // #t=0.1 заставляет iPhone показать первый кадр вместо чёрного прямоугольника
                src: `${url}#t=0.1`,
                controls: true,
                playsInline: true,
                preload: 'metadata',
                style: { width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#000' },
              })
            ) : (
              <TouchableOpacity onPress={() => Linking.openURL(url)}>
                <Text style={styles.placeholder}>▶️ Открыть видео</Text>
              </TouchableOpacity>
            )
          ) : (
            <Image source={url} style={StyleSheet.absoluteFill} contentFit="contain" transition={150} />
          )}
        </View>
      )}

      {canPickMedia() && (
        <View style={styles.buttons}>
          <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={handlePick} disabled={uploading} activeOpacity={0.8}>
            {uploading ? (
              <View style={styles.row}>
                <ActivityIndicator size="small" color="#F8FAFC" />
                <Text style={styles.btnText}>Загрузка…</Text>
              </View>
            ) : (
              <Text style={styles.btnText}>{value ? '🔄 Заменить' : '📷 Добавить фото или видео'}</Text>
            )}
          </TouchableOpacity>
          {value && !uploading && (
            <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={handleRemove} activeOpacity={0.8}>
              <Text style={styles.btnText}>Убрать</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 10,
  },
  frame: {
    height: 240,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#020617',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  placeholder: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    padding: 12,
  },
  buttons: {
    flexDirection: 'row',
    gap: 8,
  },
  btn: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: '#38BDF815',
    borderColor: '#38BDF8',
  },
  btnDanger: {
    backgroundColor: '#EF444415',
    borderColor: '#EF4444',
  },
  btnText: {
    color: '#F8FAFC',
    fontWeight: '700',
    fontSize: 13,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
