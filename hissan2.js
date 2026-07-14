/* けいさんマスター — たし算・ひき算・かけ算のひっ算モジュール
   わり算ひっ算(hissan.js)と画面(howto/play/result)を共有する。
   いま画面をつかっているモジュールは window.__hissanOwner で判定
   ('div'=わり算 / 'add'・'sub'・'mul'=このモジュール)。 */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  function App() { return window.WarizanApp || null; }
  function ri(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function mine() { return ['add', 'sub', 'mul'].indexOf(window.__hissanOwner) >= 0; }

  var KURAI = ['一のくらい', '十のくらい', '百のくらい', '千のくらい'];

  // n の右から i けため(0=一のくらい)。無ければ null
  function dig(n, i) {
    var s = String(n);
    var idx = s.length - 1 - i;
    return idx >= 0 ? +s[idx] : null;
  }

  /* ==================================================================
     エンジン: セル(cells)とステップ(steps)を組み立てる
     セル: {key, row, p(右から0), text, cls, sign}
     ステップ: {q, answer, reveals[], okText, badge, info}
     reveal キー 'slash-a-2' は「セル a-2 に斜線を引く」の意味
     ================================================================== */

  function buildAdd(a, b) {
    var sum = a + b;
    var W = String(sum).length;
    var nA = String(a).length, nB = String(b).length, nMax = Math.max(nA, nB);
    var cells = [], steps = [], i;

    for (i = 0; i < nA; i++) cells.push({ key: 'a-' + i, row: 2, p: i, text: dig(a, i), cls: '' });
    for (i = 0; i < nB; i++) cells.push({ key: 'b-' + i, row: 3, p: i, text: dig(b, i), cls: '' });
    cells.push({ key: 'sign', row: 3, sign: true, text: '＋', cls: 'sign' });
    for (i = 0; i < W; i++) cells.push({ key: 'ans-' + i, row: 5, p: i, text: dig(sum, i), cls: 'quot hidden' });

    var carry = 0;
    for (var p = 0; p < nMax; p++) {
      var va = dig(a, p), vb = dig(b, p);
      var parts = [];
      if (carry) parts.push('くりあがりの 1');
      if (va !== null) parts.push(va);
      if (vb !== null) parts.push(vb);
      var s = (carry || 0) + (va || 0) + (vb || 0);
      var newCarry = s >= 10 ? 1 : 0;
      var reveals = ['ans-' + p];
      var ok;
      if (newCarry && p + 1 < nMax) {
        cells.push({ key: 'carry-' + (p + 1), row: 1, p: p + 1, text: '1', cls: 'carry hidden' });
        reveals.push('carry-' + (p + 1));
        ok = s + '! ' + (s % 10) + ' をかいて、1 くりあがり!';
      } else if (newCarry) {
        reveals.push('ans-' + (p + 1));
        ok = s + '! くりあがった 1 もかいて、できあがり!';
      } else {
        ok = s + '! そのまま かくよ。';
      }
      steps.push({ q: KURAI[p] + ': ' + parts.join(' + ') + ' は?', answer: s, reveals: reveals, okText: ok, badge: KURAI[p] });
      carry = newCarry;
    }
    return { kind: 'add', a: a, b: b, width: W, cells: cells, steps: steps, lines: [{ row: 4 }], answer: sum, answerText: String(sum), rows: 5 };
  }

  function buildSub(a, b) {
    var diff = a - b;
    var W = String(a).length, dW = String(diff).length;
    var nB = String(b).length;
    var cells = [], steps = [], i;

    for (i = 0; i < W; i++) cells.push({ key: 'a-' + i, row: 2, p: i, text: dig(a, i), cls: '' });
    for (i = 0; i < nB; i++) cells.push({ key: 'b-' + i, row: 3, p: i, text: dig(b, i), cls: '' });
    cells.push({ key: 'sign', row: 3, sign: true, text: '−', cls: 'sign' });
    for (i = 0; i < dW; i++) cells.push({ key: 'ans-' + i, row: 5, p: i, text: dig(diff, i), cls: 'quot hidden' });

    var ea = [];
    for (i = 0; i < W; i++) ea.push(dig(a, i));

    for (var p = 0; p < W; p++) {
      var vb = dig(b, p) || 0;
      var reveals = [];
      var pre = '';
      if (ea[p] < vb) {
        var j = p + 1;
        while (ea[j] === 0) j++;
        cells.push({ key: 'note-' + j, row: 1, p: j, text: String(ea[j] - 1), cls: 'note hidden' });
        reveals.push('slash-a-' + j, 'note-' + j);
        for (var k = j - 1; k > p; k--) {
          cells.push({ key: 'note-' + k, row: 1, p: k, text: '9', cls: 'note hidden' });
          reveals.push('slash-a-' + k, 'note-' + k);
          ea[k] = 9;
        }
        ea[j] -= 1;
        ea[p] += 10;
        pre = 'そのままでは ひけない! となりから 10 かりるよ。';
      }
      var ansD = ea[p] - vb;
      var ok;
      if (p < dW) {
        reveals.push('ans-' + p);
        ok = ansD + '! かけたね。';
      } else {
        ok = ansD + '! 0 だから なにも かかないよ。';
      }
      steps.push({ q: pre + ' ' + KURAI[p] + ': ' + ea[p] + ' − ' + vb + ' は?', answer: ansD, reveals: reveals, okText: ok, badge: KURAI[p] });
    }
    return { kind: 'sub', a: a, b: b, width: W, cells: cells, steps: steps, lines: [{ row: 4 }], answer: diff, answerText: String(diff), rows: 5 };
  }

  function buildMul1(a, b) {
    var prod = a * b;
    var W = String(prod).length, nA = String(a).length;
    var cells = [], steps = [], i;

    for (i = 0; i < nA; i++) cells.push({ key: 'a-' + i, row: 2, p: i, text: dig(a, i), cls: '' });
    cells.push({ key: 'b-0', row: 3, p: 0, text: b, cls: '' });
    cells.push({ key: 'sign', row: 3, sign: true, text: '×', cls: 'sign' });
    for (i = 0; i < W; i++) cells.push({ key: 'ans-' + i, row: 5, p: i, text: dig(prod, i), cls: 'quot hidden' });

    var carry = 0;
    for (var p = 0; p < nA; p++) {
      var v = b * dig(a, p) + carry;
      var q = b + ' × ' + dig(a, p) + (carry ? ' + くりあがりの ' + carry : '') + ' は?';
      var newCarry = Math.floor(v / 10);
      var reveals = ['ans-' + p];
      var ok;
      if (newCarry && p + 1 < nA) {
        cells.push({ key: 'carry-' + (p + 1), row: 1, p: p + 1, text: String(newCarry), cls: 'carry hidden' });
        reveals.push('carry-' + (p + 1));
        ok = v + '! ' + (v % 10) + ' をかいて、' + newCarry + ' くりあがり!';
      } else if (newCarry) {
        reveals.push('ans-' + (p + 1));
        ok = v + '! さいごだから そのまま ' + v + ' とかくよ!';
      } else {
        ok = v + '! そのまま かくよ。';
      }
      steps.push({ q: q, answer: v, reveals: reveals, okText: ok, badge: 'かける' });
      carry = newCarry;
    }
    return { kind: 'mul1', a: a, b: b, width: W, cells: cells, steps: steps, lines: [{ row: 4 }], answer: prod, answerText: String(prod), rows: 5 };
  }

  function buildMul2(a, b) {
    var b0 = b % 10, b1 = Math.floor(b / 10);
    var p1 = a * b0, p2 = a * b1, prod = a * b;
    var W = String(prod).length;
    var L1 = String(p1).length, L2 = String(p2).length;
    var cells = [], steps = [], i;

    for (i = 0; i < 2; i++) cells.push({ key: 'a-' + i, row: 1, p: i, text: dig(a, i), cls: '' });
    cells.push({ key: 'b-0', row: 2, p: 0, text: b0, cls: '' });
    cells.push({ key: 'b-1', row: 2, p: 1, text: b1, cls: '' });
    cells.push({ key: 'sign', row: 2, sign: true, text: '×', cls: 'sign' });
    for (i = 0; i < L1; i++) cells.push({ key: 'p1-' + i, row: 4, p: i, text: dig(p1, i), cls: 'prod hidden' });
    for (i = 0; i < L2; i++) cells.push({ key: 'p2-' + i, row: 5, p: i + 1, text: dig(p2, i), cls: 'prod hidden' });
    for (i = 0; i < W; i++) cells.push({ key: 'ans-' + i, row: 7, p: i, text: dig(prod, i), cls: 'quot hidden' });

    // フェーズ1: 一のくらいの b0 をかける
    var carry = 0, p, v, newCarry, reveals, ok;
    for (p = 0; p < 2; p++) {
      v = b0 * dig(a, p) + carry;
      newCarry = Math.floor(v / 10);
      reveals = ['p1-' + p];
      if (newCarry && p === 1) { reveals.push('p1-2'); ok = v + '! そのまま ' + v + ' とかくよ!'; }
      else if (newCarry) { ok = v + '! ' + (v % 10) + ' をかいて ' + newCarry + ' くりあがり(あたまで おぼえておこう)!'; }
      else { ok = v + '! そのまま かくよ。'; }
      steps.push({ q: '一のくらいの ' + b0 + ' × ' + dig(a, p) + (carry ? ' + くりあがりの ' + carry : '') + ' は?', answer: v, reveals: reveals, okText: ok, badge: 'かける' });
      carry = newCarry;
    }
    steps.push({ info: true, q: 'つぎは 十のくらいの ' + b1 + ' を かけるよ。こたえは 1つ ひだりに ずらして かくのが ポイント!', reveals: [], badge: 'ちゅうい' });
    // フェーズ2: 十のくらいの b1 をかける(1つ左へずらす)
    carry = 0;
    for (p = 0; p < 2; p++) {
      v = b1 * dig(a, p) + carry;
      newCarry = Math.floor(v / 10);
      reveals = ['p2-' + p];
      if (newCarry && p === 1) { reveals.push('p2-2'); ok = v + '! そのまま かくよ!'; }
      else if (newCarry) { ok = v + '! ' + (v % 10) + ' をかいて ' + newCarry + ' くりあがり!'; }
      else { ok = v + '! そのまま かくよ。'; }
      steps.push({ q: '十のくらいの ' + b1 + ' × ' + dig(a, p) + (carry ? ' + くりあがりの ' + carry : '') + ' は?', answer: v, reveals: reveals, okText: ok, badge: 'かける' });
      carry = newCarry;
    }
    steps.push({ info: true, q: 'さいごに 2だんを たてに たすよ!', reveals: [], badge: 'たす' });
    // フェーズ3: 2だんのたし算
    carry = 0;
    var shifted = p2 * 10;
    for (p = 0; p < W; p++) {
      var x = dig(p1, p), y = dig(shifted, p);
      var parts = [];
      if (carry) parts.push('くりあがりの 1');
      if (x !== null) parts.push(x);
      if (y !== null && !(p === 0 && y === 0)) parts.push(y);
      if (p === 0) parts = [x]; // 一のくらいは そのままおりる
      var s = (carry || 0) + (x || 0) + (p === 0 ? 0 : (y || 0));
      newCarry = s >= 10 ? 1 : 0;
      reveals = ['ans-' + p];
      ok = s >= 10 ? s + '! ' + (s % 10) + ' をかいて 1 くりあがり!' : s + '! かけたね。';
      steps.push({ q: KURAI[p] + ': ' + parts.join(' + ') + ' は?', answer: s, reveals: reveals, okText: ok, badge: 'たす' });
      carry = newCarry;
    }
    return { kind: 'mul2', a: a, b: b, width: W, cells: cells, steps: steps, lines: [{ row: 3 }, { row: 6 }], answer: prod, answerText: String(prod), rows: 7 };
  }

  /* ================= レベル定義と問題生成 ================= */
  function genAdd1() { // くり上がりなし
    var x = ri(1, 8), y = ri(1, 9 - x);
    var t1 = ri(1, 8), t2 = ri(1, 9 - t1);
    return buildAdd(t1 * 10 + x, t2 * 10 + y);
  }
  function genAdd2() { // 一のくらいで くり上がり(こたえは2けた)
    var x = ri(2, 9), y = ri(Math.max(10 - x, 2), 9);
    var t1 = ri(1, 7), t2 = ri(1, 8 - t1);
    return buildAdd(t1 * 10 + x, t2 * 10 + y);
  }
  function genAdd3() { // 3けた+3けた(くり上がりあり、こたえは3けた)
    var x = ri(2, 9), y = ri(Math.max(10 - x, 2), 9);      // 一のくらいは必ずくり上がる
    var p = ri(1, 9), q2 = ri(1, 9);
    var carry2 = (p + q2 + 1) >= 10 ? 1 : 0;
    var hp = ri(1, 8 - carry2), hq = ri(1, 9 - carry2 - hp);
    return buildAdd(hp * 100 + p * 10 + x, hq * 100 + q2 * 10 + y);
  }
  function genSub1() { // くり下がりなし
    var y = ri(1, 8), x = ri(y, 9);
    var q2 = ri(1, 8), p = ri(q2 + 1, 9);
    return buildSub(p * 10 + x, q2 * 10 + y);
  }
  function genSub2() { // くり下がりあり(こたえも2けた)
    var x = ri(1, 8), y = ri(x + 1, 9);
    var q2 = ri(1, 7), p = ri(q2 + 2, 9);
    return buildSub(p * 10 + x, q2 * 10 + y);
  }
  function genSub3() { // 3けた−3けた(ときどき 0をまたぐ れんぞくくり下がり)
    for (var t = 0; t < 300; t++) {
      var a, b;
      if (Math.random() < 0.35) { // 305−178 のような 0またぎ
        var h = ri(3, 9), o = ri(0, 8);
        a = h * 100 + o;
        b = ri(1, h - 2) * 100 + ri(0, 9) * 10 + ri(o + 1, 9);
      } else {
        a = ri(201, 989);
        b = ri(101, a - 101);
      }
      if (a - b >= 100 && (a % 10) < (b % 10) && a - b <= 899) return buildSub(a, b);
    }
    return buildSub(305, 178);
  }
  function genMul1() {
    var a = ri(12, 98);
    while (a % 10 === 0) a = ri(12, 98);
    return buildMul1(a, ri(2, 9));
  }
  function genMul2() {
    var d3 = ri(1, 9) * 100 + ri(1, 9) * 10 + ri(1, 9);
    return buildMul1(d3, ri(2, 9));
  }
  function genMul3() {
    var a = ri(12, 98), b = ri(12, 98);
    while (a % 10 === 0) a = ri(12, 98);
    while (b % 10 === 0) b = ri(12, 98);
    return buildMul2(a, b);
  }

  var LEVELS = [
    { id: 'add-h1', op: 'add', name: '2けた＋2けた(くり上がりなし)', xp: 60, gen: genAdd1 },
    { id: 'add-h2', op: 'add', name: '2けた＋2けた(くり上がりあり)', xp: 70, gen: genAdd2 },
    { id: 'add-h3', op: 'add', name: '3けた＋3けた', xp: 90, gen: genAdd3 },
    { id: 'sub-h1', op: 'sub', name: '2けた−2けた(くり下がりなし)', xp: 60, gen: genSub1 },
    { id: 'sub-h2', op: 'sub', name: '2けた−2けた(くり下がりあり)', xp: 70, gen: genSub2 },
    { id: 'sub-h3', op: 'sub', name: '3けた−3けた', xp: 90, gen: genSub3 },
    { id: 'mul-h1', op: 'mul', name: '2けた×1けた', xp: 70, gen: genMul1 },
    { id: 'mul-h2', op: 'mul', name: '3けた×1けた', xp: 85, gen: genMul2 },
    { id: 'mul-h3', op: 'mul', name: '2けた×2けた', xp: 120, gen: genMul3 }
  ];
  var LEVEL_BY_ID = {};
  LEVELS.forEach(function (l) { LEVEL_BY_ID[l.id] = l; });

  var HOWTO_EXAMPLES = {
    add: { make: function () { return buildAdd(47, 38); }, lead: 'れい: 47 ＋ 38。一のくらいから じゅんばんに たすよ!' },
    sub: { make: function () { return buildSub(53, 28); }, lead: 'れい: 53 − 28。ひけないときは となりから 10 かりるよ!' },
    mul: { make: function () { return buildMul1(34, 6); }, lead: 'れい: 34 × 6。一のくらいから じゅんばんに かけるよ!' }
  };

  var BADGE_CLS = { add: 'step-tateru', sub: 'step-hiku', mul: 'step-kakeru', info: 'step-orosu' };

  /* ================= 描画 ================= */
  function renderGrid2(container, m) {
    container.innerHTML = '';
    container.style.gridTemplateColumns = 'auto repeat(' + m.width + ', var(--hcell))';
    var map = {};
    m.cells.forEach(function (c) {
      var el = document.createElement('div');
      el.className = 'hcell ' + (c.cls || '');
      el.textContent = c.text;
      el.style.gridRow = c.row;
      el.style.gridColumn = c.sign ? 1 : (1 + m.width - c.p);
      container.appendChild(el);
      map[c.key] = el;
    });
    m.lines.forEach(function (L, i) {
      var el = document.createElement('div');
      el.className = 'hissan-line';
      el.style.gridRow = L.row;
      el.style.gridColumn = '1 / ' + (m.width + 2);
      container.appendChild(el);
      map['line-' + i] = el;
    });
    return map;
  }

  function reveal2(map, key) {
    if (key.indexOf('slash-') === 0) {
      var target = map[key.slice(6)];
      if (target) target.classList.add('slashed');
      return;
    }
    var el = map[key];
    if (!el) return;
    el.classList.remove('hidden');
    el.classList.add('pop-show');
  }

  function show(screenId) {
    var screens = document.querySelectorAll('.screen');
    for (var i = 0; i < screens.length; i++) screens[i].classList.remove('active');
    $(screenId).classList.add('active');
  }

  function setBadge(st, op) {
    var el = $('hissan-step-badge');
    el.textContent = st.badge || '';
    el.className = 'hissan-step-badge ' + (st.info ? BADGE_CLS.info : BADGE_CLS[op]);
  }

  /* ================= やり方解説 ================= */
  var howto2 = { op: 'add', m: null, idx: -1, map: null, done: false };

  function startHowto(op) {
    window.__hissanOwner = op;
    howto2.op = op;
    howto2.m = HOWTO_EXAMPLES[op].make();
    howto2.idx = -1;
    howto2.done = false;
    howto2.map = renderGrid2($('howto-grid'), howto2.m);
    $('howto-text').textContent = HOWTO_EXAMPLES[op].lead + ' ボタンを おしてね。';
    $('howto-next').textContent = 'はじめる ▶';
    show('screen-hissan-howto');
  }

  function howtoNext2() {
    howto2.idx++;
    var steps = howto2.m.steps;
    if (howto2.idx >= steps.length) {
      $('howto-text').textContent = 'できあがり! こたえは ' + howto2.m.answerText + '。やってみよう!';
      $('howto-next').textContent = 'やってみる ▶';
      howto2.done = true;
      Effects.sound('fanfare');
      Effects.confetti(2);
      return;
    }
    var st = steps[howto2.idx];
    st.reveals.forEach(function (k) { reveal2(howto2.map, k); });
    $('howto-text').textContent = st.info ? st.q : st.q + ' → こたえ ' + st.answer + '。' + (st.okText || '');
    $('howto-next').textContent = 'つぎへ ▶';
    Effects.sound(st.info ? 'tap' : 'correct');
  }

  /* ================= れんしゅう ================= */
  var play2 = { level: null, m: null, idx: 0, map: null, input: '', solving: false };

  function startPlay(levelId) {
    var lvl = LEVEL_BY_ID[levelId];
    if (!lvl) return;
    window.__hissanOwner = lvl.op;
    play2.level = lvl;
    play2.m = lvl.gen();
    play2.idx = 0;
    play2.input = '';
    play2.solving = true;
    play2.map = renderGrid2($('play-grid'), play2.m);
    show('screen-hissan-play');
    showStep2();
  }

  function showStep2() {
    var st = play2.m.steps[play2.idx];
    setBadge(st, play2.level.op);
    if (window.HandWrite) window.HandWrite.clearPads();
    $('play-text').textContent = st.q;
    $('play-face').textContent = '🦊';
    play2.input = '';
    if (st.info) {
      $('hissan-numpad').classList.add('hidden');
      $('play-answer').classList.add('hidden');
      var ob = $('hissan-orosu-btn');
      ob.textContent = 'わかった! ▶';
      ob.classList.remove('hidden');
    } else {
      $('hissan-numpad').classList.remove('hidden');
      $('play-answer').classList.remove('hidden');
      $('hissan-orosu-btn').classList.add('hidden');
      renderAnswer2();
    }
  }

  function renderAnswer2() {
    $('play-answer').textContent = play2.input === '' ? '?' : play2.input;
  }

  function inputDigit2(d) {
    if (!play2.solving || play2.input.length >= 3) return;
    play2.input += d;
    Effects.sound('tap');
    renderAnswer2();
  }
  function clearInput2() {
    if (!play2.solving) return;
    play2.input = '';
    Effects.sound('tap');
    renderAnswer2();
  }

  function shake2() {
    var el = $('play-answer');
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
  }

  function submit2() {
    if (!play2.solving) return;
    var st = play2.m.steps[play2.idx];
    if (st.info) return;
    if (play2.input === '') { shake2(); return; }
    if (parseInt(play2.input, 10) === st.answer) {
      st.reveals.forEach(function (k) { reveal2(play2.map, k); });
      Effects.sound('correct');
      Effects.burstAt($('play-answer'));
      $('play-text').textContent = st.okText || 'せいかい!';
      advance2();
    } else {
      Effects.sound('wrong');
      shake2();
      $('play-text').textContent = 'おしい! もういちど。' + st.q;
      play2.input = '';
      renderAnswer2();
    }
  }

  function infoOk() {
    if (!play2.solving) return;
    var st = play2.m.steps[play2.idx];
    if (!st.info) return;
    Effects.sound('tap');
    advance2();
  }

  function advance2() {
    play2.solving = false;
    setTimeout(function () {
      play2.idx++;
      if (play2.idx >= play2.m.steps.length) {
        finishPlay2();
      } else {
        play2.solving = true;
        showStep2();
      }
    }, 700);
  }

  function resetOrosuBtn() {
    var ob = $('hissan-orosu-btn');
    ob.textContent = '⬇ おろす!';
    ob.classList.add('hidden');
  }

  function finishPlay2() {
    play2.solving = false;
    resetOrosuBtn();
    var rmap = renderGrid2($('result-grid'), play2.m);
    for (var k in rmap) { rmap[k].classList.remove('hidden'); }
    // くり下がりの斜線も再現する
    play2.m.steps.forEach(function (st) {
      st.reveals.forEach(function (rk) { if (rk.indexOf('slash-') === 0) reveal2(rmap, rk); });
    });
    $('hissan-result-answer').textContent = play2.m.answerText;
    $('hissan-result-title').textContent = pick(['よく できました!', 'かんぺき!', 'ひっ算 バッチリ!', 'すごい! といたね!']);
    $('hissan-result-face').textContent = '🦊';
    var app = App();
    if (app && app.state) {
      app.state.hissanCleared = (app.state.hissanCleared || 0) + 1;
      var res = app.grantXp(play2.level.xp);
      $('hissan-result-xp').textContent = '+' + play2.level.xp + ' XP! といた かいすう: ' + app.state.hissanCleared + ' かい';
      show('screen-hissan-result');
      Effects.sound('fanfare');
      Effects.confetti(3);
      if (res.levelsGained > 0) {
        setTimeout(function () { app.showLevelUp(); }, 1500);
      }
    } else {
      $('hissan-result-xp').textContent = '+' + play2.level.xp + ' XP!';
      show('screen-hissan-result');
      Effects.sound('fanfare');
      Effects.confetti(3);
    }
  }

  function backToOp() {
    var app = App();
    var op = play2.level ? play2.level.op : howto2.op;
    if (app && app.showOp) app.showOp(op);
    else show('screen-home');
  }

  /* ================= イベント登録 ================= */
  function bind() {
    $('howto-next').addEventListener('click', function () {
      if (!mine()) return;
      Effects.sound('tap');
      if (howto2.done) { howto2.done = false; backToOp(); }
      else howtoNext2();
    });
    $('howto-back').addEventListener('click', function () {
      if (!mine()) return;
      Effects.sound('tap');
      backToOp();
    });
    $('hissan-quit').addEventListener('click', function () {
      if (!mine()) return;
      play2.solving = false;
      resetOrosuBtn();
      backToOp();
    });
    $('hissan-orosu-btn').addEventListener('click', function () {
      if (!mine()) return;
      infoOk();
    });
    $('hissan-next-btn').addEventListener('click', function () {
      if (!mine()) return;
      Effects.sound('tap');
      startPlay(play2.level.id);
    });
    $('hissan-menu-btn').addEventListener('click', function () {
      if (!mine()) return;
      Effects.sound('tap');
      backToOp();
    });
    $('hissan-numpad').addEventListener('click', function (e) {
      if (!mine()) return;
      var btn = e.target.closest('button');
      if (!btn) return;
      var num = btn.getAttribute('data-num');
      var action = btn.getAttribute('data-action');
      if (num !== null) inputDigit2(num);
      else if (action === 'clear') clearInput2();
      else if (action === 'enter') submit2();
    });
    document.addEventListener('keydown', function (e) {
      if (!mine()) return;
      if (!$('screen-hissan-play').classList.contains('active') || !play2.solving) return;
      var st = play2.m.steps[play2.idx];
      if (st && st.info) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); infoOk(); }
        return;
      }
      if (e.key >= '0' && e.key <= '9') inputDigit2(e.key);
      else if (e.key === 'Backspace') { e.preventDefault(); clearInput2(); }
      else if (e.key === 'Enter') { e.preventDefault(); submit2(); }
    });
  }

  window.Hissan2 = {
    levelsFor: function (op) { return LEVELS.filter(function (l) { return l.op === op; }); },
    startHowto: startHowto,
    startPlay: startPlay,
    setInput: function (str) { if (!play2.solving) return; play2.input = str.slice(0, 3); renderAnswer2(); },
    clearInput: function () { if (!play2.solving) return; play2.input = ''; renderAnswer2(); },
    submitInput: function () { submit2(); },
    _test: { buildAdd: buildAdd, buildSub: buildSub, buildMul1: buildMul1, buildMul2: buildMul2, LEVELS: LEVELS }
  };

  if (typeof document !== 'undefined' && document.getElementById) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
    else bind();
  }
})();
