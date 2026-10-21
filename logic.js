// 一般 <script>（不用 module），雙擊 index.html 用 file:// 開也能跑；node 測試走下方 module.exports

// 答對後隔幾天再複習，連續答對越多次拉越長；答錯排明天
const INTERVALS = [1, 3, 7, 14, 30, 60];

// 答錯就進錯題庫，連續答對 2 次才移出
const inWrongBank = s => !!s && s.wrong > 0 && s.streak < 2;

// 沒練過的新字也算該練；舊版紀錄沒有 due，視為已到期
const isDue = (s, today) => !s || !(s.due > today);

// today 是本地日序號（第幾天），由呼叫端傳入
function record(stats, id, correct, today) {
  const s = stats[id] ?? { right: 0, wrong: 0, streak: 0 };
  const streak = correct ? s.streak + 1 : 0;
  stats[id] = {
    right: s.right + (correct ? 1 : 0),
    wrong: s.wrong + (correct ? 0 : 1),
    streak,
    due: today + (correct ? INTERVALS[Math.min(streak, INTERVALS.length) - 1] : 1),
  };
  return stats;
}

const pickCards = (words, stats, from, to, mode, today) =>
  words.filter(w => w.id >= from && w.id <= to &&
    (mode === 'wrong' ? inWrongBank(stats[w.id]) : mode === 'due' ? isDue(stats[w.id], today) : true));

// 依 id 合併，同 id 以新檔為準；格式不對就丟錯，呼叫端不會寫入
function mergeWords(old, incoming) {
  const ok = Array.isArray(incoming) && incoming.every(w =>
    Number.isInteger(w?.id) && typeof w.en === 'string' && typeof w.zh === 'string');
  if (!ok) throw new Error('單字檔格式錯誤：需要 [{ "id": 數字, "en": "...", "zh": "..." }] 的陣列');
  const map = new Map(old.map(w => [w.id, w]));
  for (const w of incoming) map.set(w.id, w);
  return [...map.values()].sort((a, b) => a.id - b.id);
}

const validStats = x =>
  !!x && typeof x === 'object' && !Array.isArray(x) &&
  Object.values(x).every(s => [s?.right, s?.wrong, s?.streak].every(Number.isInteger) &&
    (s.due === undefined || Number.isInteger(s.due)));

if (typeof module === 'object') module.exports = { inWrongBank, isDue, record, pickCards, mergeWords, validStats };
