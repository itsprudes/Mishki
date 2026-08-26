/* starfield.js — процедурный космический фон с метеорным дождём.
   Starfield.draw(ctx, width, height, options)
   options: { seed, angle, density, base, tile } */
(function (global) {
  'use strict';

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* r, g, b, вес — белый и голубой доминируют, остальное акценты */
  var PALETTE = [
    [255, 255, 255, 32],
    [168, 206, 255, 28],
    [120, 224, 235, 12],
    [255, 150, 198, 10],
    [255, 190, 140, 10],
    [190, 164, 255, 8]
  ];
  var TOTAL_WEIGHT = PALETTE.reduce(function (s, c) { return s + c[3]; }, 0);

  function draw(ctx, W, H, opts) {
    var o = Object.assign({
      seed: 7,
      angle: 32,        // наклон метеоров, градусы (вниз-вправо)
      density: 1,       // множитель количества объектов
      base: '#203C92',  // базовый цвет неба
      tile: false       // true — бесшовный тайл (объекты заворачиваются за края)
    }, opts || {});

    var rnd = mulberry32(o.seed);
    var ANG = o.angle * Math.PI / 180;
    var scale = (W * H) / (1024 * 1024) * o.density;

    function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
    function pickColor() {
      var t = rnd() * TOTAL_WEIGHT;
      for (var i = 0; i < PALETTE.length; i++) { t -= PALETTE[i][3]; if (t <= 0) return PALETTE[i]; }
      return PALETTE[0];
    }
    /* вызывает fn для точки и её «зеркал» за краями — так тайл стыкуется без шва */
    function at(x, y, reach, fn) {
      fn(x, y);
      if (!o.tile) return;
      for (var dx = -1; dx <= 1; dx++) {
        for (var dy = -1; dy <= 1; dy++) {
          if (!dx && !dy) continue;
          var nx = x + dx * W, ny = y + dy * H;
          if (nx > -reach && nx < W + reach && ny > -reach && ny < H + reach) fn(nx, ny);
        }
      }
    }

    /* ---------- 1. небо ---------- */
    ctx.fillStyle = o.base;
    ctx.fillRect(0, 0, W, H);

    for (var n = 0; n < 11; n++) {
      var nx0 = rnd() * W, ny0 = rnd() * H;
      var nr = (0.22 + rnd() * 0.38) * Math.max(W, H);
      var lit = rnd() < 0.55;
      var ncol = lit ? [74, 116, 214] : [12, 26, 78];
      var na = lit ? 0.12 : 0.16;
      at(nx0, ny0, nr, function (x, y) {
        var g = ctx.createRadialGradient(x, y, 0, x, y, nr);
        g.addColorStop(0, rgba(ncol, na));
        g.addColorStop(1, rgba(ncol, 0));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      });
    }

    /* ---------- 2. боке — крупные мягкие круги ---------- */
    var bokehCount = Math.round(42 * scale);
    for (var b = 0; b < bokehCount; b++) {
      var bc = pickColor();
      var br = 6 + rnd() * rnd() * 26;
      var ba = 0.03 + rnd() * 0.07;
      at(rnd() * W, rnd() * H, br * 3, function (x, y) {
        ctx.save();
        ctx.filter = 'blur(' + (br * 0.45).toFixed(2) + 'px)';
        ctx.fillStyle = rgba(bc, ba);
        ctx.beginPath(); ctx.arc(x, y, br, 0, 6.2832); ctx.fill();
        ctx.restore();
      });
    }

    /* ---------- 3. метеоры ----------
       Три прохода: широкие световые полосы (атмосфера), обычные метеоры
       и тонкие волоски — вместе дают глубину, одним проходом не выходит. */
    function streak(len, thick, alpha, blur, col) {
      at(rnd() * W, rnd() * H, len, function (x, y) {
        ctx.save();
        ctx.filter = 'blur(' + blur.toFixed(2) + 'px)';
        ctx.translate(x, y);
        ctx.rotate(ANG);
        var g = ctx.createLinearGradient(-len / 2, 0, len / 2, 0);
        g.addColorStop(0.00, rgba(col, 0));
        g.addColorStop(0.30, rgba(col, alpha * 0.55));
        g.addColorStop(0.58, rgba(col, alpha));
        g.addColorStop(0.80, rgba(col, alpha * 0.35));
        g.addColorStop(1.00, rgba(col, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(0, 0, len / 2, thick / 2, 0, 0, 6.2832);
        ctx.fill();
        ctx.restore();
      });
    }

    var glowCount = Math.round(26 * scale);
    for (var gI = 0; gI < glowCount; gI++) {
      streak(180 + rnd() * 420, 8 + rnd() * 16, 0.05 + rnd() * 0.09, 6 + rnd() * 8, pickColor());
    }

    var streakCount = Math.round(300 * scale);
    for (var s = 0; s < streakCount; s++) {
      var len = 34 + Math.pow(rnd(), 2.4) * 400;      // много коротких, мало длинных
      streak(len, 1.1 + rnd() * 1.9, 0.10 + Math.pow(rnd(), 1.7) * 0.48,
             0.35 + rnd() * 1.2, pickColor());
    }

    var hairCount = Math.round(190 * scale);
    for (var hI = 0; hI < hairCount; hI++) {
      streak(90 + Math.pow(rnd(), 1.8) * 460, 0.55 + rnd() * 0.5,
             0.16 + Math.pow(rnd(), 1.4) * 0.5, 0.15 + rnd() * 0.35, pickColor());
    }

    /* ---------- 4. звёзды-точки ---------- */
    var dotCount = Math.round(980 * scale);
    for (var d = 0; d < dotCount; d++) {
      var dc = pickColor();
      var dr = 0.7 + Math.pow(rnd(), 2.6) * 4.2;
      var da = 0.18 + Math.pow(rnd(), 1.3) * 0.72;
      var soft = rnd() < 0.45 ? dr * 0.7 : 0;
      at(rnd() * W, rnd() * H, dr * 4, function (x, y) {
        ctx.save();
        if (soft) ctx.filter = 'blur(' + soft.toFixed(2) + 'px)';
        ctx.fillStyle = rgba(dc, da);
        ctx.beginPath(); ctx.arc(x, y, dr, 0, 6.2832); ctx.fill();
        ctx.restore();
      });
    }

    /* ---------- 5. блики-четырёхлучевики ---------- */
    var sparkCount = Math.max(3, Math.round(9 * scale));
    for (var k = 0; k < sparkCount; k++) {
      var kc = rnd() < 0.65 ? [150, 205, 255] : [255, 255, 255];
      var kl = 16 + rnd() * 30;
      var ka = 0.5 + rnd() * 0.45;
      var krot = ANG + (rnd() - 0.5) * 0.5;
      at(rnd() * W, rnd() * H, kl * 2, function (x, y) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(krot);
        ctx.filter = 'blur(0.8px)';
        [[kl, 1.6], [kl * 0.42, 1.3]].forEach(function (arm, i) {
          ctx.save();
          if (i) ctx.rotate(Math.PI / 2);
          var g = ctx.createLinearGradient(-arm[0], 0, arm[0], 0);
          g.addColorStop(0, rgba(kc, 0));
          g.addColorStop(0.5, rgba(kc, ka));
          g.addColorStop(1, rgba(kc, 0));
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.ellipse(0, 0, arm[0], arm[1], 0, 0, 6.2832); ctx.fill();
          ctx.restore();
        });
        ctx.filter = 'blur(2.5px)';
        ctx.fillStyle = rgba(kc, ka * 0.8);
        ctx.beginPath(); ctx.arc(0, 0, 2.6, 0, 6.2832); ctx.fill();
        ctx.restore();
      });
    }

    ctx.filter = 'none';
  }

  /* Вешает фон на элемент: сам подгоняет размер под DPR и ресайз окна. */
  function mount(el, opts) {
    var canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:-1;display:block';
    (el || document.body).appendChild(canvas);
    var ctx = canvas.getContext('2d');
    var t;
    function render() {
      var dpr = Math.min(global.devicePixelRatio || 1, 2);
      var w = canvas.clientWidth, h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(ctx, w, h, opts);
    }
    render();
    global.addEventListener('resize', function () {
      clearTimeout(t); t = setTimeout(render, 180);
    });
    return canvas;
  }

  global.Starfield = { draw: draw, mount: mount };
})(window);
