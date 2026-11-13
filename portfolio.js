const portfolio = document.querySelector('#portfolio');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const cycle = portfolio.cloneNode(true);
cycle.removeAttribute('id');
cycle.setAttribute('aria-hidden', 'true');
cycle.inert = true;
cycle.querySelectorAll('[id], [aria-labelledby]').forEach(element => {
  element.removeAttribute('id');
  element.removeAttribute('aria-labelledby');
});
portfolio.after(cycle);

const galleries = [...portfolio.querySelectorAll('.gallery')];
const copies = [...cycle.querySelectorAll('.slides')];

for (const [index, gallery] of galleries.entries()) {
  const track = gallery.querySelector('.slides');
  const slides = [...track.children];
  const previous = gallery.querySelector('.previous');
  const next = gallery.querySelector('.next');

  function updateControls() {
    previous.disabled = track.scrollLeft < 2;
    next.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
    copies[index].scrollLeft = track.scrollLeft;
  }

  function move(step) {
    const current = slides.reduce((closest, slide, slideIndex) => {
      const distance = Math.abs(slide.offsetLeft - track.scrollLeft);
      return distance < Math.abs(slides[closest].offsetLeft - track.scrollLeft) ? slideIndex : closest;
    }, 0);
    const target = Math.max(0, Math.min(current + step, slides.length - 1));
    track.scrollTo({ left: slides[target].offsetLeft, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  }

  gallery.querySelectorAll('[data-step]').forEach(button => {
    button.addEventListener('click', () => move(Number(button.dataset.step)));
  });
  track.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      move(event.key === 'ArrowLeft' ? -1 : 1);
    }
  });
  track.addEventListener('scroll', updateControls, { passive: true });
  new ResizeObserver(updateControls).observe(track);
  updateControls();
}

window.addEventListener('scroll', () => {
  const nextCycleTop = cycle.getBoundingClientRect().top;
  if (nextCycleTop <= 0 && !document.querySelector('dialog[open]')) {
    window.scrollTo({ top: window.scrollY - portfolio.getBoundingClientRect().height, behavior: 'instant' });
  }
}, { passive: true });

for (const trigger of document.querySelectorAll('[data-panel]')) {
  const panel = document.getElementById(trigger.dataset.panel);
  trigger.addEventListener('click', () => panel.showModal());
  panel.addEventListener('click', event => {
    if (event.target !== panel) return;
    const bounds = panel.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom) panel.close();
  });
  panel.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', () => panel.close());
  });
}
