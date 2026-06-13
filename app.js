/* わりざんマスター — メインロジック(画面制御・出題・採点・レベル・バッジ・ランキング) */
(function () {
  'use strict';

  var QUESTIONS = 10;
  var PLAYER_NAME = 'ゆま'; // ランキング登録の名前(ひとりで使うので固定。変えたいときはここを書き換える)
  var $ = function (id) { return document.getElementById(id); };

  var state = Storage.load();
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
    var need = xpToNext(state.level);
    $('home-xp-fill').style.width = Math.min(100, state.xp / need * 100) + '%';
    $('home-xp-text').textContent = state.xp + ' / ' + need + ' XP';
    $('home-streak').textContent = state.streakDays > 0
      ? '🔥 ' + state.streakDays + 'にち れんぞくで がんばってるよ!'
      : '⭐ きょうも いっしょに がんばろう!';
    $('btn-sound').textContent = Effects.enabled ? '🔊' : '🔇';
  }
  function goHome() {
    renderHome();
    showScreen('home');
  }

  /* ---------- ゲーム進行 ---------- */
  function startGame(diff) {
    game = {
      diff: diff, qIndex: 0, score: 0, correct: 0,
      combo: 0, maxCombo: 0, totalTime: 0, qStart: 0,
      q: null, input: { q: '', r: '' }, active: 'q'
    };
    lock = false;
    $('game-score').textContent = '0';
    $('remainder-wrap').classList.toggle('hidden', diff !== 'hard');
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
    game.q = QuizData.generateQuestion(game.diff);
    game.input = { q: '', r: '' };
    game.active = 'q';
    $('q-num').textContent = game.qIndex;
    $('progress-fill').style.width = ((game.qIndex - 1) / QUESTIONS * 100) + '%';
    $('question-text').textContent = game.q.a + ' ÷ ' + game.q.b + ' =';
    renderInput();
    hideFeedback();
    $('game-mascot').className = 'mascot mascot-game';
    lock = false;
    game.qStart = performance.now();
  }

  function renderInput() {
    var qb = $('answer-quotient');
    var rb = $('answer-remainder');
    qb.textContent = game.input.q === '' ? '?' : game.input.q;
    rb.textContent = game.input.r === '' ? '?' : game.input.r;
    qb.classList.toggle('active', game.active === 'q');
    rb.classList.toggle('active', game.active === 'r' && game.diff === 'hard');
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
    if (lock || !game || game.diff !== 'hard') return;
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

    var ok = ansQ === q.answer && (game.diff !== 'hard' || ansR === q.remainder);
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
      var correctText = 'こたえは ' + q.answer + (game.diff === 'hard' ? ' あまり ' + q.remainder : '');
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
    var session = {
      score: s.score, correctCount: s.correct, total: QUESTIONS,
      difficulty: s.diff, maxCombo: s.maxCombo,
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
    if (s.diff === 'hard') state.hardCorrect += s.correct;
    if (s.maxCombo > state.maxCombo) state.maxCombo = s.maxCombo;
    if (s.score > state.bestScore[s.diff]) state.bestScore[s.diff] = s.score;

    // XP とレベル(複数レベル一括対応)
    var gainedXp = Math.round(s.score / 10);
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

    // ランクイン判定&自動登録(トップ10、名前は PLAYER_NAME 固定で都度入力なし)
    var list = state.rankings[s.diff];
    var rankIn = s.score > 0 && (list.length < 10 || s.score > list[list.length - 1].score);
    var rankPos = 0;
    if (rankIn) {
      var entry = { name: PLAYER_NAME, score: s.score, time: Math.round(s.totalTime * 10) / 10, date: today };
      list.push(entry);
      list.sort(function (a, b) { return b.score - a.score || a.time - b.time; });
      state.rankings[s.diff] = list.slice(0, 10);
      rankPos = state.rankings[s.diff].indexOf(entry) + 1;
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
    for (var j = 0; j < newBadges.length; j++) {
      var chip = document.createElement('div');
      chip.className = 'badge-chip';
      chip.textContent = newBadges[j].emoji + ' ' + newBadges[j].name + ' ゲット!';
      nb.appendChild(chip);
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

  /* ---------- ランキング ---------- */
  var currentRankTab = 'easy';
  function showRanking(diff) {
    if (diff) currentRankTab = diff;
    var tabs = document.querySelectorAll('.rank-tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].classList.toggle('active', tabs[i].getAttribute('data-diff') === currentRankTab);
    }
    var ol = $('rank-list');
    ol.innerHTML = '';
    var list = state.rankings[currentRankTab] || [];
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
    $('btn-easy').addEventListener('click', function () { Effects.sound('tap'); startGame('easy'); });
    $('btn-normal').addEventListener('click', function () { Effects.sound('tap'); startGame('normal'); });
    $('btn-hard').addEventListener('click', function () { Effects.sound('tap'); startGame('hard'); });
    $('btn-badges').addEventListener('click', function () { Effects.sound('tap'); showBadges(); });
    $('btn-ranking').addEventListener('click', function () { Effects.sound('tap'); showRanking('easy'); });
    $('btn-quit').addEventListener('click', quitGame);
    $('btn-retry').addEventListener('click', function () {
      Effects.sound('tap');
      if (pendingResult) startGame(pendingResult.session.difficulty);
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
        showRanking(e.currentTarget.getAttribute('data-diff'));
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

  /* ---------- 起動 ---------- */
  bind();
  goHome();
})();
