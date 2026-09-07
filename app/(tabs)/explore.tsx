import React, { useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useWorkoutStore } from '../../store';

export default function HistoryScreen() {
  const history = useWorkoutStore((state) => state.history);
  const deleteLog = useWorkoutStore((state) => state.deleteLog);
  const exercises = useWorkoutStore((state) => state.exercises);
  const session = useWorkoutStore((state) => state.session);

  const [searchQuery, setSearchQuery] = useState('');

  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const [selectedChartExerciseId, setSelectedChartExerciseId] = useState<string | null>(null);

  const loggedExercisesIds = Array.from(new Set(history.map(log => log.exerciseId)));
  const loggedExercises = exercises.filter(ex => loggedExercisesIds.includes(ex.id));

  const getExerciseName = (id: string) => {
    const found = exercises.find((ex) => ex.id === id);
    return found ? found.name : id;
  };

  const getExerciseCategory = (id: string) => {
    const found = exercises.find((ex) => ex.id === id);
    return found ? found.category : 'Разное';
  };

  const hasWorkoutOnDate = (dateString: string) => {
    return history.some((log) => {
      const d = new Date(log.date);
      const y = d.getFullYear();
      const m = (d.getMonth() + 1).toString().padStart(2, '0');
      const day = d.getDate().toString().padStart(2, '0');
      return `${y}-${m}-${day}` === dateString;
    });
  };

  const filteredHistory = history.filter((log) => {
    const name = getExerciseName(log.exerciseId).toLowerCase();
    const gym = log.location.toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch = name.includes(query) || gym.includes(query);

    if (selectedCalendarDate) {
      const d = new Date(log.date);
      const y = d.getFullYear();
      const m = (d.getMonth() + 1).toString().padStart(2, '0');
      const day = d.getDate().toString().padStart(2, '0');
      const formattedLogDate = `${y}-${m}-${day}`;
      return matchesSearch && formattedLogDate === selectedCalendarDate;
    }

    return matchesSearch;
  });

  const groupedLogs: { [dateStr: string]: typeof history } = {};
  const sortedHistory = [...filteredHistory].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  sortedHistory.forEach((log) => {
    const dateObj = new Date(log.date);
    const dateStr = dateObj.toLocaleDateString('ru-RU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    if (!groupedLogs[dateStr]) {
      groupedLogs[dateStr] = [];
    }
    groupedLogs[dateStr].push(log);
  });

  const datesList = Object.keys(groupedLogs);

  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayIdx = getFirstDayOfMonth(currentYear, currentMonth);

  const daysArray: { num: number | null; dateStr: string | null }[] = [];
  for (let i = 0; i < firstDayIdx; i++) {
    daysArray.push({ num: null, dateStr: null });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const mStr = (currentMonth + 1).toString().padStart(2, '0');
    const dStr = d.toString().padStart(2, '0');
    daysArray.push({ num: d, dateStr: `${currentYear}-${mStr}-${dStr}` });
  }

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const selectDate = (dateStr: string | null) => {
    if (!dateStr) return;
    if (selectedCalendarDate === dateStr) {
      setSelectedCalendarDate(null);
    } else {
      setSelectedCalendarDate(dateStr);
    }
  };

  const chartLogs = selectedChartExerciseId
    ? history
      .filter((log) => log.exerciseId === selectedChartExerciseId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-8)
    : [];

  const maxChartWeight = chartLogs.length > 0 ? Math.max(...chartLogs.map(l => l.weight)) : 100;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>История тренировок</Text>
        <Text style={styles.subtitle}>Твой путь к силе и выносливости</Text>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity onPress={handlePrevMonth} style={styles.arrowBtn}>
            <Text style={styles.arrowBtnText}>◀</Text>
          </TouchableOpacity>
          <Text style={styles.calendarMonthTitle}>
            {monthNames[currentMonth]} {currentYear}
          </Text>
          <TouchableOpacity onPress={handleNextMonth} style={styles.arrowBtn}>
            <Text style={styles.arrowBtnText}>▶</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.weekdaysRow}>
          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(w => (
            <Text key={w} style={styles.weekdayText}>{w}</Text>
          ))}
        </View>

        <View style={styles.daysGrid}>
          {daysArray.map((day, idx) => {
            const hasWorkout = day.dateStr ? hasWorkoutOnDate(day.dateStr) : false;
            const isSelected = day.dateStr && selectedCalendarDate === day.dateStr;
            const isToday = day.dateStr && day.dateStr === `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;

            return (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.dayCell,
                  isSelected && styles.dayCellSelected,
                  isToday && !isSelected && styles.dayCellToday,
                ]}
                onPress={() => selectDate(day.dateStr)}
                disabled={!day.num}
                activeOpacity={0.7}
              >
                {day.num && (
                  <View style={styles.dayCellContent}>
                    <Text style={[
                      styles.dayCellText,
                      isSelected && styles.dayCellTextSelected,
                      isToday && !isSelected && styles.dayCellTextToday,
                    ]}>
                      {day.num}
                    </Text>
                    {hasWorkout && !isSelected && (
                      <View style={styles.workoutDot} />
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {selectedCalendarDate && (
          <TouchableOpacity
            style={styles.clearDateFilterBtn}
            onPress={() => setSelectedCalendarDate(null)}
          >
            <Text style={styles.clearDateFilterText}>
              Показать все дни (выбран: {new Date(selectedCalendarDate).toLocaleDateString('ru-RU')}) ✕
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {loggedExercises.length > 0 && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>📈 Прогресс в упражнении</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chartSelectorScroll}
            contentContainerStyle={styles.chartSelectorContent}
          >
            {loggedExercises.map(ex => {
              const isSelected = selectedChartExerciseId === ex.id;
              return (
                <TouchableOpacity
                  key={ex.id}
                  style={[styles.chartSelectorChip, isSelected && styles.chartSelectorChipActive]}
                  onPress={() => setSelectedChartExerciseId(isSelected ? null : ex.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chartSelectorChipText, isSelected && styles.chartSelectorChipTextActive]}>
                    {ex.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {selectedChartExerciseId ? (
            chartLogs.length > 0 ? (
              <View style={styles.chartContainer}>
                <View style={styles.chartBarsRow}>
                  {chartLogs.map((log) => {
                    const barHeight = maxChartWeight > 0 ? (log.weight / maxChartWeight) * 100 : 0;
                    return (
                      <View key={log.id} style={styles.chartColumn}>
                        <Text style={styles.chartValueLabel}>{log.weight}</Text>
                        <View style={styles.chartBarBg}>
                          <View style={[styles.chartBarFill, { height: `${barHeight}%` }]} />
                        </View>

                        <Text style={styles.chartDateLabel}>
                          {new Date(log.date).toLocaleDateString('ru-RU', { day: 'numeric', month: '2-digit' })}
                        </Text>
                        <Text style={styles.chartRepsLabel}>{log.reps} пов.</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : (
              <Text style={styles.noChartData}>Нет логов по этому упражнению</Text>
            )
          ) : (
            <Text style={styles.noChartData}>Выберите упражнение выше, чтобы увидеть график прогресса весов</Text>
          )}
        </View>
      )}

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Поиск по упражнению или залу..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {datesList.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {searchQuery.length > 0 || selectedCalendarDate
              ? 'Ничего не найдено по этому запросу'
              : 'Истории тренировок пока нет.\nСделай и запиши свой первый подход на главном экране!'}
          </Text>
        </View>
      ) : (
        datesList.map((dateStr) => (
          <View key={dateStr} style={styles.dayGroup}>
            <Text style={styles.dayGroupHeader}>{dateStr}</Text>

            {(() => {
              const logsForDay = groupedLogs[dateStr];
              const exerciseGroups: { [exId: string]: typeof history } = {};

              logsForDay.forEach((log) => {
                if (!exerciseGroups[log.exerciseId]) {
                  exerciseGroups[log.exerciseId] = [];
                }
                exerciseGroups[log.exerciseId].push(log);
              });

              return Object.keys(exerciseGroups).map((exId) => {
                const sets = exerciseGroups[exId];
                const firstLog = sets[0];
                return (
                  <View key={exId} style={styles.exerciseRowCard}>
                    <View style={styles.exerciseRowHeader}>
                      <View>
                        <Text style={styles.exerciseNameText}>{getExerciseName(exId)}</Text>
                        <Text style={styles.exerciseCategoryText}>
                          {getExerciseCategory(exId)} • зал {firstLog.location}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.setsList}>
                      {sets.map((set, index) => (
                        <View key={set.id} style={styles.setRow}>
                          <Text style={styles.setText}>
                            Подход {sets.length - index}:{' '}
                            <Text style={styles.setHighlight}>
                              {set.weight} кг × {set.reps} пов.
                            </Text>
                          </Text>
                          <TouchableOpacity
                            onPress={() => {
                              Alert.alert(
                                'Удалить подход',
                                'Вы уверены, что хотите удалить этот подход?',
                                [
                                  { text: 'Отмена', style: 'cancel' },
                                  {
                                    text: 'Удалить',
                                    style: 'destructive',
                                    onPress: () => deleteLog(set.id),
                                  },
                                ]
                              );
                            }}
                            style={styles.deleteBtn}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.deleteBtnText}>Удалить</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              });
            })()}
          </View>
        ))
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
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
  sectionCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 12,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  arrowBtn: {
    backgroundColor: '#334155',
    borderRadius: 8,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowBtnText: {
    color: '#38BDF8',
    fontSize: 14,
  },
  calendarMonthTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  weekdaysRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    borderRadius: 8,
  },
  dayCellSelected: {
    backgroundColor: '#0284C7',
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  dayCellContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  dayCellTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dayCellTextToday: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  workoutDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10B981',
    marginTop: 2,
  },
  clearDateFilterBtn: {
    backgroundColor: '#334155',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  clearDateFilterText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 15,
    paddingVertical: 10,
  },
  clearBtn: {
    padding: 8,
  },
  clearBtnText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '700',
  },
  chartSelectorScroll: {
    marginBottom: 12,
  },
  chartSelectorContent: {
    paddingBottom: 4,
  },
  chartSelectorChip: {
    backgroundColor: '#334155',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chartSelectorChipActive: {
    backgroundColor: '#0284C720',
    borderColor: '#0284C7',
  },
  chartSelectorChipText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  chartSelectorChipTextActive: {
    color: '#38BDF8',
    fontWeight: '700',
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
  chartRepsLabel: {
    color: '#94A3B8',
    fontSize: 8,
    fontWeight: '600',
  },
  noChartData: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  dayGroup: {
    marginBottom: 24,
  },
  dayGroupHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: '#38BDF8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    paddingLeft: 4,
  },
  exerciseRowCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  exerciseRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingBottom: 8,
    marginBottom: 10,
  },
  exerciseNameText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  exerciseCategoryText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  setsList: {
    width: '100%',
  },
  setRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  setText: {
    fontSize: 13,
    color: '#E2E8F0',
  },
  setHighlight: {
    fontWeight: '700',
    color: '#F8FAFC',
  },
  deleteBtn: {
    backgroundColor: '#EF444415',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#EF444430',
  },
  deleteBtnText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '600',
  },
});
