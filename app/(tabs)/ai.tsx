import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useWorkoutStore } from '../../store';
import { supabase } from '../../supabase';

export default function AICoachScreen() {
  const history = useWorkoutStore((state) => state.history);
  const exercises = useWorkoutStore((state) => state.exercises);
  const measurements = useWorkoutStore((state) => state.measurements);
  const foodLogs = useWorkoutStore((state) => state.foodLogs);
  const nutritionTarget = useWorkoutStore((state) => state.nutritionTarget);

  const [loading, setLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');

  // Запрос идёт на наш сервер (api/ai-coach), который обращается к Claude. Ответ приходит частями и печатается сразу.
  const askCoach = async (promptText: string) => {
    if (loading) return;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      Alert.alert('Нужен вход', 'Войдите в аккаунт, чтобы пользоваться ИИ Тренером.');
      return;
    }

    setLoading(true);
    setAiResponse('');
    try {
      const response = await fetch('/api/ai-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt: promptText }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || `Ошибка сервера (${response.status})`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setAiResponse(await response.text());
        return;
      }
      const decoder = new TextDecoder();
      let text = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setAiResponse(text.trimStart());
      }
      text += decoder.decode();
      setAiResponse(text.trim() || 'ИИ не прислал ответ. Попробуйте ещё раз.');
    } catch (error: any) {
      console.error(error);
      Alert.alert('Ошибка ИИ', error?.message || 'Нет связи с сервером. Проверьте интернет.');
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
    askCoach(prompt);
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
    askCoach(prompt);
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
    askCoach(prompt);
  };

  const handleCustomPrompt = () => {
    if (!customPrompt.trim()) return;
    askCoach(customPrompt);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>ИИ Тренер 🧠</Text>
          <Text style={styles.subtitle}>Персональные рекомендации на основе твоих данных. Работает на Claude.</Text>
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
            <TouchableOpacity style={[styles.sendPromptBtn, loading && { opacity: 0.5 }]} onPress={handleCustomPrompt} disabled={loading}>
              <Text style={styles.sendPromptBtnText}>🚀</Text>
            </TouchableOpacity>
          </View>
        </View>

        {(loading || aiResponse) && (
          <View style={styles.responseCard}>
            <Text style={styles.responseHeader}>📋 Результат анализа ИИ:</Text>

            {loading && !aiResponse ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#38BDF8" />
                <Text style={styles.loadingText}>ИИ анализирует ваши данные...</Text>
              </View>
            ) : (
              <Text style={styles.responseText}>{aiResponse}</Text>
            )}
          </View>
        )}

        <View style={{ height: 120 }} />
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
