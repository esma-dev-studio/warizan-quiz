/* けいさんマスター — てがき入力モジュール
   キャンバスに書いた 0〜9 を、点群マッチング($P系)の自作エンジンで認識する。
   外部ライブラリなし・完全オフライン。テンキーとは body.hw-on クラスで切替。 */
(function () {
  'use strict';

  /* ==================================================================
     1) 認識エンジン(点群マッチング)
     - ストローク群 → 64点にリサンプル → 重心を原点へ → 大きさを正規化
     - テンプレートと「貪欲な点群対応づけ」で距離を計り、いちばん近い数字に
     - 点群なので書き順・筆方向・ストローク数のちがいに強い
     ================================================================== */

  var N_POINTS = 64;

  function pathLength(pts) {
    var d = 0;
    for (var i = 1; i < pts.length; i++) {
      d += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    }
    return d;
  }

  // 複数ストロークを、全体で「ちょうど total 点」になるよう長さ比例でリサンプル
  function resampleStrokes(strokes, total) {
    var lens = strokes.map(pathLength);
    var sum = lens.reduce(function (a, b) { return a + b; }, 0);

    // 各ストロークへの点数わりあて(最低2点、合計を total にそろえる)
    var counts = strokes.map(function (s, i) {
      return sum === 0 ? Math.max(2, Math.floor(total / strokes.length)) : Math.max(2, Math.round(total * lens[i] / sum));
    });
    var diff = total - counts.reduce(function (a, b) { return a + b; }, 0);
    var k = 0;
    while (diff !== 0 && k < 2000) {
      var idx = k % counts.length;
      if (diff > 0) { counts[idx]++; diff--; }
      else if (counts[idx] > 2) { counts[idx]--; diff++; }
      k++;
    }

    var out = [];
    strokes.forEach(function (stroke, si) {
      var n = counts[si];
      var L = lens[si];
      if (L === 0 || stroke.length === 1) { // 点(ドット)
        for (var z = 0; z < n; z++) out.push({ x: stroke[0].x, y: stroke[0].y, s: si });
        return;
      }
      var step = L / (n - 1);
      out.push({ x: stroke[0].x, y: stroke[0].y, s: si });
      var placed = 1, acc = 0;
      var prev = stroke[0];
      for (var j = 1; j < stroke.length && placed < n;) {
        var cur = stroke[j];
        var d = Math.hypot(cur.x - prev.x, cur.y - prev.y);
        if (acc + d >= step && d > 0) {
          var t = (step - acc) / d;
          var q = { x: prev.x + t * (cur.x - prev.x), y: prev.y + t * (cur.y - prev.y), s: si };
          out.push(q);
          placed++;
          prev = q;
          acc = 0;
        } else {
          acc += d;
          prev = cur;
          j++;
        }
      }
      while (placed < n) {
        out.push({ x: stroke[stroke.length - 1].x, y: stroke[stroke.length - 1].y, s: si });
        placed++;
      }
    });
    return out;
  }

  // 重心を原点に、最大辺で等方スケール(たてよこ比は保つ)
  function normalize(points) {
    var cx = 0, cy = 0, i;
    for (i = 0; i < points.length; i++) { cx += points[i].x; cy += points[i].y; }
    cx /= points.length; cy /= points.length;
    var minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    for (i = 0; i < points.length; i++) {
      minX = Math.min(minX, points[i].x); maxX = Math.max(maxX, points[i].x);
      minY = Math.min(minY, points[i].y); maxY = Math.max(maxY, points[i].y);
    }
    var w = maxX - minX, h = maxY - minY;
    var scale = Math.max(w, h);
    if (scale < 1e-6) scale = 1;
    var out = [];
    for (i = 0; i < points.length; i++) {
      out.push({ x: (points[i].x - cx) / scale, y: (points[i].y - cy) / scale });
    }
    out.ar = h < 1e-6 ? 99 : w / h; // たてよこ比(補助特徴)
    return out;
  }

  // $P の貪欲対応づけ距離(両方向の小さいほう)
  function cloudDistance(a, b, start) {
    var n = a.length;
    var matched = new Array(n);
    var sum = 0;
    var i = start;
    do {
      var min = 1e9, index = -1;
      for (var j = 0; j < n; j++) {
        if (matched[j]) continue;
        var d = Math.hypot(a[i].x - b[j].x, a[i].y - b[j].y);
        if (d < min) { min = d; index = j; }
      }
      matched[index] = true;
      var weight = 1 - ((i - start + n) % n) / n;
      sum += weight * min;
      i = (i + 1) % n;
    } while (i !== start);
    return sum;
  }

  function greedyMatch(a, b) {
    var e = 0.5;
    var step = Math.floor(Math.pow(a.length, 1 - e));
    var min = 1e9;
    for (var i = 0; i < a.length; i += step) {
      min = Math.min(min, cloudDistance(a, b, i));
      min = Math.min(min, cloudDistance(b, a, i));
    }
    return min;
  }

  /* ---- テンプレート(単位ますの中の 0〜9。複数の書きかたを用意) ---- */
  function ellipse(cx, cy, rx, ry, from, to, n) {
    var pts = [];
    for (var i = 0; i <= n; i++) {
      var t = from + (to - from) * (i / n);
      pts.push({ x: cx + rx * Math.sin(t), y: cy - ry * Math.cos(t) });
    }
    return pts;
  }

  var RAW_TEMPLATES = [
    { d: 0, s: [ellipse(0.5, 0.5, 0.34, 0.46, 0, 2 * Math.PI, 24)] },
    { d: 0, s: [ellipse(0.5, 0.5, 0.26, 0.45, 0, 2 * Math.PI, 24)] },
    { d: 1, s: [[{ x: 0.5, y: 0.05 }, { x: 0.5, y: 0.95 }]] },
    { d: 1, s: [[{ x: 0.33, y: 0.2 }, { x: 0.52, y: 0.05 }, { x: 0.52, y: 0.95 }]] },
    { d: 2, s: [ellipse(0.5, 0.26, 0.32, 0.2, -1.9, 1.5, 10).concat([{ x: 0.6, y: 0.52 }, { x: 0.16, y: 0.9 }, { x: 0.88, y: 0.9 }])] },
    { d: 2, s: [[{ x: 0.16, y: 0.3 }, { x: 0.3, y: 0.08 }, { x: 0.62, y: 0.05 }, { x: 0.82, y: 0.22 }, { x: 0.75, y: 0.46 }, { x: 0.4, y: 0.68 }, { x: 0.14, y: 0.92 }, { x: 0.9, y: 0.92 }]] },
    { d: 3, s: [[{ x: 0.2, y: 0.14 }, { x: 0.45, y: 0.03 }, { x: 0.75, y: 0.13 }, { x: 0.78, y: 0.3 }, { x: 0.52, y: 0.46 }, { x: 0.78, y: 0.6 }, { x: 0.78, y: 0.82 }, { x: 0.5, y: 0.97 }, { x: 0.18, y: 0.86 }]] },
    { d: 3, s: [[{ x: 0.25, y: 0.08 }, { x: 0.68, y: 0.06 }, { x: 0.46, y: 0.42 }, { x: 0.75, y: 0.55 }, { x: 0.78, y: 0.8 }, { x: 0.5, y: 0.96 }, { x: 0.2, y: 0.88 }]] },
    { d: 4, s: [[{ x: 0.58, y: 0.05 }, { x: 0.16, y: 0.6 }, { x: 0.86, y: 0.6 }], [{ x: 0.64, y: 0.32 }, { x: 0.64, y: 0.96 }]] },
    { d: 4, s: [[{ x: 0.3, y: 0.06 }, { x: 0.22, y: 0.52 }, { x: 0.8, y: 0.52 }], [{ x: 0.66, y: 0.06 }, { x: 0.66, y: 0.95 }]] },
    { d: 5, s: [[{ x: 0.78, y: 0.06 }, { x: 0.28, y: 0.06 }, { x: 0.24, y: 0.42 }, { x: 0.5, y: 0.36 }, { x: 0.78, y: 0.5 }, { x: 0.8, y: 0.74 }, { x: 0.52, y: 0.94 }, { x: 0.2, y: 0.84 }]] },
    { d: 5, s: [[{ x: 0.3, y: 0.08 }, { x: 0.26, y: 0.45 }], [{ x: 0.26, y: 0.45 }, { x: 0.55, y: 0.38 }, { x: 0.8, y: 0.56 }, { x: 0.76, y: 0.8 }, { x: 0.46, y: 0.95 }, { x: 0.18, y: 0.84 }], [{ x: 0.3, y: 0.08 }, { x: 0.8, y: 0.08 }]] },
    { d: 6, s: [[{ x: 0.68, y: 0.04 }, { x: 0.38, y: 0.35 }, { x: 0.22, y: 0.68 }].concat(ellipse(0.5, 0.72, 0.27, 0.24, -0.6, 2 * Math.PI - 0.6, 16))] },
    { d: 6, s: [[{ x: 0.6, y: 0.06 }, { x: 0.3, y: 0.5 }].concat(ellipse(0.48, 0.72, 0.24, 0.22, -0.9, 2 * Math.PI - 0.9, 16))] },
    { d: 7, s: [[{ x: 0.14, y: 0.1 }, { x: 0.84, y: 0.1 }, { x: 0.42, y: 0.95 }]] },
    { d: 7, s: [[{ x: 0.14, y: 0.14 }, { x: 0.84, y: 0.1 }, { x: 0.45, y: 0.95 }], [{ x: 0.28, y: 0.5 }, { x: 0.72, y: 0.5 }]] },
    { d: 8, s: [ellipse(0.5, 0.28, 0.24, 0.23, 0, 2 * Math.PI, 16).concat(ellipse(0.5, 0.74, 0.29, 0.24, Math.PI, 3 * Math.PI, 16))] },
    { d: 8, s: [[{ x: 0.66, y: 0.16 }, { x: 0.44, y: 0.04 }, { x: 0.28, y: 0.2 }, { x: 0.62, y: 0.52 }, { x: 0.76, y: 0.72 }, { x: 0.6, y: 0.94 }, { x: 0.34, y: 0.92 }, { x: 0.24, y: 0.7 }, { x: 0.58, y: 0.44 }, { x: 0.7, y: 0.26 }, { x: 0.5, y: 0.06 }]] },
    { d: 9, s: [ellipse(0.46, 0.28, 0.25, 0.24, 0.6, 2 * Math.PI + 0.6, 16).concat([{ x: 0.7, y: 0.4 }, { x: 0.66, y: 0.95 }])] },
    { d: 9, s: [ellipse(0.46, 0.3, 0.24, 0.25, 0, 2 * Math.PI, 16).concat([{ x: 0.7, y: 0.35 }, { x: 0.58, y: 0.7 }, { x: 0.5, y: 0.96 }])] },
    /* まぎらわしい数字のための追加バリエーション */
    { d: 4, s: [[{ x: 0.5, y: 0.06 }, { x: 0.14, y: 0.66 }, { x: 0.9, y: 0.66 }], [{ x: 0.7, y: 0.4 }, { x: 0.6, y: 0.97 }]] },
    { d: 7, s: [[{ x: 0.18, y: 0.08 }, { x: 0.88, y: 0.14 }, { x: 0.5, y: 0.55 }, { x: 0.36, y: 0.95 }]] },
    { d: 5, s: [[{ x: 0.74, y: 0.06 }, { x: 0.3, y: 0.06 }, { x: 0.28, y: 0.4 }, { x: 0.62, y: 0.36 }, { x: 0.78, y: 0.6 }, { x: 0.66, y: 0.88 }, { x: 0.3, y: 0.94 }, { x: 0.18, y: 0.8 }]] },
    { d: 0, s: [ellipse(0.5, 0.5, 0.36, 0.44, 0.35, 2 * Math.PI + 0.15, 22)] },
    { d: 1, s: [[{ x: 0.42, y: 0.12 }, { x: 0.55, y: 0.04 }, { x: 0.55, y: 0.95 }], [{ x: 0.3, y: 0.95 }, { x: 0.8, y: 0.95 }]] },
    { d: 6, s: [[{ x: 0.72, y: 0.06 }, { x: 0.42, y: 0.3 }, { x: 0.24, y: 0.62 }].concat(ellipse(0.5, 0.74, 0.26, 0.22, -0.5, 2 * Math.PI - 0.5, 16))] },
    { d: 2, s: [ellipse(0.48, 0.24, 0.3, 0.19, -1.7, 1.6, 10).concat([{ x: 0.52, y: 0.6 }, { x: 0.18, y: 0.92 }, { x: 0.5, y: 0.8 }, { x: 0.88, y: 0.86 }])] }
  ];

  var TEMPLATES = RAW_TEMPLATES.map(function (t) {
    var pts = normalize(resampleStrokes(t.s, N_POINTS));
    return { d: t.d, pts: pts, ar: pts.ar, nStrokes: t.s.length };
  });

  // 1つの数字(ストローク群)を判定して {digit, score} を返す
  function classifyGroup(strokes) {
    var pts = normalize(resampleStrokes(strokes, N_POINTS));
    var best = { d: '?', score: 1e9 };
    for (var i = 0; i < TEMPLATES.length; i++) {
      var t = TEMPLATES[i];
      var d = greedyMatch(pts, t.pts);
      // たてよこ比のちがいをペナルティに(「1」と「0」の区別などに効く)
      var arPen = Math.abs(Math.log((pts.ar + 0.05) / (t.ar + 0.05)));
      var score = d * (1 + 0.32 * Math.min(arPen, 1.2));
      if (score < best.score) best = { d: t.d, score: score };
    }
    return best;
  }

  // ストロークを「よこの位置」で桁ごとにまとめる(重なるものは同じ数字、はなれていたら別の数字)
  function segment(strokes, canvasWidth) {
    var groups = [];
    var gapLimit = Math.max(12, canvasWidth * 0.045);
    var boxes = strokes.map(function (s) {
      var minX = 1e9, maxX = -1e9;
      s.forEach(function (p) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); });
      return { s: s, minX: minX, maxX: maxX };
    });
    boxes.sort(function (a, b) { return a.minX - b.minX; });
    boxes.forEach(function (b) {
      var joined = false;
      for (var g = 0; g < groups.length; g++) {
        var G = groups[g];
        var overlap = Math.min(G.maxX, b.maxX) - Math.max(G.minX, b.minX);
        if (overlap > -gapLimit) {
          G.strokes.push(b.s);
          G.minX = Math.min(G.minX, b.minX);
          G.maxX = Math.max(G.maxX, b.maxX);
          joined = true;
          break;
        }
      }
      if (!joined) groups.push({ strokes: [b.s], minX: b.minX, maxX: b.maxX });
    });
    groups.sort(function (a, b) { return a.minX - b.minX; });
    return groups;
  }

  function recognize(strokes, canvasWidth) {
    if (!strokes.length) return '';
    var groups = segment(strokes, canvasWidth);
    var digits = groups.map(function (g) { return String(classifyGroup(g.strokes).d); });
    return digits.join('').slice(0, 3);
  }

  /* ==================================================================
     2) てがきパッド(キャンバス+清書ボタン)
     ================================================================== */

  function App() { return window.WarizanApp || null; }

  function makePad(cfg) {
    var wrap = document.getElementById(cfg.wrapId);
    var canvas = document.getElementById(cfg.canvasId);
    var numpad = document.getElementById(cfg.numpadId);
    var toggle = document.getElementById(cfg.toggleId);
    if (!wrap || !canvas || !numpad || !toggle) return null;

    var ctx = canvas.getContext('2d');
    var strokes = [];
    var cur = null;
    var timer = null;
    var dpr = window.devicePixelRatio || 1;

    function fitCanvas() {
      var w = wrap.clientWidth - 4;
      var h = 170;
      if (w < 50) return;
      if (canvas.width !== Math.round(w * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        redraw();
      }
    }

    function redraw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // うすい中央ガイド線
      ctx.save();
      ctx.strokeStyle = 'rgba(62, 142, 222, 0.14)';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(8, 145);
      ctx.lineTo(canvas.width / dpr - 8, 145);
      ctx.stroke();
      ctx.restore();
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#4A3F35';
      strokes.concat(cur ? [cur] : []).forEach(function (s) {
        if (s.length < 2) {
          ctx.beginPath();
          ctx.arc(s[0].x, s[0].y, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = '#4A3F35';
          ctx.fill();
          return;
        }
        ctx.beginPath();
        ctx.moveTo(s[0].x, s[0].y);
        for (var i = 1; i < s.length; i++) ctx.lineTo(s[i].x, s[i].y);
        ctx.stroke();
      });
    }

    function pos(e) {
      var r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    function runRecognize() {
      var text = recognize(strokes, canvas.width / dpr);
      if (text) cfg.setInput(text);
    }

    canvas.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      fitCanvas();
      if (timer) clearTimeout(timer);
      cur = [pos(e)];
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* 合成イベント等では不可 */ }
      redraw();
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!cur) return;
      e.preventDefault();
      cur.push(pos(e));
      redraw();
    });
    function endStroke(e) {
      if (!cur) return;
      strokes.push(cur);
      cur = null;
      redraw();
      if (timer) clearTimeout(timer);
      timer = setTimeout(runRecognize, 550);
    }
    canvas.addEventListener('pointerup', endStroke);
    canvas.addEventListener('pointercancel', endStroke);

    function clearAll() {
      strokes = [];
      cur = null;
      if (timer) clearTimeout(timer);
      redraw();
    }

    wrap.querySelector('.wp-clear').addEventListener('click', function () {
      Effects.sound('tap');
      clearAll();
      cfg.clearInput();
    });
    wrap.querySelector('.wp-ok').addEventListener('click', function () {
      Effects.sound('tap');
      if (timer) { clearTimeout(timer); runRecognize(); }
      cfg.submit();
    });

    // テンキーの表示状態(.hidden)を鏡うつしにして、モードで出しわけ
    var observer = new MutationObserver(sync);
    observer.observe(numpad, { attributes: true, attributeFilter: ['class'] });
    function sync() {
      var logicallyHidden = numpad.classList.contains('hidden');
      wrap.classList.toggle('wp-off', logicallyHidden);
      toggle.classList.toggle('wp-off', logicallyHidden);
      fitCanvas();
    }

    toggle.addEventListener('click', function () {
      Effects.sound('tap');
      setMode(document.body.classList.contains('hw-on') ? 'pad' : 'write');
    });

    return { clearAll: clearAll, sync: sync, fitCanvas: fitCanvas };
  }

  var pads = [];

  function setMode(mode) {
    document.body.classList.toggle('hw-on', mode === 'write');
    document.querySelectorAll('.input-toggle').forEach(function (b) {
      b.textContent = mode === 'write' ? '🔢 テンキーで こたえる' : '✍️ てがきで こたえる';
    });
    pads.forEach(function (p) { if (p) { p.fitCanvas(); } });
    var app = App();
    if (app && app.state) {
      app.state.inputMode = mode;
      app.save();
    }
  }

  function init() {
    pads.push(makePad({
      wrapId: 'quiz-writepad', canvasId: 'quiz-canvas', numpadId: 'numpad', toggleId: 'quiz-input-toggle',
      setInput: function (str) { var app = App(); if (app && app.hw) app.hw.setInput(str); },
      clearInput: function () { var app = App(); if (app && app.hw) app.hw.clear(); },
      submit: function () { var app = App(); if (app && app.hw) app.hw.submit(); }
    }));
    pads.push(makePad({
      wrapId: 'hissan-writepad', canvasId: 'hissan-canvas', numpadId: 'hissan-numpad', toggleId: 'hissan-input-toggle',
      setInput: function (str) {
        if (window.__hissanOwner === 'div') { if (window.HissanDivInput) window.HissanDivInput.set(str); }
        else if (window.Hissan2) window.Hissan2.setInput(str);
      },
      clearInput: function () {
        if (window.__hissanOwner === 'div') { if (window.HissanDivInput) window.HissanDivInput.clear(); }
        else if (window.Hissan2) window.Hissan2.clearInput();
      },
      submit: function () {
        if (window.__hissanOwner === 'div') { if (window.HissanDivInput) window.HissanDivInput.submit(); }
        else if (window.Hissan2) window.Hissan2.submitInput();
      }
    }));

    // 保存されたモードを復元(未設定ならタッチ端末は てがき)
    var app = App();
    var mode = app && app.state && app.state.inputMode;
    if (!mode) mode = ('ontouchstart' in window) ? 'write' : 'pad';
    setMode(mode);
  }

  window.HandWrite = {
    clearPads: function () { pads.forEach(function (p) { if (p) p.clearAll(); }); },
    _test: { recognize: recognize, classifyGroup: classifyGroup, segment: segment, TEMPLATES: TEMPLATES, RAW_TEMPLATES: RAW_TEMPLATES, resampleStrokes: resampleStrokes, normalize: normalize, greedyMatch: greedyMatch, N_POINTS: N_POINTS }
  };

  if (typeof document !== 'undefined' && document.getElementById) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }
})();
