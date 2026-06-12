(function() {
  'use strict';

  let canvas = null;
  let ctx = null;
  let particles = [];
  let animationId = null;
  let audioContext = null;
  let audioResumed = false;

  const Colors = [
    '#FF1744', '#FF5722', '#FFC400', '#00E676',
    '#00BCD4', '#2196F3', '#7C4DFF', '#FF4081'
  ];

  function resizeCanvas() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function startAnimationLoop() {
    if (animationId !== null) return;

    function loop() {
      if (particles.length === 0) {
        animationId = null;
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        return;
      }

      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.update();
          p.draw(ctx);

          if (p.isDead()) {
            particles.splice(i, 1);
          }
        }
      }

      animationId = requestAnimationFrame(loop);
    }

    animationId = requestAnimationFrame(loop);
  }

  class ConfettiParticle {
    constructor(x, y, vx, vy, color, type = 'rect') {
      this.x = x;
      this.y = y;
      this.vx = vx;
      this.vy = vy;
      this.color = color;
      this.type = type;
      this.gravity = 0.15;
      this.friction = 0.98;
      this.rotation = Math.random() * Math.PI * 2;
      this.rotationSpeed = (Math.random() - 0.5) * 0.2;
      this.life = 1;
      this.maxLife = 2.5 + Math.random() * 0.5;
      this.size = 4 + Math.random() * 6;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.vy += this.gravity;
      this.vx *= this.friction;
      this.vy *= this.friction;
      this.rotation += this.rotationSpeed;
      this.life -= 1 / (60 * this.maxLife);
      if (this.life < 0) this.life = 0;
    }

    draw(ctx) {
      ctx.save();
      ctx.globalAlpha = this.life;
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);

      if (this.type === 'rect') {
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.size / 2, -this.size / 3, this.size, this.size / 1.5);
      } else if (this.type === 'circle') {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (this.type === 'star') {
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⭐', 0, 0);
      }

      ctx.restore();
    }

    isDead() {
      return this.life <= 0;
    }
  }

  class BurstParticle {
    constructor(x, y, vx, vy, char) {
      this.x = x;
      this.y = y;
      this.vx = vx;
      this.vy = vy;
      this.char = char;
      this.life = 1;
      this.maxLife = 1;
      this.friction = 0.95;
      this.gravity = 0.2;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.vy += this.gravity;
      this.vx *= this.friction;
      this.vy *= this.friction;
      this.life -= 1 / (60 * this.maxLife);
      if (this.life < 0) this.life = 0;
    }

    draw(ctx) {
      ctx.save();
      ctx.globalAlpha = this.life;
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.char, this.x, this.y);
      ctx.restore();
    }

    isDead() {
      return this.life <= 0;
    }
  }

  function getAudioContext() {
    try {
      if (!audioContext) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        audioContext = new AC();
      }

      if (audioContext.state === 'suspended' && !audioResumed) {
        audioResumed = true;
        audioContext.resume().catch(() => {});
      }

      return audioContext;
    } catch (e) {
      return null;
    }
  }

  // delay: 発音開始までの遅延秒(メロディの音をずらすために使う)
  function playTone(frequency, duration, type = 'sine', gainValue = 0.15, delay = 0, releaseTime = 0.2) {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const t0 = ctx.currentTime + delay;
      const len = Math.max(duration, 0.04);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.value = frequency;

      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(gainValue, t0 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + len);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t0);
      osc.stop(t0 + len + 0.05);
    } catch (e) {
      // silent fail
    }
  }

  window.Effects = {
    enabled: true,

    init(canvasElement) {
      try {
        if (!canvasElement) return;
        canvas = canvasElement;
        ctx = canvas.getContext('2d');
        if (!ctx) return;

        resizeCanvas();
        window.addEventListener('resize', () => resizeCanvas());
      } catch (e) {
        // silent fail
      }
    },

    confetti(power = 1) {
      try {
        if (!canvas || !ctx) return;

        const counts = [80, 160, 280];
        const count = counts[Math.min(power - 1, 2)] || 80;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 4;

        for (let i = 0; i < count; i++) {
          const color = Colors[Math.floor(Math.random() * Colors.length)];
          const vx = (Math.random() - 0.5) * 8;
          const vy = -Math.random() * 8 - 2;
          const type = Math.random() > 0.85 ? 'circle' : 'rect';

          particles.push(new ConfettiParticle(centerX, centerY, vx, vy, color, type));
        }

        if (power >= 3) {
          for (let i = 0; i < 20; i++) {
            const vx = (Math.random() - 0.5) * 6;
            const vy = -Math.random() * 6 - 1;
            particles.push(new ConfettiParticle(centerX, centerY, vx, vy, '#FFD700', 'star'));
          }
        }

        startAnimationLoop();
      } catch (e) {
        // silent fail
      }
    },

    burstAt(el, chars = ['⭐', '✨']) {
      try {
        if (!el || !canvas || !ctx) return;

        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        for (let i = 0; i < 12; i++) {
          const angle = (Math.PI * 2 * i) / 12;
          const speed = 4 + Math.random() * 2;
          const vx = Math.cos(angle) * speed;
          const vy = Math.sin(angle) * speed;
          const char = chars[Math.floor(Math.random() * chars.length)];

          particles.push(new BurstParticle(centerX, centerY, vx, vy, char));
        }

        startAnimationLoop();
      } catch (e) {
        // silent fail
      }
    },

    sound(name, level = 2) {
      try {
        if (!this.enabled) return;

        const ctx = getAudioContext();
        if (!ctx) return;

        const now = ctx.currentTime;

        switch (name) {
          case 'tap':
            playTone(700, 0.05, 'sine', 0.15, 0.01, 0.03);
            break;

          case 'correct':
            playTone(523, 0.1, 'triangle', 0.15, 0.01, 0.05);
            playTone(659, 0.1, 'triangle', 0.15, 0.11, 0.05);
            playTone(784, 0.1, 'triangle', 0.15, 0.21, 0.05);
            break;

          case 'wrong':
            try {
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.type = 'sine';
              osc.frequency.setValueAtTime(250, now);
              osc.frequency.exponentialRampToValueAtTime(180, now + 0.25);
              gain.gain.setValueAtTime(0.15, now);
              gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
              gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.start(now);
              osc.stop(now + 0.25);
            } catch (e) {}
            break;

          case 'combo':
            const startFreq = 500 + level * 60;
            const endFreq = startFreq * 1.3;
            try {
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.type = 'square';
              osc.frequency.setValueAtTime(startFreq, now);
              osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.15);
              gain.gain.setValueAtTime(0.08, now);
              gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.start(now);
              osc.stop(now + 0.15);
            } catch (e) {}
            break;

          case 'fanfare':
            playTone(523, 0.16, 'triangle', 0.14, 0, 0.1);
            playTone(659, 0.16, 'triangle', 0.14, 0.18, 0.1);
            playTone(784, 0.16, 'triangle', 0.14, 0.36, 0.1);
            playTone(1047, 0.5, 'triangle', 0.14, 0.54, 0.2);
            playTone(523, 0.5, 'sine', 0.07, 0.54, 0.2);
            playTone(659, 0.5, 'sine', 0.07, 0.54, 0.2);
            playTone(784, 0.5, 'sine', 0.07, 0.54, 0.2);
            break;

          case 'badge':
            playTone(1319, 0.08, 'sine', 0.12, 0.01, 0.05);
            playTone(1568, 0.08, 'sine', 0.12, 0.09, 0.05);
            playTone(1976, 0.08, 'sine', 0.12, 0.17, 0.05);
            playTone(2637, 0.08, 'sine', 0.12, 0.25, 0.05);
            break;

          case 'levelup':
            playTone(523, 0.12, 'triangle', 0.14, 0, 0.08);
            playTone(659, 0.12, 'triangle', 0.14, 0.12, 0.08);
            playTone(784, 0.12, 'triangle', 0.14, 0.24, 0.08);
            playTone(1047, 0.12, 'triangle', 0.14, 0.36, 0.08);
            playTone(1319, 0.6, 'triangle', 0.14, 0.5, 0.2);
            playTone(1047, 0.6, 'sine', 0.08, 0.5, 0.2);
            playTone(784, 0.6, 'sine', 0.08, 0.5, 0.2);
            playTone(1568, 0.6, 'sine', 0.06, 0.62, 0.2);
            break;

          default:
            break;
        }
      } catch (e) {
        // silent fail
      }
    }
  };
})();
