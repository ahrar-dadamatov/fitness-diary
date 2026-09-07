import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { supabase } from './supabase';
import { Alert, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// 1. Описываем упражнение
export interface Exercise {
  id: string;
  name: string;
  category: string;
  day: number;
  instructions: string[];
  imageUrl?: string;
}

// Статический список упражнений по умолчанию
export const DEFAULT_EXERCISES: Exercise[] = [
  // День 1: Грудь и Трицепс
  {
    id: 'bench_press',
    name: 'Жим лежа',
    category: 'Грудь',
    day: 1,
    instructions: [
      'Лягте на скамью, лопатки сведены, стопы плотно уперты в пол.',
      'Возьмите гриф широким хватом, снимите со стоек.',
      'Опустите штангу на нижнюю часть груди на вдохе.',
      'Выжмите вверх на выдохе, полностью не блокируя локти.'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=1470&auto=format&fit=crop'
  },
  {
    id: 'incline_dumbbells',
    name: 'Жим гантелей на наклонной',
    category: 'Грудь',
    day: 1,
    instructions: [
      'Угол скамьи 30-45 градусов.',
      'Выжмите гантели вверх над грудью.',
      'Плавно опустите гантели до уровня плеч, растягивая грудные мышцы.',
      'Мощным движением выжмите гантели вверх.'
    ]
  },
  {
    id: 'chest_fly',
    name: 'Разведение гантелей',
    category: 'Грудь',
    day: 1,
    instructions: [
      'Лягте на горизонтальную скамью, гантели в руках над грудью.',
      'Слегка согните руки в локтях и разведите их в стороны.',
      'Опустите гантели до ощущения растяжения в грудных.',
      'Сведите гантели обратно за счет усилия грудных мышц.'
    ]
  },
  {
    id: 'tricep_pushdown',
    name: 'Разгибания на трицепс в блоке',
    category: 'Трицепс',
    day: 1,
    instructions: [
      'Встаньте лицом к блоку, возьмите рукоять хватом сверху.',
      'Прижмите локти к корпусу и зафиксируйте их.',
      'Разогните руки вниз до полного сокращения трицепса.',
      'Плавно вернитесь в исходное положение до угла 90 градусов в локтях.'
    ]
  },
  
  // День 2: Спина и Бицепс
  {
    id: 'lat_pulldown',
    name: 'Тяга верхнего блока',
    category: 'Спина',
    day: 2,
    instructions: [
      'Возьмитесь за рукоять широким хватом.',
      'Слегка отклонитесь назад, сведите лопатки.',
      'Притяните рукоять к верхней части груди, направляя локти вниз.',
      'Медленно вернитесь в исходное положение.'
    ]
  },
  {
    id: 'barbell_row',
    name: 'Тяга штанги в наклоне',
    category: 'Спина',
    day: 2,
    instructions: [
      'Наклонитесь вперед с прямой спиной под углом около 45 градусов.',
      'Держите штангу хватом сверху.',
      'Подтяните штангу к низу живота, сводя лопатки.',
      'Медленно опустите штангу в исходное положение.'
    ]
  },
  {
    id: 'hyperextension',
    name: 'Гиперэкстензия',
    category: 'Спина',
    day: 2,
    instructions: [
      'Лягте на тренажер, зафиксируйте ноги.',
      'Опустите корпус вниз с прямой спиной.',
      'За счет мышц поясницы и ягодиц поднимите корпус до прямой линии с ногами.',
      'Не переразгибайте спину назад.'
    ]
  },
  {
    id: 'biceps_curl',
    name: 'Подъем штанги на бицепс',
    category: 'Бицепс',
    day: 2,
    instructions: [
      'Встаньте ровно, штанга в руках хватом снизу.',
      'Прижмите локти к бокам.',
      'Согните руки в локтях, поднимая штангу к плечам.',
      'Плавно опустите в исходное положение.'
    ]
  },

  // День 3: Плечи и Пресс
  {
    id: 'overhead_press',
    name: 'Армейский жим стоя',
    category: 'Плечи',
    day: 3,
    instructions: [
      'Держите штангу на уровне ключиц хватом чуть шире плеч.',
      'Напрягите пресс и ягодицы для стабильности.',
      'Выжмите штангу над головой, слегка подавая голову вперед в верхней точке.',
      'Плавно опустите штангу обратно на грудь.'
    ]
  },
  {
    id: 'lateral_raise',
    name: 'Махи гантелями в стороны',
    category: 'Плечи',
    day: 3,
    instructions: [
      'Возьмите гантели, слегка наклоните корпус вперед.',
      'Поднимите руки через стороны до уровня плеч, локти смотрят вверх.',
      'Не раскачивайте корпус.',
      'Медленно опустите гантели.'
    ]
  },
  {
    id: 'face_pull',
    name: 'Тяга к лицу (задняя дельта)',
    category: 'Плечи',
    day: 3,
    instructions: [
      'Установите блок на уровне лица, используйте канатную рукоять.',
      'Потяните рукоять к лицу, разводя концы каната в стороны.',
      'Локти должны быть выше кистей.',
      'Почувствуйте сокращение задней дельты и плавно верните блок.'
    ]
  },
  {
    id: 'abs_crunch',
    name: 'Скручивания на пресс',
    category: 'Пресс',
    day: 3,
    instructions: [
      'Лягте на спину, согните ноги в коленях.',
      'Руки держите у висков или скрестите на груди.',
      'На выдохе оторвите лопатки от пола за счет напряжения пресса.',
      'На вдохе плавно опуститесь назад.'
    ]
  },

  // День 4: Ноги
  {
    id: 'squat',
    name: 'Приседания со штангой',
    category: 'Ноги',
    day: 4,
    instructions: [
      'Положите штангу на верх трапеций.',
      'Поставьте ноги на ширине плеч, носки слегка разверните в стороны.',
      'Отводя таз назад, присядьте до параллели бедер с полом (или чуть ниже).',
      'Встаньте, упираясь пятками в пол и держа спину прямой.'
    ]
  },
  {
    id: 'romanian_deadlift',
    name: 'Румынская тяга',
    category: 'Ноги',
    day: 4,
    instructions: [
      'Встаньте прямо, штанга в руках хватом сверху.',
      'Отводя таз назад, наклоните корпус, ведя штангу вдоль бедер.',
      'Колени слегка согнуты, спина идеально прямая.',
      'Опустите до середины голени и за счет ягодиц вернитесь назад.'
    ]
  },
  {
    id: 'leg_extension',
    name: 'Разгибание ног в тренажере',
    category: 'Ноги',
    day: 4,
    instructions: [
      'Сядьте в тренажер, заведите голени под валик.',
      'Держитесь руками за рукоятки по бокам.',
      'На выдохе полностью разогните ноги в коленях.',
      'На вдохе плавно верните ноги в исходное положение.'
    ]
  },
  {
    id: 'calf_raise',
    name: 'Подъемы на носки',
    category: 'Икры',
    day: 4,
    instructions: [
      'Встаньте носками на возвышение (степ-платформу или блин от штанги).',
      'Опустите пятки максимально вниз, растягивая икроножные.',
      'Мощным усилием поднимитесь на носки максимально вверх.',
      'Задержитесь в верхней точке на секунду и опуститесь.'
    ]
  },
];

// 2. Описываем один сохраненный подход
export interface WorkoutLog {
  id: string;
  date: string;
  exerciseId: string;
  weight: number;
  reps: number;
  location: string;
}

// Новая структура для замеров тела
export interface BodyMeasurement {
  id: string;
  date: string;
  weight: number;      // Вес (кг)
  biceps?: number;     // Бицепс (см)
  chest?: number;      // Грудь (см)
  waist?: number;      // Талия (см)
  hips?: number;       // Бедра (см)
}

export interface FoodLog {
  id: string;
  date: string;
  name: string;
  calories: number;
  proteins: number;
  fats: number;
  carbs: number;
}

export interface WorkoutDay {
  num: number;
  title: string;
  icon: string;
}

export const DEFAULT_TRAINING_DAYS: WorkoutDay[] = [
  { num: 1, title: 'Грудь / Трицепс', icon: '💪' },
  { num: 2, title: 'Спина / Бицепс', icon: '🏋️‍♂️' },
  { num: 3, title: 'Плечи / Пресс', icon: '⚡' },
  { num: 4, title: 'Ноги / Икры', icon: '🦵' },
];

export interface WorkoutProgramDay {
  num: number;
  title: string;
  icon: string;
  exercises: Omit<Exercise, 'id' | 'day'>[];
}

export interface WorkoutProgram {
  id: string;
  title: string;
  description: string;
  days: WorkoutProgramDay[];
}

// 3. Состояние и функции хранилища
interface WorkoutStore {
  history: WorkoutLog[];
  exercises: Exercise[];
  measurements: BodyMeasurement[];
  foodLogs: FoodLog[];
  currentDay: number;
  trainingDays: WorkoutDay[];
  user: any;
  session: any;
  timerSeconds: number;
  timerActive: boolean;
  timerMax: number;
  nutritionTarget: { calories: number; proteins: number; fats: number; carbs: number } | null;
  workoutActive: boolean;
  workoutStartTime: string | null;
  setSession: (session: any) => void;
  setCurrentDay: (day: number) => void;
  addLog: (exerciseId: string, weight: number, reps: number, location?: string) => Promise<void>;
  deleteLog: (id: string) => Promise<void>;
  getLastLog: (exerciseId: string) => WorkoutLog | null;
  addExercise: (name: string, category: string, day: number, instructions?: string[], imageUrl?: string) => Promise<void>;
  updateExercise: (id: string, name: string, category: string, day: number, instructions?: string[], imageUrl?: string) => Promise<void>;
  deleteExercise: (id: string) => Promise<void>;
  addMeasurement: (weight: number, biceps?: number, chest?: number, waist?: number, hips?: number) => Promise<void>;
  deleteMeasurement: (id: string) => Promise<void>;
  syncData: () => Promise<void>;
  clearUserData: () => void;
  startTimer: (seconds: number) => Promise<void>;
  stopTimer: () => Promise<void>;
  adjustTimer: (amount: number) => Promise<void>;
  tickTimer: () => void;
  setNutritionTarget: (target: { calories: number; proteins: number; fats: number; carbs: number } | null) => void;
  addFoodLog: (name: string, calories: number, proteins: number, fats: number, carbs: number) => Promise<void>;
  deleteFoodLog: (id: string) => Promise<void>;
  startWorkout: () => void;
  endWorkout: () => void;
  addTrainingDay: (title: string, icon: string) => Promise<void>;
  updateTrainingDay: (num: number, title: string, icon: string) => Promise<void>;
  deleteTrainingDay: (num: number) => Promise<void>;
  swapTrainingDays: (numA: number, numB: number) => Promise<void>;
  applyProgram: (program: WorkoutProgram) => Promise<void>;
  geminiApiKey: string;
  setGeminiApiKey: (key: string) => void;
  timerNotificationId: string | null;
  setTimerNotificationId: (id: string | null) => void;
  timerTargetTimestamp: number | null;
}

export const useWorkoutStore = create<WorkoutStore>()(
  persist(
    (set, get) => ({
      // История подходов
      history: [],
      // Список упражнений (по умолчанию заполнен стартовыми)
      exercises: DEFAULT_EXERCISES,
      // Список замеров тела
      measurements: [],
      // Текущий выбранный день тренировок
      currentDay: 1,
      // Список тренировочных дней
      trainingDays: DEFAULT_TRAINING_DAYS,
      // Информация о сессии пользователя
      user: null,
      session: null,
      timerSeconds: 0,
      timerActive: false,
      timerMax: 240,
      nutritionTarget: null,
      foodLogs: [],
      workoutActive: false,
      workoutStartTime: null,
      geminiApiKey: '',
      timerNotificationId: null,
      timerTargetTimestamp: null,

      setSession: (session) => {
        set({
          session,
          user: session?.user ?? null,
        });
        if (session?.user) {
          get().syncData();
        }
      },

      clearUserData: () => {
        set({
          history: [],
          measurements: [],
          exercises: DEFAULT_EXERCISES,
          trainingDays: DEFAULT_TRAINING_DAYS,
          user: null,
          session: null,
          nutritionTarget: null,
          foodLogs: [],
          workoutActive: false,
          workoutStartTime: null,
          geminiApiKey: '',
          timerNotificationId: null,
          timerTargetTimestamp: null,
        });
      },

      setCurrentDay: (day) => set({ currentDay: day }),

      // Добавить новый подход
      addLog: async (exerciseId, weight, reps, location = 'Adrenaline') => {
        const newLog: WorkoutLog = {
          id: Date.now().toString(),
          date: new Date().toISOString(),
          exerciseId,
          weight,
          reps,
          location: location.trim() || 'Adrenaline',
        };

        // Сохраняем локально мгновенно (Optimistic Update)
        set((state) => ({
          history: [...state.history, newLog],
        }));

        // Запуск таймера отдыха на 240 секунд (4 минуты) при записи подхода
        get().startTimer(240);

        // Отправляем в облако
        const { user } = get();
        if (user) {
          const { error } = await supabase.from('workout_logs').insert({
            id: newLog.id,
            user_id: user.id,
            date: newLog.date,
            exercise_id: newLog.exerciseId,
            weight,
            reps,
            location: newLog.location,
          });
          if (error) {
            console.error('Ошибка добавления подхода в Supabase:', error);
            Alert.alert('Ошибка синхронизации подходов', error.message);
          }
        }
      },

      // Удалить подход по ID
      deleteLog: async (id) => {
        set((state) => ({
          history: state.history.filter((log) => log.id !== id),
        }));

        const { user } = get();
        if (user) {
          await supabase.from('workout_logs').delete().eq('id', id);
        }
      },

      // Получить прошлый результат для упражнения
      getLastLog: (exerciseId) => {
        const { history } = get();
        const exerciseLogs = history.filter((log) => log.exerciseId === exerciseId);

        if (exerciseLogs.length === 0) return null;

        // Возвращаем самый свежий подход
        return [...exerciseLogs].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        )[0];
      },

      // Добавить упражнение
      addExercise: async (name, category, day, instructions = [], imageUrl) => {
        const newExercise: Exercise = {
          id: `custom_${Date.now()}`,
          name: name.trim(),
          category: category.trim() || 'Разное',
          day,
          instructions: instructions.map(i => i.trim()).filter(Boolean),
          imageUrl,
        };

        set((state) => ({
          exercises: [...state.exercises, newExercise],
        }));

        const { user } = get();
        if (user) {
          await supabase.from('exercises').insert({
            id: newExercise.id,
            user_id: user.id,
            name: newExercise.name,
            category: newExercise.category,
            day,
            instructions: newExercise.instructions,
            image_url: newExercise.imageUrl,
          });
        }
      },

      // Изменить упражнение
      updateExercise: async (id, name, category, day, instructions = [], imageUrl) => {
        set((state) => ({
          exercises: state.exercises.map((ex) =>
            ex.id === id
              ? {
                  ...ex,
                  name: name.trim(),
                  category: category.trim(),
                  day,
                  instructions: instructions.map(i => i.trim()).filter(Boolean),
                  imageUrl,
                }
              : ex
          ),
        }));

        const { user } = get();
        if (user && id.startsWith('custom_')) {
          await supabase.from('exercises').update({
            name: name.trim(),
            category: category.trim(),
            day,
            instructions: instructions.map(i => i.trim()).filter(Boolean),
            image_url: imageUrl,
          }).eq('id', id);
        }
      },

      // Удалить упражнение
      deleteExercise: async (id) => {
        set((state) => ({
          exercises: state.exercises.filter((ex) => ex.id !== id),
        }));

        const { user } = get();
        if (user) {
          await supabase.from('exercises').delete().eq('id', id);
        }
      },

      // Добавить замер тела
      addMeasurement: async (weight, biceps, chest, waist, hips) => {
        const newMeasurement: BodyMeasurement = {
          id: Date.now().toString(),
          date: new Date().toISOString(),
          weight,
          biceps,
          chest,
          waist,
          hips,
        };

        set((state) => ({
          measurements: [...state.measurements, newMeasurement],
        }));

        const { user } = get();
        if (user) {
          await supabase.from('body_measurements').insert({
            id: newMeasurement.id,
            user_id: user.id,
            date: newMeasurement.date,
            weight,
            biceps,
            chest,
            waist,
            hips,
          });
        }
      },

      // Удалить замер тела
      deleteMeasurement: async (id) => {
        set((state) => ({
          measurements: state.measurements.filter((m) => m.id !== id),
        }));

        const { user } = get();
        if (user) {
          await supabase.from('body_measurements').delete().eq('id', id);
        }
      },

      // Синхронизация данных с бэкенда
      syncData: async () => {
        const { user } = get();
        if (!user) return;

        try {
          // 1. Загружаем упражнения пользователя из базы
          const { data: exData, error: exErr } = await supabase
            .from('exercises')
            .select('*')
            .order('created_at', { ascending: true });
          
          if (exErr) {
            console.error('Ошибка загрузки упражнений:', exErr);
            Alert.alert('Ошибка загрузки упражнений', exErr.message);
          } else if (exData) {
            if (exData.length === 0) {
              // Если в Supabase пусто (новый пользователь), инициализируем стандартными из локального стейта
              const localExercises = get().exercises;
              const initialized: Exercise[] = [];
              for (const ex of localExercises) {
                // Превращаем дефолтные ID в custom_, чтобы они корректно сохранялись в Supabase
                const newId = ex.id.startsWith('custom_') ? ex.id : `custom_${ex.id}`;
                const newEx = { ...ex, id: newId };
                initialized.push(newEx);

                await supabase.from('exercises').insert({
                  id: newId,
                  user_id: user.id,
                  name: ex.name,
                  category: ex.category,
                  day: ex.day,
                  instructions: ex.instructions,
                  image_url: ex.imageUrl,
                });
              }
              set({ exercises: initialized });
            } else {
              // Если в базе есть упражнения, используем только их (никаких дефолтных слияний)
              const formatted: Exercise[] = exData.map((e) => ({
                id: e.id,
                name: e.name,
                category: e.category,
                day: Number(e.day),
                instructions: e.instructions || [],
                imageUrl: e.image_url,
              }));
              set({ exercises: formatted });
            }
          }

          // 2. Загружаем историю тренировок
          const { data: logData, error: logErr } = await supabase
            .from('workout_logs')
            .select('*');
          
          if (logErr) {
            console.error('Ошибка загрузки истории:', logErr);
            Alert.alert('Ошибка загрузки истории подходов', logErr.message);
          } else if (logData) {
            const formattedLogs: WorkoutLog[] = logData.map(l => ({
              id: l.id,
              date: l.date,
              exerciseId: l.exercise_id,
              weight: Number(l.weight),
              reps: l.reps,
              location: l.location,
            }));
            set({ history: formattedLogs });
          }

          // 3. Загружаем замеры тела
          const { data: measureData, error: measureErr } = await supabase
            .from('body_measurements')
            .select('*');
          
          if (measureErr) {
            console.error('Ошибка загрузки замеров:', measureErr);
            Alert.alert('Ошибка загрузки замеров тела', measureErr.message);
          } else if (measureData) {
            const formattedMeasures: BodyMeasurement[] = measureData.map(m => ({
              id: m.id,
              date: m.date,
              weight: Number(m.weight),
              biceps: m.biceps ? Number(m.biceps) : undefined,
              chest: m.chest ? Number(m.chest) : undefined,
              waist: m.waist ? Number(m.waist) : undefined,
              hips: m.hips ? Number(m.hips) : undefined,
            }));
            set({ measurements: formattedMeasures });
          }

          // 4. Загружаем дневник питания
          const { data: foodData, error: foodErr } = await supabase
            .from('food_logs')
            .select('*');
          
          if (foodErr) {
            console.error('Ошибка загрузки питания:', foodErr);
          } else if (foodData) {
            const formattedFoods: FoodLog[] = foodData.map(f => ({
              id: f.id,
              date: f.date,
              name: f.name,
              calories: Number(f.calories),
              proteins: Number(f.proteins),
              fats: Number(f.fats),
              carbs: Number(f.carbs),
            }));
            set({ foodLogs: formattedFoods });
          }
        } catch (e) {
          console.error("Ошибка при синхронизации:", e);
        }
      },

      startTimer: async (seconds) => {
        const { timerNotificationId } = get();
        if (timerNotificationId) {
          try {
            await Notifications.cancelScheduledNotificationAsync(timerNotificationId);
          } catch (e) {
            console.warn(e);
          }
        }

        let newNotifId = null;
        try {
          const { status } = await Notifications.getPermissionsAsync();
          if (status === 'granted') {
            newNotifId = await Notifications.scheduleNotificationAsync({
              content: {
                title: 'Отдых окончен! 🏋️‍♂️',
                body: 'Пора делать следующий подход!',
                sound: true,
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                seconds: seconds,
              } as any,
            });
          }
        } catch (e) {
          console.warn('Не удалось запланировать уведомление:', e);
        }

        set({
          timerSeconds: seconds,
          timerActive: true,
          timerMax: seconds,
          timerNotificationId: newNotifId,
          timerTargetTimestamp: Date.now() + seconds * 1000,
        });
      },
      stopTimer: async () => {
        const { timerNotificationId } = get();
        if (timerNotificationId) {
          try {
            await Notifications.cancelScheduledNotificationAsync(timerNotificationId);
          } catch (e) {
            console.warn(e);
          }
        }
        set({ timerActive: false, timerNotificationId: null, timerTargetTimestamp: null });
      },
      adjustTimer: async (amount) => {
        const { timerSeconds, timerNotificationId, timerActive } = get();
        const next = Math.max(0, timerSeconds + amount);

        if (timerNotificationId) {
          try {
            await Notifications.cancelScheduledNotificationAsync(timerNotificationId);
          } catch (e) {
            console.warn(e);
          }
        }

        let newNotifId = null;
        if (timerActive && next > 0) {
          try {
            const { status } = await Notifications.getPermissionsAsync();
            if (status === 'granted') {
              newNotifId = await Notifications.scheduleNotificationAsync({
                content: {
                  title: 'Отдых окончен! 🏋️‍♂️',
                  body: 'Пора делать следующий подход!',
                  sound: true,
                },
                trigger: {
                  type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                  seconds: next,
                } as any,
              });
            }
          } catch (e) {
            console.warn('Не удалось перенастроить уведомление:', e);
          }
        }

        set((state) => ({
          timerSeconds: next,
          timerActive: next > 0 ? state.timerActive : false,
          timerMax: Math.max(state.timerMax, next),
          timerNotificationId: newNotifId,
          timerTargetTimestamp: next > 0 ? Date.now() + next * 1000 : null,
        }));
      },
      tickTimer: () => {
        const { timerSeconds } = get();
        if (timerSeconds <= 1) {
          set({ timerSeconds: 0, timerActive: false, timerNotificationId: null, timerTargetTimestamp: null });
        } else {
          set({ timerSeconds: timerSeconds - 1 });
        }
      },
      setNutritionTarget: (target) => set({ nutritionTarget: target }),
      addFoodLog: async (name, calories, proteins, fats, carbs) => {
        const newFood: FoodLog = {
          id: Date.now().toString(),
          date: new Date().toISOString(),
          name: name.trim() || 'Еда',
          calories,
          proteins,
          fats,
          carbs,
        };

        set((state) => ({
          foodLogs: [...state.foodLogs, newFood],
        }));

        const { user } = get();
        if (user) {
          const { error } = await supabase.from('food_logs').insert({
            id: newFood.id,
            user_id: user.id,
            date: newFood.date,
            name: newFood.name,
            calories,
            proteins,
            fats,
            carbs,
          });
          if (error) {
            console.error('Ошибка добавления еды в Supabase:', error);
            Alert.alert('Ошибка синхронизации питания', error.message);
          }
        }
      },
      deleteFoodLog: async (id) => {
        set((state) => ({
          foodLogs: state.foodLogs.filter((f) => f.id !== id),
        }));

        const { user } = get();
        if (user) {
          const { error } = await supabase.from('food_logs').delete().eq('id', id);
          if (error) {
            console.error('Ошибка удаления еды из Supabase:', error);
          }
        }
      },
      startWorkout: () => set({ workoutActive: true, workoutStartTime: new Date().toISOString() }),
      endWorkout: () => set({ workoutActive: false, workoutStartTime: null }),
      addTrainingDay: async (title, icon) => {
        set((state) => {
          const nextNum = state.trainingDays.length > 0 
            ? Math.max(...state.trainingDays.map(d => d.num)) + 1 
            : 1;
          const newDay = { num: nextNum, title: title.trim(), icon: icon.trim() || '💪' };
          return {
            trainingDays: [...state.trainingDays, newDay]
          };
        });
      },
      updateTrainingDay: async (num, title, icon) => {
        set((state) => ({
          trainingDays: state.trainingDays.map((d) => 
            d.num === num ? { ...d, title: title.trim(), icon: icon.trim() || '💪' } : d
          )
        }));
      },
      deleteTrainingDay: async (num) => {
        const { user, exercises } = get();
        // Remove exercises of this day
        const exercisesToDelete = exercises.filter(ex => ex.day === num);
        for (const ex of exercisesToDelete) {
          if (user && ex.id.startsWith('custom_')) {
            await supabase.from('exercises').delete().eq('id', ex.id);
          }
        }
        set((state) => {
          const nextDays = state.trainingDays.filter((d) => d.num !== num);
          const nextExercises = state.exercises.filter((ex) => ex.day !== num);
          let nextActiveDay = state.currentDay;
          if (state.currentDay === num) {
            nextActiveDay = nextDays.length > 0 ? nextDays[0].num : 1;
          }
          return {
            trainingDays: nextDays,
            exercises: nextExercises,
            currentDay: nextActiveDay,
          };
        });
      },
      swapTrainingDays: async (numA, numB) => {
        set((state) => {
          const nextExercises = state.exercises.map((ex) => {
            if (ex.day === numA) return { ...ex, day: numB };
            if (ex.day === numB) return { ...ex, day: numA };
            return ex;
          });
          const nextDays = state.trainingDays.map((d) => {
            if (d.num === numA) return { ...d, num: numB };
            if (d.num === numB) return { ...d, num: numA };
            return d;
          }).sort((a, b) => a.num - b.num);

          let nextActiveDay = state.currentDay;
          if (state.currentDay === numA) nextActiveDay = numB;
          else if (state.currentDay === numB) nextActiveDay = numA;

          return {
            exercises: nextExercises,
            trainingDays: nextDays,
            currentDay: nextActiveDay,
          };
        });

        const { user, exercises } = get();
        if (user) {
          const exA = exercises.filter(ex => ex.day === numB);
          for (const ex of exA) {
            await supabase.from('exercises').update({ day: numB }).eq('id', ex.id);
          }
          const exB = exercises.filter(ex => ex.day === numA);
          for (const ex of exB) {
            await supabase.from('exercises').update({ day: numA }).eq('id', ex.id);
          }
        }
      },
      applyProgram: async (program) => {
        const { user } = get();
        
        const newTrainingDays: WorkoutDay[] = program.days.map(d => ({
          num: d.num,
          title: d.title,
          icon: d.icon,
        }));

        const newExercises: Exercise[] = [];
        program.days.forEach(d => {
          d.exercises.forEach(ex => {
            newExercises.push({
              ...ex,
              id: `custom_${Date.now()}_${Math.random().toString(36).substring(7)}`,
              day: d.num,
            });
          });
        });

        set({
          trainingDays: newTrainingDays,
          exercises: newExercises,
          currentDay: newTrainingDays[0]?.num || 1,
        });

        if (user) {
          try {
             await supabase.from('exercises').delete().eq('user_id', user.id);
             
             const inserts = newExercises.map(ex => ({
               id: ex.id,
               user_id: user.id,
               name: ex.name,
               category: ex.category,
               day: ex.day,
               instructions: ex.instructions,
               image_url: ex.imageUrl,
             }));
             
             for(let i = 0; i < inserts.length; i += 10) {
                await supabase.from('exercises').insert(inserts.slice(i, i + 10));
             }
          } catch(e) {
            console.error('Ошибка применения программы:', e);
          }
        }
      },
      setGeminiApiKey: (key: string) => set({ geminiApiKey: key }),
      setTimerNotificationId: (id: string | null) => set({ timerNotificationId: id }),
    }),
    {
      name: 'fitness-storage-v11', // Обновили версию для полной синхронизации упражнений с бэкендом
      storage: createJSONStorage(() => AsyncStorage), 
      // Не сохраняем в Async Storage данные сессии напрямую, Supabase сделает это сам через свой config
      partialize: (state) => ({
        history: state.history,
        exercises: state.exercises,
        measurements: state.measurements,
        currentDay: state.currentDay,
        trainingDays: state.trainingDays,
        nutritionTarget: state.nutritionTarget,
        foodLogs: state.foodLogs,
        workoutActive: state.workoutActive,
        workoutStartTime: state.workoutStartTime,
        geminiApiKey: state.geminiApiKey,
        timerNotificationId: state.timerNotificationId,
        timerTargetTimestamp: state.timerTargetTimestamp,
      }),
    }
  )
);