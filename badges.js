(function() {
  'use strict';

  window.QuizData = window.QuizData || {};
  window.QuizData.BADGES = [
    {
      id: 'first-step',
      emoji: '🐣',
      name: 'はじめのいっぽ',
      desc: 'さいしょの れんしゅうを やりきった!',
      check: function(stats, session) { return stats.sessions >= 1; }
    },
    {
      id: 'perfect',
      emoji: '🌟',
      name: 'パーフェクト',
      desc: 'ぜんぶ あってた!',
      check: function(stats, session) { return session.perfect === true; }
    },
    {
      id: 'speedster',
      emoji: '⚡',
      name: 'スピードスター',
      desc: 'はやく たくさん あてた!',
      check: function(stats, session) { return session.correctCount >= 8 && session.avgTime <= 5; }
    },
    {
      id: 'combo-5',
      emoji: '🔥',
      name: 'コンボキング',
      desc: '5れんぞくで せいかい!',
      check: function(stats, session) { return session.maxCombo >= 5; }
    },
    {
      id: 'challenger',
      emoji: '🦸',
      name: 'ちょうせんしゃ',
      desc: 'むずかしいに ちょうせんした!',
      check: function(stats, session) { return session.difficulty === 'hard'; }
    },
    {
      id: 'amari-master',
      emoji: '👑',
      name: 'あまりマスター',
      desc: 'むずかしいで パーフェクト!',
      check: function(stats, session) { return session.difficulty === 'hard' && session.perfect === true; }
    },
    {
      id: 'total-100',
      emoji: '🎓',
      name: '100もんはかせ',
      desc: 'あわせて 100もん せいかい!',
      check: function(stats, session) { return stats.totalCorrect >= 100; }
    },
    {
      id: 'total-500',
      emoji: '🏆',
      name: '500もんはかせ',
      desc: 'あわせて 500もん せいかい!',
      check: function(stats, session) { return stats.totalCorrect >= 500; }
    },
    {
      id: 'sessions-10',
      emoji: '💪',
      name: 'つづけるちから',
      desc: '10かい あそんだ!',
      check: function(stats, session) { return stats.sessions >= 10; }
    },
    {
      id: 'level-5',
      emoji: '🚀',
      name: 'レベル5とうたつ',
      desc: 'レベル5に なった!',
      check: function(stats, session) { return stats.level >= 5; }
    },
    {
      id: 'level-10',
      emoji: '🌈',
      name: 'レベル10とうたつ',
      desc: 'レベル10に なった!',
      check: function(stats, session) { return stats.level >= 10; }
    },
    {
      id: 'streak-3',
      emoji: '📅',
      name: 'まいにちコツコツ',
      desc: '3にち つづけた!',
      check: function(stats, session) { return stats.streakDays >= 3; }
    },
    {
      id: 'score-2000',
      emoji: '💎',
      name: 'スコアおうじゃ',
      desc: '1ゲームで 2000てん!',
      check: function(stats, session) { return session.score >= 2000; }
    },
    {
      id: 'correct-10',
      emoji: '✨',
      name: '10もんクリア',
      desc: 'あわせて 10もん あてた!',
      check: function(stats, session) { return stats.totalCorrect >= 10; }
    },
    {
      id: 'correct-25',
      emoji: '🎯',
      name: '25もんチャレンジ',
      desc: 'あわせて 25もん あてた!',
      check: function(stats, session) { return stats.totalCorrect >= 25; }
    },
    {
      id: 'correct-50',
      emoji: '🎪',
      name: '50もんメダル',
      desc: 'あわせて 50もん あてた!',
      check: function(stats, session) { return stats.totalCorrect >= 50; }
    },
    {
      id: 'correct-75',
      emoji: '🎨',
      name: '75もんアーティスト',
      desc: 'あわせて 75もん あてた!',
      check: function(stats, session) { return stats.totalCorrect >= 75; }
    },
    {
      id: 'correct-150',
      emoji: '🌸',
      name: '150もんコンプリート',
      desc: 'あわせて 150もん あてた!',
      check: function(stats, session) { return stats.totalCorrect >= 150; }
    },
    {
      id: 'correct-250',
      emoji: '🍀',
      name: '250もんレジェンド',
      desc: 'あわせて 250もん あてた!',
      check: function(stats, session) { return stats.totalCorrect >= 250; }
    },
    {
      id: 'correct-300',
      emoji: '🌺',
      name: '300もんマスター',
      desc: 'あわせて 300もん あてた!',
      check: function(stats, session) { return stats.totalCorrect >= 300; }
    },
    {
      id: 'correct-400',
      emoji: '🎭',
      name: '400もんスーパースター',
      desc: 'あわせて 400もん あてた!',
      check: function(stats, session) { return stats.totalCorrect >= 400; }
    },
    {
      id: 'correct-600',
      emoji: '🌙',
      name: '600もんムーン',
      desc: 'あわせて 600もん あてた!',
      check: function(stats, session) { return stats.totalCorrect >= 600; }
    },
    {
      id: 'correct-750',
      emoji: '☀️',
      name: '750もんサンシャイン',
      desc: 'あわせて 750もん あてた!',
      check: function(stats, session) { return stats.totalCorrect >= 750; }
    },
    {
      id: 'correct-1000',
      emoji: '🔱',
      name: '1000もんエンペラー',
      desc: 'あわせて 1000もん あてた!',
      check: function(stats, session) { return stats.totalCorrect >= 1000; }
    },
    {
      id: 'correct-1500',
      emoji: '🎆',
      name: '1500もんフェスティバル',
      desc: 'あわせて 1500もん あてた!',
      check: function(stats, session) { return stats.totalCorrect >= 1500; }
    },
    {
      id: 'correct-2000',
      emoji: '🏖️',
      name: '2000もんパラダイス',
      desc: 'あわせて 2000もん あてた!',
      check: function(stats, session) { return stats.totalCorrect >= 2000; }
    },
    {
      id: 'correct-3000',
      emoji: '🌌',
      name: '3000もんギャラクシー',
      desc: 'あわせて 3000もん あてた!',
      check: function(stats, session) { return stats.totalCorrect >= 3000; }
    },
    {
      id: 'correct-4000',
      emoji: '🏔️',
      name: '4000もんマウンテン',
      desc: 'あわせて 4000もん あてた!',
      check: function(stats, session) { return stats.totalCorrect >= 4000; }
    },
    {
      id: 'correct-5000',
      emoji: '♔',
      name: '5000もんロイヤル',
      desc: 'あわせて 5000もん あてた!',
      check: function(stats, session) { return stats.totalCorrect >= 5000; }
    },
    {
      id: 'sessions-3',
      emoji: '🎮',
      name: '3かいプレイヤー',
      desc: '3かい あそんだ!',
      check: function(stats, session) { return stats.sessions >= 3; }
    },
    {
      id: 'sessions-5',
      emoji: '🎲',
      name: '5かいチャレンジャー',
      desc: '5かい あそんだ!',
      check: function(stats, session) { return stats.sessions >= 5; }
    },
    {
      id: 'sessions-20',
      emoji: '🧩',
      name: '20かいパズラー',
      desc: '20かい あそんだ!',
      check: function(stats, session) { return stats.sessions >= 20; }
    },
    {
      id: 'sessions-30',
      emoji: '🎪',
      name: '30かいサーカス',
      desc: '30かい あそんだ!',
      check: function(stats, session) { return stats.sessions >= 30; }
    },
    {
      id: 'sessions-50',
      emoji: '🏅',
      name: '50かいチャンピオン',
      desc: '50かい あそんだ!',
      check: function(stats, session) { return stats.sessions >= 50; }
    },
    {
      id: 'sessions-75',
      emoji: '🎊',
      name: '75かいセレブレーション',
      desc: '75かい あそんだ!',
      check: function(stats, session) { return stats.sessions >= 75; }
    },
    {
      id: 'sessions-100',
      emoji: '🏰',
      name: '100かいキャッスル',
      desc: '100かい あそんだ!',
      check: function(stats, session) { return stats.sessions >= 100; }
    },
    {
      id: 'sessions-150',
      emoji: '🌊',
      name: '150かいオーシャン',
      desc: '150かい あそんだ!',
      check: function(stats, session) { return stats.sessions >= 150; }
    },
    {
      id: 'sessions-200',
      emoji: '🚁',
      name: '200かいスカイ',
      desc: '200かい あそんだ!',
      check: function(stats, session) { return stats.sessions >= 200; }
    },
    {
      id: 'level-2',
      emoji: '🎀',
      name: 'レベル2スタート',
      desc: 'レベル2に なった!',
      check: function(stats, session) { return stats.level >= 2; }
    },
    {
      id: 'level-3',
      emoji: '🎁',
      name: 'レベル3ギフト',
      desc: 'レベル3に なった!',
      check: function(stats, session) { return stats.level >= 3; }
    },
    {
      id: 'level-4',
      emoji: '🎈',
      name: 'レベル4バルーン',
      desc: 'レベル4に なった!',
      check: function(stats, session) { return stats.level >= 4; }
    },
    {
      id: 'level-6',
      emoji: '🎸',
      name: 'レベル6ミュージック',
      desc: 'レベル6に なった!',
      check: function(stats, session) { return stats.level >= 6; }
    },
    {
      id: 'level-7',
      emoji: '🎹',
      name: 'レベル7ハーモニー',
      desc: 'レベル7に なった!',
      check: function(stats, session) { return stats.level >= 7; }
    },
    {
      id: 'level-8',
      emoji: '🎺',
      name: 'レベル8トランペット',
      desc: 'レベル8に なった!',
      check: function(stats, session) { return stats.level >= 8; }
    },
    {
      id: 'level-12',
      emoji: '🎻',
      name: 'レベル12シンフォニー',
      desc: 'レベル12に なった!',
      check: function(stats, session) { return stats.level >= 12; }
    },
    {
      id: 'level-15',
      emoji: '🎼',
      name: 'レベル15コンサート',
      desc: 'レベル15に なった!',
      check: function(stats, session) { return stats.level >= 15; }
    },
    {
      id: 'level-20',
      emoji: '🎵',
      name: 'レベル20メロディ',
      desc: 'レベル20に なった!',
      check: function(stats, session) { return stats.level >= 20; }
    },
    {
      id: 'level-25',
      emoji: '🎶',
      name: 'レベル25リズム',
      desc: 'レベル25に なった!',
      check: function(stats, session) { return stats.level >= 25; }
    },
    {
      id: 'level-30',
      emoji: '🎤',
      name: 'レベル30スター',
      desc: 'レベル30に なった!',
      check: function(stats, session) { return stats.level >= 30; }
    },
    {
      id: 'level-35',
      emoji: '🎧',
      name: 'レベル35サウンド',
      desc: 'レベル35に なった!',
      check: function(stats, session) { return stats.level >= 35; }
    },
    {
      id: 'level-40',
      emoji: '🎬',
      name: 'レベル40シネマ',
      desc: 'レベル40に なった!',
      check: function(stats, session) { return stats.level >= 40; }
    },
    {
      id: 'level-50',
      emoji: '🎞️',
      name: 'レベル50フィルム',
      desc: 'レベル50に なった!',
      check: function(stats, session) { return stats.level >= 50; }
    },
    {
      id: 'combo-3',
      emoji: '⚔️',
      name: 'コンボ3ファイター',
      desc: '3れんぞくで せいかい!',
      check: function(stats, session) { return stats.maxCombo >= 3; }
    },
    {
      id: 'combo-7',
      emoji: '🗡️',
      name: 'コンボ7ウォーリアー',
      desc: '7れんぞくで せいかい!',
      check: function(stats, session) { return stats.maxCombo >= 7; }
    },
    {
      id: 'combo-10',
      emoji: '🏹',
      name: 'コンボ10アーチャー',
      desc: '10れんぞくで せいかい!',
      check: function(stats, session) { return stats.maxCombo >= 10; }
    },
    {
      id: 'combo-15',
      emoji: '🛡️',
      name: 'コンボ15ディフェンダー',
      desc: '15れんぞくで せいかい!',
      check: function(stats, session) { return stats.maxCombo >= 15; }
    },
    {
      id: 'combo-20',
      emoji: '⚚',
      name: 'コンボ20ジャスティス',
      desc: '20れんぞくで せいかい!',
      check: function(stats, session) { return stats.maxCombo >= 20; }
    },
    {
      id: 'combo-30',
      emoji: '🔨',
      name: 'コンボ30ハンマー',
      desc: '30れんぞくで せいかい!',
      check: function(stats, session) { return stats.maxCombo >= 30; }
    },
    {
      id: 'streak-2',
      emoji: '📆',
      name: '2にちストリーク',
      desc: '2にち つづけた!',
      check: function(stats, session) { return stats.streakDays >= 2; }
    },
    {
      id: 'streak-5',
      emoji: '📍',
      name: '5にちマーク',
      desc: '5にち つづけた!',
      check: function(stats, session) { return stats.streakDays >= 5; }
    },
    {
      id: 'streak-7',
      emoji: '📌',
      name: '1しゅうかん',
      desc: '7にち つづけた!',
      check: function(stats, session) { return stats.streakDays >= 7; }
    },
    {
      id: 'streak-14',
      emoji: '📎',
      name: '2しゅうかん',
      desc: '14にち つづけた!',
      check: function(stats, session) { return stats.streakDays >= 14; }
    },
    {
      id: 'streak-21',
      emoji: '📋',
      name: '3しゅうかん',
      desc: '21にち つづけた!',
      check: function(stats, session) { return stats.streakDays >= 21; }
    },
    {
      id: 'streak-30',
      emoji: '📊',
      name: '1かげつ',
      desc: '30にち つづけた!',
      check: function(stats, session) { return stats.streakDays >= 30; }
    },
    {
      id: 'streak-50',
      emoji: '📈',
      name: '50にちチャート',
      desc: '50にち つづけた!',
      check: function(stats, session) { return stats.streakDays >= 50; }
    },
    {
      id: 'streak-100',
      emoji: '💯',
      name: '100にち',
      desc: '100にち つづけた!',
      check: function(stats, session) { return stats.streakDays >= 100; }
    },
    {
      id: 'streak-365',
      emoji: '🌍',
      name: '1ねんかん',
      desc: '365にち つづけた!',
      check: function(stats, session) { return stats.streakDays >= 365; }
    },
    {
      id: 'perfect-count-1',
      emoji: '✅',
      name: 'パーフェクト1かい',
      desc: 'パーフェクトを 1かい あてた!',
      check: function(stats, session) { return stats.perfectCount >= 1; }
    },
    {
      id: 'perfect-count-3',
      emoji: '☑️',
      name: 'パーフェクト3かい',
      desc: 'パーフェクトを 3かい あてた!',
      check: function(stats, session) { return stats.perfectCount >= 3; }
    },
    {
      id: 'perfect-count-5',
      emoji: '✔️',
      name: 'パーフェクト5かい',
      desc: 'パーフェクトを 5かい あてた!',
      check: function(stats, session) { return stats.perfectCount >= 5; }
    },
    {
      id: 'perfect-count-10',
      emoji: '✓',
      name: 'パーフェクト10かい',
      desc: 'パーフェクトを 10かい あてた!',
      check: function(stats, session) { return stats.perfectCount >= 10; }
    },
    {
      id: 'perfect-count-20',
      emoji: '🆗',
      name: 'パーフェクト20かい',
      desc: 'パーフェクトを 20かい あてた!',
      check: function(stats, session) { return stats.perfectCount >= 20; }
    },
    {
      id: 'perfect-count-50',
      emoji: '🆒',
      name: 'パーフェクト50かい',
      desc: 'パーフェクトを 50かい あてた!',
      check: function(stats, session) { return stats.perfectCount >= 50; }
    },
    {
      id: 'hard-correct-10',
      emoji: '🔴',
      name: 'むずかしい10もん',
      desc: 'むずかしいで 10もん あてた!',
      check: function(stats, session) { return stats.hardCorrect >= 10; }
    },
    {
      id: 'hard-correct-25',
      emoji: '🟡',
      name: 'むずかしい25もん',
      desc: 'むずかしいで 25もん あてた!',
      check: function(stats, session) { return stats.hardCorrect >= 25; }
    },
    {
      id: 'hard-correct-50',
      emoji: '🟢',
      name: 'むずかしい50もん',
      desc: 'むずかしいで 50もん あてた!',
      check: function(stats, session) { return stats.hardCorrect >= 50; }
    },
    {
      id: 'hard-correct-100',
      emoji: '🔵',
      name: 'むずかしい100もん',
      desc: 'むずかしいで 100もん あてた!',
      check: function(stats, session) { return stats.hardCorrect >= 100; }
    },
    {
      id: 'hard-correct-200',
      emoji: '🟣',
      name: 'むずかしい200もん',
      desc: 'むずかしいで 200もん あてた!',
      check: function(stats, session) { return stats.hardCorrect >= 200; }
    },
    {
      id: 'hard-correct-500',
      emoji: '⚫',
      name: 'むずかしい500もん',
      desc: 'むずかしいで 500もん あてた!',
      check: function(stats, session) { return stats.hardCorrect >= 500; }
    },
    {
      id: 'easy-correct-100',
      emoji: '🌻',
      name: 'かんたん100もん',
      desc: 'かんたんで 100もん あてた!',
      check: function(stats, session) { return stats.easyCorrect >= 100; }
    },
    {
      id: 'easy-correct-300',
      emoji: '🌻',
      name: 'かんたん300もん',
      desc: 'かんたんで 300もん あてた!',
      check: function(stats, session) { return stats.easyCorrect >= 300; }
    },
    {
      id: 'normal-correct-100',
      emoji: '🌷',
      name: 'ふつう100もん',
      desc: 'ふつうで 100もん あてた!',
      check: function(stats, session) { return stats.normalCorrect >= 100; }
    },
    {
      id: 'normal-correct-300',
      emoji: '🌷',
      name: 'ふつう300もん',
      desc: 'ふつうで 300もん あてた!',
      check: function(stats, session) { return stats.normalCorrect >= 300; }
    },
    {
      id: 'score-1000',
      emoji: '💰',
      name: '1000てんゲット',
      desc: '1ゲームで 1000てん!',
      check: function(stats, session) { return session.score >= 1000; }
    },
    {
      id: 'score-2500',
      emoji: '💸',
      name: '2500てんめざし',
      desc: '1ゲームで 2500てん!',
      check: function(stats, session) { return session.score >= 2500; }
    },
    {
      id: 'score-3500',
      emoji: '💵',
      name: '3500てんハイスコア',
      desc: '1ゲームで 3500てん!',
      check: function(stats, session) { return session.score >= 3500; }
    },
    {
      id: 'score-5000',
      emoji: '💴',
      name: '5000てんダイヤモンド',
      desc: '1ゲームで 5000てん!',
      check: function(stats, session) { return session.score >= 5000; }
    },
    {
      id: 'total-score-10000',
      emoji: '🏦',
      name: '10000てんバンク',
      desc: 'あわせて 10000てん!',
      check: function(stats, session) { return stats.totalScore >= 10000; }
    },
    {
      id: 'total-score-25000',
      emoji: '🏪',
      name: '25000てんストア',
      desc: 'あわせて 25000てん!',
      check: function(stats, session) { return stats.totalScore >= 25000; }
    },
    {
      id: 'total-score-50000',
      emoji: '🏬',
      name: '50000てんモール',
      desc: 'あわせて 50000てん!',
      check: function(stats, session) { return stats.totalScore >= 50000; }
    },
    {
      id: 'total-score-100000',
      emoji: '🏢',
      name: '100000てんビル',
      desc: 'あわせて 100000てん!',
      check: function(stats, session) { return stats.totalScore >= 100000; }
    },
    {
      id: 'total-score-250000',
      emoji: '🏛️',
      name: '250000てんパレス',
      desc: 'あわせて 250000てん!',
      check: function(stats, session) { return stats.totalScore >= 250000; }
    },
    {
      id: 'best-hard-1500',
      emoji: '🥇',
      name: 'むずかしい1500てん',
      desc: 'むずかしいのベスト 1500てん!',
      check: function(stats, session) { return stats.bestScore.hard >= 1500; }
    },
    {
      id: 'best-hard-3000',
      emoji: '🥇',
      name: 'むずかしい3000てん',
      desc: 'むずかしいのベスト 3000てん!',
      check: function(stats, session) { return stats.bestScore.hard >= 3000; }
    },
    {
      id: 'easy-games-25',
      emoji: '🎯',
      name: 'かんたん25かい',
      desc: 'かんたんを 25かい あそんだ!',
      check: function(stats, session) { return stats.easyGames >= 25; }
    },
    {
      id: 'normal-games-25',
      emoji: '🎪',
      name: 'ふつう25かい',
      desc: 'ふつうを 25かい あそんだ!',
      check: function(stats, session) { return stats.normalGames >= 25; }
    },
    {
      id: 'hard-games-10',
      emoji: '⚙️',
      name: 'むずかしい10かい',
      desc: 'むずかしいを 10かい あそんだ!',
      check: function(stats, session) { return stats.hardGames >= 10; }
    },
    {
      id: 'hard-games-50',
      emoji: '⚙️',
      name: 'むずかしい50かい',
      desc: 'むずかしいを 50かい あそんだ!',
      check: function(stats, session) { return stats.hardGames >= 50; }
    },
    {
      id: 'fast-4',
      emoji: '🏃',
      name: '4びょう以下',
      desc: 'へいきん 4びょう以下で あてた!',
      check: function(stats, session) { return session.correctCount >= 8 && session.avgTime <= 4; }
    },
    {
      id: 'fast-3',
      emoji: '🏃',
      name: '3びょう以下',
      desc: 'へいきん 3びょう以下で あてた!',
      check: function(stats, session) { return session.correctCount >= 10 && session.avgTime <= 3; }
    },
    {
      id: 'answered-1000',
      emoji: '👀',
      name: '1000もん見た',
      desc: 'あわせて 1000もん 見た!',
      check: function(stats, session) { return stats.totalAnswered >= 1000; }
    }
  ];
})();
