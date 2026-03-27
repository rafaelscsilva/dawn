/**
 * PMC Lightbox — Fullscreen image viewer
 * Triggered by clicks on .pmc__slide images inside any [id^="pmc-"] carousel.
 * Vanilla JS, no dependencies, fully self-contained.
 */

(() => {
  // ─── Constants ────────────────────────────────────────────────────────────
  const MODAL_ID   = 'pmc-lightbox';
  const OPEN_CLASS = 'pmc-lb--open';
  const CSS = `
    /* ── Overlay ── */
    #pmc-lightbox {
      position: fixed;
      inset: 0;
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.88);
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
      opacity: 0;
      pointer-events: none;
      transition: opacity 320ms cubic-bezier(0.4, 0, 0.2, 1);
      overscroll-behavior: contain;
    }
    #pmc-lightbox.pmc-lb--open {
      opacity: 1;
      pointer-events: auto;
    }

    /* ── Inner frame ── */
    #pmc-lightbox .pmc-lb__inner {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* ── Image strip (slides) ── */
    #pmc-lightbox .pmc-lb__track-wrap {
      width: 100%;
      height: 100%;
      overflow: hidden;
    }
    #pmc-lightbox .pmc-lb__track {
      display: flex;
      height: 100%;
      transition: transform 400ms cubic-bezier(0.25, 0.1, 0.25, 1);
      will-change: transform;
    }
    @media (prefers-reduced-motion: reduce) {
      #pmc-lightbox .pmc-lb__track { transition: none; }
    }

    /* ── Single slide ── */
    #pmc-lightbox .pmc-lb__slide {
      flex: 0 0 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 3.5rem 5rem;
      box-sizing: border-box;
    }
    @media screen and (max-width: 749px) {
      #pmc-lightbox .pmc-lb__slide { padding: 3.5rem 1rem 2rem; }
    }

    /* ── Image inside slide ── */
    #pmc-lightbox .pmc-lb__img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      border-radius: 8px;
      display: block;
      transform: scale(0.94);
      opacity: 0;
      transition:
        transform 360ms cubic-bezier(0.34, 1.2, 0.64, 1),
        opacity   320ms ease;
      cursor: zoom-in;
      user-select: none;
      -webkit-user-drag: none;
      box-shadow: 0 32px 80px rgba(0, 0, 0, 0.55);
    }
    #pmc-lightbox.pmc-lb--open .pmc-lb__img--active {
      transform: scale(1);
      opacity: 1;
    }

    /* Zoom state */
    #pmc-lightbox .pmc-lb__img.pmc-lb__img--zoomed {
      cursor: zoom-out;
      transform: scale(2.2) !important;
      transition: transform 260ms cubic-bezier(0.25, 0.1, 0.25, 1) !important;
    }

    /* ── Close button ── */
    #pmc-lightbox .pmc-lb__close {
      position: fixed;
      top: 1.25rem;
      right: 1.25rem;
      width: 42px;
      height: 42px;
      display: grid;
      place-items: center;
      border-radius: 50%;
      border: 1px solid rgba(255, 255, 255, 0.18);
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      color: #fff;
      cursor: pointer;
      z-index: 10;
      transition: background 180ms ease, transform 180ms ease;
    }
    #pmc-lightbox .pmc-lb__close:hover {
      background: rgba(255, 255, 255, 0.22);
      transform: scale(1.08);
    }
    #pmc-lightbox .pmc-lb__close svg {
      width: 18px;
      height: 18px;
      stroke: #fff;
      stroke-width: 2;
      fill: none;
    }

    /* ── Arrow buttons ── */
    #pmc-lightbox .pmc-lb__arrow {
      position: fixed;
      top: 50%;
      transform: translateY(-50%);
      width: 48px;
      height: 48px;
      display: grid;
      place-items: center;
      border-radius: 50%;
      border: 1px solid rgba(255, 255, 255, 0.18);
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      color: #fff;
      cursor: pointer;
      z-index: 10;
      transition: background 180ms ease, transform 180ms ease, opacity 180ms ease;
      opacity: 0.7;
    }
    #pmc-lightbox .pmc-lb__arrow:hover { background: rgba(255,255,255,0.22); opacity: 1; }
    #pmc-lightbox .pmc-lb__arrow--prev { left: 1.25rem; }
    #pmc-lightbox .pmc-lb__arrow--next { right: 1.25rem; }
    #pmc-lightbox .pmc-lb__arrow svg {
      width: 20px;
      height: 20px;
      stroke: #fff;
      stroke-width: 2;
      fill: none;
    }
    #pmc-lightbox .pmc-lb__arrow[hidden],
    #pmc-lightbox .pmc-lb__arrow[aria-disabled="true"] {
      opacity: 0.2;
      pointer-events: none;
    }
    @media screen and (max-width: 749px) {
      #pmc-lightbox .pmc-lb__arrow { display: none; }
    }

    /* ── Pagination counter ── */
    #pmc-lightbox .pmc-lb__counter {
      position: fixed;
      bottom: 1.5rem;
      left: 50%;
      transform: translateX(-50%);
      color: rgba(255, 255, 255, 0.6);
      font-size: 0.75rem;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      letter-spacing: 0.08em;
      pointer-events: none;
      z-index: 10;
    }
  `;

  // ─── State ─────────────────────────────────────────────────────────────────
  let modal     = null;
  let track     = null;
  let counter   = null;
  let prevBtn   = null;
  let nextBtn   = null;
  let images    = [];   // { src, srcset, alt, width, height } for each slide
  let current   = 0;
  let total     = 0;
  let isOpen    = false;

  // Touch/swipe state
  let touchStartX   = 0;
  let touchDeltaX   = 0;
  let isTouching    = false;

  // ─── Build DOM (once) ──────────────────────────────────────────────────────
  function buildModal() {
    if (document.getElementById(MODAL_ID)) return;

    // Inject CSS
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    // Markup
    modal = document.createElement('div');
    modal.id = MODAL_ID;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Product image viewer');
    modal.tabIndex = -1;
    modal.innerHTML = `
      <div class="pmc-lb__inner">
        <div class="pmc-lb__track-wrap">
          <div class="pmc-lb__track"></div>
        </div>
      </div>
      <button class="pmc-lb__close" aria-label="Close" type="button">
        <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      <button class="pmc-lb__arrow pmc-lb__arrow--prev" aria-label="Previous image" type="button">
        <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <button class="pmc-lb__arrow pmc-lb__arrow--next" aria-label="Next image" type="button">
        <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
      <div class="pmc-lb__counter"></div>
    `;
    document.body.appendChild(modal);

    track   = modal.querySelector('.pmc-lb__track');
    counter = modal.querySelector('.pmc-lb__counter');
    prevBtn = modal.querySelector('.pmc-lb__arrow--prev');
    nextBtn = modal.querySelector('.pmc-lb__arrow--next');

    // ── Event listeners ──────────────────────────────────────────────────────
    modal.querySelector('.pmc-lb__close').addEventListener('click', close);

    // Click overlay backdrop to close (not when clicking image)
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.classList.contains('pmc-lb__inner') || e.target.classList.contains('pmc-lb__track-wrap')) close();
    });

    prevBtn.addEventListener('click', () => navigate(-1));
    nextBtn.addEventListener('click', () => navigate(1));

    // Keyboard
    document.addEventListener('keydown', onKeydown);

    // Touch / swipe
    modal.addEventListener('touchstart', onTouchStart, { passive: true });
    modal.addEventListener('touchmove',  onTouchMove,  { passive: true });
    modal.addEventListener('touchend',   onTouchEnd);
  }

  // ─── Collect images from a carousel ───────────────────────────────────────
  function collectImages(carouselEl) {
    const slideEls = Array.from(carouselEl.querySelectorAll('.pmc__slide'));
    return slideEls.map((slide) => {
      const img = slide.querySelector('img');
      if (!img) return null;
      return {
        src:    img.src,
        srcset: img.srcset || '',
        alt:    img.alt   || '',
        width:  img.naturalWidth  || img.width  || 1100,
        height: img.naturalHeight || img.height || 1100,
      };
    }).filter(Boolean);
  }

  // ─── Populate track with slide elements ───────────────────────────────────
  function buildSlides() {
    track.innerHTML = '';
    images.forEach(({ src, srcset, alt, width, height }, i) => {
      const slide = document.createElement('div');
      slide.className = 'pmc-lb__slide';
      slide.dataset.lbIndex = i;

      const img = document.createElement('img');
      img.className = 'pmc-lb__img';
      img.src    = src;
      img.srcset = srcset;
      img.sizes  = '(min-width: 750px) 80vw, 98vw';
      img.alt    = alt;
      img.width  = width;
      img.height = height;
      img.draggable = false;

      // Zoom on click
      img.addEventListener('click', (e) => {
        e.stopPropagation();
        img.classList.toggle('pmc-lb__img--zoomed');
      });

      slide.appendChild(img);
      track.appendChild(slide);
    });
  }

  // ─── Open ──────────────────────────────────────────────────────────────────
  function open(carouselEl, startIndex) {
    buildModal();
    images  = collectImages(carouselEl);
    total   = images.length;
    if (!total) return;

    current = Math.max(0, Math.min(startIndex, total - 1));
    buildSlides();
    updatePosition(true /* skipTransition */);
    updateUI();

    modal.classList.add(OPEN_CLASS);
    isOpen = true;

    // Prevent background scroll
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    // Focus modal for keyboard nav
    modal.focus();

    // Animate in the active image after a tiny delay (allows transition to start)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const activeImg = track.querySelector(`.pmc-lb__slide[data-lb-index="${current}"] .pmc-lb__img`);
        activeImg?.classList.add('pmc-lb__img--active');
      });
    });
  }

  // ─── Close ─────────────────────────────────────────────────────────────────
  function close() {
    if (!isOpen) return;
    modal.classList.remove(OPEN_CLASS);
    isOpen = false;
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';

    // Reset zoom on close
    track.querySelectorAll('.pmc-lb__img--zoomed').forEach((img) => img.classList.remove('pmc-lb__img--zoomed'));
  }

  // ─── Navigate ──────────────────────────────────────────────────────────────
  function navigate(delta) {
    if (!total) return;

    // Remove active class from current before sliding
    const prevImg = track.querySelector(`.pmc-lb__slide[data-lb-index="${current}"] .pmc-lb__img`);
    prevImg?.classList.remove('pmc-lb__img--active', 'pmc-lb__img--zoomed');

    current = (current + delta + total) % total;
    updatePosition(false);
    updateUI();

    // Animate the new active image in
    requestAnimationFrame(() => {
      const activeImg = track.querySelector(`.pmc-lb__slide[data-lb-index="${current}"] .pmc-lb__img`);
      activeImg?.classList.add('pmc-lb__img--active');
    });
  }

  // ─── Position track ────────────────────────────────────────────────────────
  function updatePosition(skipTransition = false) {
    if (skipTransition) {
      track.style.transition = 'none';
      requestAnimationFrame(() => { track.style.transition = ''; });
    }
    track.style.transform = `translateX(-${current * 100}%)`;
  }

  // ─── Update buttons & counter ──────────────────────────────────────────────
  function updateUI() {
    if (total <= 1) {
      prevBtn.setAttribute('hidden', '');
      nextBtn.setAttribute('hidden', '');
    } else {
      prevBtn.removeAttribute('hidden');
      nextBtn.removeAttribute('hidden');
    }
    counter.textContent = total > 1 ? `${current + 1} / ${total}` : '';
  }

  // ─── Keyboard ──────────────────────────────────────────────────────────────
  function onKeydown(e) {
    if (!isOpen) return;
    switch (e.key) {
      case 'ArrowLeft':  e.preventDefault(); navigate(-1); break;
      case 'ArrowRight': e.preventDefault(); navigate(1);  break;
      case 'Escape':     e.preventDefault(); close();       break;
    }
  }

  // ─── Touch / swipe ─────────────────────────────────────────────────────────
  function onTouchStart(e) {
    isTouching   = true;
    touchStartX  = e.touches[0].clientX;
    touchDeltaX  = 0;
  }
  function onTouchMove(e) {
    if (!isTouching) return;
    touchDeltaX = e.touches[0].clientX - touchStartX;
  }
  function onTouchEnd() {
    if (!isTouching) return;
    isTouching = false;
    if (touchDeltaX < -50) navigate(1);
    else if (touchDeltaX > 50) navigate(-1);
  }

  // ─── Wire up clicks on carousel slides ────────────────────────────────────
  function attachToCarousel(carouselEl) {
    carouselEl.addEventListener('click', (e) => {
      // Only trigger on image clicks, not arrows/dots/thumbs
      const img = e.target.closest('.pmc__slide img');
      if (!img) return;

      const slide = img.closest('.pmc__slide');
      if (!slide) return;

      const startIndex = parseInt(slide.dataset.index ?? '0', 10);
      open(carouselEl, startIndex);
    });

    // Cursor hint
    carouselEl.querySelectorAll('.pmc__slide').forEach((slide) => {
      const img = slide.querySelector('img');
      if (img) img.style.cursor = 'zoom-in';
    });
  }

  // ─── Init ──────────────────────────────────────────────────────────────────
  function init() {
    document.querySelectorAll('[id^="pmc-"]').forEach(attachToCarousel);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  // Expose globally so theme editor reloads can re-init
  window.PmcLightbox = { init, open, close };
})();
