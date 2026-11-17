// Сводка данных пользователя для ИИ Тренера: программа, прогресс по упражнениям, объём по неделям, замеры, питание.
// Файл начинается с «_», поэтому Vercel не делает из него отдельный адрес API.

const MAX_SESSIONS_PER_EXERCISE = 8;
const WEEKS_OF_VOLUME = 8;
const FOOD_DAYS = 14;

function dateFormatter(timeZone) {
  try {
    return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone });
  } catch {
    return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'UTC' });
  }
}

const num = (v) => (Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100));

// Неделя начинается в понедельник; ключ — дата понедельника
function weekKey(date, fmt) {
  const d = new Date(date);
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day);
  return fmt.format(d);
}

async function fetchAll(query) {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

async function buildCoachContext(supabase, userId, { timeZone, nutritionTarget } = {}) {
  const fmt = dateFormatter(timeZone);
  const [exercises, days, logs, measurements, foods] = await Promise.all([
    fetchAll(supabase.from('exercises').select('id, name, category, day, created_at').eq('user_id', userId).order('created_at')),
    fetchAll(supabase.from('training_days').select('num, title').eq('user_id', userId).order('num')).catch(() => []),
    fetchAll(supabase.from('workout_logs').select('date, exercise_id, weight, reps').eq('user_id', userId).order('date').limit(10000)),
    fetchAll(supabase.from('body_measurements').select('date, weight, biceps, chest, waist, hips').eq('user_id', userId).order('date').limit(200)),
    fetchAll(
      supabase.from('food_logs').select('date, name, calories, proteins, fats, carbs').eq('user_id', userId)
        .gte('date', new Date(Date.now() - FOOD_DAYS * 86400000).toISOString()).order('date').limit(500)
    ),
  ]);

  const lines = [`Сегодня: ${fmt.format(new Date())}.`];

  // Программа
  const dayNums = [...new Set(exercises.map((e) => Number(e.day)))].sort((a, b) => a - b);
  if (dayNums.length) {
    lines.push('', 'ПРОГРАММА:');
    for (const n of dayNums) {
      const title = days.find((d) => Number(d.num) === n)?.title;
      const names = exercises.filter((e) => Number(e.day) === n).map((e) => e.name.trim());
      lines.push(`День ${n}${title ? ` (${title})` : ''}: ${names.join(', ')}`);
    }
  }

  // Тренировки
  lines.push('', 'ТРЕНИРОВКИ:');
  if (!logs.length) {
    lines.push('Записанных подходов пока нет.');
  } else {
    const workoutDays = new Set(logs.map((l) => fmt.format(new Date(l.date))));
    lines.push(
      `Всего ${logs.length} подходов за ${workoutDays.size} тренировочных дней, ` +
      `с ${fmt.format(new Date(logs[0].date))} по ${fmt.format(new Date(logs[logs.length - 1].date))}.`
    );

    // Тоннаж по неделям
    const weeks = new Map();
    for (const l of logs) {
      const k = weekKey(l.date, fmt);
      const w = weeks.get(k) || { tonnage: 0, sets: 0, days: new Set() };
      w.tonnage += Number(l.weight) * Number(l.reps);
      w.sets += 1;
      w.days.add(fmt.format(new Date(l.date)));
      weeks.set(k, w);
    }
    lines.push(`Объём по неделям (последние ${WEEKS_OF_VOLUME}, неделя с понедельника):`);
    for (const [k, w] of [...weeks.entries()].slice(-WEEKS_OF_VOLUME)) {
      lines.push(`- неделя с ${k}: ${w.days.size} трен., ${w.sets} подходов, тоннаж ${Math.round(w.tonnage)} кг`);
    }

    // Прогресс по каждому упражнению: подходы, сгруппированные по дням
    const byId = new Map(exercises.map((e) => [e.id, e]));
    const groups = new Map();
    let orphanSets = 0;
    for (const l of logs) {
      if (!byId.has(l.exercise_id)) { orphanSets += 1; continue; }
      const g = groups.get(l.exercise_id) || new Map();
      const d = fmt.format(new Date(l.date));
      if (!g.has(d)) g.set(d, []);
      g.get(d).push(l);
      groups.set(l.exercise_id, g);
    }
    lines.push('', 'ПРОГРЕСС ПО УПРАЖНЕНИЯМ (вес кг × повторы, подходы через запятую):');
    for (const ex of exercises) {
      const g = groups.get(ex.id);
      if (!g) continue;
      const all = [...g.values()].flat();
      const best = all.reduce((a, b) => (Number(b.weight) > Number(a.weight) || (Number(b.weight) === Number(a.weight) && b.reps > a.reps) ? b : a));
      const sessions = [...g.entries()];
      const shown = sessions.length > MAX_SESSIONS_PER_EXERCISE
        ? [sessions[0], ...sessions.slice(-(MAX_SESSIONS_PER_EXERCISE - 1))]
        : sessions;
      lines.push(
        `• ${ex.name.trim()} (${ex.category}, день ${ex.day}): тренировок ${sessions.length}, ` +
        `рекорд ${num(Number(best.weight))}×${best.reps} (${fmt.format(new Date(best.date))})`
      );
      shown.forEach(([d, sets], i) => {
        if (i === 1 && sessions.length > MAX_SESSIONS_PER_EXERCISE) lines.push('  …');
        lines.push(`  ${d}: ${sets.map((s) => `${num(Number(s.weight))}×${s.reps}`).join(', ')}`);
      });
    }
    const untouched = exercises.filter((e) => !groups.has(e.id)).map((e) => e.name.trim());
    if (untouched.length) lines.push(`Упражнения программы без записей: ${untouched.join(', ')}.`);
    if (orphanSets) lines.push(`Ещё ${orphanSets} подходов относятся к упражнениям, которых уже нет в программе.`);
  }

  // Замеры
  lines.push('', 'ЗАМЕРЫ ТЕЛА:');
  if (!measurements.length) {
    lines.push('Замеров нет.');
  } else {
    for (const m of measurements.slice(-20)) {
      const parts = [`вес ${num(Number(m.weight))} кг`];
      if (m.biceps) parts.push(`бицепс ${num(Number(m.biceps))} см`);
      if (m.chest) parts.push(`грудь ${num(Number(m.chest))} см`);
      if (m.waist) parts.push(`талия ${num(Number(m.waist))} см`);
      if (m.hips) parts.push(`бёдра ${num(Number(m.hips))} см`);
      lines.push(`- ${fmt.format(new Date(m.date))}: ${parts.join(', ')}`);
    }
  }

  // Питание
  lines.push('', `ПИТАНИЕ (последние ${FOOD_DAYS} дней):`);
  const t = nutritionTarget;
  if (t && [t.calories, t.proteins, t.fats, t.carbs].every((v) => Number.isFinite(Number(v)))) {
    lines.push(`Цель: ${num(Number(t.calories))} ккал, Б ${num(Number(t.proteins))} г, Ж ${num(Number(t.fats))} г, У ${num(Number(t.carbs))} г в день.`);
  }
  if (!foods.length) {
    lines.push('Записей о еде нет.');
  } else {
    const perDay = new Map();
    for (const f of foods) {
      const d = fmt.format(new Date(f.date));
      const s = perDay.get(d) || { kcal: 0, p: 0, f: 0, c: 0, items: [] };
      s.kcal += Number(f.calories) || 0; s.p += Number(f.proteins) || 0; s.f += Number(f.fats) || 0; s.c += Number(f.carbs) || 0;
      s.items.push(f.name);
      perDay.set(d, s);
    }
    for (const [d, s] of perDay) {
      lines.push(`- ${d}: ${Math.round(s.kcal)} ккал, Б ${Math.round(s.p)} / Ж ${Math.round(s.f)} / У ${Math.round(s.c)} (${s.items.slice(0, 8).join(', ')})`);
    }
  }

  return lines.join('\n');
}

module.exports = { buildCoachContext };
