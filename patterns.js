/* けいさんマスター — 4演算クイズのパターン定義(問題ジェネレーター) */
(function () {
  'use strict';

  function ri(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function q(a, b, ans, rem, hasRem) {
    return { a: a, b: b, answer: ans, remainder: rem || 0, hasRemainder: !!hasRem };
  }

  var OPS = {
    add: { sym: '＋', name: 'たし算', emoji: '➕', btnClass: 'op-add' },
    sub: { sym: '−', name: 'ひき算', emoji: '➖', btnClass: 'op-sub' },
    mul: { sym: '×', name: 'かけ算', emoji: '✖️', btnClass: 'op-mul' },
    div: { sym: '÷', name: 'わり算', emoji: '➗', btnClass: 'op-div' }
  };

  var dan = 3; // 九九のだん(mul-1用)。setDan で変更

  var PATTERNS = [
    /* ---------- ➕ たし算 ---------- */
    { id: 'add-1', op: 'add', name: '1けた＋1けた', sub: 'くりあがりなし', grade: '小1', mult: 1.0,
      gen: function () { var a = ri(1, 8); var b = ri(1, 9 - a); return q(a, b, a + b); } },
    { id: 'add-2', op: 'add', name: '1けた＋1けた', sub: 'くりあがりあり', grade: '小1', mult: 1.1,
      gen: function () { var a = ri(2, 9); var b = ri(Math.max(10 - a, 2), 9); return q(a, b, a + b); } },
    { id: 'add-3', op: 'add', name: '2けた＋1けた', sub: '', grade: '小2', mult: 1.2,
      gen: function () { var a = ri(11, 89); var b = ri(1, 9); return q(a, b, a + b); } },
    { id: 'add-4', op: 'add', name: '2けた＋2けた', sub: 'あんざん', grade: '小2〜3', mult: 1.4,
      gen: function () { var a = ri(11, 88); var b = ri(10, 99 - a); return q(a, b, a + b); } },

    /* ---------- ➖ ひき算 ---------- */
    { id: 'sub-1', op: 'sub', name: '1けた−1けた', sub: '', grade: '小1', mult: 1.0,
      gen: function () { var b = ri(1, 8); var ans = ri(1, 9 - b); return q(b + ans, b, ans); } },
    { id: 'sub-2', op: 'sub', name: 'じゅういくつ−1けた', sub: 'くりさがり', grade: '小1', mult: 1.1,
      gen: function () { var b = ri(2, 9); var ans = ri(Math.max(11 - b, 2), 9); return q(b + ans, b, ans); } },
    { id: 'sub-3', op: 'sub', name: '2けた−1けた', sub: '', grade: '小2', mult: 1.2,
      gen: function () { var a = ri(11, 99); var b = ri(1, 9); return q(a, b, a - b); } },
    { id: 'sub-4', op: 'sub', name: '2けた−2けた', sub: 'あんざん', grade: '小2〜3', mult: 1.4,
      gen: function () { var ans = ri(2, 80); var b = ri(10, Math.min(89, 99 - ans)); return q(ans + b, b, ans); } },

    /* ---------- ✖️ かけ算 ---------- */
    { id: 'mul-1', op: 'mul', name: '九九(えらんだ だん)', sub: 'だんをえらぶ', grade: '小2', mult: 1.1, needsDan: true,
      gen: function () { var b = ri(1, 9); return q(dan, b, dan * b); } },
    { id: 'mul-2', op: 'mul', name: '九九ミックス', sub: 'ぜんぶのだん', grade: '小2', mult: 1.2,
      gen: function () { var a = ri(2, 9); var b = ri(1, 9); return q(a, b, a * b); } },
    { id: 'mul-3', op: 'mul', name: 'なんじゅう×1けた', sub: '', grade: '小3', mult: 1.3,
      gen: function () { var a = ri(1, 9) * 10; var b = ri(2, 9); return q(a, b, a * b); } },
    { id: 'mul-4', op: 'mul', name: '2けた×1けた', sub: 'あんざん', grade: '小3', mult: 1.5,
      gen: function () {
        for (var t = 0; t < 60; t++) {
          var a = ri(12, 49); var b = ri(2, 9);
          if (a % 10 !== 0 && a * b <= 99) return q(a, b, a * b);
        }
        return q(23, 3, 69);
      } },

    /* ---------- ➗ わり算(既存ジェネレーターを利用) ---------- */
    { id: 'div-1', op: 'div', name: 'かんたん', sub: '÷2〜5', grade: '小3', mult: 1.2,
      gen: function () { return window.QuizData.generateQuestion('easy'); } },
    { id: 'div-2', op: 'div', name: 'ふつう', sub: '÷2〜9', grade: '小3', mult: 1.4,
      gen: function () { return window.QuizData.generateQuestion('normal'); } },
    { id: 'div-3', op: 'div', name: 'あまりあり', sub: 'こたえ+あまり', grade: '小3', mult: 1.6,
      gen: function () { return window.QuizData.generateQuestion('hard'); } }
  ];

  var byId = {};
  PATTERNS.forEach(function (p) { byId[p.id] = p; });

  // 直前と同じ問題の連続を避ける共通ラッパー
  var lastKey = '';
  function makeQuestion(pid) {
    var p = byId[pid];
    var t = p.gen();
    var key = pid + ':' + t.a + ':' + t.b;
    if (key === lastKey) t = p.gen();
    lastKey = pid + ':' + t.a + ':' + t.b;
    return t;
  }

  window.QuizData = window.QuizData || {};
  window.QuizData.OPS = OPS;
  window.QuizData.PATTERNS = PATTERNS;
  window.QuizData.getPattern = function (pid) { return byId[pid]; };
  window.QuizData.makeQuestion = makeQuestion;
  window.QuizData.setDan = function (n) { dan = n; };
  window.QuizData.getDan = function () { return dan; };
})();
