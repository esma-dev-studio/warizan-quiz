(function() {
  'use strict';

  window.QuizData = window.QuizData || {};
  window.QuizData.BADGES = (window.QuizData.BADGES || []).concat([
    {
      id: 'add-c-50',
      emoji: '🎯',
      name: 'たしざんマスター',
      desc: 'たし算で50もん せいかいしたよ',
      check: function(stats, session) { return stats.opCorrect.add >= 50; }
    },
    {
      id: 'add-c-200',
      emoji: '⭐',
      name: 'たしざんキング',
      desc: 'たし算で200もん せいかいした',
      check: function(stats, session) { return stats.opCorrect.add >= 200; }
    },
    {
      id: 'add-c-500',
      emoji: '👑',
      name: 'たしざんチャンピオン',
      desc: 'たし算で500もん!すごいね',
      check: function(stats, session) { return stats.opCorrect.add >= 500; }
    },
    {
      id: 'sub-c-50',
      emoji: '🔢',
      name: 'ひきざんマスター',
      desc: 'ひき算で50もん せいかい',
      check: function(stats, session) { return stats.opCorrect.sub >= 50; }
    },
    {
      id: 'sub-c-200',
      emoji: '✨',
      name: 'ひきざんキング',
      desc: 'ひき算で200もん せいかいした',
      check: function(stats, session) { return stats.opCorrect.sub >= 200; }
    },
    {
      id: 'sub-c-500',
      emoji: '💎',
      name: 'ひきざんチャンピオン',
      desc: 'ひき算で500もん!さいこう',
      check: function(stats, session) { return stats.opCorrect.sub >= 500; }
    },
    {
      id: 'mul-c-50',
      emoji: '🌟',
      name: 'かけざんマスター',
      desc: 'かけ算で50もん せいかい',
      check: function(stats, session) { return stats.opCorrect.mul >= 50; }
    },
    {
      id: 'mul-c-200',
      emoji: '🚀',
      name: 'かけざんキング',
      desc: 'かけ算で200もん すごい!',
      check: function(stats, session) { return stats.opCorrect.mul >= 200; }
    },
    {
      id: 'mul-c-500',
      emoji: '🏆',
      name: 'かけざんチャンピオン',
      desc: 'かけ算で500もん!てっぺんだ',
      check: function(stats, session) { return stats.opCorrect.mul >= 500; }
    },
    {
      id: 'add-g-10',
      emoji: '🎲',
      name: 'たしざんしょしんしゃ',
      desc: 'たし算を10かい あそんだ',
      check: function(stats, session) { return stats.opGames.add >= 10; }
    },
    {
      id: 'sub-g-10',
      emoji: '🎪',
      name: 'ひきざんしょしんしゃ',
      desc: 'ひき算を10かい あそんだ',
      check: function(stats, session) { return stats.opGames.sub >= 10; }
    },
    {
      id: 'mul-g-10',
      emoji: '🎨',
      name: 'かけざんしょしんしゃ',
      desc: 'かけ算を10かい あそんだ',
      check: function(stats, session) { return stats.opGames.mul >= 10; }
    },
    {
      id: 'all-ops',
      emoji: '🌈',
      name: 'ぜんぶのりょりろん',
      desc: '4つの けいさん ぜんぶ あそんだ',
      check: function(stats, session) { return stats.opGames.add >= 1 && stats.opGames.sub >= 1 && stats.opGames.mul >= 1 && stats.opGames.div >= 1; }
    },
    {
      id: 'ops-100',
      emoji: '💪',
      name: 'きゃんばっとエリート',
      desc: 'ぜんぶで100かい あそんだ',
      check: function(stats, session) { return (stats.opGames.add + stats.opGames.sub + stats.opGames.mul + stats.opGames.div) >= 100; }
    },
    {
      id: 'hissan-1',
      emoji: '📝',
      name: 'ひっさんデビュー',
      desc: 'ひっ算を はじめて といた',
      check: function(stats, session) { return stats.hissanCleared >= 1; }
    },
    {
      id: 'hissan-10',
      emoji: '📚',
      name: 'ひっさんれんにん',
      desc: 'ひっ算を10もん といた',
      check: function(stats, session) { return stats.hissanCleared >= 10; }
    },
    {
      id: 'hissan-30',
      emoji: '🎓',
      name: 'ひっさんはかせ',
      desc: 'ひっ算を30もん といた',
      check: function(stats, session) { return stats.hissanCleared >= 30; }
    },
    {
      id: 'hissan-100',
      emoji: '🔬',
      name: 'ひっさんれいきゃく',
      desc: 'ひっ算を100もん といた',
      check: function(stats, session) { return stats.hissanCleared >= 100; }
    },
    {
      id: 'total-10000',
      emoji: '💯',
      name: 'ぜんのうせんし',
      desc: 'ぜんぶで10000もん せいかい',
      check: function(stats, session) { return stats.totalCorrect >= 10000; }
    },
    {
      id: 'streak-200',
      emoji: '🔥',
      name: 'れんぞくきろく',
      desc: '200にちあいだずっと あそんだ',
      check: function(stats, session) { return stats.streakDays >= 200; }
    }
  ]);

})();
