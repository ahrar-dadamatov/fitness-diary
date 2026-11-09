import React, { useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useWorkoutStore, WorkoutProgram } from '../../store';

// Видео тренера лежат в общей папке хранилища, их видят все вошедшие пользователи
const trainerVideo = (n: number) => `storage:shared/split-4/${n}.mp4`;

// Предустановленные программы (хардкод для старта)
const PROGRAMS: WorkoutProgram[] = [
  {
    id: 'split-4-video',
    title: 'Сплит на 4 дня (с видео)',
    description: 'Программа с видео тренера к каждому упражнению: техника в разделе «Техника» в карточке.',
    days: [
      {
        num: 1,
        title: 'Грудь / Бицепс',
        icon: '💪',
        exercises: [
          { name: 'Жим лёжа в Смите', category: 'Грудь', instructions: [], imageUrl: trainerVideo(7503) },
          { name: 'Жим в Смите на наклоне 45°', category: 'Верх груди', instructions: [], imageUrl: trainerVideo(7504) },
          { name: 'Разводка «Бабочка»', category: 'Грудь', instructions: [], imageUrl: trainerVideo(7505) },
          { name: 'Бицепс на скамье Скотта', category: 'Бицепс', instructions: [], imageUrl: trainerVideo(7506) },
          { name: 'Сгибание рук с опорой на бедро', category: 'Бицепс', instructions: [], imageUrl: trainerVideo(7507) },
          { name: 'Сгибание рук в кроссовере', category: 'Бицепс', instructions: [], imageUrl: trainerVideo(7508) },
        ],
      },
      {
        num: 2,
        title: 'Ноги / Икры',
        icon: '🦵',
        exercises: [
          { name: 'Присед в гакке', category: 'Ноги', instructions: [], imageUrl: trainerVideo(7509) },
          { name: 'Выпады на месте', category: 'Ноги', instructions: [], imageUrl: trainerVideo(7510) },
          { name: 'Разгибание голени сидя', category: 'Ноги', instructions: [], imageUrl: trainerVideo(7511) },
          { name: 'Сгибание голени лёжа', category: 'Ноги', instructions: [], imageUrl: trainerVideo(7512) },
          { name: 'Подъём на носок', category: 'Икры', instructions: [], imageUrl: trainerVideo(7513) },
        ],
      },
      {
        num: 3,
        title: 'Спина / Трицепс',
        icon: '🏋️‍♂️',
        exercises: [
          { name: 'Подтягивания', category: 'Спина', instructions: [], imageUrl: trainerVideo(7514) },
          { name: 'Горизонтальная тяга треугольника', category: 'Спина', instructions: [], imageUrl: trainerVideo(7515) },
          { name: 'Тяга гантели в наклоне одной рукой', category: 'Спина', instructions: [], imageUrl: trainerVideo(7516) },
          { name: 'Пожимание плечами', category: 'Спина', instructions: [], imageUrl: trainerVideo(7517) },
          { name: 'Брусья', category: 'Трицепс', instructions: [], imageUrl: trainerVideo(7518) },
          { name: 'Отжимания Арнольда', category: 'Трицепс', instructions: [], imageUrl: trainerVideo(7519) },
          { name: 'Трицепс в кроссовере', category: 'Трицепс', instructions: [], imageUrl: trainerVideo(7520) },
        ],
      },
      {
        num: 4,
        title: 'Плечи / Пресс',
        icon: '⚡',
        exercises: [
          { name: 'Жим сидя в Смите (скамья 15°)', category: 'Плечи', instructions: [], imageUrl: trainerVideo(7521) },
          { name: 'Махи на среднюю дельту', category: 'Плечи', instructions: [], imageUrl: trainerVideo(7522) },
          { name: 'Сгибание-разгибание рук в наклоне', category: 'Плечи', instructions: [], imageUrl: trainerVideo(7523) },
          { name: 'Скручивания на коленях', category: 'Пресс', instructions: [], imageUrl: trainerVideo(7524) },
          { name: 'Подъём таза в висе', category: 'Пресс', instructions: [], imageUrl: trainerVideo(7525) },
          { name: 'Горизонтальные скручивания с весом', category: 'Пресс', instructions: [], imageUrl: trainerVideo(7526) },
        ],
      },
    ],
  },
  {
    id: 'p1',
    title: 'Full Body (3 дня)',
    description: 'Идеальный старт для новичков. Проработка всех мышечных групп на каждой тренировке.',
    days: [
      {
        num: 1,
        title: 'Тренировка А',
        icon: '🔥',
        exercises: [
          { name: 'Приседания со штангой', category: 'Ноги', instructions: ['Спина прямая', 'Глубокий присед'], imageUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=1470&auto=format&fit=crop' },
          { name: 'Жим лежа', category: 'Грудь', instructions: ['Лопатки сведены'], imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1470&auto=format&fit=crop' },
          { name: 'Тяга верхнего блока', category: 'Спина', instructions: ['Ключицы вверх'] },
        ]
      },
      {
        num: 2,
        title: 'Отдых',
        icon: '💤',
        exercises: []
      },
      {
        num: 3,
        title: 'Тренировка Б',
        icon: '⚡',
        exercises: [
          { name: 'Румынская тяга', category: 'Ноги', instructions: ['Отводите таз назад'] },
          { name: 'Армейский жим', category: 'Плечи', instructions: ['Жмите над головой'] },
          { name: 'Тяга штанги в наклоне', category: 'Спина', instructions: ['Тяните к животу'] },
        ]
      }
    ]
  },
  {
    id: 'p2',
    title: 'Push / Pull / Legs',
    description: 'Популярный сплит PPL. Разделение по типам движений для максимальной гипертрофии.',
    days: [
      {
        num: 1,
        title: 'Push (Тяни)',
        icon: '💪',
        exercises: [
          { name: 'Жим гантелей лежа', category: 'Грудь', instructions: [] },
          { name: 'Разведение гантелей стоя', category: 'Плечи', instructions: [] },
          { name: 'Разгибания в блоке', category: 'Трицепс', instructions: [] },
        ]
      },
      {
        num: 2,
        title: 'Pull (Толкай)',
        icon: '🏋️‍♂️',
        exercises: [
          { name: 'Подтягивания', category: 'Спина', instructions: [] },
          { name: 'Тяга гантели в наклоне', category: 'Спина', instructions: [] },
          { name: 'Подъем штанги на бицепс', category: 'Бицепс', instructions: [] },
        ]
      },
      {
        num: 3,
        title: 'Legs (Ноги)',
        icon: '🦵',
        exercises: [
          { name: 'Жим ногами', category: 'Ноги', instructions: [] },
          { name: 'Выпады', category: 'Ноги', instructions: [] },
          { name: 'Икры сидя', category: 'Икры', instructions: [] },
        ]
      }
    ]
  }
];

export default function ProgramsScreen() {
  const applyProgram = useWorkoutStore((state) => state.applyProgram);
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const handleApplyProgram = (program: WorkoutProgram) => {
    Alert.alert(
      'Применить программу?',
      `Программа «${program.title}» заменит ваши текущие дни и упражнения. История тренировок сохранится.`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Применить',
          style: 'destructive',
          onPress: async () => {
            await applyProgram(program);
            Alert.alert('Успех', 'Программа успешно применена!');
            router.push('/(tabs)');
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0F172A' }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Программы</Text>
          <Text style={styles.subtitle}>Выберите готовый план тренировок</Text>
        </View>

        {PROGRAMS.map((prog) => (
          <View key={prog.id} style={styles.programCard}>
            <Image 
              source="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1470&auto=format&fit=crop" 
              style={styles.programImage} 
              contentFit="cover" 
            />
            <View style={styles.programContent}>
              <Text style={styles.programTitle}>{prog.title}</Text>
              <Text style={styles.programDescription}>{prog.description}</Text>
              
              <Text style={styles.daysTitle}>Дни:</Text>
              <View style={styles.daysList}>
                {prog.days.map(d => (
                  <View key={d.num} style={styles.dayBadge}>
                    <Text style={styles.dayBadgeText}>{d.icon} {d.title}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity 
                style={[styles.applyBtn, { backgroundColor: '#334155', marginBottom: 10 }]} 
                onPress={() => toggleExpand(prog.id)}
                activeOpacity={0.8}
              >
                <Text style={[styles.applyBtnText, { color: '#F1F5F9' }]}>
                  {expandedId === prog.id ? 'Скрыть упражнения ▴' : 'Посмотреть упражнения ▾'}
                </Text>
              </TouchableOpacity>

              {expandedId === prog.id && (
                <View style={styles.previewContainer}>
                  {prog.days.map(d => (
                    <View key={d.num} style={styles.previewDay}>
                      <Text style={styles.previewDayTitle}>{d.icon} {d.title}</Text>
                      {d.exercises.length === 0 ? (
                        <Text style={styles.previewExerciseNone}>Отдых</Text>
                      ) : (
                        d.exercises.map((ex, i) => (
                          <Text key={i} style={styles.previewExercise}>• {ex.name} <Text style={{ color: '#64748B' }}>({ex.category})</Text></Text>
                        ))
                      )}
                    </View>
                  ))}
                </View>
              )}

              <TouchableOpacity 
                style={styles.applyBtn} 
                onPress={() => handleApplyProgram(prog)}
                activeOpacity={0.8}
              >
                <Text style={styles.applyBtnText}>Начать программу</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        
        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
    padding: 16,
    paddingTop: 16,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
  },
  programCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  programImage: {
    width: '100%',
    height: 140,
    // Видно, пока картинка грузится или если нет интернета
    backgroundColor: '#0C4A6E',
  },
  programContent: {
    padding: 20,
  },
  programTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#F1F5F9',
    marginBottom: 8,
  },
  programDescription: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 16,
    lineHeight: 20,
  },
  daysTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#E2E8F0',
    marginBottom: 8,
  },
  daysList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  dayBadge: {
    backgroundColor: '#334155',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  dayBadgeText: {
    color: '#F1F5F9',
    fontSize: 13,
  },
  applyBtn: {
    backgroundColor: '#38BDF8',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  applyBtnText: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: 'bold',
  },
  previewContainer: {
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  previewDay: {
    marginBottom: 12,
  },
  previewDayTitle: {
    color: '#38BDF8',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  previewExercise: {
    color: '#94A3B8',
    fontSize: 14,
    marginLeft: 8,
    marginBottom: 2,
  },
  previewExerciseNone: {
    color: '#64748B',
    fontSize: 14,
    marginLeft: 8,
    fontStyle: 'italic',
  }
});
