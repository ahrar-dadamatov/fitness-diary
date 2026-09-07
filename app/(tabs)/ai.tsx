import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useWorkoutStore } from '../../store';


const DEFAULT_GEMINI_API_KEY = '';

export default function AICoachScreen() {
  const history = useWorkoutStore((state) => state.history);
  const exercises = useWorkoutStore((state) => state.exercises);
  const measurements = useWorkoutStore((state) => state.measurements);
  const foodLogs = useWorkoutStore((state) => state.foodLogs);
  const nutritionTarget = useWorkoutStore((state) => state.nutritionTarget);
  const geminiApiKey = useWorkoutStore((state) => state.geminiApiKey);
  const setGeminiApiKey = useWorkoutStore((state) => state.setGeminiApiKey);

  const [localKey, setLocalKey] = useState(geminiApiKey);
  const [showKeySetup, setShowKeySetup] = useState(!geminiApiKey && !DEFAULT_GEMINI_API_KEY);
  const [loading, setLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');

  const handleSaveKey = () => {
    setGeminiApiKey(localKey.trim());
    setShowKeySetup(false);
    Alert.alert('Успешно', 'API ключ сохранен локально!');
  };

  const callGeminiAPI = async (promptText: string) => {
    const keyToUse = geminiApiKey || localKey.trim() || DEFAULT_GEMINI_API_KEY;
    if (!keyToUse) {
      Alert.alert('Ошибка', 'Пожалуйста, введите и сохраните ваш Google Gemini API ключ.');
      setShowKeySetup(true);
      return;
    }

    setLoading(true);
    setAiResponse('');

    try {
      let modelName = 'gemini-1.5-flash';
      try {
        const listUrl = `https://generativelanguage.googleapis.com/v1/models?key=${keyToUse}`;
        const listResponse = await fetch(listUrl);
        const listData = await listResponse.json();
        if (listData.models && Array.isArray(listData.models)) {
          const generateModels = listData.models.filter((m: any) =>
            m.supportedGenerationMethods?.includes('generateContent')
          );
          const preferred = generateModels.find((m: any) => m.name.includes('gemini-1.5-flash'))
            || generateModels.find((m: any) => m.name.includes('gemini-1.5-flash-latest'))
            || generateModels.find((m: any) => m.name.includes('gemini-2.5-flash-latest'))
            || generateModels.find((m: any) => m.name.includes('gemini-2.0-flash'))
            || generateModels.find((m: any) => m.name.includes('gemini-pro'))
            || generateModels.find((m: any) => !m.name.includes('gemini-2.5-flash'))
            || generateModels[0];

          if (preferred) {
            modelName = preferred.name.replace('models/', '');
          }
        }
      } catch (listErr) {
        console.warn('Не удалось получить список моделей, используем стандартную:', listErr);
      }

      const url = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${keyToUse}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `${promptText}\nОтвечай строго на русском языке, структурированно, профессионально и дружелюбно как спортивный тренер. Используй emoji.`,
                },
              ],
            },
          ],
        }),
      });

      const data = await response.json();
      if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
        setAiResponse(data.candidates[0].content.parts[0].text);
      } else {
        const errMsg = data.error?.message || 'Не удалось получить анализ от ИИ. Проверьте ваш API-ключ.';
        throw new Error(errMsg);
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert('Ошибка ИИ', error.message || 'Ошибка соединения с сервером.');
    } finally {
      setLoading(false);
    }
  };

  const handleWorkoutAnalysis = () => {
    const recentLogs = [...history]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 20);

    if (recentLogs.length === 0) {
      Alert.alert('Мало данных', 'Добавьте хотя бы несколько выполненных подходов в тренировках для анализа.');
      return;
    }

    const logsSummary = recentLogs.map((log) => {
      const ex = exercises.find((e) => e.id === log.exerciseId);
      const name = ex ? ex.name : 'Упражнение';
      const category = ex ? ex.category : 'Разное';
      const date = new Date(log.date).toLocaleDateString('ru-RU');
      return `- Дата: ${date}, Упражнение: "${name}" (${category}), Вес: ${log.weight} кг, Повторения: ${log.reps}`;
    }).join('\n');

    const prompt = `Проанализируй мои последние тренировки и дай рекомендации по прогрессу нагрузок:\n\n${logsSummary}`;
    callGeminiAPI(prompt);
  };

  const handleMeasurementsAnalysis = () => {
    if (measurements.length === 0) {
      Alert.alert('Мало данных', 'Добавьте хотя бы один замер тела на вкладке «Замеры».');
      return;
    }

    const sortedMeasures = [...measurements].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const measuresSummary = sortedMeasures.map((m) => {
      const date = new Date(m.date).toLocaleDateString('ru-RU');
      return `- Дата: ${date}, Вес: ${m.weight} кг, Бицепс: ${m.biceps || '-'} см, Грудь: ${m.chest || '-'} см, Талия: ${m.waist || '-'} см, Бедра: ${m.hips || '-'} см`;
    }).join('\n');

    const prompt = `Проанализируй динамику моих замеров тела. Дай советы по корректировке тренировок или питания в зависимости от прогресса:\n\n${measuresSummary}`;
    callGeminiAPI(prompt);
  };

  const handleNutritionAnalysis = () => {
    if (foodLogs.length === 0) {
      Alert.alert('Мало данных', 'Запишите съеденные продукты в Дневник Питания на вкладке «Замеры».');
      return;
    }

    const foodsSummary = foodLogs.map((f) => {
      const date = new Date(f.date).toLocaleDateString('ru-RU');
      return `- Дата: ${date}, Продукт: "${f.name}", Калории: ${f.calories} ккал, Белки: ${f.proteins}г, Жиры: ${f.fats}г, Углеводы: ${f.carbs}г`;
    }).join('\n');

    const targetStr = nutritionTarget
      ? `Моя цель по КБЖУ: Калории: ${nutritionTarget.calories} ккал, Белки: ${nutritionTarget.proteins}г, Жиры: ${nutritionTarget.fats}г, Углеводы: ${nutritionTarget.carbs}г`
      : 'Моя цель по калориям не задана.';

    const prompt = `Проанализируй мой рацион питания и сравни его с целями (если заданы). Оцени баланс макронутриентов и дай практические советы:\n\n${targetStr}\n\nМои логи питания:\n${foodsSummary}`;
    callGeminiAPI(prompt);
  };

  const handleCustomPrompt = () => {
    if (!customPrompt.trim()) return;
    callGeminiAPI(customPrompt);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>ИИ Тренер 🧠</Text>
          <Text style={styles.subtitle}>Персональные рекомендации и аналитика на основе твоих данных</Text>
        </View>

        <View style={styles.card}>
          <TouchableOpacity
            style={styles.keyHeader}
            onPress={() => setShowKeySetup(!showKeySetup)}
            activeOpacity={0.7}
          >
            <Text style={styles.keyTitle}>🔑 Настройка Gemini API Ключа</Text>
            <Text style={styles.keyToggleText}>{showKeySetup ? 'Скрыть ✕' : 'Настроить ⚙️'}</Text>
          </TouchableOpacity>

          {showKeySetup && (
            <View style={styles.keyBody}>
              <Text style={styles.keyInstructions}>
                Для работы ИИ нужен бесплатный API-ключ Gemini. Вы можете получить его за 30 секунд в Google AI Studio:
              </Text>
              <TouchableOpacity
                onPress={() => Linking.openURL('https://aistudio.google.com/')}
                style={styles.linkButton}
              >
                <Text style={styles.linkButtonText}>Получить бесплатный API ключ 🔗</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                value={localKey}
                onChangeText={setLocalKey}
                placeholder="Вставьте ваш API-ключ здесь"
                placeholderTextColor="#64748B"
                secureTextEntry
              />
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveKey}>
                <Text style={styles.saveBtnText}>Сохранить ключ</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>Быстрый анализ прогресса</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionCard} onPress={handleWorkoutAnalysis} activeOpacity={0.7}>
            <Text style={styles.actionIcon}>🏋️‍♂️</Text>
            <Text style={styles.actionTitle}>Анализ{'\n'}тренировок</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={handleMeasurementsAnalysis} activeOpacity={0.7}>
            <Text style={styles.actionIcon}>📏</Text>
            <Text style={styles.actionTitle}>Анализ{'\n'}замеров</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={handleNutritionAnalysis} activeOpacity={0.7}>
            <Text style={styles.actionIcon}>🍎</Text>
            <Text style={styles.actionTitle}>Анализ{'\n'}питания</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.customPromptCard}>
          <Text style={styles.customPromptLabel}>Задать произвольный вопрос тренеру:</Text>
          <View style={styles.promptInputRow}>
            <TextInput
              style={styles.promptInput}
              value={customPrompt}
              onChangeText={setCustomPrompt}
              placeholder="Например: Как правильно делать разминку перед приседом?"
              placeholderTextColor="#64748B"
              multiline
            />
            <TouchableOpacity style={styles.sendPromptBtn} onPress={handleCustomPrompt}>
              <Text style={styles.sendPromptBtnText}>🚀</Text>
            </TouchableOpacity>
          </View>
        </View>

        {(loading || aiResponse) && (
          <View style={styles.responseCard}>
            <Text style={styles.responseHeader}>📋 Результат анализа ИИ:</Text>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#38BDF8" />
                <Text style={styles.loadingText}>ИИ анализирует ваши данные...</Text>
              </View>
            ) : (
              <Text style={styles.responseText}>{aiResponse}</Text>
            )}
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
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  keyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  keyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  keyToggleText: {
    fontSize: 13,
    color: '#38BDF8',
    fontWeight: '600',
  },
  keyBody: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 12,
  },
  keyInstructions: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
    marginBottom: 10,
  },
  linkButton: {
    backgroundColor: '#38BDF815',
    borderWidth: 1,
    borderColor: '#38BDF830',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  linkButtonText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 12,
  },
  saveBtn: {
    backgroundColor: '#0284C7',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 12,
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  actionCard: {
    flex: 0.31,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  actionIcon: {
    fontSize: 26,
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 12,
    color: '#F8FAFC',
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 16,
  },
  customPromptCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  customPromptLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 10,
  },
  promptInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  promptInput: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    minHeight: 44,
    maxHeight: 100,
    marginRight: 10,
    textAlignVertical: 'top',
  },
  sendPromptBtn: {
    backgroundColor: '#0284C7',
    borderRadius: 10,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendPromptBtnText: {
    fontSize: 18,
  },
  responseCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#0284C7',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  responseHeader: {
    fontSize: 15,
    fontWeight: '800',
    color: '#38BDF8',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  loadingContainer: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 12,
  },
  responseText: {
    color: '#F8FAFC',
    fontSize: 15,
    lineHeight: 22,
  },
});
