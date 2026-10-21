import test from 'node:test';
import assert from 'node:assert/strict';
import logic from './logic.js';

const { inWrongBank, record, pickCards, mergeWords, validStats } = logic;

const words = [1, 2, 3, 4, 5].map(id => ({ id, en: `e${id}`, zh: `z${id}` }));

test('答錯進錯題庫，連續答對 2 次才移出', () => {
  const s = {};
  record(s, 1, false);
  assert.ok(inWrongBank(s[1]));
  record(s, 1, true);
  assert.ok(inWrongBank(s[1]));
  record(s, 1, true);
  assert.ok(!inWrongBank(s[1]));
  record(s, 1, false);
  assert.ok(inWrongBank(s[1]));
  assert.deepEqual(s[1], { right: 2, wrong: 2, streak: 0 });
  assert.ok(!inWrongBank(record({}, 2, true)[2]));
  assert.ok(!inWrongBank(undefined));
});

test('範圍篩選與只練錯題', () => {
  assert.deepEqual(pickCards(words, {}, 2, 4, false).map(w => w.id), [2, 3, 4]);
  const s = record(record({}, 3, false), 5, false);
  assert.deepEqual(pickCards(words, s, 1, 4, true).map(w => w.id), [3]);
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
  assert.ok(validStats({}));
  assert.ok(!validStats([]));
  assert.ok(!validStats({ 1: { right: 1 } }));
  assert.ok(!validStats(null));
});
