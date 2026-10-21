import test from 'node:test';
import assert from 'node:assert/strict';
import logic from './logic.js';

const { inWrongBank, isDue, record, pickCards, mergeWords, validStats } = logic;

const words = [1, 2, 3, 4, 5].map(id => ({ id, en: `e${id}`, zh: `z${id}` }));
const T = 20000; // 任意一天

test('答錯進錯題庫，連續答對 2 次才移出', () => {
  const s = {};
  record(s, 1, false, T);
  assert.ok(inWrongBank(s[1]));
  record(s, 1, true, T);
  assert.ok(inWrongBank(s[1]));
  record(s, 1, true, T);
  assert.ok(!inWrongBank(s[1]));
  record(s, 1, false, T);
  assert.ok(inWrongBank(s[1]));
  assert.deepEqual(s[1], { right: 2, wrong: 2, streak: 0, due: T + 1 });
  assert.ok(!inWrongBank(record({}, 2, true, T)[2]));
  assert.ok(!inWrongBank(undefined));
});

test('複習間隔：連續答對 1,3,7,14,30,60 天，之後封頂；答錯排明天', () => {
  const s = {};
  const gaps = [];
  for (let k = 0; k < 8; k++) gaps.push(record(s, 1, true, T)[1].due - T);
  assert.deepEqual(gaps, [1, 3, 7, 14, 30, 60, 60, 60]);
  assert.equal(record(s, 1, false, T)[1].due, T + 1);
});

test('到期判斷：新字、舊版沒有 due、今天到期都算；未來的不算', () => {
  assert.ok(isDue(undefined, T));
  assert.ok(isDue({ right: 1, wrong: 0, streak: 1 }, T));
  assert.ok(isDue({ due: T }, T));
  assert.ok(isDue({ due: T - 3 }, T));
  assert.ok(!isDue({ due: T + 1 }, T));
});

test('範圍篩選與三種模式', () => {
  assert.deepEqual(pickCards(words, {}, 2, 4, 'all', T).map(w => w.id), [2, 3, 4]);
  const s = record(record({}, 3, false, T), 5, false, T);
  assert.deepEqual(pickCards(words, s, 1, 4, 'wrong', T).map(w => w.id), [3]);
  record(s, 2, true, T);                    // 2 排到明天
  s[4] = { right: 3, wrong: 0, streak: 3, due: T };  // 4 今天到期
  assert.deepEqual(pickCards(words, s, 1, 5, 'due', T).map(w => w.id), [1, 4]);
  assert.deepEqual(pickCards(words, s, 1, 5, 'due', T + 1).map(w => w.id), [1, 2, 3, 4, 5]);
});

test('匯入依 id 合併並排序，格式錯誤丟錯', () => {
  const merged = mergeWords(words.slice(0, 2), [{ id: 9, en: 'x', zh: 'y' }, { id: 1, en: 'new', zh: '新' }]);
  assert.deepEqual(merged.map(w => w.id), [1, 2, 9]);
  assert.equal(merged[0].en, 'new');
  assert.throws(() => mergeWords([], { id: 1 }));
  assert.throws(() => mergeWords([], [{ id: '1', en: 'a', zh: 'b' }]));
  assert.throws(() => mergeWords([], [null]));
});

test('進度檔格式檢查', () => {
  assert.ok(validStats({ 1: { right: 1, wrong: 0, streak: 1 } }));
  assert.ok(validStats({ 1: { right: 1, wrong: 0, streak: 1, due: T } }));
  assert.ok(validStats({}));
  assert.ok(!validStats([]));
  assert.ok(!validStats({ 1: { right: 1 } }));
  assert.ok(!validStats({ 1: { right: 1, wrong: 0, streak: 1, due: '明天' } }));
  assert.ok(!validStats(null));
});
