/* わりざんマスター — メインロジック(画面制御・出題・採点・レベル・バッジ・ランキング) */
(function () {
  'use strict';

  var QUESTIONS = 10;
  var DAILY_GOAL = 20; // きょうの もくひょう(1日にせいかいする もんすう)
  var PLAYER_NAME = 'ゆま'; // ランキング登録の名前(ひとりで使うので固定。変えたいときはここを書き換える)
  // 累計せいかい数の「つぎの きろく」マイルストーン(きろく画面の進捗バー用)
  var MILESTONES = [10, 25, 50, 100, 250, 500, 1000, 2000, 3500, 5000, 7500, 10000];
  var $ = function (id) { return document.getElementById(id); };

  var state = Storage.load();

  // v4移行: わり算専用だった記録を4演算対応の形へうつす(初回のみ)
  (function migrateV4() {
    if (state.migratedV4) return;
    if (state.totalCorrect > 0 && state.opCorrect.div === 0) {
      state.opCorrect.div = state.totalCorrect;
      state.opGames.div = state.sessions;
    }
    var map = { easy: 'div-1', normal: 'div-2', hard: 'div-3' };
    var gamesMap = { easy: state.easyGames, normal: state.normalGames, hard: state.hardGames };
    var corrMap = { easy: state.easyCorrect, normal: state.normalCorrect, hard: state.hardCorrect };
    for (var k in map) {
      var pid = map[k];
      if (!state.rankings2[pid] && state.rankings[k] && state.rankings[k].length) {
        state.rankings2[pid] = state.rankings[k].slice();
      }
      if (!state.patternStats[pid] && (gamesMap[k] || 0) > 0) {
        state.patternStats[pid] = { games: gamesMap[k] || 0, correct: corrMap[k] || 0, best: state.bestScore[k] || 0 };
      }
    }
    state.migratedV4 = true;
    Storage.save(state);
  })();

  var game = null;          // 進行中セッション
  var pendingResult = null; // 直前のリザルト(もういちど/ランク登録用)
  var lock = false;         // フィードバック表示中の入力ロック
  var ticker = null;

  Effects.init($('fx-canvas'));
  Effects.enabled = state.soundOn !== false;

  /* ---------- ユーティリティ ---------- */
  function dateStr(d) {
    var m = ('0' + (d.getMonth() + 1)).slice(-2);
    var dd = ('0' + d.getDate()).slice(-2);
    return d.getFullYear() + '-' + m + '-' + dd;
  }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function xpToNext(level) { return 100 + (level - 1) * 50; }
  function rankTitle(level) { // レベルに応じた称号(ホームに表示)
    if (level >= 30) return 'でんせつ';
    if (level >= 20) return 'グランドマスター';
    if (level >= 12) return 'マスター';
    if (level >= 8) return 'たつじん';
    if (level >= 5) return 'けいさんし';
    if (level >= 3) return 'かけだし';
    return 'みならい';
  }
  function replay(el, cls) { // CSSアニメを付け直して再生
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }

  function showScreen(name) {
    var screens = document.querySelectorAll('.screen');
    for (var i = 0; i < screens.length; i++) screens[i].classList.remove('active');
    $('screen-' + name).classList.add('active');
  }

  /* ---------- ホーム ---------- */
  function renderHome() {
    $('home-level').textContent = state.level;
    $('home-rank').textContent = rankTitle(state.level);
    var need = xpToNext(state.level);
    $('home-xp-fill').style.width = Math.min(100, state.xp / need * 100) + '%';
    $('home-xp-text').textContent = state.xp + ' / ' + need + ' XP';
    $('home-streak').textContent = state.streakDays > 0
      ? '🔥 ' + state.streakDays + 'にち れんぞくで がんばってるよ!'
      : '⭐ きょうも いっしょに がんばろう!';
    // きょうの もくひょう(デイリーゴール)
    var today = dateStr(new Date());
    var todayCount = state.todayDate === today ? state.todayCount : 0;
    $('daily-target').textContent = DAILY_GOAL;
    $('daily-count').textContent = Math.min(todayCount, DAILY_GOAL);
    $('daily-fill').style.width = Math.min(100, todayCount / DAILY_GOAL * 100) + '%';
    $('daily-done').classList.toggle('hidden', todayCount < DAILY_GOAL);
    $('btn-sound').textContent = Effects.enabled ? '🔊' : '🔇';
  }
  function goHome() {
    renderHome();
    showScreen('home');
  }

  /* ---------- ゲーム進行 ---------- */
  function startGame(pid) {
    var pat = QuizData.getPattern(pid);
    game = {
      pid: pid, pattern: pat, qIndex: 0, score: 0, correct: 0,
      combo: 0, maxCombo: 0, totalTime: 0, qStart: 0,
      q: null, input: { q: '', r: '' }, active: 'q'
    };
    lock = false;
    $('game-score').textContent = '0';
    updateCombo();
    showScreen('game');
    nextQuestion();
    if (ticker) clearInterval(ticker);
    ticker = setInterval(updateTimer, 100);
  }

  function updateTimer() {
    if (!game) return;
    var t = game.totalTime + (game.qStart ? (performance.now() - game.qStart) / 1000 : 0);
    $('timer').textContent = '⏱ ' + t.toFixed(1);
  }

  function nextQuestion() {
    game.qIndex++;
    game.q = QuizData.makeQuestion(game.pid);
    game.input = { q: '', r: '' };
    game.active = 'q';
    $('q-num').textContent = game.qIndex;
    $('progress-fill').style.width = ((game.qIndex - 1) / QUESTIONS * 100) + '%';
    $('question-text').textContent = game.q.a + ' ' + QuizData.OPS[game.pattern.op].sym + ' ' + game.q.b + ' =';
    $('remainder-wrap').classList.toggle('hidden', !game.q.hasRemainder);
    renderInput();
    hideFeedback();
    $('game-mascot').className = 'mascot mascot-game';
    if (window.HandWrite) window.HandWrite.clearPads();
    lock = false;
    game.qStart = performance.now();
  }

  function renderInput() {
    var qb = $('answer-quotient');
    var rb = $('answer-remainder');
    qb.textContent = game.input.q === '' ? '?' : game.input.q;
    rb.textContent = game.input.r === '' ? '?' : game.input.r;
    qb.classList.toggle('active', game.active === 'q');
    rb.classList.toggle('active', game.active === 'r' && game.q && game.q.hasRemainder);
  }

  function inputDigit(d) {
    if (lock || !game) return;
    var cur = game.input[game.active];
    if (cur.length >= 3) return;
    game.input[game.active] = cur + d;
    Effects.sound('tap');
    renderInput();
  }
  function delDigit() {
    if (lock || !game) return;
    var cur = game.input[game.active];
    game.input[game.active] = cur.slice(0, -1);
    renderInput();
  }
  function clearInput() {
    if (lock || !game) return;
    game.input[game.active] = '';
    Effects.sound('tap');
    renderInput();
  }
  function setActive(which) {
    if (lock || !game || !game.q || !game.q.hasRemainder) return;
    game.active = which;
    renderInput();
  }

  function speedBonus(sec) {
    if (sec <= 3) return 50;
    if (sec <= 6) return 30;
    if (sec <= 10) return 10;
    return 0;
  }

  function submit() {
    if (lock || !game) return;
    if (game.input.q === '') {
      replay($('question-card'), 'shake');
      return;
    }
    var q = game.q;
    var ansQ = parseInt(game.input.q, 10);
    var ansR = game.input.r === '' ? 0 : parseInt(game.input.r, 10);
    var elapsed = (performance.now() - game.qStart) / 1000;
    game.totalTime += elapsed;
    game.qStart = 0;
    lock = true;

    var ok = ansQ === q.answer && (!q.hasRemainder || ansR === q.remainder);
    if (ok) {
      game.correct++;
      game.combo++;
      if (game.combo > game.maxCombo) game.maxCombo = game.combo;
      var sb = speedBonus(elapsed);
      var cb = Math.min((game.combo - 1) * 10, 100);
      var gained = 100 + sb + cb;
      game.score += gained;
      $('game-score').textContent = game.score;
      updateCombo();
      Effects.sound('correct');
      if (game.combo >= 3) Effects.sound('combo', game.combo);
      Effects.confetti(game.combo >= 5 ? 2 : 1);
      Effects.burstAt($('question-card'));
      $('game-mascot').classList.add('bounce');
      showFeedback(true, pick(QuizData.PRAISES), '+' + gained + ' てん' + (sb >= 30 ? ' ⚡はやい!' : ''));
      setTimeout(step, 1200);
    } else {
      game.combo = 0;
      updateCombo();
      Effects.sound('wrong');
      replay($('question-card'), 'shake');
      $('game-mascot').classList.add('wobble');
      var correctText = 'こたえは ' + q.answer + (q.hasRemainder ? ' あまり ' + q.remainder : '');
      showFeedback(false, correctText, pick(QuizData.ENCOURAGES));
      setTimeout(step, 1900);
    }
  }

  function step() {
    if (!game) return;
    if (game.qIndex >= QUESTIONS) endSession();
    else nextQuestion();
  }

  function updateCombo() {
    var el = $('combo-display');
    if (game && game.combo >= 2) {
      el.textContent = '🔥 ' + game.combo + ' コンボ!';
      el.classList.add('show');
      el.classList.toggle('hot', game.combo >= 5);
    } else {
      el.classList.remove('show');
      el.classList.remove('hot');
    }
  }

  function showFeedback(good, main, sub) {
    var ov = $('feedback-overlay');
    ov.classList.remove('correct');
    ov.classList.remove('wrong');
    ov.classList.add(good ? 'correct' : 'wrong');
    $('feedback-text').textContent = main;
    $('feedback-sub').textContent = sub;
    replay(ov, 'show');
  }
  function hideFeedback() { $('feedback-overlay').classList.remove('show'); }

  function quitGame() {
    if (ticker) clearInterval(ticker);
    game = null;
    goHome();
  }

  /* ---------- セッション終了・リザルト ---------- */
  function endSession() {
    if (ticker) clearInterval(ticker);
    $('progress-fill').style.width = '100%';
    var s = game;
    game = null;
    var pat = s.pattern;
    var op = pat.op;
    var legacyDiff = s.pid === 'div-1' ? 'easy' : s.pid === 'div-2' ? 'normal' : s.pid === 'div-3' ? 'hard' : null;
    var session = {
      pid: s.pid,
      score: s.score, correctCount: s.correct, total: QUESTIONS,
      difficulty: legacyDiff || op, maxCombo: s.maxCombo,
      avgTime: s.totalTime / QUESTIONS, totalTime: s.totalTime,
      perfect: s.correct === QUESTIONS
    };

    // れんぞく日数(ストリーク)
    var today = dateStr(new Date());
    if (state.lastPlayDate !== today) {
      var yest = new Date();
      yest.setDate(yest.getDate() - 1);
      state.streakDays = state.lastPlayDate === dateStr(yest) ? state.streakDays + 1 : 1;
      state.lastPlayDate = today;
    }

    // 累計の更新
    state.sessions++;
    state.totalCorrect += s.correct;
    state.totalAnswered += QUESTIONS;
    state.totalScore += s.score;
    if (session.perfect) state.perfectCount++;
    state.opCorrect[op] += s.correct;
    state.opGames[op]++;
    if (legacyDiff === 'easy') { state.easyCorrect += s.correct; state.easyGames++; }
    else if (legacyDiff === 'normal') { state.normalCorrect += s.correct; state.normalGames++; }
    else if (legacyDiff === 'hard') { state.hardCorrect += s.correct; state.hardGames++; }
    if (s.maxCombo > state.maxCombo) state.maxCombo = s.maxCombo;
    if (legacyDiff && s.score > state.bestScore[legacyDiff]) state.bestScore[legacyDiff] = s.score;
    var ps = state.patternStats[s.pid] || (state.patternStats[s.pid] = { games: 0, correct: 0, best: 0 });
    ps.games++;
    ps.correct += s.correct;
    if (s.score > ps.best) ps.best = s.score;

    // きょうの もくひょう(デイリーゴール)の更新
    if (state.todayDate !== today) { state.todayDate = today; state.todayCount = 0; }
    state.todayCount += s.correct;

    // XP とレベル(むずかしいパターンほど倍率が高い)
    var gainedXp = Math.round(s.score / 10 * pat.mult);
    state.xp += gainedXp;
    var levelsGained = 0;
    while (state.xp >= xpToNext(state.level)) {
      state.xp -= xpToNext(state.level);
      state.level++;
      levelsGained++;
    }

    // バッジ判定
    var newBadges = [];
    for (var i = 0; i < QuizData.BADGES.length; i++) {
      var b = QuizData.BADGES[i];
      if (!state.badges[b.id] && b.check(state, session)) {
        state.badges[b.id] = today;
        newBadges.push(b);
      }
    }

    // ランクイン判定&自動登録(パターン別トップ10、名前は PLAYER_NAME 固定で都度入力なし)
    var list = state.rankings2[s.pid] || (state.rankings2[s.pid] = []);
    var rankIn = s.score > 0 && (list.length < 10 || s.score > list[list.length - 1].score);
    var rankPos = 0;
    if (rankIn) {
      var entry = { name: PLAYER_NAME, score: s.score, time: Math.round(s.totalTime * 10) / 10, date: today };
      list.push(entry);
      list.sort(function (a, b) { return b.score - a.score || a.time - b.time; });
      state.rankings2[s.pid] = list.slice(0, 10);
      rankPos = state.rankings2[s.pid].indexOf(entry) + 1;
    }
    state.lastName = PLAYER_NAME;

    Storage.save(state);
    renderResult(session, gainedXp, levelsGained, newBadges, rankIn, rankPos);
  }

  function renderResult(session, gainedXp, levelsGained, newBadges, rankIn, rankPos) {
    var stars = session.perfect ? 3 : session.correctCount >= 8 ? 2 : session.correctCount >= 6 ? 1 : 0;
    var titles = ['チャレンジ ありがとう! 💪', 'よく がんばったね! 😊', 'すごい! 🎉', 'パーフェクト!! 🎊'];
    $('result-title').textContent = titles[stars];
    $('result-correct').textContent = session.correctCount + ' / ' + session.total;
    $('result-time').textContent = session.totalTime.toFixed(1) + ' びょう';
    $('result-combo').textContent = session.maxCombo;
    $('result-score').textContent = session.score;

    var starSpans = $('result-stars').querySelectorAll('span');
    for (var i = 0; i < starSpans.length; i++) starSpans[i].classList.remove('on');

    $('result-xp-fill').style.width = '0%';
    $('result-xp-text').textContent = '+' + gainedXp + ' XP!(レベル' + state.level + ': ' + state.xp + ' / ' + xpToNext(state.level) + ')';

    var nb = $('result-newbadges');
    nb.innerHTML = '';
    var chipMax = Math.min(newBadges.length, 6); // 一度に大量取得しても表示は最大6個
    for (var j = 0; j < chipMax; j++) {
      var chip = document.createElement('div');
      chip.className = 'badge-chip';
      chip.textContent = newBadges[j].emoji + ' ' + newBadges[j].name + ' ゲット!';
      nb.appendChild(chip);
    }
    if (newBadges.length > chipMax) {
      var moreChip = document.createElement('div');
      moreChip.className = 'badge-chip';
      moreChip.textContent = '🏅 ほか ' + (newBadges.length - chipMax) + ' こ ゲット!';
      nb.appendChild(moreChip);
    }

    $('result-rankin').classList.toggle('hidden', !rankIn);
    if (rankIn) $('rank-in-msg').textContent = '🎉 ' + rankPos + 'い に ランクイン!';

    pendingResult = { session: session, levelsGained: levelsGained, stars: stars };
    showScreen('result');
    playResultEffects(stars, session.perfect, levelsGained, newBadges.length, rankIn);
  }

  function playResultEffects(stars, perfect, levelsGained, badgeCount, rankIn) {
    Effects.sound('fanfare');
    var starSpans = $('result-stars').querySelectorAll('span');
    for (var i = 0; i < stars; i++) {
      (function (idx) {
        setTimeout(function () {
          starSpans[idx].classList.add('on');
          Effects.sound('combo', idx + 3);
        }, 500 + idx * 350);
      })(i);
    }
    setTimeout(function () {
      Effects.confetti(perfect || levelsGained > 0 ? 3 : stars >= 2 ? 2 : 1);
    }, 400);
    setTimeout(function () {
      $('result-xp-fill').style.width = Math.min(100, state.xp / xpToNext(state.level) * 100) + '%';
    }, 600);
    if (badgeCount > 0 || rankIn) {
      setTimeout(function () { Effects.sound('badge'); }, 1300);
    }
    if (levelsGained > 0) {
      setTimeout(function () {
        $('levelup-level').textContent = 'レベル ' + state.level + ' に なったよ!';
        $('levelup-overlay').classList.add('show');
        Effects.sound('levelup');
        Effects.confetti(3);
        setTimeout(function () { $('levelup-overlay').classList.remove('show'); }, 3200);
      }, 1700);
    }
  }

  /* ---------- バッジ一覧 ---------- */
  function showBadges() {
    var grid = $('badge-grid');
    grid.innerHTML = '';
    var got = 0;
    for (var i = 0; i < QuizData.BADGES.length; i++) {
      var b = QuizData.BADGES[i];
      var unlocked = !!state.badges[b.id];
      if (unlocked) got++;
      var item = document.createElement('div');
      item.className = 'badge-item ' + (unlocked ? 'unlocked' : 'locked');
      var emoji = document.createElement('div');
      emoji.className = 'badge-emoji';
      emoji.textContent = b.emoji;
      var name = document.createElement('div');
      name.className = 'badge-name';
      name.textContent = b.name;
      var desc = document.createElement('div');
      desc.className = 'badge-desc';
      desc.textContent = b.desc;
      item.appendChild(emoji);
      item.appendChild(name);
      item.appendChild(desc);
      grid.appendChild(item);
    }
    $('badge-count').textContent = got + ' / ' + QuizData.BADGES.length + ' こ ゲット!';
    showScreen('badges');
  }

  /* ---------- きろく(統計の可視化) ---------- */
  function showStats() {
    var tc = state.totalCorrect;
    $('stat-total').textContent = tc;

    // つぎの きろくまで(マイルストーン進捗バー)
    var prev = 0, next = 0;
    for (var i = 0; i < MILESTONES.length; i++) {
      if (MILESTONES[i] > tc) { next = MILESTONES[i]; break; }
      prev = MILESTONES[i];
    }
    if (next === 0) {
      $('stat-milestone').textContent = '🏆 ぜんぶの きろく たっせい! でんせつだ!';
      $('stat-milestone-fill').style.width = '100%';
    } else {
      $('stat-milestone').textContent = 'つぎの きろくまで あと ' + (next - tc) + ' もん!';
      $('stat-milestone-fill').style.width = ((tc - prev) / (next - prev) * 100) + '%';
    }

    // 演算べつ せいかい数(よこ棒グラフ。いちばん多いものを満タンにそろえる)
    var oc = state.opCorrect;
    var mx = Math.max(oc.add, oc.sub, oc.mul, oc.div, 1);
    ['add', 'sub', 'mul', 'div'].forEach(function (op) {
      $('stat-num-' + op).textContent = oc[op];
      $('stat-bar-' + op).style.width = (oc[op] / mx * 100) + '%';
    });

    // タイル(せいかいりつ・パーフェクト数 など)
    var acc = state.totalAnswered > 0 ? Math.round(state.totalCorrect / state.totalAnswered * 100) : 0;
    $('stat-accuracy').textContent = acc + '%';
    $('stat-perfect').textContent = state.perfectCount;
    $('stat-combo').textContent = '🔥' + state.maxCombo;
    $('stat-sessions').textContent = state.sessions;
    $('stat-streak').textContent = state.streakDays;
    var badgeGot = 0;
    for (var k = 0; k < QuizData.BADGES.length; k++) {
      if (state.badges[QuizData.BADGES[k].id]) badgeGot++;
    }
    $('stat-badges').textContent = badgeGot + '/' + QuizData.BADGES.length;

    // つぎに ねらう バッジ(まだ取っていない さいしょの4つ)
    var box = $('stat-nextbadge');
    box.innerHTML = '';
    var locked = [];
    for (var m = 0; m < QuizData.BADGES.length && locked.length < 4; m++) {
      if (!state.badges[QuizData.BADGES[m].id]) locked.push(QuizData.BADGES[m]);
    }
    var title = document.createElement('div');
    title.className = 'next-badge-title';
    if (locked.length === 0) {
      title.textContent = '🎉 バッジ ぜんぶ あつめた! すごい!';
      box.appendChild(title);
    } else {
      title.textContent = '🎯 つぎは これを ねらおう!';
      box.appendChild(title);
      for (var p = 0; p < locked.length; p++) {
        var row = document.createElement('div');
        row.className = 'next-badge-row';
        row.textContent = locked[p].emoji + ' ' + locked[p].name + ' — ' + locked[p].desc;
        box.appendChild(row);
      }
    }
    showScreen('stats');
  }

  /* ---------- 演算えらび画面 ---------- */
  function recommendedPid(op) {
    // 「つぎのおすすめ」= その演算で まだ3回あそんでいない いちばんやさしいレベル
    for (var i = 0; i < QuizData.PATTERNS.length; i++) {
      var p = QuizData.PATTERNS[i];
      if (p.op !== op) continue;
      var ps = state.patternStats[p.id];
      if (!ps || ps.games < 3) return p.id;
    }
    return null;
  }

  function showOp(op) {
    var meta = QuizData.OPS[op];
    $('op-title').textContent = meta.emoji + ' ' + meta.name;
    var rec = recommendedPid(op);

    var listEl = $('op-quiz-list');
    listEl.innerHTML = '';
    var danRow = $('dan-row');
    danRow.classList.add('hidden');
    danRow.innerHTML = '';

    QuizData.PATTERNS.forEach(function (p) {
      if (p.op !== op) return;
      var btn = document.createElement('button');
      btn.className = 'btn level-btn ' + meta.btnClass;
      var label = document.createElement('span');
      label.textContent = (p.id === rec ? '🌟 ' : '') + p.name + (p.sub ? '(' + p.sub + ')' : '');
      btn.appendChild(label);
      btn.addEventListener('click', function () {
        Effects.sound('tap');
        if (p.needsDan) buildDanRow(p.id);
        else startGame(p.id);
      });
      listEl.appendChild(btn);
    });

    var hArea = $('op-hissan-area');
    hArea.innerHTML = '';
    if (op === 'div') {
      var hb = document.createElement('button');
      hb.className = 'btn btn-hissan';
      hb.textContent = '✏️ わり算の ひっ算(かいせつつき)';
      hb.addEventListener('click', function () { Effects.sound('tap'); showScreen('hissan-menu'); });
      hArea.appendChild(hb);
    } else if (window.Hissan2) {
      var how = document.createElement('button');
      how.className = 'btn btn-sub';
      how.textContent = '📖 やり方を みる';
      how.addEventListener('click', function () { Effects.sound('tap'); window.Hissan2.startHowto(op); });
      hArea.appendChild(how);
      window.Hissan2.levelsFor(op).forEach(function (lv) {
        var lb = document.createElement('button');
        lb.className = 'btn level-btn ' + meta.btnClass;
        lb.textContent = '✏️ ' + lv.name;
        lb.addEventListener('click', function () { Effects.sound('tap'); window.Hissan2.startPlay(lv.id); });
        hArea.appendChild(lb);
      });
    }
    showScreen('op');
  }

  function buildDanRow(pid) {
    var danRow = $('dan-row');
    if (!danRow.classList.contains('hidden')) { danRow.classList.add('hidden'); return; }
    danRow.innerHTML = '';
    var tip = document.createElement('div');
    tip.className = 'dan-tip';
    tip.textContent = 'どの だんに する?';
    danRow.appendChild(tip);
    var wrap = document.createElement('div');
    wrap.className = 'dan-btns';
    for (var d = 2; d <= 9; d++) {
      (function (dd) {
        var b = document.createElement('button');
        b.className = 'dan-btn';
        b.textContent = dd;
        b.addEventListener('click', function () {
          Effects.sound('tap');
          QuizData.setDan(dd);
          startGame(pid);
        });
        wrap.appendChild(b);
      })(d);
    }
    danRow.appendChild(wrap);
    danRow.classList.remove('hidden');
  }

  /* ---------- ランキング(演算タブ+レベルチップ) ---------- */
  var currentRankOp = 'div';
  var currentRankPid = 'div-1';
  function showRanking(op, pid) {
    if (op) currentRankOp = op;
    var pats = [];
    for (var pi = 0; pi < QuizData.PATTERNS.length; pi++) {
      if (QuizData.PATTERNS[pi].op === currentRankOp) pats.push(QuizData.PATTERNS[pi]);
    }
    if (pid) currentRankPid = pid;
    var found = false;
    for (var fi = 0; fi < pats.length; fi++) { if (pats[fi].id === currentRankPid) found = true; }
    if (!found) currentRankPid = pats[0].id;

    var tabs = document.querySelectorAll('.rank-tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].classList.toggle('active', tabs[i].getAttribute('data-op') === currentRankOp);
    }
    var lv = $('rank-levels');
    lv.innerHTML = '';
    pats.forEach(function (p) {
      var chip = document.createElement('button');
      chip.className = 'rank-chip' + (p.id === currentRankPid ? ' active' : '');
      chip.textContent = p.name + (p.sub ? '(' + p.sub + ')' : '');
      chip.addEventListener('click', function () { Effects.sound('tap'); showRanking(null, p.id); });
      lv.appendChild(chip);
    });

    var ol = $('rank-list');
    ol.innerHTML = '';
    var list = state.rankings2[currentRankPid] || [];
    if (list.length === 0) {
      var empty = document.createElement('li');
      empty.className = 'rank-empty';
      empty.textContent = 'まだ きろくが ないよ。いちばんのりを めざそう!';
      ol.appendChild(empty);
    }
    var medals = ['🥇', '🥈', '🥉'];
    for (var j = 0; j < list.length; j++) {
      var r = list[j];
      var row = document.createElement('li');
      row.className = 'rank-row' + (j < 3 ? ' top' + (j + 1) : '');
      var pos = document.createElement('span');
      pos.className = 'rank-pos';
      pos.textContent = j < 3 ? medals[j] : (j + 1) + 'い';
      var nm = document.createElement('span');
      nm.className = 'rank-name';
      nm.textContent = r.name;
      var sc = document.createElement('span');
      sc.className = 'rank-score';
      sc.textContent = r.score + ' てん';
      var tm = document.createElement('span');
      tm.className = 'rank-time';
      tm.textContent = r.time + ' びょう';
      row.appendChild(pos);
      row.appendChild(nm);
      row.appendChild(sc);
      row.appendChild(tm);
      ol.appendChild(row);
    }
    showScreen('ranking');
  }

  /* ---------- イベント登録 ---------- */
  function bind() {
    var opBtns = document.querySelectorAll('[data-op-btn]');
    for (var ob = 0; ob < opBtns.length; ob++) {
      opBtns[ob].addEventListener('click', function (e) {
        Effects.sound('tap');
        showOp(e.currentTarget.getAttribute('data-op-btn'));
      });
    }
    $('btn-badges').addEventListener('click', function () { Effects.sound('tap'); showBadges(); });
    $('btn-ranking').addEventListener('click', function () { Effects.sound('tap'); showRanking(currentRankOp); });
    $('btn-stats').addEventListener('click', function () { Effects.sound('tap'); showStats(); });
    $('btn-quit').addEventListener('click', quitGame);
    $('btn-retry').addEventListener('click', function () {
      Effects.sound('tap');
      if (pendingResult) startGame(pendingResult.session.pid);
    });
    $('btn-home').addEventListener('click', function () { Effects.sound('tap'); goHome(); });
    $('btn-sound').addEventListener('click', function () {
      Effects.enabled = !Effects.enabled;
      state.soundOn = Effects.enabled;
      Storage.save(state);
      $('btn-sound').textContent = Effects.enabled ? '🔊' : '🔇';
      if (Effects.enabled) Effects.sound('tap');
    });

    var backs = document.querySelectorAll('[data-back]');
    for (var i = 0; i < backs.length; i++) {
      backs[i].addEventListener('click', function () { Effects.sound('tap'); goHome(); });
    }

    var tabs = document.querySelectorAll('.rank-tab');
    for (var j = 0; j < tabs.length; j++) {
      tabs[j].addEventListener('click', function (e) {
        Effects.sound('tap');
        showRanking(e.currentTarget.getAttribute('data-op'));
      });
    }

    $('numpad').addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      var num = btn.getAttribute('data-num');
      var action = btn.getAttribute('data-action');
      if (num !== null) inputDigit(num);
      else if (action === 'clear') clearInput();
      else if (action === 'enter') submit();
    });

    $('answer-quotient').addEventListener('click', function () { setActive('q'); });
    $('answer-remainder').addEventListener('click', function () { setActive('r'); });

    document.addEventListener('keydown', function (e) {
      if (!game || !$('screen-game').classList.contains('active')) return;
      if (e.key >= '0' && e.key <= '9') {
        inputDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        delDigit();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        submit();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        setActive(game.active === 'q' ? 'r' : 'q');
      }
    });

    $('levelup-overlay').addEventListener('click', function () {
      $('levelup-overlay').classList.remove('show');
    });
  }

  // ひっ算モジュール(hissan.js)が 進行データを 共有・更新するための まど口
  window.WarizanApp = {
    state: state,
    xpToNext: xpToNext,
    goHome: goHome,
    showOp: showOp,
    hw: { // てがき入力(handwrite.js)からのブリッジ
      setInput: function (str) { if (!game || lock) return; game.input[game.active] = str.slice(0, 3); renderInput(); },
      clear: function () { if (!game || lock) return; game.input[game.active] = ''; renderInput(); },
      submit: function () { submit(); }
    },
    save: function () { Storage.save(state); },
    grantXp: function (xp) { // ひっ算クリアの ごほうび。レベルアップ数を返す
      state.xp += xp;
      var gained = 0;
      while (state.xp >= xpToNext(state.level)) {
        state.xp -= xpToNext(state.level);
        state.level++;
        gained++;
      }
      Storage.save(state);
      return { levelsGained: gained, level: state.level };
    },
    showLevelUp: function () { // 共有の レベルアップ演出
      $('levelup-level').textContent = 'レベル ' + state.level + ' に なったよ!';
      $('levelup-overlay').classList.add('show');
      Effects.sound('levelup');
      Effects.confetti(3);
      setTimeout(function () { $('levelup-overlay').classList.remove('show'); }, 3200);
    }
  };

  /* ---------- 起動 ---------- */
  bind();
  goHome();
})();
