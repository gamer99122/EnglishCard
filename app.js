const $ = s => document.querySelector(s);

// 同帳號的 GitHub Pages 共用 localStorage，加前綴避免和其他專案的 key 撞名
const load = (k, d) => { try { return JSON.parse(localStorage.getItem('englishcard.' + k)) ?? d; } catch { return d; } };
const save = (k, v) => {
  try { localStorage.setItem('englishcard.' + k, JSON.stringify(v)); }
  catch { alertMsg('無法儲存：瀏覽器儲存空間無法使用（無痕模式？）'); }
};
const alertMsg = t => { $('#msg').textContent = t; };

// shortcut: 把舊版沒有前綴的資料搬一次（舊 key 留著不刪），所有裝置都開過新版後可以刪掉這段
try {
  for (const k of ['words', 'stats', 'prefs']) {
    const old = localStorage.getItem(k);
    if (old !== null && localStorage.getItem('englishcard.' + k) === null) localStorage.setItem('englishcard.' + k, old);
  }
} catch {}

let words = load('words', []);
let stats = load('stats', {});
let queue = [], i = 0, nRight = 0, nWrong = 0;

function show(id) {
  for (const s of document.querySelectorAll('main > section')) s.hidden = s.id !== id;
  if (id === 'home') refreshHome();
}

function refreshHome() {
  $('#wordCount').textContent = words.length
    ? `已載入 ${words.length} 筆單字（編號 ${words[0].id}–${words.at(-1).id}）`
    : '還沒有單字，請先匯入單字檔（JSON）';
  $('#wrongCount').textContent = words.filter(w => inWrongBank(stats[w.id])).length;
}

function fillRange(from, to) {
  $('#from').value = from;
  $('#to').value = to;
}

function shuffle(a) {
  for (let j = a.length - 1; j > 0; j--) {
    const k = Math.floor(Math.random() * (j + 1));
    [a[j], a[k]] = [a[k], a[j]];
  }
  return a;
}

function start() {
  const mode = document.querySelector('input[name=mode]:checked').value;
  const from = +$('#from').value, to = +$('#to').value;
  queue = shuffle(pickCards(words, stats, from, to, mode === 'wrong'));
  if (!queue.length) return alertMsg(mode === 'wrong' ? '這個範圍內沒有錯題' : '這個範圍內沒有單字');
  save('prefs', { from, to, mode });
  alertMsg('');
  i = nRight = nWrong = 0;
  show('study');
  showCard();
}

function showCard() {
  const w = queue[i];
  $('#front').textContent = w.en;
  $('#zh').textContent = w.zh;
  $('#note').textContent = w.note ?? '';
  $('#back').hidden = true;
  $('#progress').textContent = `${i + 1} / ${queue.length}`;
}

function answer(ok) {
  record(stats, queue[i].id, ok);
  save('stats', stats);
  ok ? nRight++ : nWrong++;
  if (++i < queue.length) return showCard();
  $('#result').textContent = `答對 ${nRight} 題、答錯 ${nWrong} 題（正確率 ${Math.round(nRight / queue.length * 100)}%）`;
  show('done');
}

function showStats() {
  const all = Object.values(stats);
  const r = all.reduce((n, s) => n + s.right, 0), w = all.reduce((n, s) => n + s.wrong, 0);
  $('#summary').textContent = r + w
    ? `總作答 ${r + w} 次，答對 ${r}、答錯 ${w}，正確率 ${Math.round(r / (r + w) * 100)}%。下表列出答錯過的單字：`
    : '還沒有作答紀錄。';
  const rows = words.filter(x => stats[x.id]?.wrong).sort((a, b) => stats[b.id].wrong - stats[a.id].wrong);
  $('#statRows').replaceChildren(...rows.map(x => {
    const s = stats[x.id], tr = document.createElement('tr');
    for (const [v, cls] of [[x.id, 'num'], [x.en], [x.zh], [s.right, 'num'], [s.wrong, 'num'], [inWrongBank(s) ? '●' : '']]) {
      const td = tr.insertCell();
      td.textContent = v;
      if (cls) td.className = cls;
    }
    return tr;
  }));
  show('stats');
}

async function readJson(input) {
  const file = input.files[0];
  input.value = '';
  return JSON.parse(await file.text());
}

// 卡片先飛出畫面再換下一張，看起來才像「下一題」；飛行中忽略其他輸入，避免答案記到下一張
const card = $('#card');
let flying = false;
function fly(ok) {
  if (flying) return;
  flying = true;
  card.style.transition = '';
  card.dataset.dir = ok ? 'right' : 'left';
  card.style.transform = `translateX(${ok ? 120 : -120}vw) rotate(${ok ? 30 : -30}deg)`;
  setTimeout(() => {
    flying = false;
    card.style.transition = 'none';
    card.style.transform = card.dataset.dir = '';
    answer(ok);
  }, 200);
}

// 滑動：拖超過 100px 判定答案，幾乎沒動視為點擊翻面
let startX = null, dx = 0, dragged = false;
card.addEventListener('pointerdown', e => {
  if (flying) return;
  startX = e.clientX; dx = 0; dragged = false;
  card.setPointerCapture(e.pointerId);
  card.style.transition = 'none';
});
card.addEventListener('pointermove', e => {
  if (startX === null) return;
  dx = e.clientX - startX;
  if (Math.abs(dx) >= 5) dragged = true;
  card.style.transform = `translateX(${dx}px) rotate(${dx / 20}deg)`;
  card.dataset.dir = dx > 30 ? 'right' : dx < -30 ? 'left' : '';
});
const release = () => {
  if (startX === null) return;
  startX = null;
  if (Math.abs(dx) > 100) return fly(dx > 0);
  card.style.transition = card.style.transform = card.dataset.dir = '';
};
card.addEventListener('pointerup', release);
card.addEventListener('pointercancel', () => { dx = 0; release(); });
card.addEventListener('click', () => { if (!dragged) $('#back').hidden = !$('#back').hidden; });

document.addEventListener('keydown', e => {
  if ($('#study').hidden) return;
  if (e.key === 'ArrowLeft') fly(false);
  if (e.key === 'ArrowRight') fly(true);
});

$('#no').onclick = () => fly(false);
$('#yes').onclick = () => fly(true);
$('#start').onclick = start;
$('#again').onclick = start;
$('#showStats').onclick = showStats;
for (const b of document.querySelectorAll('.home')) b.onclick = () => show('home');

$('#pickWords').onclick = () => $('#wordFile').click();
$('#wordFile').onchange = async e => {
  try {
    const before = words.length;
    words = mergeWords(words, await readJson(e.target));
    save('words', words);
    fillRange(words[0].id, words.at(-1).id);
    refreshHome();
    alertMsg(`匯入完成：新增 ${words.length - before} 筆，共 ${words.length} 筆`);
  } catch (err) {
    alertMsg(`匯入失敗，原本的資料沒有變動：${err.message}`);
  }
};

$('#exportStats').onclick = () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(stats)], { type: 'application/json' }));
  a.download = `englishcard-progress-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
};
$('#pickStats').onclick = () => $('#statsFile').click();
$('#statsFile').onchange = async e => {
  try {
    const data = await readJson(e.target);
    if (!validStats(data)) throw new Error('不是進度檔');
    if (!confirm('匯入的進度會取代目前這台裝置上的作答紀錄，確定嗎？')) return;
    stats = data;
    save('stats', stats);
    refreshHome();
    alertMsg(`已匯入進度（${Object.keys(stats).length} 筆單字紀錄）`);
  } catch (err) {
    alertMsg(`匯入進度失敗，原本的紀錄沒有變動：${err.message}`);
  }
};

// 打開就用上次的範圍和模式直接出卡片；還沒匯入單字或範圍內沒題目時停在設定頁
const prefs = load('prefs', {});
if (prefs.mode === 'wrong') document.querySelector('input[name=mode][value=wrong]').checked = true;
show('home');
if (words.length) {
  fillRange(prefs.from ?? words[0].id, prefs.to ?? words.at(-1).id);
  start();
}
