const projects = window.portfolioProjects;
const work = document.querySelector('#work');
const feed = document.querySelector('#project-feed');
const resetCanvas = document.querySelector('#reset-canvas');
const detail = document.querySelector('#detail');
const info = document.querySelector('#info');
const toolbar = document.querySelector('#toolbar');
const lightbox = document.querySelector('#lightbox');
const imageContainer = document.querySelector('#light-content');
const sections = ['home', 'work', 'detail', 'info', 'agb'];
const titles = [['BUREAU_BLIEM', '#home'], ['INFO', '#info'], ['WORK', '#work'], ['MAIL', 'mailto:office@bureaubliem.com']];
let lightboxImages = [];
let selectedImage = 0;
let currentRoute = '';
let workPosition = 0;
let touchStart = 0;

function node(tag, className, content) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (content !== undefined) element.textContent = content;
  return element;
}

function link(text, href, className) {
  const anchor = node('a', className, text);
  anchor.href = href;
  return anchor;
}

function createMoveGrip(title) {
  const grip = node('button', 'project-grip', '⠿');
  grip.type = 'button';
  grip.setAttribute('aria-label', 'Move ' + title);
  grip.setAttribute('aria-description', 'Drag or use the arrow keys to move this panel.');
  grip.title = 'Move ' + title;
  return grip;
}

for (let i = 0; i < 5; i++) {
  const row = node('div', 'poster-row');
  for (const [text, href] of titles) {
    const item = link(text, href);
    if (i > 0) {
      item.tabIndex = -1;
      item.setAttribute('aria-hidden', 'true');
    }
    row.append(item);
  }
  document.querySelector('#home-nav').append(row);
}

function picture(image) {
  const img = node('img');
  [img.src, img.alt] = image;
  img.loading = 'lazy';
  img.decoding = 'async';
  return img;
}

function renderGrid(project, inDetail = false) {
  const grid = node('div', 'project-grid layout-' + (project.layout || 'diptych'));
  const images = project.images.filter(Boolean);
  for (const [index, image] of images.entries()) {
    const item = inDetail ? node('button', 'grid-image') : link('', '#project/' + project.id, 'grid-image');
    if (inDetail) {
      item.type = 'button';
      item.addEventListener('click', () => openImage(images, index));
    }
    item.setAttribute('aria-label', inDetail
      ? (image[2] ? 'Play ' : 'Enlarge ') + image[1]
      : 'Open project ' + project.title + ' — ' + image[1]);
    item.append(picture(image));
    if (image[2]) {
      const badge = node('span', 'video-badge', '▶');
      badge.setAttribute('aria-hidden', 'true');
      item.append(badge);
    }
    grid.append(item);
  }
  return grid;
}

function renderAgency() {
  const section = node('section', 'text-panel agency');
  section.dataset.moveTitle = 'Agency Beyond Engineering';
  section.append(node('h2', '', 'AGENCY BEYOND ENGINEERING'));
  const contact = node('address');
  contact.append(link('office@bureaubliem.com', 'mailto:office@bureaubliem.com'));
  const services = node('ul');
  for (const [english, german] of [
    ['CONSULTING', 'BERATUNG'], ['RESEARCH', 'FORSCHUNG'], ['DESIGN', 'ENTWICKLUNG'],
    ['PLANNING', 'PLANUNG'], ['IMPLEMENTATION', 'UMSETZUNG'], ['COLLABORATION', 'ZUSAMMENARBEIT']
  ]) {
    const item = node('li');
    const translation = node('span', '', german);
    translation.lang = 'de';
    item.append(node('span', '', english), translation);
    services.append(item);
  }
  const logos = node('div', 'agency-logos');
  for (const [name, alt] of [['bureau', 'Bureau Bliem'], ['ingenieur', 'Ingenieurbüros'], ['kwf', 'KWF']]) {
    logos.append(picture(['assets/projects/' + name + '-logo.webp', alt]));
  }
  const information = node('div', 'agency-info');
  information.append(contact, services);
  section.append(information, logos);
  return section;
}

info.querySelector('.info-copy').after(renderAgency());

for (const project of projects) {
  const card = node('article', 'work-project');
  card.id = 'work-' + project.id;
  if (project.width === 'full') card.classList.add('wide-project');
  card.dataset.layout = project.layout || 'diptych';
  card.dataset.photos = project.images.filter(Boolean).length;
  const grip = createMoveGrip(project.title);
  const resizeGrip = node('button', 'project-resize');
  resizeGrip.type = 'button';
  resizeGrip.setAttribute('aria-label', 'Resize ' + project.title);
  resizeGrip.setAttribute('aria-description', 'Drag or use the arrow keys to resize this project proportionally.');
  resizeGrip.title = 'Resize project grid';
  const caption = node('div', 'project-caption');
  const heading = node('h2');
  heading.append(link(project.title, '#project/' + project.id));
  caption.append(heading);
  if (project.description?.length) caption.append(node('p', '', project.description[0]));
  else if (project.facts?.Material) caption.append(node('p', '', project.facts.Material));
  card.append(renderGrid(project), caption, grip, resizeGrip);
  feed.append(card);
}

const cards = [...feed.children];
const positions = new Map();
const movedCards = new Map();
const resizedCards = new Map();
const mobileLayout = window.matchMedia('(max-width: 650px)');
let canvasHeight = 0;
let topLayer = 1;

function place(card, x, y) {
  card.style.left = x + 'px';
  card.style.top = y + 'px';
}

function layoutCanvas() {
  const width = feed.clientWidth;
  if (!width) return;
  const narrow = mobileLayout.matches;
  const lanes = narrow ? 2 : 12;
  const gutter = narrow ? 6 : 10;
  const laneWidth = (width - gutter) / lanes;
  const heights = Array(lanes).fill(narrow ? 76 : 58);
  const baseSpans = { stack: 7, diptych: 5, reverse: 5, center: 6 };
  let previousY = 0;
  let previousLane = -1;

  cards.forEach((card, index) => {
    const full = card.matches('.wide-project');
    const photos = Number(card.dataset.photos) || 0;
    const preferredSpan = baseSpans[card.dataset.layout] || 5;
    const defaultSpan = full ? lanes : narrow ? 1
      : Math.min(8, preferredSpan + Math.floor(photos / 5));
    const defaultWidth = defaultSpan * laneWidth - gutter;
    const scale = narrow ? 1 : resizedCards.get(card) ?? 1;
    const cardWidth = scale === 1 ? defaultWidth
      : Math.max(220, Math.min(width - 2 * gutter, defaultWidth * scale));
    const span = Math.ceil((cardWidth + gutter) / laneWidth - 1e-6);
    const preferredLane = narrow ? index % 2
      : [0, lanes - span, 1, lanes - span, 0, 2][index % 6];
    const offset = index === 1 ? (narrow ? 24 : 28) : 0;
    let best = { lane: 0, y: 0, score: Infinity };
    for (let lane = 0; lane <= lanes - span; lane++) {
      const availableY = Math.max(...heights.slice(lane, lane + span)) + offset;
      const y = Math.max(availableY, previousY + (lane <= previousLane ? 1 : 0));
      const score = y + Math.abs(lane - preferredLane) * 18;
      if (score < best.score) best = { lane, y, score };
    }
    previousY = best.y;
    previousLane = best.lane;
    const x = gutter + best.lane * laneWidth;
    card.style.width = cardWidth + 'px';
    const height = card.offsetHeight;
    heights.fill(best.y + height + gutter * 2, best.lane, best.lane + span);
    positions.set(card, { x, y: best.y, width: cardWidth, height, defaultWidth });
  });

  canvasHeight = Math.max(...heights);
  cards.forEach(card => {
    const moved = movedCards.get(card);
    const original = positions.get(card);
    if (moved) {
      canvasHeight = Math.max(canvasHeight, moved.y + original.height + gutter);
      moveCard(card, moved.x * width, moved.y, false);
    } else {
      place(card, original.x, original.y);
    }
  });
  feed.style.height = canvasHeight + 'px';
}

function moveCard(card, x, y, remember = true) {
  const width = feed.clientWidth;
  const size = positions.get(card);
  const nextX = Math.max(0, Math.min(width - size.width, x));
  const nextY = Math.max(44, Math.min(canvasHeight - size.height, y));
  place(card, nextX, nextY);
  if (remember) {
    movedCards.set(card, { x: nextX / width, y: nextY });
    card.style.zIndex = ++topLayer;
    resetCanvas.disabled = false;
  }
}

resetCanvas.addEventListener('click', () => {
  for (const card of movedCards.keys()) card.style.zIndex = '';
  movedCards.clear();
  resizedCards.clear();
  layoutCanvas();
  resetCanvas.disabled = true;
});

function enableMove(card, grip, move) {
  let drag;
  grip.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    grip.setPointerCapture(event.pointerId);
    drag = {
      pointer: event.pointerId, startX: event.clientX,
      startY: event.clientY + window.scrollY, x: card.offsetLeft, y: card.offsetTop
    };
    card.classList.add('is-dragging');
  });
  function updateDrag(event) {
    if (drag?.pointer !== event.pointerId) return;
    const { startX, startY, x, y } = drag;
    const dx = event.clientX - startX;
    const dy = event.clientY + window.scrollY - startY;
    if (!drag.started && Math.hypot(dx, dy) < 4) return;
    drag.started = true;
    move(x + dx, y + dy);
  }
  grip.addEventListener('pointermove', updateDrag);
  grip.addEventListener('pointerup', updateDrag);
  grip.addEventListener('lostpointercapture', () => {
    card.classList.remove('is-dragging');
    drag = undefined;
  });
  grip.addEventListener('keydown', event => {
    const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
    if (!direction) return;
    event.preventDefault();
    const step = event.shiftKey ? 64 : 16;
    move(card.offsetLeft + direction[0] * step, card.offsetTop + direction[1] * step);
  });
}

for (const card of cards) {
  const grip = card.querySelector('.project-grip');
  if (grip) enableMove(card, grip, (x, y) => moveCard(card, x, y));
}

for (const panel of info.querySelectorAll('.text-panel')) {
  const grip = createMoveGrip(panel.dataset.moveTitle);
  panel.prepend(grip);
  enableMove(panel, grip, (x, y) => {
    const left = Math.max(8, Math.min(info.clientWidth - panel.offsetWidth - 8, x));
    const top = Math.max(54, y);
    const shiftX = parseFloat(panel.style.left) || 0;
    const shiftY = parseFloat(panel.style.top) || 0;
    panel.style.left = shiftX + left - panel.offsetLeft + 'px';
    panel.style.top = shiftY + top - panel.offsetTop + 'px';
    panel.style.zIndex = ++topLayer;
  });
}

const termsCanvas = document.getElementById('agb');
const termsPanel = termsCanvas.querySelector('.text-panel');
const termsGrip = createMoveGrip('AGB');
termsGrip.lang = 'de';
termsGrip.setAttribute('aria-label', 'AGB verschieben');
termsGrip.setAttribute('aria-description', 'Ziehen oder mit den Pfeiltasten verschieben.');
termsGrip.title = 'AGB verschieben';
termsPanel.prepend(termsGrip);
enableMove(termsPanel, termsGrip, (x, y) => {
  const available = termsCanvas.clientWidth - termsPanel.offsetWidth;
  const left = Math.max(8, Math.min(available - 8, x));
  const top = Math.max(60, Math.min(window.innerHeight * 0.6, y));
  termsPanel.style.setProperty('--panel-x', left / termsCanvas.clientWidth * 100 + '%');
  termsPanel.style.setProperty('--panel-y', top + 'px');
});

for (const card of cards) {
  const grip = card.querySelector('.project-resize');
  if (!grip) continue;
  let resize;

  function previewWidth(width, left = card.offsetLeft) {
    const available = feed.clientWidth - 20;
    const nextWidth = Math.max(220, Math.min(available, width));
    card.style.left = Math.min(left, feed.clientWidth - nextWidth - 6) + 'px';
    card.style.width = nextWidth + 'px';
    feed.style.height = Math.max(canvasHeight, card.offsetTop + card.offsetHeight + 10) + 'px';
    return nextWidth;
  }

  function saveWidth(width) {
    resizedCards.set(card, width / positions.get(card).defaultWidth);
    resetCanvas.disabled = false;
    layoutCanvas();
  }

  grip.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0 || mobileLayout.matches) return;
    const grid = card.querySelector('.project-grid');
    resize = {
      width: grid.offsetWidth,
      left: card.offsetLeft,
      slope: grid.offsetHeight / grid.offsetWidth,
      x: event.clientX,
      y: event.clientY + window.scrollY,
      pointer: event.pointerId
    };
    grip.setPointerCapture(event.pointerId);
    card.classList.add('is-resizing');
  });

  function updateResize(event) {
    if (resize?.pointer !== event.pointerId) return;
    const dx = event.clientX - resize.x;
    const dy = event.clientY + window.scrollY - resize.y;
    if (resize.preview === undefined && Math.hypot(dx, dy) < 4) return;
    const delta = (dx + dy * resize.slope) / (1 + resize.slope ** 2);
    resize.preview = previewWidth(resize.width + delta, resize.left);
  }

  grip.addEventListener('pointermove', updateResize);
  grip.addEventListener('pointerup', event => {
    updateResize(event);
    const finalWidth = resize?.pointer === event.pointerId ? resize.preview : undefined;
    if (finalWidth === undefined) return;
    resize = undefined;
    saveWidth(finalWidth);
  });
  grip.addEventListener('lostpointercapture', () => {
    card.classList.remove('is-resizing');
    if (resize?.preview !== undefined) layoutCanvas();
    resize = undefined;
  });
  grip.addEventListener('keydown', event => {
    const direction = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!direction || mobileLayout.matches) return;
    event.preventDefault();
    saveWidth(previewWidth(card.offsetWidth + direction * (event.shiftKey ? 64 : 24)));
  });
}

let lastWidth = 0;
new ResizeObserver(() => {
  if (!work.hidden && feed.clientWidth !== lastWidth) {
    lastWidth = feed.clientWidth;
    layoutCanvas();
  }
}).observe(feed);
document.fonts.ready.then(() => {
  if (!work.hidden) layoutCanvas();
});
let infoViewportWidth = window.innerWidth;
window.addEventListener('resize', () => {
  if (window.innerWidth === infoViewportWidth) return;
  infoViewportWidth = window.innerWidth;
  for (const panel of info.querySelectorAll('.text-panel')) {
    panel.style.left = '';
    panel.style.top = '';
    panel.style.zIndex = '';
  }
});
mobileLayout.addEventListener('change', () => {
  if (!work.hidden) layoutCanvas();
});

function renderDetail(project) {
  const copy = node('div', 'detail-content');
  const title = node('h1', '', project.title);
  title.id = 'detail-title';
  const text = node('div', 'detail-description');
  for (const paragraph of project.description || []) text.append(node('p', '', paragraph));
  if (project.facts) {
    const facts = node('dl', 'facts');
    for (const [label, value] of Object.entries(project.facts)) {
      const row = node('div');
      row.append(node('dt', '', label), node('dd', '', value));
      facts.append(row);
    }
    text.append(facts);
  }
  copy.append(title, text, link('Back to WORK', '#work', 'back-link'));
  detail.replaceChildren(renderGrid(project, true), copy);
}

function route() {
  const previous = currentRoute;
  const hash = location.hash.slice(1) || 'home';
  const project = hash.startsWith('project/') && projects.find(item => item.id === hash.slice(8) && item.images);
  if (previous === 'work') workPosition = window.scrollY;
  currentRoute = project ? 'detail' : sections.includes(hash) && hash !== 'detail' ? hash : 'home';
  if (lightbox.open) lightbox.close();
  if (project) renderDetail(project);
  for (const id of sections) document.getElementById(id).hidden = id !== currentRoute;
  toolbar.hidden = currentRoute === 'home';
  for (const anchor of toolbar.querySelectorAll('a')) {
    if (anchor.getAttribute('href') === '#' + currentRoute) anchor.setAttribute('aria-current', 'page');
    else anchor.removeAttribute('aria-current');
  }
  if (currentRoute === 'work') layoutCanvas();
  window.scrollTo({ top: currentRoute === 'work' && previous === 'detail' ? workPosition : 0, behavior: 'instant' });
}

function showImage() {
  const entry = lightboxImages[selectedImage];
  const previousVideo = imageContainer.querySelector('video');
  if (previousVideo) previousVideo.pause();
  const media = entry[2] ? node('video') : picture(entry);
  if (entry[2]) {
    media.src = entry[2];
    media.poster = entry[0];
    media.controls = true;
    media.playsInline = true;
    media.preload = 'metadata';
    media.setAttribute('aria-label', entry[1]);
  } else {
    media.loading = 'eager';
  }
  imageContainer.replaceChildren(media);
  document.querySelector('#light-count').textContent = (selectedImage + 1) + ' / ' + lightboxImages.length;
}

function openImage(images, index) {
  lightboxImages = images;
  for (const control of lightbox.querySelectorAll('.light-prev, .light-next')) control.hidden = images.length < 2;
  selectedImage = index;
  showImage();
  lightbox.showModal();
}

function stepImage(step) {
  const count = lightboxImages.length;
  selectedImage = (selectedImage + step + count) % count;
  showImage();
}
lightbox.addEventListener('close', () => {
  const video = imageContainer.querySelector('video');
  if (video) video.pause();
});
lightbox.querySelector('.light-close').addEventListener('click', () => lightbox.close());
lightbox.querySelector('.light-prev').addEventListener('click', () => stepImage(-1));
lightbox.querySelector('.light-next').addEventListener('click', () => stepImage(1));
lightbox.addEventListener('keydown', event => {
  if (event.target instanceof HTMLVideoElement) return;
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    stepImage(event.key === 'ArrowLeft' ? -1 : 1);
  }
});
imageContainer.addEventListener('touchstart', event => { touchStart = event.changedTouches[0].clientX; }, { passive: true });
imageContainer.addEventListener('touchend', event => {
  if (event.target instanceof HTMLVideoElement) return;
  const distance = event.changedTouches[0].clientX - touchStart;
  if (Math.abs(distance) > 45) stepImage(distance > 0 ? -1 : 1);
}, { passive: true });

const terms = document.querySelector('#terms-copy');
fetch('agb.txt').then(response => {
  if (!response.ok) throw Error('AGBs unavailable');
  return response.text();
}).then(content => {
  for (const block of content.trim().split(/\n\n(?=\d+\.\)|Stand )/)) {
    const [heading, ...lines] = block.trim().split('\n');
    terms.append(node(heading.startsWith('Stand ') ? 'p' : 'h2', '', heading));
    if (lines.length) terms.append(node('pre', '', lines.join('\n').trim()));
  }
}).catch(() => terms.append(link('AGBs öffnen', 'agb.txt')));
history.scrollRestoration = 'manual';
window.addEventListener('hashchange', route);
route();
