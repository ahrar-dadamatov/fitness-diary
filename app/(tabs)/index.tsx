import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  AppState,
  AppStateStatus,
  KeyboardAvoidingView,
  Linking,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Vibration,
  View,
} from 'react-native';

import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';
import Svg, { Circle } from 'react-native-svg';
import { Exercise, useWorkoutStore, WorkoutDay, WorkoutLog } from '../../store';
import { supabase } from '../../supabase';

// Настройка отображения уведомлений в фореграунде (когда приложение открыто)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldSetBadge: false,
  }),
});

export default function HomeScreen() {
  const currentDay = useWorkoutStore((state) => state.currentDay);
  const setCurrentDay = useWorkoutStore((state) => state.setCurrentDay);
  const history = useWorkoutStore((state) => state.history);
  const exercises = useWorkoutStore((state) => state.exercises);
  const trainingDays = useWorkoutStore((state) => state.trainingDays);

  const addLog = useWorkoutStore((state) => state.addLog);
  const deleteLog = useWorkoutStore((state) => state.deleteLog);
  const getLastLog = useWorkoutStore((state) => state.getLastLog);

  const addExercise = useWorkoutStore((state) => state.addExercise);
  const updateExercise = useWorkoutStore((state) => state.updateExercise);
  const deleteExercise = useWorkoutStore((state) => state.deleteExercise);

  const addTrainingDay = useWorkoutStore((state) => state.addTrainingDay);
  const updateTrainingDay = useWorkoutStore((state) => state.updateTrainingDay);
  const deleteTrainingDay = useWorkoutStore((state) => state.deleteTrainingDay);
  const swapTrainingDays = useWorkoutStore((state) => state.swapTrainingDays);

  const session = useWorkoutStore((state) => state.session);
  const setSession = useWorkoutStore((state) => state.setSession);
  const clearUserData = useWorkoutStore((state) => state.clearUserData);

  const timerSeconds = useWorkoutStore((state) => state.timerSeconds);
  const timerActive = useWorkoutStore((state) => state.timerActive);
  const timerMax = useWorkoutStore((state) => state.timerMax);
  const startTimer = useWorkoutStore((state) => state.startTimer);
  const tickTimer = useWorkoutStore((state) => state.tickTimer);
  const stopTimer = useWorkoutStore((state) => state.stopTimer);
  const adjustTimer = useWorkoutStore((state) => state.adjustTimer);
  const timerNotificationId = useWorkoutStore((state) => state.timerNotificationId);
  const setTimerNotificationId = useWorkoutStore((state) => state.setTimerNotificationId);
  const timerTargetTimestamp = useWorkoutStore((state) => state.timerTargetTimestamp);


  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && timerActive && timerTargetTimestamp) {
        const remaining = Math.max(0, Math.round((timerTargetTimestamp - Date.now()) / 1000));
        if (remaining <= 0) {
          useWorkoutStore.setState({
            timerSeconds: 0,
            timerActive: false,
            timerTargetTimestamp: null,
            timerNotificationId: null,
          });
          playTimerEndSound();
        } else {
          useWorkoutStore.setState({
            timerSeconds: remaining,
          });
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [timerActive, timerTargetTimestamp]);

  useEffect(() => {
    async function requestPermissions() {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.warn('Не удалось получить права на отправку уведомлений!');
      }
    }
    requestPermissions();
  }, []);

  // Каждую секунду уменьшаем таймер
  useEffect(() => {
    let interval: any = null;
    if (timerActive && timerSeconds > 0) {
      interval = setInterval(() => {
        tickTimer();
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerActive, timerSeconds]);

  // Звуковое оповещение при окончании таймера
  const playTimerEndSound = async () => {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });
      const { sound } = await Audio.Sound.createAsync(
        { uri: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav' }
      );
      await sound.playAsync();
    } catch (e) {
      console.warn('Не удалось воспроизвести звук:', e);
    }
  };

  const prevTimerActive = useRef(timerActive);
  useEffect(() => {
    if (prevTimerActive.current && !timerActive && timerSeconds === 0) {
      Vibration.vibrate([0, 400, 150, 400]);
      playTimerEndSound();
    }
    prevTimerActive.current = timerActive;
  }, [timerActive, timerSeconds]);

  const workoutActive = useWorkoutStore((state) => state.workoutActive);
  const workoutStartTime = useWorkoutStore((state) => state.workoutStartTime);
  const startWorkout = useWorkoutStore((state) => state.startWorkout);
  const endWorkout = useWorkoutStore((state) => state.endWorkout);

  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [summaryModalVisible, setSummaryModalVisible] = useState(false);
  const [workoutSummary, setWorkoutSummary] = useState<{ duration: string; tonnage: number; sets: number } | null>(null);

  // Каждую секунду увеличиваем секундомер тренировки
  useEffect(() => {
    let interval: any = null;
    if (workoutActive && workoutStartTime) {
      const start = new Date(workoutStartTime).getTime();
      const update = () => {
        const diff = Math.floor((Date.now() - start) / 1000);
        setSessionSeconds(Math.max(0, diff));
      };
      update();
      interval = setInterval(update, 1000);
    } else {
      setSessionSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [workoutActive, workoutStartTime]);

  const handleEndWorkout = () => {
    if (!workoutStartTime) return;

    const elapsedSeconds = Math.floor((Date.now() - new Date(workoutStartTime).getTime()) / 1000);
    const minutes = Math.floor(elapsedSeconds / 60);
    const secs = elapsedSeconds % 60;
    const durationStr = minutes > 0 ? `${minutes} мин ${secs} сек` : `${elapsedSeconds} сек`;

    const sessionLogs = history.filter(
      (log) => new Date(log.date).getTime() >= new Date(workoutStartTime).getTime()
    );
    const tonnage = sessionLogs.reduce((sum, log) => sum + (log.weight * log.reps), 0);
    const setsCount = sessionLogs.length;

    setWorkoutSummary({
      duration: durationStr,
      tonnage,
      sets: setsCount,
    });

    endWorkout();
    setSummaryModalVisible(true);
  };

  // Локальный стейт для названия зала (по умолчанию Adrenaline)
  const [gymLocation, setGymLocation] = useState('Adrenaline');

  // Состояние модального окна добавления/редактирования
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedExId, setSelectedExId] = useState('');
  const [exName, setExName] = useState('');
  const [exCategory, setExCategory] = useState('');
  const [exInstructions, setExInstructions] = useState('');

  // Состояние модального окна добавления/редактирования дня
  const [dayModalVisible, setDayModalVisible] = useState(false);
  const [dayEditMode, setDayEditMode] = useState(false);
  const [selectedDayNum, setSelectedDayNum] = useState<number | null>(null);
  const [dayTitle, setDayTitle] = useState('');
  const [dayIcon, setDayIcon] = useState('💪');

  const handleLogout = () => {
    Alert.alert('Выход', 'Вы уверены, что хотите выйти из аккаунта?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Выйти',
        style: 'destructive',
        onPress: () => {
          supabase.auth.signOut();
        },
      },
    ]);
  };

  const handleOpenAddDayModal = () => {
    setDayEditMode(false);
    setSelectedDayNum(null);
    setDayTitle('');
    setDayIcon('💪');
    setDayModalVisible(true);
  };

  const handleOpenEditDayModal = (day: WorkoutDay) => {
    setDayEditMode(true);
    setSelectedDayNum(day.num);
    setDayTitle(day.title);
    setDayIcon(day.icon);
    setDayModalVisible(true);
  };

  const handleSaveDay = () => {
    if (!dayTitle.trim()) {
      Alert.alert('Ошибка', 'Введите название дня');
      return;
    }
    if (dayEditMode && selectedDayNum !== null) {
      updateTrainingDay(selectedDayNum, dayTitle, dayIcon);
    } else {
      addTrainingDay(dayTitle, dayIcon);
    }
    setDayModalVisible(false);
  };

  const handleDeleteDayPrompt = (num: number) => {
    Alert.alert(
      'Удалить день',
      'Вы уверены, что хотите удалить этот тренировочный день? Все упражнения этого дня будут безвозвратно удалены.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => {
            deleteTrainingDay(num);
            setDayModalVisible(false);
          },
        },
      ]
    );
  };

  // Информация о текущем дне
  const currentDayInfo = trainingDays.find((d) => d.num === currentDay) || trainingDays[0] || { num: 1, title: 'Грудь / Трицепс', icon: '💪' };

  // Фильтруем упражнения под выбранный день
  const activeExercises = exercises.filter((ex) => ex.day === currentDay);

  const handleOpenAddModal = () => {
    setEditMode(false);
    setSelectedExId('');
    setExName('');
    setExCategory('');
    setExInstructions('');
    setModalVisible(true);
  };

  const handleOpenEditModal = (ex: Exercise) => {
    setEditMode(true);
    setSelectedExId(ex.id);
    setExName(ex.name);
    setExCategory(ex.category);
    setExInstructions(ex.instructions ? ex.instructions.join('\n') : '');
    setModalVisible(true);
  };

  const handleSaveExercise = () => {
    if (!exName.trim()) {
      Alert.alert('Ошибка', 'Введите название упражнения');
      return;
    }

    const instructionsArray = exInstructions
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    if (editMode) {
      updateExercise(selectedExId, exName, exCategory, currentDay, instructionsArray);
    } else {
      addExercise(exName, exCategory, currentDay, instructionsArray);
    }

    setModalVisible(false);
  };

  const handleDeleteExercisePrompt = (ex: Exercise) => {
    Alert.alert(
      'Удалить упражнение',
      `Вы уверены, что хотите удалить упражнение «${ex.name}»? История подходов останется, но само упражнение исчезнет из списка тренировок.`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => deleteExercise(ex.id),
        },
      ]
    );
  };

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayLogs = history.filter(
    (log) => new Date(log.date).getTime() >= todayStart.getTime()
  );
  const todayTonnage = todayLogs.reduce((sum, log) => sum + (log.weight * log.reps), 0);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Заголовок */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
            <Text style={[styles.title, { flex: 1 }]}>Фитнес Дневник</Text>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} activeOpacity={0.7}>
              <Text style={styles.logoutBtnText}>Выйти 🚪</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>Прогрессируй с каждой тренировкой</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, flexWrap: 'wrap', gap: 8 }}>
            <View style={styles.tonnageBadge}>
              <Text style={styles.tonnageBadgeText}>🏋️‍♂️ Тоннаж сегодня: {todayTonnage} кг</Text>
            </View>

            {workoutActive ? (
              <View style={styles.stopwatchBadgeRow}>
                <View style={styles.stopwatchBadge}>
                  <Text style={styles.stopwatchBadgeText}>
                    ⏱️ {Math.floor(sessionSeconds / 60).toString().padStart(2, '0')}:
                    {(sessionSeconds % 60).toString().padStart(2, '0')}
                  </Text>
                </View>
                <TouchableOpacity onPress={handleEndWorkout} style={styles.stopWorkoutBtn} activeOpacity={0.7}>
                  <Text style={styles.stopWorkoutBtnText}>Завершить ⏹️</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={startWorkout} style={styles.startWorkoutBtn} activeOpacity={0.7}>
                <Text style={styles.startWorkoutBtnText}>▶️ Начать тренировку</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Выбор зала */}
        <View style={styles.gymContainer}>
          <Text style={styles.sectionLabel}>Текущий зал:</Text>
          <TextInput
            style={styles.gymInput}
            value={gymLocation}
            onChangeText={setGymLocation}
            placeholder="Название зала"
            placeholderTextColor="#888"
          />
        </View>

        {/* Выбор дня */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.daysSelectorScroll}
          contentContainerStyle={styles.daysSelectorContent}
        >
          {trainingDays.map((d) => {
            const isActive = d.num === currentDay;
            return (
              <TouchableOpacity
                key={d.num}
                style={[styles.dayButton, isActive && styles.dayButtonActive]}
                onPress={() => setCurrentDay(d.num)}
                onLongPress={() => handleOpenEditDayModal(d)}
                activeOpacity={0.7}
              >
                <Text style={styles.dayIcon}>{d.icon}</Text>
                <Text style={[styles.dayText, isActive && styles.dayTextActive]}>
                  День {d.num}
                </Text>
                <Text style={[styles.daySub, isActive && styles.daySubActive]} numberOfLines={1}>
                  {d.title.split(' / ')[0]}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Кнопка добавления дня */}
          <TouchableOpacity
            style={styles.addDayButton}
            onPress={handleOpenAddDayModal}
            activeOpacity={0.7}
          >
            <Text style={styles.addDayIcon}>➕</Text>
            <Text style={styles.addDayText}>Добавить</Text>
            <Text style={styles.addDaySub}>день</Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.dayHeaderRow}>
          <Text style={styles.dayTitle}>
            {currentDayInfo.icon} День {currentDayInfo.num}: {currentDayInfo.title}
          </Text>

          <TouchableOpacity style={styles.addExerciseBtnHeader} onPress={handleOpenAddModal}>
            <Text style={styles.addExerciseBtnTextHeader}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Список упражнений */}
        {activeExercises.length === 0 ? (
          <View style={styles.emptyExercisesContainer}>
            <Text style={styles.emptyExercisesText}>В этот день пока нет упражнений.</Text>
            <TouchableOpacity style={styles.addExerciseBtnEmpty} onPress={handleOpenAddModal}>
              <Text style={styles.addExerciseBtnTextEmpty}>Создать первое упражнение</Text>
            </TouchableOpacity>
          </View>
        ) : (
          activeExercises.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              location={gymLocation}
              history={history}
              addLog={addLog}
              deleteLog={deleteLog}
              lastLog={getLastLog(exercise.id)}
              onEdit={() => handleOpenEditModal(exercise)}
              onDelete={() => handleDeleteExercisePrompt(exercise)}
            />
          ))
        )}

        {/* Нижняя кнопка добавления */}
        {activeExercises.length > 0 && (
          <TouchableOpacity style={styles.bottomAddBtn} onPress={handleOpenAddModal}>
            <Text style={styles.bottomAddBtnText}>+ Добавить упражнение в День {currentDay}</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Модальное окно создания/редактирования */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          >
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>
                  {editMode ? 'Редактировать упражнение' : 'Новое упражнение'}
                </Text>

                <Text style={styles.modalSubtitle}>
                  Будет добавлено в День {currentDayInfo.num} ({currentDayInfo.title})
                </Text>

                <View style={styles.modalForm}>
                  <Text style={styles.fieldLabel}>Название упражнения *</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={exName}
                    onChangeText={setExName}
                    placeholder="Например: Жим штанги лежа"
                    placeholderTextColor="#64748B"
                  />

                  <Text style={styles.fieldLabel}>Группа мышц / Категория</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={exCategory}
                    onChangeText={setExCategory}
                    placeholder="Например: Грудь, Спина, Трицепс"
                    placeholderTextColor="#64748B"
                  />

                  <Text style={styles.fieldLabel}>Инструкция выполнения (каждый пункт с новой строки)</Text>
                  <TextInput
                    style={[styles.modalInput, styles.modalInputMultiline]}
                    value={exInstructions}
                    onChangeText={setExInstructions}
                    placeholder="1. Лягте на скамью...&#10;2. Возьмите штангу..."
                    placeholderTextColor="#64748B"
                    multiline
                    numberOfLines={4}
                  />
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.modalBtnCancel]}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.modalBtnCancelText}>Отмена</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.modalBtnSave]}
                    onPress={handleSaveExercise}
                  >
                    <Text style={styles.modalBtnSaveText}>Сохранить</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Модальное окно создания/редактирования дня */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={dayModalVisible}
        onRequestClose={() => setDayModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setDayModalVisible(false)}
          >
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>
                  {dayEditMode ? 'Редактировать день' : 'Добавить день'}
                </Text>

                <Text style={styles.modalSubtitle}>
                  {dayEditMode ? `Редактирование Дня ${selectedDayNum}` : 'Создание нового тренировочного дня'}
                </Text>

                <View style={styles.modalForm}>
                  <Text style={styles.fieldLabel}>Название дня *</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={dayTitle}
                    onChangeText={setDayTitle}
                    placeholder="Например: Кардио / Пресс"
                    placeholderTextColor="#64748B"
                  />

                  <Text style={styles.fieldLabel}>Иконка (Emoji) *</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={dayIcon}
                    onChangeText={setDayIcon}
                    placeholder="Например: 🏃‍♂️"
                    placeholderTextColor="#64748B"
                  />

                  {dayEditMode && trainingDays.length > 1 && (
                    <View style={{ marginTop: 15 }}>
                      <Text style={styles.fieldLabel}>Поменять местами с другим днем:</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 5 }}>
                        {trainingDays
                          .filter((d) => d.num !== selectedDayNum)
                          .map((d) => (
                            <TouchableOpacity
                              key={d.num}
                              style={{
                                backgroundColor: '#334155',
                                paddingVertical: 8,
                                paddingHorizontal: 12,
                                borderRadius: 8,
                                borderWidth: 1,
                                borderColor: '#475569',
                              }}
                              onPress={() => {
                                if (selectedDayNum !== null) {
                                  swapTrainingDays(selectedDayNum, d.num);
                                  setDayModalVisible(false);
                                }
                              }}
                            >
                              <Text style={{ color: '#F1F5F9', fontSize: 13 }}>
                                {d.icon} День {d.num}
                              </Text>
                            </TouchableOpacity>
                          ))}
                      </View>
                    </View>
                  )}
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalBtn, dayEditMode ? { flex: 0.3, backgroundColor: '#334155' } : styles.modalBtnCancel]}
                    onPress={() => setDayModalVisible(false)}
                  >
                    <Text style={styles.modalBtnCancelText}>Отмена</Text>
                  </TouchableOpacity>

                  {dayEditMode && selectedDayNum !== null && (
                    <TouchableOpacity
                      style={[styles.modalBtn, { backgroundColor: '#EF4444', flex: 0.3 }]}
                      onPress={() => handleDeleteDayPrompt(selectedDayNum)}
                    >
                      <Text style={styles.modalBtnCancelText}>Удалить</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[styles.modalBtn, styles.modalBtnSave, dayEditMode ? { flex: 0.3 } : {}]}
                    onPress={handleSaveDay}
                  >
                    <Text style={styles.modalBtnSaveText}>Сохранить</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Модальное окно сводки завершенной тренировки */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={summaryModalVisible}
        onRequestClose={() => setSummaryModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSummaryModalVisible(false)}
        >
          <TouchableWithoutFeedback>
            <View style={[styles.modalContent, { alignItems: 'center' }]}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🏆</Text>
              <Text style={[styles.modalTitle, { fontSize: 22, marginBottom: 8 }]}>Отличная работа!</Text>
              <Text style={styles.modalSubtitle}>Ваша тренировка успешно завершена</Text>

              {workoutSummary && (
                <View style={styles.summaryBox}>
                  <View style={styles.summaryRowItem}>
                    <Text style={styles.summaryItemLabel}>⏱️ Длительность:</Text>
                    <Text style={styles.summaryItemValue}>{workoutSummary.duration}</Text>
                  </View>
                  <View style={styles.summaryRowItem}>
                    <Text style={styles.summaryItemLabel}>🏋️‍♂️ Общий объем:</Text>
                    <Text style={styles.summaryItemValue}>{workoutSummary.tonnage} кг</Text>
                  </View>
                  <View style={styles.summaryRowItem}>
                    <Text style={styles.summaryItemLabel}>✅ Выполнено подходов:</Text>
                    <Text style={styles.summaryItemValue}>{workoutSummary.sets}</Text>
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: '#10B981', width: '100%', marginTop: 20 }]}
                onPress={() => setSummaryModalVisible(false)}
              >
                <Text style={styles.saveBtnText}>Супер!</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      {/* Плавающий таймер отдыха */}
      {
        timerSeconds > 0 && (
          <View style={styles.floatingTimerCard}>
            <View style={styles.timerHeader}>
              <Text style={styles.timerTitle}>⏱️ Отдых после подхода</Text>
            </View>

            <View style={{ alignItems: 'center', justifyContent: 'center', marginVertical: 15 }}>
              <Svg width="140" height="140" viewBox="0 0 140 140">
                <Circle cx="70" cy="70" r="60" stroke="#334155" strokeWidth="12" fill="none" />
                <Circle
                  cx="70"
                  cy="70"
                  r="60"
                  stroke="#0284C7"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={2 * Math.PI * 60}
                  strokeDashoffset={(2 * Math.PI * 60) * (1 - (timerSeconds / (timerMax || 90)))}
                  strokeLinecap="round"
                  transform="rotate(-90 70 70)"
                />
              </Svg>
              <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={[styles.timerCount, { fontSize: 36, marginBottom: 0 }]}>
                  {Math.floor(timerSeconds / 60).toString().padStart(2, '0')}:
                  {(timerSeconds % 60).toString().padStart(2, '0')}
                </Text>
              </View>
            </View>

            <View style={styles.timerActions}>
              <TouchableOpacity onPress={() => adjustTimer(-30)} style={styles.timerActionBtn} activeOpacity={0.7}>
                <Text style={styles.timerActionText}>-30с</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => timerActive ? stopTimer() : startTimer(timerSeconds)} style={[styles.timerActionBtn, { backgroundColor: '#0284C7' }]} activeOpacity={0.7}>
                <Text style={styles.timerActionText}>{timerActive ? 'Пауза' : 'Старт'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => adjustTimer(30)} style={styles.timerActionBtn} activeOpacity={0.7}>
                <Text style={styles.timerActionText}>+30с</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => adjustTimer(-timerSeconds)} style={[styles.timerActionBtn, { backgroundColor: '#EF4444' }]} activeOpacity={0.7}>
                <Text style={styles.timerActionText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        )
      }
    </KeyboardAvoidingView >
  );
}
interface ExerciseCardProps {
  exercise: Exercise;
  location: string;
  history: WorkoutLog[];
  addLog: (Id: string, weight: number, reps: number, location?: string) => void;
  deleteLog: (id: string) => void;
  lastLog: WorkoutLog | null;
  onEdit: () => void;
  onDelete: () => void;
}

function ExerciseCard({ exercise, location, history, addLog, deleteLog, lastLog, onEdit, onDelete }: ExerciseCardProps) {
  const [weightStr, setWeightStr] = useState('');
  const [repsStr, setRepsStr] = useState('');
  const [isLb, setIsLb] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const translateX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 15;
      },
      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.dx < 0) {
          const val = Math.max(gestureState.dx, -120);
          translateX.setValue(val);
        } else {
          translateX.setValue(0);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx < -65) {
          Animated.spring(translateX, {
            toValue: -85,
            useNativeDriver: true,
            tension: 40,
            friction: 7,
          }).start();
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 40,
            friction: 7,
          }).start();
        }
      },
    })
  ).current;

  const resetSwipe = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      tension: 40,
      friction: 7,
    }).start();
  };

  useEffect(() => {
    if (lastLog) {
      setWeightStr(lastLog.weight.toString());
      setRepsStr(lastLog.reps.toString());
    } else {
      setWeightStr('20');
      setRepsStr('10');
    }
  }, [exercise.id, lastLog]);

  const weight = parseFloat(weightStr) || 0;
  const parsedWeightKg = isLb ? Math.round(weight * 0.45359237 * 10) / 10 : weight;
  const reps = parseInt(repsStr, 10) || 0;

  const adjustWeight = (amount: number) => {
    setWeightStr((prev) => {
      const val = Math.max(0, (parseFloat(prev) || 0) + amount);
      return val % 1 === 0 ? val.toString() : val.toFixed(1);
    });
  };

  const adjustReps = (amount: number) => {
    setRepsStr((prev) => Math.max(0, (parseInt(prev, 10) || 0) + amount).toString());
  };

  const handleSave = () => {
    if (parsedWeightKg > 0 && reps > 0) {
      addLog(exercise.id, parsedWeightKg, reps, location);
    }
  };

  const watchOnYouTube = () => {
    const query = `${exercise.name} техника выполнения`;
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    Linking.openURL(url).catch((err) => console.error("Couldn't load page", err));
  };

  const handleDeleteWithReset = () => {
    onDelete();
    setTimeout(resetSwipe, 300);
  };
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todaySets = history.filter(
    (log) =>
      log.exerciseId === exercise.id &&
      new Date(log.date).getTime() >= todayStart.getTime()
  );
  const exerciseLogs = history.filter((log) => log.exerciseId === exercise.id);
  const bestLog = exerciseLogs.length > 0
    ? [...exerciseLogs].sort((a, b) => b.weight - a.weight)[0]
    : null;

  return (
    <View style={styles.cardSwipeContainer}>
      <TouchableOpacity
        style={styles.deleteSwipeBtn}
        onPress={handleDeleteWithReset}
        activeOpacity={0.8}
      >
        <Text style={styles.deleteSwipeBtnText}>🗑️</Text>
      </TouchableOpacity>

      <Animated.View
        style={[styles.card, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.exerciseName}>{exercise.name}</Text>
            <Text style={styles.exerciseCategory}>{exercise.category}</Text>
          </View>
          <View style={styles.actionHeaderRow}>
            <TouchableOpacity onPress={onEdit} style={styles.editBtn} activeOpacity={0.7}>
              <Text style={styles.editBtnText}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.infoBtn, showInstructions && styles.infoBtnActive]}
              onPress={() => setShowInstructions(!showInstructions)}
            >
              <Text style={styles.infoBtnText}>{showInstructions ? 'Скрыть' : 'Техника 📖'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {showInstructions && (
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsTitle}>Техника выполнения:</Text>
            {exercise.instructions?.map((step, idx) => (
              <Text key={idx} style={styles.instructionStep}>
                {idx + 1}. {step}
              </Text>
            ))}
            <TouchableOpacity style={styles.youtubeBtn} onPress={watchOnYouTube} activeOpacity={0.8}>
              <Text style={styles.youtubeBtnText}>🎥 Смотреть видео на YouTube</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.historyContainer}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <Text style={styles.historyLabel}>Прошлый раз:</Text>
            {bestLog && (
              <Text style={styles.recordLabel}>
                🏆 Рекорд: {bestLog.weight} кг × {bestLog.reps}
              </Text>
            )}
          </View>
          {lastLog ? (
            <View style={styles.historyRow}>
              <Text style={styles.historyValue}>
                🔥 {lastLog.weight} кг × {lastLog.reps}
              </Text>
              <Text style={styles.historyLocation}>
                в зал {lastLog.location} ({new Date(lastLog.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })})
              </Text>
            </View>
          ) : (
            <Text style={styles.noHistory}>Ещё нет записей. Начните сегодня!</Text>
          )}
        </View>

        <View style={styles.inputRow}>
          <View style={styles.inputBlock}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={styles.inputLabel}>{isLb ? 'Вес (lb)' : 'Вес (кг)'}</Text>
              <TouchableOpacity
                onPress={() => {
                  const currentVal = parseFloat(weightStr) || 0;
                  if (currentVal > 0) {
                    if (isLb) {
                      // Convert LB to KG
                      const kg = currentVal * 0.45359237;
                      setWeightStr(kg % 1 === 0 ? kg.toString() : kg.toFixed(1));
                    } else {
                      // Convert KG to LB
                      const lb = currentVal / 0.45359237;
                      setWeightStr(lb % 1 === 0 ? lb.toString() : lb.toFixed(1));
                    }
                  }
                  setIsLb(!isLb);
                }}
                style={styles.unitToggleBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.unitToggleText}>{isLb ? '➡️ кг' : '➡️ lb'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.counterRow}>
              <TouchableOpacity style={styles.counterBtn} onPress={() => adjustWeight(isLb ? -5 : -2.5)}>
                <Text style={styles.counterBtnText}>{isLb ? '-5' : '-2.5'}</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                value={weightStr}
                onChangeText={setWeightStr}
                keyboardType="numeric"
                selectTextOnFocus
              />
              <TouchableOpacity style={styles.counterBtn} onPress={() => adjustWeight(isLb ? 5 : 2.5)}>
                <Text style={styles.counterBtnText}>{isLb ? '+5' : '+2.5'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputBlock}>
            <Text style={[styles.inputLabel, { marginBottom: 6 }]}>Повторы</Text>
            <View style={styles.counterRow}>
              <TouchableOpacity style={styles.counterBtn} onPress={() => adjustReps(-1)}>
                <Text style={styles.counterBtnText}>-1</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                value={repsStr}
                onChangeText={setRepsStr}
                keyboardType="numeric"
                selectTextOnFocus
              />
              <TouchableOpacity style={styles.counterBtn} onPress={() => adjustReps(1)}>
                <Text style={styles.counterBtnText}>+1</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
          <Text style={styles.saveBtnText}>
            Записать подход ({isLb ? `${weight} lb ≈ ` : ''}{parsedWeightKg} кг × {reps})
          </Text>
        </TouchableOpacity>

        {todaySets.length > 0 && (
          <View style={styles.todaySetsContainer}>
            <Text style={styles.todaySetsLabel}>Выполнено сегодня:</Text>
            <View style={styles.todaySetsList}>
              {todaySets.map((set, idx) => (
                <View key={set.id} style={styles.todaySetBadge}>
                  <Text style={styles.todaySetText}>
                    {idx + 1}. {set.weight} кг × {set.reps}
                  </Text>
                  <TouchableOpacity onPress={() => deleteLog(set.id)} style={styles.deleteSetBtn}>
                    <Text style={styles.deleteSetText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A', // Sleek dark slate
  },
  content: {
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 48 : 24,
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
  gymContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionLabel: {
    color: '#94A3B8',
    fontWeight: '600',
    marginRight: 10,
    fontSize: 15,
  },
  gymInput: {
    flex: 1,
    color: '#38BDF8', // Cyan highlight
    fontSize: 16,
    fontWeight: '700',
    padding: 0,
  },
  daysSelectorScroll: {
    marginBottom: 20,
  },
  daysSelectorContent: {
    paddingHorizontal: 4,
    flexDirection: 'row',
  },
  dayButton: {
    width: 85,
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  dayButtonActive: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
  },
  addDayButton: {
    width: 85,
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    marginHorizontal: 4,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#475569',
    justifyContent: 'center',
  },
  addDayIcon: {
    fontSize: 18,
    marginBottom: 4,
  },
  addDayText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  addDaySub: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 2,
  },
  dayIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  dayText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  dayTextActive: {
    color: '#FFFFFF',
  },
  daySub: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  daySubActive: {
    color: '#E0F2FE',
  },
  dayTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 16,
    marginTop: 8,
  },
  cardSwipeContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  deleteSwipeBtn: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    backgroundColor: '#EF4444',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteSwipeBtnText: {
    fontSize: 22,
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editBtn: {
    backgroundColor: '#334155',
    padding: 6,
    borderRadius: 8,
    marginRight: 8,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtnText: {
    fontSize: 14,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  exerciseCategory: {
    fontSize: 12,
    color: '#38BDF8',
    marginTop: 2,
    fontWeight: '600',
  },
  historyContainer: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#38BDF8',
  },
  historyLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 2,
    flexWrap: 'wrap',
  },
  historyValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#38BDF8',
    marginRight: 6,
  },
  historyLocation: {
    fontSize: 12,
    color: '#94A3B8',
  },
  noHistory: {
    fontSize: 13,
    color: '#64748B',
    fontStyle: 'italic',
    marginTop: 2,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  inputBlock: {
    flex: 0.48,
  },
  inputLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
    marginBottom: 6,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  counterBtn: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBtnText: {
    color: '#F8FAFC',
    fontWeight: '700',
    fontSize: 12,
  },
  input: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 8,
  },
  saveBtn: {
    backgroundColor: '#0284C7',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  todaySetsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 10,
  },
  todaySetsLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
    marginBottom: 6,
  },
  todaySetsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  todaySetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  todaySetText: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
  },
  deleteSetBtn: {
    marginLeft: 8,
    padding: 2,
  },
  deleteSetText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: 'bold',
  },
  infoBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  infoBtnActive: {
    backgroundColor: '#0284C7',
  },
  infoBtnText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '600',
  },
  instructionsContainer: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  instructionsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  instructionStep: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
    marginBottom: 6,
  },
  youtubeBtn: {
    backgroundColor: '#EF444415',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  youtubeBtnText: {
    color: '#F8FAFC',
    fontWeight: '700',
    fontSize: 13,
  },
  dayHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  addExerciseBtnHeader: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#38BDF8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addExerciseBtnTextHeader: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyExercisesContainer: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  emptyExercisesText: {
    color: '#94A3B8',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 16,
  },
  addExerciseBtnEmpty: {
    backgroundColor: '#0284C7',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  addExerciseBtnTextEmpty: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  bottomAddBtn: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#475569',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  bottomAddBtnText: {
    color: '#94A3B8',
    fontWeight: '600',
    fontSize: 14,
  },
  inlineActionBtn: {
    padding: 6,
    marginLeft: 6,
  },
  inlineActionText: {
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  modalForm: {
    marginBottom: 20,
  },
  fieldLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 12,
  },
  modalInput: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  modalInputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalBtn: {
    flex: 0.48,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalBtnCancel: {
    backgroundColor: '#334155',
  },
  modalBtnCancelText: {
    color: '#F8FAFC',
    fontWeight: '700',
    fontSize: 15,
  },
  modalBtnSave: {
    backgroundColor: '#0284C7',
  },
  modalBtnSaveText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  logoutBtn: {
    backgroundColor: '#EF444420',
    borderWidth: 1,
    borderColor: '#EF444450',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  logoutBtnText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
  },
  unitToggleBtn: {
    backgroundColor: '#334155',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  unitToggleText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  floatingTimerCard: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 110 : 95,
    left: 16,
    right: 16,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#38BDF8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  timerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  timerTitle: {
    fontSize: 14,
    color: '#F8FAFC',
    fontWeight: '700',
  },
  timerCount: {
    fontSize: 20,
    color: '#38BDF8',
    fontWeight: '800',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#0F172A',
    borderRadius: 3,
    marginBottom: 14,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#38BDF8',
    borderRadius: 3,
  },
  timerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timerActionBtn: {
    flex: 0.23,
    backgroundColor: '#334155',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  tonnageBadge: {
    backgroundColor: '#10B98115',
    borderWidth: 1,
    borderColor: '#10B98130',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tonnageBadgeText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700',
  },
  recordLabel: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '700',
  },
  startWorkoutBtn: {
    backgroundColor: '#0284C7',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  startWorkoutBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  stopwatchBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stopwatchBadge: {
    backgroundColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  stopwatchBadgeText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
  },
  stopWorkoutBtn: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  stopWorkoutBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  summaryBox: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginTop: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  summaryRowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryItemLabel: {
    fontSize: 14,
    color: '#94A3B8',
  },
  summaryItemValue: {
    fontSize: 14,
    color: '#F8FAFC',
    fontWeight: '700',
  },
});