/* ============================================================
   Stop Frames & Loops
   1. появление плиток при скролле
   2. лупы грузятся и играют только когда видны
   3. счётчик кадра внизу слева
   4. лайтбокс с навигацией
   ============================================================ */
(() => {
  const tiles = [...document.querySelectorAll('.tile')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── 1. появление ───────────────────────────────────────── */
  if (reduced) {
    tiles.forEach(t => t.classList.add('in'));
  } else {
    const reveal = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        reveal.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    tiles.forEach(t => reveal.observe(t));
  }

  /* ── 2. ленивая загрузка и проигрывание лупов ────────────── */
  const loops = [...document.querySelectorAll('video.loop')];

  const load = (v) => {
    if (v.dataset.src && !v.src) {
      v.src = v.dataset.src;
      v.load();
    }
  };

  if (reduced) {
    // ничего не проигрываем: остаётся постер, видео откроется по клику
  } else {
    const playback = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        const v = e.target;
        if (e.isIntersecting) {
          load(v);
          if (!document.body.classList.contains('lb-open')) v.play().catch(() => {});
        } else if (!v.paused) {
          v.pause();
        }
      });
    }, { rootMargin: '180px 0px', threshold: 0.12 });
    loops.forEach(v => playback.observe(v));

    // вкладка в фоне — не жжём процессор
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) loops.forEach(v => v.pause());
    });
  }

  /* ── 3. счётчик ─────────────────────────────────────────── */
  const countEl = document.getElementById('count');
  const totalEl = document.getElementById('total');
  const pad = (n) => String(n).padStart(2, '0');
  if (totalEl) totalEl.textContent = pad(tiles.length);

  let ticking = false;
  const updateCounter = () => {
    ticking = false;
    const mid = innerHeight / 2;
    let best = 0, bestDist = Infinity;
    tiles.forEach((t, i) => {
      const r = t.getBoundingClientRect();
      const d = Math.abs(r.top + r.height / 2 - mid);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    if (countEl) countEl.textContent = pad(best + 1);
  };
  addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(updateCounter);
  }, { passive: true });
  updateCounter();

  /* ── 4. лайтбокс ────────────────────────────────────────── */
  const lb = document.getElementById('lightbox');
  const lbMedia = lb.querySelector('.lb-media');
  const lbCap = lb.querySelector('.lb-cap');
  let current = -1;
  let lastFocus = null;

  const render = (i) => {
    current = (i + tiles.length) % tiles.length;
    const tile = tiles[current];
    const src = tile.querySelector('img, video');
    const kind = tile.querySelector('.kind')?.textContent ?? '';
    const clip = tile.querySelector('.src')?.textContent ?? '';
    lbMedia.textContent = '';

    if (src.tagName === 'IMG') {
      const img = document.createElement('img');
      img.src = src.currentSrc || src.src;
      img.alt = src.alt;
      lbMedia.append(img);
    } else {
      const v = document.createElement('video');
      v.src = src.dataset.src || src.src;
      v.muted = true;
      v.loop = true;
      v.playsInline = true;
      v.autoplay = true;
      lbMedia.append(v);
      v.play().catch(() => {});
    }
    lbCap.textContent = `${pad(current + 1)} / ${pad(tiles.length)} · ${kind} · ${clip}`;
  };

  const open = (i) => {
    lastFocus = document.activeElement;
    document.body.classList.add('lb-open');
    document.body.style.overflow = 'hidden';
    loops.forEach(v => v.pause());
    lb.hidden = false;
    render(i);
    requestAnimationFrame(() => lb.classList.add('show'));
    lb.querySelector('.lb-close').focus();
  };

  const close = () => {
    lb.classList.remove('show');
    document.body.classList.remove('lb-open');
    document.body.style.overflow = '';
    const done = () => {
      lb.hidden = true;
      lbMedia.textContent = '';
      lb.removeEventListener('transitionend', done);
    };
    if (reduced) done(); else lb.addEventListener('transitionend', done);
    current = -1;
    lastFocus?.focus?.();
    // видимые лупы поедут дальше сами: подтолкнём те, что в кадре
    if (!reduced) loops.forEach(v => {
      const r = v.getBoundingClientRect();
      if (r.bottom > 0 && r.top < innerHeight) v.play().catch(() => {});
    });
  };

  tiles.forEach((tile, i) => {
    const frame = tile.querySelector('.frame');
    frame.addEventListener('click', () => open(i));
    frame.tabIndex = 0;
    frame.setAttribute('role', 'button');
    frame.setAttribute('aria-label', `Open frame ${pad(i + 1)}`);
    frame.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(i); }
    });
  });

  lb.querySelector('.lb-close').addEventListener('click', close);
  lb.querySelector('.lb-prev').addEventListener('click', () => render(current - 1));
  lb.querySelector('.lb-next').addEventListener('click', () => render(current + 1));
  // клик по фону закрывает, по самой картинке — нет
  lb.addEventListener('pointerdown', (e) => {
    if (e.target === lb || e.target === lbMedia || e.target.classList.contains('lb-figure')) close();
  });

  addEventListener('keydown', (e) => {
    if (lb.hidden) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') render(current - 1);
    else if (e.key === 'ArrowRight') render(current + 1);
  });
})();
