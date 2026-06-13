'use strict';

(function() {
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // デフォルト state
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  var DEFAULT_STATE = {
    xp: 0,
    level: 1,
    totalCorrect: 0,
    totalAnswered: 0,
    sessions: 0,
    maxCombo: 0,
    hardCorrect: 0,
    easyCorrect: 0,
    normalCorrect: 0,
    easyGames: 0,
    normalGames: 0,
    hardGames: 0,
    perfectCount: 0,
    totalScore: 0,
    todayDate: '',
    todayCount: 0,
    badges: {},
    lastPlayDate: '',
    streakDays: 0,
    lastName: '',
    soundOn: true,
    bestScore: {
      easy: 0,
      normal: 0,
      hard: 0
    },
    rankings: {
      easy: [],
      normal: [],
      hard: []
    }
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // QuizData
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  var lastA = null;
  var lastB = null;

  var QuizData = {
    PRAISES: [
      'すごい!',
      'てんさい!',
      'やったね!',
      'かんぺき!',
      'さすが!',
      'ばっちり!',
      'いいね!',
      'さいこう!',
      'よくできた!',
      'その ちょうし!',
      'えらい!',
      'めちゃ すごい!'
    ],

    ENCOURAGES: [
      'おしい! つぎは できる!',
      'まちがいは せいちょうの チャンス!',
      'チャレンジが かっこいい!',
      'もう いっかい やってみよう!',
      'がんばって!',
      'つぎ つぎ!',
      'だいじょうぶ! みんな ときどき まちがえる!',
      'もう すこし!',
      'あきらめずに どんどん いこう!',
      'しっぱいは せんせい! つづけよう!',
      'くやしさを ちからに かえよう!'
    ],

    BADGES: [
      {
        id: 'first-step',
        emoji: '🐣',
        name: 'はじめのいっぽ',
        desc: 'さいしょの れんしゅうを やりきった!',
        check: function(stats, session) {
          return stats.sessions >= 1;
        }
      },
      {
        id: 'perfect',
        emoji: '🌟',
        name: 'パーフェクト',
        desc: 'ぜんぶ あってた!',
        check: function(stats, session) {
          return session.perfect === true;
        }
      },
      {
        id: 'speedster',
        emoji: '⚡',
        name: 'スピードスター',
        desc: 'はやく たくさん あてた!',
        check: function(stats, session) {
          return session.correctCount >= 8 && session.avgTime <= 5;
        }
      },
      {
        id: 'combo-5',
        emoji: '🔥',
        name: 'コンボキング',
        desc: 'つづけて あいまくった!',
        check: function(stats, session) {
          return session.maxCombo >= 5;
        }
      },
      {
        id: 'challenger',
        emoji: '🦸',
        name: 'ちょうせんしゃ',
        desc: 'ハード で ちょうせんした!',
        check: function(stats, session) {
          return session.difficulty === 'hard';
        }
      },
      {
        id: 'amari-master',
        emoji: '👑',
        name: 'あまりマスター',
        desc: 'ハード で パーフェクト!',
        check: function(stats, session) {
          return session.difficulty === 'hard' && session.perfect === true;
        }
      },
      {
        id: 'total-100',
        emoji: '🎓',
        name: '100もんはかせ',
        desc: 'あわせて 100もん あてた!',
        check: function(stats, session) {
          return stats.totalCorrect >= 100;
        }
      },
      {
        id: 'total-500',
        emoji: '🏆',
        name: 'でんせつのはかせ',
        desc: 'あわせて 500もん あてた!',
        check: function(stats, session) {
          return stats.totalCorrect >= 500;
        }
      },
      {
        id: 'sessions-10',
        emoji: '💪',
        name: 'つづけるちから',
        desc: '10かい も やった!',
        check: function(stats, session) {
          return stats.sessions >= 10;
        }
      },
      {
        id: 'level-5',
        emoji: '🚀',
        name: 'レベル5とうたつ',
        desc: 'レベル 5 に なった!',
        check: function(stats, session) {
          return stats.level >= 5;
        }
      },
      {
        id: 'level-10',
        emoji: '🌈',
        name: 'レベル10とうたつ',
        desc: 'レベル 10 に なった!',
        check: function(stats, session) {
          return stats.level >= 10;
        }
      },
      {
        id: 'streak-3',
        emoji: '📅',
        name: 'まいにちコツコツ',
        desc: '3にち つづけた!',
        check: function(stats, session) {
          return stats.streakDays >= 3;
        }
      },
      {
        id: 'score-2000',
        emoji: '💎',
        name: 'スコアおうじゃ',
        desc: 'ひとつの ゲームで 2000てん!',
        check: function(stats, session) {
          return session.score >= 2000;
        }
      }
    ],

    generateQuestion: function(difficulty) {
      var a, b, answer, remainder, hasRemainder;

      if (difficulty === 'easy') {
        b = 2 + Math.floor(Math.random() * 4);
        answer = 1 + Math.floor(Math.random() * 9);
        a = b * answer;
        remainder = 0;
        hasRemainder = false;
      } else if (difficulty === 'normal') {
        b = 2 + Math.floor(Math.random() * 8);
        answer = 2 + Math.floor(Math.random() * 8);
        a = b * answer;
        remainder = 0;
        hasRemainder = false;
      } else if (difficulty === 'hard') {
        b = 2 + Math.floor(Math.random() * 8);
        answer = 1 + Math.floor(Math.random() * 9);
        var rand = Math.random();
        if (rand < 0.7) {
          remainder = 1 + Math.floor(Math.random() * (b - 1));
        } else {
          remainder = 0;
        }
        a = b * answer + remainder;
        hasRemainder = true;
      }

      if (lastA === a && lastB === b) {
        return QuizData.generateQuestion(difficulty);
      }

      lastA = a;
      lastB = b;

      return {
        a: a,
        b: b,
        answer: answer,
        remainder: remainder,
        hasRemainder: hasRemainder
      };
    }
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Storage
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  var Storage = {
    load: function() {
      try {
        var stored = localStorage.getItem('warizan-master-v1');
        if (!stored) {
          return JSON.parse(JSON.stringify(DEFAULT_STATE));
        }
        var parsed = JSON.parse(stored);
        var state = JSON.parse(JSON.stringify(DEFAULT_STATE));

        for (var key in parsed) {
          if (parsed.hasOwnProperty(key)) {
            if (key === 'bestScore') {
              if (typeof parsed.bestScore === 'object') {
                state.bestScore.easy = parsed.bestScore.easy || 0;
                state.bestScore.normal = parsed.bestScore.normal || 0;
                state.bestScore.hard = parsed.bestScore.hard || 0;
              }
            } else if (key === 'rankings') {
              if (typeof parsed.rankings === 'object') {
                state.rankings.easy = Array.isArray(parsed.rankings.easy) ? parsed.rankings.easy : [];
                state.rankings.normal = Array.isArray(parsed.rankings.normal) ? parsed.rankings.normal : [];
                state.rankings.hard = Array.isArray(parsed.rankings.hard) ? parsed.rankings.hard : [];
              }
            } else {
              state[key] = parsed[key];
            }
          }
        }

        return state;
      } catch (err) {
        return JSON.parse(JSON.stringify(DEFAULT_STATE));
      }
    },

    save: function(state) {
      try {
        var json = JSON.stringify(state);
        localStorage.setItem('warizan-master-v1', json);
      } catch (err) {
        // 失敗しても例外を外に投げない
      }
    }
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // グローバル公開
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  window.QuizData = QuizData;
  window.Storage = Storage;
})();
