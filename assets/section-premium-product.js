class PremiumGallery {
  constructor(root) {
    this.root = root;
    this.track = root.querySelector('[data-gallery-track]');
    this.slides = Array.from(root.querySelectorAll('[data-gallery-slide]'));
    this.dots = Array.from(root.querySelectorAll('[data-gallery-dot]'));
    this.prev = root.querySelector('[data-gallery-prev]');
    this.next = root.querySelector('[data-gallery-next]');
    this.index = 0;
    this.autoplayMs = parseInt(root.dataset.autoplay || '5000', 10);
    this.timer = null;
    this.bind();
    this.goTo(0);
    this.start();
  }

  bind() {
    this.next?.addEventListener('click', () => this.goTo(this.index + 1));
    this.prev?.addEventListener('click', () => this.goTo(this.index - 1));
    this.dots.forEach((dot, idx) => dot.addEventListener('click', () => this.goTo(idx)));

    this.root.addEventListener('pointerenter', () => this.stop());
    this.root.addEventListener('pointerleave', () => this.start());

    let startX = 0;
    let deltaX = 0;
    const onPointerMove = (event) => {
      deltaX = event.clientX - startX;
    };
    const onPointerUp = () => {
      if (Math.abs(deltaX) > 50) {
        this.goTo(this.index + (deltaX < 0 ? 1 : -1));
      }
      this.root.removeEventListener('pointermove', onPointerMove);
      this.root.removeEventListener('pointerup', onPointerUp);
    };

    this.root.addEventListener('pointerdown', (event) => {
      startX = event.clientX;
      deltaX = 0;
      this.root.addEventListener('pointermove', onPointerMove);
      this.root.addEventListener('pointerup', onPointerUp);
    });
  }

  goTo(idx) {
    if (!this.slides.length) return;
    this.index = (idx + this.slides.length) % this.slides.length;
    const offset = -this.index * 100;
    this.track.style.transform = `translateX(${offset}%)`;
    this.slides.forEach((slide, i) => slide.classList.toggle('is-active', i === this.index));
    this.dots.forEach((dot, i) => dot.classList.toggle('is-active', i === this.index));
  }

  goToMedia(mediaId) {
    if (!mediaId) return;
    const targetIndex = this.slides.findIndex((slide) => slide.dataset.mediaId === String(mediaId));
    if (targetIndex >= 0) this.goTo(targetIndex);
  }

  start() {
    if (this.timer || this.slides.length < 2) return;
    this.timer = setInterval(() => this.goTo(this.index + 1), this.autoplayMs);
  }

  stop() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }
}

class PremiumStickyATC {
  constructor(root) {
    this.root = root;
    this.anchor = document.querySelector('[data-premium-atc-anchor]');
    this.variantInput = this.root.querySelector('[data-sticky-variant]');
    this.price = this.root.querySelector('[data-sticky-price]');
    this.thumb = this.root.querySelector('[data-sticky-thumb]');
    this.observe();
    this.syncVariant();
  }

  observe() {
    if (!this.anchor) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          this.root.classList.toggle('is-visible', !entry.isIntersecting);
        });
      },
      { threshold: 0 }
    );
    observer.observe(this.anchor);
  }

  syncVariant() {
    document.addEventListener(
      PUB_SUB_EVENTS?.variantChange || 'variant-change',
      ({ detail, data }) => {
        const payload = detail || data;
        const variant = payload?.variant;
        const html = payload?.html;
        if (!variant) return;
        if (this.variantInput) {
          this.variantInput.value = variant.id;
        }
        const priceEl = html?.getElementById(`price-${payload.sectionId}`) || document.getElementById(`price-${payload.sectionId}`);
        if (priceEl && this.price) {
          this.price.innerHTML = priceEl.innerHTML;
        }
        const mediaId = variant.featured_media?.id;
        if (mediaId && this.thumb) {
          const source = document.querySelector(`[data-premium-media-thumb="${mediaId}"]`);
          if (source?.src) {
            this.thumb.src = source.src;
          }
        }
      }
    );
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const galleries = Array.from(document.querySelectorAll('[data-premium-gallery]')).map((node) => new PremiumGallery(node));
  document.querySelectorAll('[data-premium-sticky]').forEach((node) => new PremiumStickyATC(node));

  document.addEventListener(
    PUB_SUB_EVENTS?.variantChange || 'variant-change',
    ({ detail, data }) => {
      const payload = detail || data;
      const variant = payload?.variant;
      if (!variant?.featured_media?.id) return;
      galleries.forEach((gallery) => gallery.goToMedia(variant.featured_media.id));
    }
  );

  document.querySelectorAll('[data-premium-quantity]').forEach((wrapper) => {
    const input = wrapper.querySelector('.quantity__input');
    wrapper.querySelectorAll('[data-change]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const delta = parseInt(btn.dataset.change || '0', 10);
        const next = Math.max(1, parseInt(input.value || '1', 10) + delta);
        input.value = next;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
  });
});
