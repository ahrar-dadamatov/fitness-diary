import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useWorkoutStore, BodyMeasurement } from '../../store';


export default function MeasurementsScreen() {
  const measurements = useWorkoutStore((state) => state.measurements);
  const addMeasurement = useWorkoutStore((state) => state.addMeasurement);
  const deleteMeasurement = useWorkoutStore((state) => state.deleteMeasurement);
  const session = useWorkoutStore((state) => state.session);
  const nutritionTarget = useWorkoutStore((state) => state.nutritionTarget);
  const setNutritionTarget = useWorkoutStore((state) => state.setNutritionTarget);
  const foodLogs = useWorkoutStore((state) => state.foodLogs);
  const addFoodLog = useWorkoutStore((state) => state.addFoodLog);
  const deleteFoodLog = useWorkoutStore((state) => state.deleteFoodLog);

  // Стейты ввода
  const [weightStr, setWeightStr] = useState('');
  const [bicepsStr, setBicepsStr] = useState('');
  const [chestStr, setChestStr] = useState('');
  const [waistStr, setWaistStr] = useState('');
  const [hipsStr, setHipsStr] = useState('');

  // Форма раскрытия
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [isFoodFormOpen, setIsFoodFormOpen] = useState(false);

  // Стейты калькулятора калорий
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [ageStr, setAgeStr] = useState('');
  const [heightStr, setHeightStr] = useState('');
  const [activity, setActivity] = useState<'1.2' | '1.375' | '1.55' | '1.725'>('1.375');
  const [goal, setGoal] = useState<'lose' | 'maintain' | 'gain'>('maintain');

  // Стейты дневника питания
  const [foodName, setFoodName] = useState('');
  const [foodCalories, setFoodCalories] = useState('');
  const [foodProteins, setFoodProteins] = useState('');
  const [foodFats, setFoodFats] = useState('');
  const [foodCarbs, setFoodCarbs] = useState('');

  // Сортируем замеры по дате от новых к старым
  const sortedMeasurements = [...measurements].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const latest = sortedMeasurements[0] || null;
  const previous = sortedMeasurements[1] || null;

  // Предзаполнение полей при открытии формы прошлыми значениями
  useEffect(() => {
    if (latest) {
      setWeightStr(latest.weight?.toString() || '');
      setBicepsStr(latest.biceps?.toString() || '');
      setChestStr(latest.chest?.toString() || '');
      setWaistStr(latest.waist?.toString() || '');
      setHipsStr(latest.hips?.toString() || '');
    }
  }, [latest, isFormOpen]);

  const handleSave = () => {
    const weight = parseFloat(weightStr);
    if (isNaN(weight) || weight <= 0) {
      Alert.alert('Ошибка', 'Пожалуйста, введите корректный вес тела (кг) — это обязательное поле.');
      return;
    }

    const biceps = parseFloat(bicepsStr) || undefined;
    const chest = parseFloat(chestStr) || undefined;
    const waist = parseFloat(waistStr) || undefined;
    const hips = parseFloat(hipsStr) || undefined;

    addMeasurement(weight, biceps, chest, waist, hips);
    setIsFormOpen(false);
    Alert.alert('Успех', 'Замеры сохранены!');
  };

  const handleDeletePrompt = (item: BodyMeasurement) => {
    Alert.alert(
      'Удалить запись',
      `Вы уверены, что хотите удалить замер от ${new Date(item.date).toLocaleDateString('ru-RU')}?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => deleteMeasurement(item.id),
        },
      ]
    );
  };

  const handleCalculateNutrition = () => {
    const age = parseInt(ageStr, 10);
    const height = parseFloat(heightStr);
    const weight = latest ? latest.weight : null;

    if (!weight) {
      Alert.alert('Ошибка', 'Пожалуйста, запишите хотя бы один замер веса тела перед расчетом.');
      return;
    }

    if (isNaN(age) || age <= 0 || isNaN(height) || height <= 0) {
      Alert.alert('Ошибка', 'Пожалуйста, заполните возраст и рост корректно.');
      return;
    }

    // Mifflin-St Jeor
    let bmr = 10 * weight + 6.25 * height - 5 * age;
    if (gender === 'male') {
      bmr += 5;
    } else {
      bmr -= 161;
    }

    const factor = parseFloat(activity);
    let kcal = Math.round(bmr * factor);

    if (goal === 'lose') {
      kcal = Math.round(kcal * 0.85);
    } else if (goal === 'gain') {
      kcal = Math.round(kcal * 1.15);
    }

    // БЖУ: Белки 2г/кг, Жиры 1г/кг, Углеводы — остаток
    const proteins = Math.round(weight * 2);
    const fats = Math.round(weight * 1);
    const carbKcal = kcal - (proteins * 4 + fats * 9);
    const carbs = Math.max(0, Math.round(carbKcal / 4));

    setNutritionTarget({
      calories: kcal,
      proteins,
      fats,
      carbs,
    });

    setIsCalcOpen(false);
    Alert.alert('Успешно', `Ваша цель сохранена!\nКалории: ${kcal} ккал\nБелки: ${proteins}г • Жиры: ${fats}г • Углеводы: ${carbs}г`);
  };

  const handleSaveFood = () => {
    if (!foodName.trim()) {
      Alert.alert('Ошибка', 'Пожалуйста, введите название блюда/продукта.');
      return;
    }

    const kcal = parseInt(foodCalories, 10);
    if (isNaN(kcal) || kcal <= 0) {
      Alert.alert('Ошибка', 'Пожалуйста, укажите калорийность блюда.');
      return;
    }

    const prot = parseInt(foodProteins, 10) || 0;
    const fat = parseInt(foodFats, 10) || 0;
    const carb = parseInt(foodCarbs, 10) || 0;

    addFoodLog(foodName, kcal, prot, fat, carb);

    setFoodName('');
    setFoodCalories('');
    setFoodProteins('');
    setFoodFats('');
    setFoodCarbs('');
    setIsFoodFormOpen(false);
  };

  // Функция для расчета разницы (прогресса)
  const renderProgressTag = (currentVal?: number, prevVal?: number, isWaistOrHips = false) => {
    if (currentVal === undefined || prevVal === undefined) return null;
    const diff = currentVal - prevVal;
    if (diff === 0) return <Text style={styles.diffEqual}>0</Text>;

    const diffStr = diff > 0 ? `+${diff.toFixed(1)}` : `${diff.toFixed(1)}`;
    
    // Для талии и бедер уменьшение — это хорошо (зеленый), а увеличение — плохо (красный).
    // Для веса/мышц (бицепс, грудь) увеличение — обычно хорошо (зеленый).
    let isGood = diff > 0;
    if (isWaistOrHips) {
      isGood = diff < 0;
    }

    return (
      <Text style={isGood ? styles.diffGood : styles.diffBad}>
        {diffStr} {isGood ? '📈' : '📉'}
      </Text>
    );
  };

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayFoods = foodLogs.filter(
    (f) => new Date(f.date).getTime() >= todayStart.getTime()
  );

  const eatenCalories = todayFoods.reduce((sum, f) => sum + f.calories, 0);
  const eatenProteins = todayFoods.reduce((sum, f) => sum + f.proteins, 0);
  const eatenFats = todayFoods.reduce((sum, f) => sum + f.fats, 0);
  const eatenCarbs = todayFoods.reduce((sum, f) => sum + f.carbs, 0);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Заголовок */}
        <View style={styles.header}>
          <Text style={styles.title}>Замеры тела</Text>
          <Text style={styles.subtitle}>Контролируй вес и объемы мышц</Text>
        </View>

        {/* Карточка суточных калорий БЖУ */}
        {nutritionTarget && (
          <View style={styles.nutritionCard}>
            <View style={styles.nutritionHeader}>
              <Text style={styles.nutritionTitle}>🎯 Баланс калорий за сегодня</Text>
              <TouchableOpacity onPress={() => setNutritionTarget(null)} style={styles.nutritionResetBtn}>
                <Text style={styles.nutritionResetText}>Сбросить цель ✕</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
              <Text style={styles.nutritionKcal}>
                Съедено: {eatenCalories} / {nutritionTarget.calories} ккал
              </Text>
              <Text style={{ color: eatenCalories > nutritionTarget.calories ? '#EF4444' : '#10B981', fontSize: 12, fontWeight: '700' }}>
                {eatenCalories > nutritionTarget.calories ? `Лимит превышен на ${eatenCalories - nutritionTarget.calories} ккал` : `Осталось: ${nutritionTarget.calories - eatenCalories} ккал`}
              </Text>
            </View>
            <View style={[styles.nutritionBarBg, { height: 10, marginBottom: 16 }]}>
              <View style={[styles.nutritionBarFill, { width: `${Math.min(100, (eatenCalories / nutritionTarget.calories) * 100)}%`, backgroundColor: eatenCalories > nutritionTarget.calories ? '#EF4444' : '#38BDF8' }]} />
            </View>
            
            <View style={styles.nutritionBarsRow}>
              {/* Белки */}
              <View style={styles.nutritionBarItem}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={styles.nutritionBarLabel}>Белки (Б)</Text>
                  <Text style={styles.nutritionBarValue}>{eatenProteins}г из {nutritionTarget.proteins}г</Text>
                </View>
                <View style={styles.nutritionBarBg}>
                  <View style={[styles.nutritionBarFill, { width: `${Math.min(100, (eatenProteins / nutritionTarget.proteins) * 100)}%`, backgroundColor: '#EF4444' }]} />
                </View>
              </View>

              {/* Жиры */}
              <View style={styles.nutritionBarItem}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={styles.nutritionBarLabel}>Жиры (Ж)</Text>
                  <Text style={styles.nutritionBarValue}>{eatenFats}г из {nutritionTarget.fats}г</Text>
                </View>
                <View style={styles.nutritionBarBg}>
                  <View style={[styles.nutritionBarFill, { width: `${Math.min(100, (eatenFats / nutritionTarget.fats) * 100)}%`, backgroundColor: '#F59E0B' }]} />
                </View>
              </View>

              {/* Углеводы */}
              <View style={styles.nutritionBarItem}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={styles.nutritionBarLabel}>Углеводы (У)</Text>
                  <Text style={styles.nutritionBarValue}>{eatenCarbs}г из {nutritionTarget.carbs}г</Text>
                </View>
                <View style={styles.nutritionBarBg}>
                  <View style={[styles.nutritionBarFill, { width: `${Math.min(100, (eatenCarbs / nutritionTarget.carbs) * 100)}%`, backgroundColor: '#10B981' }]} />
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Кнопка открытия калькулятора */}
        <TouchableOpacity
          style={[styles.toggleFormBtn, { backgroundColor: '#0284C720', borderColor: '#0284C740', marginBottom: 20 }]}
          onPress={() => setIsCalcOpen(!isCalcOpen)}
          activeOpacity={0.8}
        >
          <Text style={[styles.toggleFormBtnText, { color: '#38BDF8' }]}>
            {isCalcOpen ? 'Закрыть калькулятор калорий ✕' : '🧮 Рассчитать калории и БЖУ'}
          </Text>
        </TouchableOpacity>

        {/* Форма калькулятора калорий */}
        {isCalcOpen && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Калькулятор суточной нормы</Text>

            {/* Выбор пола */}
            <Text style={styles.inputLabel}>Пол</Text>
            <View style={styles.genderRow}>
              <TouchableOpacity
                style={[styles.genderBtn, gender === 'male' && styles.genderBtnActive]}
                onPress={() => setGender('male')}
              >
                <Text style={[styles.genderBtnText, gender === 'male' && styles.genderBtnTextActive]}>🙋‍♂️ Мужчина</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.genderBtn, gender === 'female' && styles.genderBtnActive]}
                onPress={() => setGender('female')}
              >
                <Text style={[styles.genderBtnText, gender === 'female' && styles.genderBtnTextActive]}>🙋‍♀️ Женщина</Text>
              </TouchableOpacity>
            </View>

            {/* Возраст и рост */}
            <View style={styles.formRow}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Возраст (лет)</Text>
                <TextInput
                  style={styles.input}
                  value={ageStr}
                  onChangeText={setAgeStr}
                  keyboardType="numeric"
                  placeholder="25"
                  placeholderTextColor="#64748B"
                />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Рост (см)</Text>
                <TextInput
                  style={styles.input}
                  value={heightStr}
                  onChangeText={setHeightStr}
                  keyboardType="numeric"
                  placeholder="178"
                  placeholderTextColor="#64748B"
                />
              </View>
            </View>

            {/* Активность */}
            <Text style={styles.inputLabel}>Уровень физической активности</Text>
            <View style={styles.optionList}>
              {[
                { label: 'Сидячий (нет тренировок)', val: '1.2' },
                { label: 'Умеренный (1-3 тренировки/нед)', val: '1.375' },
                { label: 'Активный (3-5 тренировок/нед)', val: '1.55' },
                { label: 'Тяжелый спорт (ежедневно)', val: '1.725' },
              ].map((item) => (
                <TouchableOpacity
                  key={item.val}
                  style={[styles.optionBtn, activity === item.val && styles.optionBtnActive]}
                  onPress={() => setActivity(item.val as any)}
                >
                  <Text style={[styles.optionBtnText, activity === item.val && styles.optionBtnTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Цель */}
            <Text style={styles.inputLabel}>Ваша цель</Text>
            <View style={styles.optionList}>
              {[
                { label: '🔥 Сбросить вес (дефицит 15%)', val: 'lose' },
                { label: '⚖️ Поддержание веса', val: 'maintain' },
                { label: '💪 Набрать массу (профицит 15%)', val: 'gain' },
              ].map((item) => (
                <TouchableOpacity
                  key={item.val}
                  style={[styles.optionBtn, goal === item.val && styles.optionBtnActive]}
                  onPress={() => setGoal(item.val as any)}
                >
                  <Text style={[styles.optionBtnText, goal === item.val && styles.optionBtnTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#0284C7' }]} onPress={handleCalculateNutrition} activeOpacity={0.8}>
              <Text style={styles.saveBtnText}>Рассчитать и сохранить</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* РАЗДЕЛ ПИТАНИЯ / ДНЕВНИК */}
        <View style={styles.chartCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={[styles.chartTitle, { marginBottom: 0, flexShrink: 1, marginRight: 8 }]} numberOfLines={1}>
              🍎 Дневник питания
            </Text>
            <TouchableOpacity
              onPress={() => setIsFoodFormOpen(!isFoodFormOpen)}
              style={styles.unitToggleBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.unitToggleText}>{isFoodFormOpen ? 'Закрыть ✕' : '➕ Записать еду'}</Text>
            </TouchableOpacity>
          </View>

          {/* Форма добавления еды */}
          {isFoodFormOpen && (
            <View style={[styles.formCard, { marginTop: 0, marginBottom: 16 }]}>
              <Text style={[styles.formTitle, { fontSize: 15, marginBottom: 10 }]}>Добавить еду</Text>
              
              <Text style={styles.inputLabel}>Название продукта или блюда *</Text>
              <TextInput
                style={styles.input}
                value={foodName}
                onChangeText={setFoodName}
                placeholder="Например: Каша овсяная с бананом"
                placeholderTextColor="#64748B"
              />

              <View style={styles.formRow}>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Калории (ккал) *</Text>
                  <TextInput
                    style={styles.input}
                    value={foodCalories}
                    onChangeText={setFoodCalories}
                    keyboardType="numeric"
                    placeholder="350"
                    placeholderTextColor="#64748B"
                  />
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Белки (г)</Text>
                  <TextInput
                    style={styles.input}
                    value={foodProteins}
                    onChangeText={setFoodProteins}
                    keyboardType="numeric"
                    placeholder="12"
                    placeholderTextColor="#64748B"
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Жиры (г)</Text>
                  <TextInput
                    style={styles.input}
                    value={foodFats}
                    onChangeText={setFoodFats}
                    keyboardType="numeric"
                    placeholder="6"
                    placeholderTextColor="#64748B"
                  />
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Углеводы (г)</Text>
                  <TextInput
                    style={styles.input}
                    value={foodCarbs}
                    onChangeText={setFoodCarbs}
                    keyboardType="numeric"
                    placeholder="45"
                    placeholderTextColor="#64748B"
                  />
                </View>
              </View>

              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#10B981', marginTop: 12 }]} onPress={handleSaveFood} activeOpacity={0.8}>
                <Text style={styles.saveBtnText}>Добавить в дневник</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Список съеденного за сегодня */}
          {todayFoods.length > 0 ? (
            <View style={styles.foodListContainer}>
              {todayFoods.map((item) => (
                <View key={item.id} style={styles.foodItemRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.foodItemName}>{item.name}</Text>
                    <Text style={styles.foodItemMacros}>
                      Б: {item.proteins}г • Ж: {item.fats}г • У: {item.carbs}г
                    </Text>
                  </View>
                  <Text style={styles.foodItemCalories}>{item.calories} ккал</Text>
                  <TouchableOpacity
                    onPress={() => {
                      Alert.alert(
                        'Удалить запись',
                        `Удалить «${item.name}» из дневника питания?`,
                        [
                          { text: 'Отмена', style: 'cancel' },
                          { text: 'Удалить', style: 'destructive', onPress: () => deleteFoodLog(item.id) }
                        ]
                      );
                    }}
                    style={styles.deleteFoodBtn}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.deleteFoodBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noChartData}>Вы еще ничего не записали за сегодня</Text>
          )}
        </View>

        {/* Кнопка раскрытия формы */}
        <TouchableOpacity
          style={[styles.toggleFormBtn, isFormOpen && styles.toggleFormBtnActive]}
          onPress={() => setIsFormOpen(!isFormOpen)}
          activeOpacity={0.8}
        >
          <Text style={styles.toggleFormBtnText}>
            {isFormOpen ? 'Закрыть форму ввода ✖️' : '✏️ Записать новые замеры'}
          </Text>
        </TouchableOpacity>

        {/* Форма ввода */}
        {isFormOpen && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Новая запись замеров</Text>
            
            <View style={styles.formRow}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Вес (кг) *</Text>
                <TextInput
                  style={styles.input}
                  value={weightStr}
                  onChangeText={setWeightStr}
                  keyboardType="numeric"
                  placeholder="75.5"
                  placeholderTextColor="#64748B"
                />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Бицепс (см)</Text>
                <TextInput
                  style={styles.input}
                  value={bicepsStr}
                  onChangeText={setBicepsStr}
                  keyboardType="numeric"
                  placeholder="38"
                  placeholderTextColor="#64748B"
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Грудь (см)</Text>
                <TextInput
                  style={styles.input}
                  value={chestStr}
                  onChangeText={setChestStr}
                  keyboardType="numeric"
                  placeholder="105"
                  placeholderTextColor="#64748B"
                />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Талия (см)</Text>
                <TextInput
                  style={styles.input}
                  value={waistStr}
                  onChangeText={setWaistStr}
                  keyboardType="numeric"
                  placeholder="85"
                  placeholderTextColor="#64748B"
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.inputContainer, { flex: 0.48 }]}>
                <Text style={styles.inputLabel}>Бедра (см)</Text>
                <TextInput
                  style={styles.input}
                  value={hipsStr}
                  onChangeText={setHipsStr}
                  keyboardType="numeric"
                  placeholder="95"
                  placeholderTextColor="#64748B"
                />
              </View>
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
              <Text style={styles.saveBtnText}>Сохранить замеры</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Панель текущих замеров и прогресса */}
        {latest ? (
          <View style={styles.dashboardCard}>
            <Text style={styles.dashboardTitle}>Последние показатели</Text>
            <Text style={styles.dashboardDate}>
              от {new Date(latest.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
            </Text>

            <View style={styles.statsGrid}>
              {/* Вес */}
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>⚖️ Вес</Text>
                <Text style={styles.statValue}>{latest.weight} кг</Text>
                {previous && renderProgressTag(latest.weight, previous.weight)}
              </View>

              {/* Бицепс */}
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>💪 Бицепс</Text>
                <Text style={styles.statValue}>
                  {latest.biceps ? `${latest.biceps} см` : '—'}
                </Text>
                {previous && renderProgressTag(latest.biceps, previous.biceps)}
              </View>

              {/* Грудь */}
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>👕 Грудь</Text>
                <Text style={styles.statValue}>
                  {latest.chest ? `${latest.chest} см` : '—'}
                </Text>
                {previous && renderProgressTag(latest.chest, previous.chest)}
              </View>

              {/* Талия */}
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>👖 Талия</Text>
                <Text style={styles.statValue}>
                  {latest.waist ? `${latest.waist} см` : '—'}
                </Text>
                {previous && renderProgressTag(latest.waist, previous.waist, true)}
              </View>

              {/* Бедра */}
              <View style={[styles.statBox, { flexBasis: '48%' }]}>
                <Text style={styles.statLabel}>🦵 Бедра</Text>
                <Text style={styles.statValue}>
                  {latest.hips ? `${latest.hips} см` : '—'}
                </Text>
                {previous && renderProgressTag(latest.hips, previous.hips, true)}
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              Показатели ещё не записаны. Нажми кнопку выше, чтобы зафиксировать свои стартовые параметры!
            </Text>
          </View>
        )}

        {/* График веса */}
        {sortedMeasurements.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>⚖️ Динамика веса тела (кг)</Text>
            {(() => {
              // Берем последние 8 замеров и сортируем по времени от старых к новым
              const chartData = [...sortedMeasurements]
                .slice(0, 8)
                .reverse();
              
              const weights = chartData.map(m => m.weight);
              const maxWeight = Math.max(...weights, 100);
              const minWeight = Math.min(...weights, 50);
              const range = maxWeight - minWeight * 0.95;

              return (
                <View style={styles.chartContainer}>
                  <View style={styles.chartBarsRow}>
                    {chartData.map((m) => {
                      const percent = range > 0
                        ? ((m.weight - minWeight * 0.95) / range) * 100
                        : 70;
                      return (
                        <View key={m.id} style={styles.chartColumn}>
                          <Text style={styles.chartValueLabel}>{m.weight}</Text>
                          <View style={styles.chartBarBg}>
                            <View style={[styles.chartBarFill, { height: `${Math.min(100, Math.max(10, percent))}%` }]} />
                          </View>
                          <Text style={styles.chartDateLabel}>
                            {new Date(m.date).toLocaleDateString('ru-RU', { day: 'numeric', month: '2-digit' })}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })()}
          </View>
        )}

        {/* История замеров */}
        {sortedMeasurements.length > 0 && (
          <View style={styles.historyContainer}>
            <Text style={styles.historyTitle}>История измерений</Text>
            {sortedMeasurements.map((m) => (
              <View key={m.id} style={styles.historyRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyDate}>
                    {new Date(m.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                  <Text style={styles.historyDetails}>
                    Вес: {m.weight} кг
                    {m.biceps ? ` • Бицепс: ${m.biceps} см` : ''}
                    {m.waist ? ` • Талия: ${m.waist} см` : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDeletePrompt(m)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.deleteBtnText}>Удалить</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
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
  toggleFormBtn: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#38BDF8',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  toggleFormBtnActive: {
    backgroundColor: '#334155',
    borderColor: '#64748B',
  },
  toggleFormBtnText: {
    color: '#38BDF8',
    fontSize: 15,
    fontWeight: '700',
  },
  formCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  inputContainer: {
    flex: 0.48,
  },
  inputLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: '#0284C7',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  dashboardCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  dashboardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  dashboardDate: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statBox: {
    flexBasis: '48%',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    marginVertical: 4,
  },
  diffGood: {
    color: '#4ADE80',
    fontSize: 12,
    fontWeight: '700',
  },
  diffBad: {
    color: '#F87171',
    fontSize: 12,
    fontWeight: '700',
  },
  diffEqual: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  historyContainer: {
    marginTop: 10,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 12,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  historyDate: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  historyDetails: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  deleteBtn: {
    backgroundColor: '#EF444415',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#EF444430',
  },
  deleteBtnText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  chartCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 16,
  },
  chartContainer: {
    height: 160,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    justifyContent: 'flex-end',
    borderWidth: 1,
    borderColor: '#334155',
  },
  chartBarsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: '100%',
    paddingTop: 16,
  },
  chartColumn: {
    alignItems: 'center',
    flex: 1,
  },
  chartValueLabel: {
    color: '#F8FAFC',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },
  chartBarBg: {
    width: 14,
    height: 75,
    backgroundColor: '#1E293B',
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  chartBarFill: {
    width: '100%',
    backgroundColor: '#38BDF8',
    borderRadius: 4,
  },
  chartDateLabel: {
    color: '#64748B',
    fontSize: 8,
    marginTop: 4,
    fontWeight: '600',
  },
  nutritionCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  nutritionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nutritionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
  },
  nutritionResetBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  nutritionResetText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
  },
  nutritionKcal: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 16,
  },
  nutritionBarsRow: {
    gap: 12,
  },
  nutritionBarItem: {
    marginBottom: 8,
  },
  nutritionBarLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  nutritionBarValue: {
    fontSize: 12,
    color: '#F8FAFC',
    fontWeight: '700',
  },
  nutritionBarBg: {
    height: 8,
    backgroundColor: '#0F172A',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 4,
  },
  nutritionBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  genderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  genderBtn: {
    flex: 0.48,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  genderBtnActive: {
    backgroundColor: '#0284C720',
    borderColor: '#0284C7',
  },
  genderBtnText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  genderBtnTextActive: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  optionList: {
    marginBottom: 16,
    gap: 8,
  },
  optionBtn: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  optionBtnActive: {
    backgroundColor: '#0284C720',
    borderColor: '#0284C7',
  },
  optionBtnText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  optionBtnTextActive: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  foodListContainer: {
    marginTop: 10,
    gap: 8,
  },
  foodItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 6,
  },
  foodItemName: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
  },
  foodItemMacros: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  foodItemCalories: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: '800',
    marginRight: 10,
  },
  deleteFoodBtn: {
    backgroundColor: '#EF444415',
    borderRadius: 6,
    width: 26,
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteFoodBtnText: {
    color: '#EF4444',
    fontSize: 11,
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
  noChartData: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 20,
  },
});
