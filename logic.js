// 答錯就進錯題庫，連續答對 2 次才移出
// 一般 <script>（不用 module），雙擊 index.html 用 file:// 開也能跑；node 測試走下方 module.exports
const inWrongBank = s => !!s && s.wrong > 0 && s.streak < 2;

function record(stats, id, correct) {
  const s = stats[id] ?? { right: 0, wrong: 0, streak: 0 };
  stats[id] = correct
    ? { right: s.right + 1, wrong: s.wrong, streak: s.streak + 1 }
    : { right: s.right, wrong: s.wrong + 1, streak: 0 };
  return stats;
}

const pickCards =(words, stats, from, to, onlyWrong) =>
  words.filter(w => w.id >= from && w.id <= to && (!onlyWrong || inWrongBank(stats[w.id])));

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
  Object.values(x).every(s => [s?.right, s?.wrong, s?.streak].every(Number.isInteger));

if (typeof module === 'object') module.exports = { inWrongBank, record, pickCards, mergeWords, validStats };
