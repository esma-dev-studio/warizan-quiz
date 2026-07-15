/* わりざんマスター — わり算のひっ算モジュール
   「たてる・かける・ひく・おろす」を解説し、全ステップを子どもが入力して練習する。
   app.js とは独立。進行データの共有だけ window.WarizanApp 経由で行う。 */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  function App() { return window.WarizanApp || null; }

  /* ===================================================================
     1) ひっ算エンジン — (dividend ÷ divisor) の手順を組み立てる
     =================================================================== */

  // 数 num を、いちばん右の桁が endCol に来るように セル配列へ
  function placeRight(num, endCol) {
    var s = String(num);
    var cells = [];
    for (var k = 0; k < s.length; k++) {
      cells.push({ col: endCol - (s.length - 1 - k), digit: +s[k] });
    }
    return cells;
  }

  // ひっ算モデルを作る。商の各桁・各ラウンド(たてる〜おろす)の情報を持つ
  function buildHissan(dividend, divisor) {
    var Dstr = String(dividend);
    var n = Dstr.length;
    var digits = Dstr.split('').map(Number);
    var quotient = [];
    for (var z = 0; z < n; z++) quotient.push(null);

    var rounds = [];
    var started = false;
    var cur = 0;
    var workCols = [];

    for (var i = 0; i < n; i++) {
      cur = cur * 10 + digits[i];
      workCols.push(i);
      var q = Math.floor(cur / divisor);
      if (q > 0) started = true;
      if (!started) continue; // 先頭の「桁が足りない」ぶんは商を立てずに次へ

      quotient[i] = q;
      var product = q * divisor;
      var remainder = cur - product;
      var endCol = i;

      rounds.push({
        col: i,
        cur: cur,
        workCols: workCols.slice(),
        q: q,
        product: product,
        prodCells: placeRight(product, endCol),
        remainder: remainder,
        remCol: endCol,
        broughtDown: (i + 1 < n) ? digits[i + 1] : null,
        bdCol: (i + 1 < n) ? i + 1 : null
      });

      cur = remainder;
      workCols = (remainder === 0) ? [] : [endCol];
    }

    var ansStr = quotient.map(function (x) { return x === null ? '' : x; }).join('');
    return {
      dividend: dividend, divisor: divisor, n: n, digits: digits,
      quotient: quotient, rounds: rounds,
      answer: parseInt(ansStr, 10), remainder: cur
    };
  }

  // やさしく読める問題かどうか(途中の0や桁とびを避ける)
  function isClean(m, wantRounds, wantRemainderZero) {
    if (m.rounds.length !== wantRounds) return false;
    if (m.digits.indexOf(0) >= 0) return false;               // わられる数に0を入れない
    for (var i = 0; i < m.quotient.length; i++) {
      var qd = m.quotient[i];
      if (qd === 0) return false;                              // 商の途中に0を出さない
    }
    for (var r = 0; r < m.rounds.length; r++) {
      var last = (r === m.rounds.length - 1);
      if (!last && m.rounds[r].remainder === 0) return false;  // 途中のあまり0を避ける
    }
    if (wantRemainderZero && m.remainder !== 0) return false;
    if (!wantRemainderZero && m.remainder === 0) return false;
    return true;
  }

  function randInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }

  // レベルごとに 問題を作る。条件を満たすまで作り直し(だめなら固定問題)
  function genProblem(level) {
    var tries = 0, m;
    while (tries++ < 400) {
      var d = randInt(2, 9);
      if (level === 'd2') {
        var q2 = randInt(1, 9) * 10 + randInt(1, 9);   // 11〜99(0なし)
        m = buildHissan(q2 * d, d);
        if (String(q2 * d).length === 2 && isClean(m, 2, true)) return m;
      } else if (level === 'd3') {
        var q3 = randInt(1, 9) * 100 + randInt(1, 9) * 10 + randInt(1, 9);
        m = buildHissan(q3 * d, d);
        if (String(q3 * d).length === 3 && isClean(m, 3, true)) return m;
      } else { // 'rem' = あまりあり(2けた÷1けた)
        var qr = randInt(1, 9) * 10 + randInt(1, 9);
        var rem = randInt(1, d - 1);
        var dd = qr * d + rem;
        m = buildHissan(dd, d);
        if (String(dd).length === 2 && isClean(m, 2, false)) return m;
      }
    }
    // フォールバック(必ず成立する問題)
    if (level === 'd3') return buildHissan(525, 5);   // 105
    if (level === 'rem') return buildHissan(85, 3);    // 28 あまり 1
    return buildHissan(84, 3);                          // 28
  }

  /* ===================================================================
     2) ステップ列 — たてる/かける/ひく/おろす を並べる
     =================================================================== */
  function buildSteps(m) {
    var steps = [];
    m.rounds.forEach(function (rd, idx) {
      steps.push({ type: 'tateru', rd: rd, ridx: idx, answer: rd.q });
      steps.push({ type: 'kakeru', rd: rd, ridx: idx, answer: rd.product });
      steps.push({ type: 'hiku', rd: rd, ridx: idx, answer: rd.remainder });
      if (rd.broughtDown !== null) {
        steps.push({ type: 'orosu', rd: rd, ridx: idx, answer: rd.broughtDown, auto: true });
      }
    });
    return steps;
  }

  var STEP_LABEL = { tateru: '① たてる', kakeru: '② かける', hiku: '③ ひく', orosu: '④ おろす' };

  // ステップの「しつもん」文(れんしゅう用)
  function questionText(st) {
    var rd = st.rd;
    if (st.type === 'tateru') return rd.cur + ' の中に ' + curDivisor + ' は いくつ?';
    if (st.type === 'kakeru') return 'たてた ' + rd.q + ' × ' + curDivisor + ' は?';
    if (st.type === 'hiku') return rd.cur + ' − ' + rd.product + ' は?';
    return 'つぎの ' + rd.broughtDown + ' を おろそう!';
  }
  var curDivisor = 0; // 現在の問題のわる数(文章生成用)

  // 解説用の説明文(答えも見せる)
  function explainText(st) {
    var rd = st.rd;
    if (st.type === 'tateru') return '【たてる】 ' + rd.cur + ' の中に ' + curDivisor + ' は ' + rd.q + 'こ。上に ' + rd.q + ' をかくよ。';
    if (st.type === 'kakeru') return '【かける】 ' + rd.q + ' × ' + curDivisor + ' = ' + rd.product + '。下にかくよ。';
    if (st.type === 'hiku') return '【ひく】 ' + rd.cur + ' − ' + rd.product + ' = ' + rd.remainder + '。';
    return '【おろす】 つぎの ' + rd.broughtDown + ' を おろして つづけるよ。';
  }

  // ステップ完了で表示する セルのキー一覧
  function revealKeys(st) {
    var rd = st.rd, keys = [];
    if (st.type === 'tateru') {
      keys.push('q-' + rd.col);
    } else if (st.type === 'kakeru') {
      rd.prodCells.forEach(function (c) { keys.push('p-' + st.ridx + '-' + c.col); });
      keys.push('line-' + st.ridx);
    } else if (st.type === 'hiku') {
      keys.push('r-' + st.ridx);
    } else if (st.type === 'orosu') {
      keys.push('b-' + st.ridx);
    }
    return keys;
  }

  /* ===================================================================
     3) 筆算レイアウト描画(CSSグリッド)
     =================================================================== */
  // すべてのセルを作り、cellMap[key] = element を返す。最初は hidden。
  function renderGrid(container, m) {
    container.innerHTML = '';
    container.style.gridTemplateColumns = 'auto repeat(' + m.n + ', var(--hcell))';
    var map = {};

    function cell(text, row, col, cls, key) {
      var el = document.createElement('div');
      el.className = 'hcell ' + (cls || '');
      el.textContent = text;
      el.style.gridRow = row;
      el.style.gridColumn = col;
      container.appendChild(el);
      if (key) map[key] = el;
      return el;
    }

    // わる数(左)
    cell(m.divisor, 2, 1, 'divisor');
    // わられる数(上にわくの線)
    for (var i = 0; i < m.n; i++) {
      var c = cell(m.digits[i], 2, i + 2, 'dividend bracket-top' + (i === 0 ? ' bracket-left' : ''));
    }
    // 商(かくれている)
    m.rounds.forEach(function (rd) {
      cell(rd.q, 1, rd.col + 2, 'quot hidden', 'q-' + rd.col);
    });
    // 各ラウンドの かける/ひく/おろす(かくれている)
    m.rounds.forEach(function (rd, idx) {
      var rowP = 3 + idx * 2;   // かけ算の行
      var rowR = 4 + idx * 2;   // あまり・おろしの行
      // ひき算の線(working の幅ぶん)
      var line = document.createElement('div');
      line.className = 'hissan-line hidden';
      line.style.gridRow = rowP;
      line.style.gridColumn = (Math.min.apply(null, rd.workCols) + 2) + ' / ' + (Math.max.apply(null, rd.workCols) + 3);
      container.appendChild(line);
      map['line-' + idx] = line;
      // かけ算の数字
      rd.prodCells.forEach(function (pc) {
        cell(pc.digit, rowP, pc.col + 2, 'prod hidden', 'p-' + idx + '-' + pc.col);
      });
      // ひいた あまり
      cell(rd.remainder, rowR, rd.remCol + 2, 'rem hidden', 'r-' + idx);
      // おろす数字
      if (rd.broughtDown !== null) {
        cell(rd.broughtDown, rowR, rd.bdCol + 2, 'brought hidden', 'b-' + idx);
      }
    });

    return map;
  }

  function reveal(map, key, drop) {
    var el = map[key];
    if (!el) return;
    el.classList.remove('hidden');
    el.classList.remove('target');
    el.classList.add(drop ? 'drop-in' : 'pop-show');
  }

  // いま書く場所のマスを光らせる(答えの文字は透明のまま)
  function markTargets(keys) {
    keys.forEach(function (k) {
      var el = play.map[k];
      if (el && el.classList.contains('hcell') && el.classList.contains('hidden')) {
        el.classList.add('target');
      }
    });
  }

  /* ===================================================================
     4) 画面きりかえ
     =================================================================== */
  function show(screenId) {
    var screens = document.querySelectorAll('.screen');
    for (var i = 0; i < screens.length; i++) screens[i].classList.remove('active');
    $(screenId).classList.add('active');
  }

  /* ===================================================================
     5) やり方解説(デモ)
     =================================================================== */
  var howto = { m: null, steps: null, idx: 0, map: null };

  function startHowto() {
    window.__hissanOwner = 'div'; // 共有画面(howto/play/result)の現在の持ち主
    howto.m = buildHissan(84, 3); // れい: 84 ÷ 3 = 28
    curDivisor = howto.m.divisor;
    howto.steps = buildSteps(howto.m);
    howto.idx = -1;
    howto.map = renderGrid($('howto-grid'), howto.m);
    $('howto-text').textContent = 'れい: 84 ÷ 3 を いっしょに といてみよう! ボタンを おしてね。';
    $('howto-next').textContent = 'はじめる ▶';
    show('screen-hissan-howto');
  }

  function howtoNext() {
    howto.idx++;
    if (howto.idx >= howto.steps.length) {
      $('howto-text').textContent = 'できた! こたえは 28。これで やり方は バッチリ! やってみよう!';
      $('howto-next').textContent = 'やってみる ▶';
      howto.done = true;
      if (howto.idx > howto.steps.length) { show('screen-hissan-menu'); return; }
      Effects.sound('fanfare');
      Effects.confetti(2);
      return;
    }
    var st = howto.steps[howto.idx];
    curDivisor = howto.m.divisor;
    revealKeys(st).forEach(function (k) { reveal(howto.map, k, st.type === 'orosu'); });
    $('howto-text').textContent = explainText(st);
    $('howto-next').textContent = 'つぎへ ▶';
    Effects.sound(st.type === 'orosu' ? 'tap' : 'correct');
  }

  /* ===================================================================
     6) れんしゅう(全ステップ入力)
     =================================================================== */
  var play = { m: null, steps: null, idx: 0, map: null, input: '', level: 'd2', solving: false };

  function startPlay(level) {
    window.__hissanOwner = 'div';
    play.level = level;
    play.m = genProblem(level);
    curDivisor = play.m.divisor;
    play.steps = buildSteps(play.m);
    play.idx = 0;
    play.input = '';
    play.solving = true;
    play.direct = true; // まずは「いきなり答えを書く」モード
    play.phase = 'q';   // 'q'=こたえ(商) / 'r'=あまり
    play.miss = 0;
    play.map = renderGrid($('play-grid'), play.m);
    show('screen-hissan-play');
    showDirect();
  }

  function clearTargets() {
    var els = $('play-grid').querySelectorAll('.hcell.target');
    for (var i = 0; i < els.length; i++) els[i].classList.remove('target');
  }

  // いきなり答えを書くモード
  function showDirect() {
    if (window.HandWrite) window.HandWrite.clearPads();
    var badge = $('hissan-step-badge');
    badge.textContent = play.phase === 'r' ? 'あまりを かく' : 'こたえを かく';
    badge.className = 'hissan-step-badge ' + (play.phase === 'r' ? 'step-hiku' : 'step-tateru');
    $('play-text').textContent = play.phase === 'r'
      ? '✍️ せいかい! つぎは あまりを かこう!'
      : '✏️ じぶんで けいさんして、こたえを かこう!';
    $('play-face').textContent = '🦊';
    // 書くモードでは説明ふきだしを出さない(あまりフェーズの案内だけ出す)
    var coach = $('hissan-play-coach');
    if (coach) coach.classList.toggle('quiet', document.body.classList.contains('hw-on') && play.phase !== 'r');
    clearTargets();
    if (play.phase === 'q') {
      play.m.rounds.forEach(function (rd) {
        var c = play.map['q-' + rd.col];
        if (c && c.classList.contains('hidden')) c.classList.add('target');
      });
    } else {
      var c = play.map['r-' + (play.m.rounds.length - 1)];
      if (c && c.classList.contains('hidden')) c.classList.add('target');
    }
    play.input = '';
    $('hissan-numpad').classList.remove('hidden');
    $('play-answer').classList.remove('hidden');
    $('hissan-orosu-btn').classList.add('hidden');
    renderAnswer();
  }

  function missDirect() {
    play.miss++;
    Effects.sound('wrong');
    var coach = $('hissan-play-coach'); // まちがえたときはメッセージを見せる
    if (coach) coach.classList.remove('quiet');
    shake();
    play.input = '';
    renderAnswer();
    if (play.miss >= 2) {
      play.direct = false;
      play.idx = 0;
      $('play-text').textContent = 'だいじょうぶ! いっしょに 1つずつ とこう!';
      play.solving = false;
      setTimeout(function () { play.solving = true; showStep(); }, 1000);
    } else {
      $('play-text').textContent = 'おしい! おちついて もういちど かんがえてみよう!';
    }
  }

  function submitDirect() {
    if (play.input === '') { shake(); return; }
    var val = parseInt(play.input, 10);
    if (play.phase === 'q') {
      if (val !== play.m.answer) { missDirect(); return; }
      play.m.rounds.forEach(function (rd) { reveal(play.map, 'q-' + rd.col, false); });
      Effects.sound('correct');
      Effects.burstAt($('play-answer'));
      if (play.level === 'rem') {
        play.phase = 'r';
        play.solving = false;
        setTimeout(function () { play.solving = true; showDirect(); }, 750);
      } else {
        $('play-text').textContent = 'せいかい! こたえは ' + play.m.answer + '!';
        play.solving = false;
        setTimeout(finishPlay, 850);
      }
    } else {
      if (val !== play.m.remainder) { missDirect(); return; }
      reveal(play.map, 'r-' + (play.m.rounds.length - 1), false);
      Effects.sound('correct');
      Effects.burstAt($('play-answer'));
      $('play-text').textContent = 'せいかい! ' + play.m.answer + ' あまり ' + play.m.remainder + '!';
      play.solving = false;
      setTimeout(finishPlay, 850);
    }
  }

  function showStep() {
    var st = play.steps[play.idx];
    curDivisor = play.m.divisor;
    if (window.HandWrite) window.HandWrite.clearPads();
    var coach = $('hissan-play-coach'); // 1つずつモードではガイドを見せる
    if (coach) coach.classList.remove('quiet');
    $('hissan-step-badge').textContent = STEP_LABEL[st.type];
    $('hissan-step-badge').className = 'hissan-step-badge step-' + st.type;
    clearTargets();
    // 1つずつモード: 式は聞かず、書く場所を光らせる(まちがえたらヒント)
    $('play-text').textContent = st.type === 'orosu' ? questionText(st) : '✏️ ひかっている □に はいる 数を かこう!';
    markTargets(revealKeys(st));
    $('play-face').textContent = '🦊';
    play.input = '';
    if (st.type === 'orosu') {
      // おろすは ボタン1つ(hissan2 がラベルを変えることがあるので毎回もどす)
      $('hissan-numpad').classList.add('hidden');
      $('play-answer').classList.add('hidden');
      var ob = $('hissan-orosu-btn');
      ob.textContent = '⬇ おろす!';
      ob.classList.remove('hidden');
    } else {
      $('hissan-numpad').classList.remove('hidden');
      $('play-answer').classList.remove('hidden');
      $('hissan-orosu-btn').classList.add('hidden');
      renderAnswer();
    }
  }

  function renderAnswer() {
    $('play-answer').textContent = play.input === '' ? '?' : play.input;
  }

  function inputDigit(d) {
    if (!play.solving) return;
    if (play.input.length >= 3) return;
    play.input += d;
    Effects.sound('tap');
    renderAnswer();
  }
  function clearInput() {
    if (!play.solving) return;
    play.input = '';
    Effects.sound('tap');
    renderAnswer();
  }

  function submit() {
    if (!play.solving) return;
    if (play.direct) { submitDirect(); return; }
    var st = play.steps[play.idx];
    if (st.type === 'orosu') return;
    if (play.input === '') { shake(); return; }
    if (parseInt(play.input, 10) === st.answer) {
      stepCorrect(st);
    } else {
      stepWrong(st);
    }
  }

  function stepCorrect(st) {
    revealKeys(st).forEach(function (k) { reveal(play.map, k, false); });
    Effects.sound('correct');
    Effects.burstAt($('play-answer'));
    $('play-text').textContent = 'せいかい! ' + STEP_LABEL[st.type].slice(2) + ' できたね!';
    advance();
  }

  function stepWrong(st) {
    Effects.sound('wrong');
    shake();
    $('play-face').textContent = '🦊';
    $('play-text').textContent = 'おしい! ' + questionText(st) + ' ' + hintText(st);
    play.input = '';
    renderAnswer();
  }

  function hintText(st) {
    if (st.type === 'tateru') return 'ヒント: ' + curDivisor + ' のだんを おもいだして! ' + st.rd.cur + ' に いちばん ちかいのは?';
    if (st.type === 'kakeru') return 'ヒント: ' + st.rd.q + ' × ' + curDivisor + ' を かぞえてみよう!';
    if (st.type === 'hiku') return 'ヒント: ' + st.rd.cur + ' から ' + st.rd.product + ' を ひくよ!';
    return 'もういちど!';
  }

  function doOrosu() {
    if (!play.solving) return;
    var st = play.steps[play.idx];
    if (st.type !== 'orosu') return;
    reveal(play.map, 'b-' + st.ridx, true);
    Effects.sound('combo', 3);
    $('play-text').textContent = st.rd.broughtDown + ' を おろしたよ! つぎは また「たてる」!';
    advance();
  }

  function advance() {
    play.solving = false;
    setTimeout(function () {
      play.idx++;
      if (play.idx >= play.steps.length) {
        finishPlay();
      } else {
        play.solving = true;
        showStep();
      }
    }, play.steps[play.idx] && play.steps[play.idx].type === 'orosu' ? 900 : 750);
  }

  function shake() {
    var el = $('play-answer');
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
    var rs = $('hissan-recog'); // 書くモードでは よみとり表示をゆらす
    if (rs) {
      rs.classList.remove('shake');
      void rs.offsetWidth;
      rs.classList.add('shake');
    }
  }

  function finishPlay() {
    play.solving = false;
    // けっか画面に同じ問題(全部表示)を描く
    var rmap = renderGrid($('result-grid'), play.m);
    for (var k in rmap) { rmap[k].classList.remove('hidden'); }
    var ansText = play.m.answer + (play.m.remainder > 0 ? ' あまり ' + play.m.remainder : '');
    $('hissan-result-answer').textContent = ansText;
    $('hissan-result-title').textContent = pick(['よく できました!', 'かんぺき!', 'すごい! といたね!', 'ひっ算 マスター!']);
    $('hissan-result-face').textContent = '🦊';

    // ごほうび(XP・クリア数)。app.js と共有
    var app = App();
    var msg = 'といた かいすう: ';
    if (app && app.state) {
      app.state.hissanCleared = (app.state.hissanCleared || 0) + 1;
      msg += app.state.hissanCleared + ' かい';
      var res = app.grantXp(60);
      $('hissan-result-xp').textContent = '+60 XP! ' + msg;
      show('screen-hissan-result');
      Effects.sound('fanfare');
      Effects.confetti(3);
      if (res.levelsGained > 0) {
        setTimeout(function () { app.showLevelUp(); }, 1500);
      }
    } else {
      $('hissan-result-xp').textContent = msg + '1 かい';
      show('screen-hissan-result');
      Effects.sound('fanfare');
      Effects.confetti(3);
    }
  }

  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  /* ===================================================================
     7) イベント登録
     =================================================================== */
  function backHome() {
    var app = App();
    if (app && app.goHome) app.goHome();
    else show('screen-home');
  }

  function bind() {
    var bh = $('btn-hissan'); // ホーム直下ボタンは廃止(演算画面から入る)。残っていれば動かす
    if (bh) bh.addEventListener('click', function () { Effects.sound('tap'); show('screen-hissan-menu'); });
    $('hissan-howto-btn').addEventListener('click', function () { Effects.sound('tap'); startHowto(); });
    $('howto-back').addEventListener('click', function () { if (window.__hissanOwner !== 'div') return; Effects.sound('tap'); show('screen-hissan-menu'); });
    $('howto-next').addEventListener('click', function () { if (window.__hissanOwner !== 'div') return; Effects.sound('tap'); if (howto.done) { howto.done = false; show('screen-hissan-menu'); } else { howtoNext(); } });

    var levelBtns = document.querySelectorAll('[data-hlevel]');
    for (var i = 0; i < levelBtns.length; i++) {
      levelBtns[i].addEventListener('click', function (e) {
        Effects.sound('tap');
        startPlay(e.currentTarget.getAttribute('data-hlevel'));
      });
    }

    $('hissan-quit').addEventListener('click', function () { if (window.__hissanOwner !== 'div') return; play.solving = false; show('screen-hissan-menu'); });
    $('hissan-orosu-btn').addEventListener('click', function () { if (window.__hissanOwner !== 'div') return; doOrosu(); });
    $('hissan-next-btn').addEventListener('click', function () { if (window.__hissanOwner !== 'div') return; Effects.sound('tap'); startPlay(play.level); });
    $('hissan-menu-btn').addEventListener('click', function () { if (window.__hissanOwner !== 'div') return; Effects.sound('tap'); show('screen-hissan-menu'); });

    // メニュー/各画面の「もどる」(data-back)はホームへ。app.js も同名で拾うが二重実行でも害なし
    $('screen-hissan-menu').querySelector('[data-back]').addEventListener('click', backHome);

    $('hissan-numpad').addEventListener('click', function (e) {
      if (window.__hissanOwner !== 'div') return;
      var btn = e.target.closest('button');
      if (!btn) return;
      var num = btn.getAttribute('data-num');
      var action = btn.getAttribute('data-action');
      if (num !== null) inputDigit(num);
      else if (action === 'clear') clearInput();
      else if (action === 'enter') submit();
    });

    document.addEventListener('keydown', function (e) {
      if (window.__hissanOwner !== 'div') return;
      if (!$('screen-hissan-play').classList.contains('active') || !play.solving) return;
      var st = play.direct ? null : play.steps[play.idx];
      if (st && st.type === 'orosu') { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); doOrosu(); } return; }
      if (e.key >= '0' && e.key <= '9') inputDigit(e.key);
      else if (e.key === 'Backspace') { e.preventDefault(); clearInput(); }
      else if (e.key === 'Enter') { e.preventDefault(); submit(); }
    });
  }

  // てがき入力(handwrite.js)からのブリッジ
  window.HissanDivInput = {
    set: function (str) { if (!play.solving) return; play.input = str.slice(0, 4); renderAnswer(); },
    clear: function () { if (!play.solving) return; play.input = ''; renderAnswer(); },
    submit: function () { submit(); },
    expected: function () {
      if (!play.solving || !play.m) return '';
      if (play.direct) return play.phase === 'r' ? String(play.m.remainder) : String(play.m.answer);
      var st = play.steps && play.steps[play.idx];
      return (st && st.type !== 'orosu') ? String(st.answer) : '';
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();
