// ИИ Тренер: принимает вопрос из приложения и отвечает через Claude, печатая ответ по мере генерации.
// Ключ Anthropic хранится только здесь (переменная ANTHROPIC_API_KEY в Vercel), в приложение он не попадает.
const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');
const { buildCoachContext } = require('./_coach-context');

const SUPABASE_URL = 'https://qnnafmawwkxbrevxgfrk.supabase.co';
const MODEL = 'claude-opus-5-5';
// Данные пользователя сервер добавляет сам, из приложения приходит только вопрос
const MAX_PROMPT_CHARS = 4000;

const SYSTEM_PROMPT = `Ты — персональный фитнес-тренер в приложении «Фитнес Дневник».
Вместе с вопросом ты получаешь выгрузку из дневника пользователя: его программу по дням, все записанные подходы с датами (сгруппированы по упражнениям), рекорды, объём по неделям, замеры тела и питание.
Отвечай на русском языке, дружелюбно и по делу, как опытный тренер. Всегда опирайся на эти данные: сравнивай первые и последние тренировки, называй конкретные даты, веса, повторы и проценты роста, замечай, где прогресс остановился или упражнение давно не делалось.
Если данных для ответа не хватает, так и скажи и подскажи, что записывать в приложении.
Ответ будут читать на телефоне в зале, поэтому пиши коротко: несколько абзацев или короткий список, без таблиц и без разметки Markdown (без **, # и т.п.). Emoji можно.
Если вопрос касается боли, травмы или здоровья, дай общий совет и посоветуй обратиться к врачу.`;

const anthropic = new Anthropic();

// Только вошедшие пользователи приложения могут тратить ключ
function adminClient() {
  return createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function getUser(supabase, req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  return error ? null : data.user;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'На сервере не настроен ключ Claude (ANTHROPIC_API_KEY).' });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'На сервере не настроен доступ к базе.' });
  }
  const supabase = adminClient();
  const user = await getUser(supabase, req);
  if (!user) {
    return res.status(401).json({ error: 'Войдите в аккаунт, чтобы пользоваться ИИ Тренером.' });
  }

  const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
  if (!prompt) {
    return res.status(400).json({ error: 'Пустой вопрос.' });
  }
  if (prompt.length > MAX_PROMPT_CHARS) {
    return res.status(413).json({ error: 'Слишком длинный запрос.' });
  }

  // Данные берём из базы только этого пользователя (запросы фильтруются по его id)
  let context;
  try {
    context = await buildCoachContext(supabase, user.id, {
      timeZone: typeof req.body?.timeZone === 'string' ? req.body.timeZone : undefined,
      nutritionTarget: req.body?.nutritionTarget,
    });
  } catch (error) {
    console.error('Could not load user data:', error?.message);
    context = 'Данные дневника сейчас не удалось загрузить. Ответь на вопрос в общем виде и скажи об этом.';
  }

  res.writeHead(200, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'X-Accel-Buffering': 'no',
  });

  try {
    const stream = anthropic.beta.messages.stream({
      model: MODEL,
      max_tokens: 16000,
      output_config: { effort: 'medium' },
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: `<дневник>
${context}
</дневник>` },
          { type: 'text', text: prompt },
        ],
      }],
      // Если модель откажется отвечать, тот же запрос автоматически выполнит запасная модель
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    });

    stream.on('text', (text) => res.write(text));
    const message = await stream.finalMessage();
    if (message.stop_reason === 'refusal') {
      res.write('\n\nНе могу ответить на этот вопрос. Попробуйте переформулировать его.');
    } else if (message.stop_reason === 'max_tokens') {
      res.write('\n\n(Ответ получился слишком длинным и обрезан.)');
    }
  } catch (error) {
    console.error('Claude request failed:', error?.status, error?.message);
    const status = error?.status;
    const text = status === 429 || status === 529
      ? 'ИИ сейчас перегружен. Попробуйте через минуту.'
      : status === 401 || status === 403
        ? 'Ключ Claude на сервере недействителен.'
        : 'Не удалось получить ответ ИИ. Попробуйте ещё раз.';
    res.write(`\n\n⚠️ ${text}`);
  }
  res.end();
};
