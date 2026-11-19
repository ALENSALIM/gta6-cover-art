// Vice Cover Studio — page wiring.
// Loads photos locally (FileReader or the bundled samples), keeps one state
// object per panel, re-renders the cover on every change, exports the PNG,
// and honours the ?shot= query scenes for deterministic screenshots.
import { drawCover, layoutPanels, SIZES, GRADES } from './cover.js';
import { runShotScene } from './shots.js';

const $ = (id) => document.getElementById(id);

const canvas = $('coverCanvas');
const ctx = canvas.getContext('2d');

const state = {
  title: 'VICE CITY',
  subtitle: 'Sunset Heist',
  grade: 'sunset',
  size: 'square',
  selected: 0,
  photos: new Map(),
  panels: [
    { source: 'boulevard', zoom: 1, panX: 0, panY: 0, fit: 'fill' },
    { source: 'pier', zoom: 1, panX: 0, panY: 0, fit: 'fill' },
    { source: 'boulevard', zoom: 1, panX: 0, panY: 0, fit: 'fill' },
    { source: 'pier', zoom: 1, panX: 0, panY: 0, fit: 'fill' },
  ],
};

let uploadCount = 0;
let dragging = null;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image: ' + src));
    img.src = src;
  });
}

async function loadSamplePhoto(name) {
  const img = await loadImage('samples/' + name + '.jpg');
  state.photos.set(name, img);
  return img;
}

function render() {
  const size = SIZES[state.size];
  canvas.width = size.w;
  canvas.height = size.h;
  canvas.setAttribute('aria-label', 'Cover preview, ' + size.label);
  drawCover(ctx, size.w, size.h, state);
  syncControls();
  setStatus('Preview: ' + size.label + ' · ' + (GRADES[state.grade] || {}).name + ' grade');
}

function setStatus(text) {
  const el = $('statusLine');
  if (el) el.textContent = text;
}

function syncControls() {
  const panel = state.panels[state.selected];
  document.querySelectorAll('[data-panel]').forEach((btn) => {
    btn.classList.toggle('active', Number(btn.dataset.panel) === state.selected);
  });
  document.querySelectorAll('[data-grade]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.grade === state.grade);
  });
  document.querySelectorAll('[data-size]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.size === state.size);
  });
  document.querySelectorAll('[data-photo]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.photo === panel.source);
  });
  const zoom = $('zoomRange');
  if (zoom) zoom.value = String(panel.zoom);
  const zoomVal = $('zoomValue');
  if (zoomVal) zoomVal.textContent = Math.round(panel.zoom * 100) + '%';
  const fitBtn = $('fitToggle');
  if (fitBtn) fitBtn.textContent = panel.fit === 'fit' ? 'Fit: whole photo' : 'Fit: fill panel';
  const titleInput = $('titleInput');
  if (titleInput && document.activeElement !== titleInput) titleInput.value = state.title;
  const subInput = $('subtitleInput');
  if (subInput && document.activeElement !== subInput) subInput.value = state.subtitle;
  const panelLabel = $('panelLabel');
  if (panelLabel) panelLabel.textContent = 'Panel ' + (state.selected + 1) + (state.selected === 0 ? ' — hero' : '');
}

// --- Photo library -------------------------------------------------------

function addUploadedPhoto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const key = 'upload-' + (++uploadCount);
      loadImage(reader.result).then((img) => {
        state.photos.set(key, img);
        addPhotoButton(key, file.name || 'Uploaded photo');
        state.panels[state.selected].source = key;
        render();
        setStatus('Photo loaded: ' + (file.name || 'uploaded image') + ' — nothing was uploaded anywhere.');
        resolve(img);
      }).catch(reject);
    };
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

function addPhotoButton(key, label) {
  const list = $('photoList');
  if (!list) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'chip';
  btn.dataset.photo = key;
  btn.textContent = label.length > 18 ? label.slice(0, 17) + '…' : label;
  btn.addEventListener('click', () => {
    state.panels[state.selected].source = key;
    render();
  });
  list.appendChild(btn);
}

// --- Panel interaction ---------------------------------------------------

function canvasPoint(evt) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (evt.clientX - rect.left) * (canvas.width / rect.width),
    y: (evt.clientY - rect.top) * (canvas.height / rect.height),
  };
}

function panelAt(x, y) {
  const rects = layoutPanels(canvas.width, canvas.height);
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i];
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
  }
  return -1;
}

canvas.addEventListener('pointerdown', (evt) => {
  const p = canvasPoint(evt);
  const idx = panelAt(p.x, p.y);
  if (idx < 0) return;
  state.selected = idx;
  const panel = state.panels[idx];
  dragging = { idx, lastX: p.x, lastY: p.y, moved: false, startPanX: panel.panX, startPanY: panel.panY };
  canvas.setPointerCapture(evt.pointerId);
  render();
});

canvas.addEventListener('pointermove', (evt) => {
  if (!dragging) return;
  const p = canvasPoint(evt);
  const rects = layoutPanels(canvas.width, canvas.height);
  const rect = rects[dragging.idx];
  const panel = state.panels[dragging.idx];
  const dx = (p.x - dragging.lastX) / rect.w;
  const dy = (p.y - dragging.lastY) / rect.h;
  if (Math.abs(dx) + Math.abs(dy) > 0.001) dragging.moved = true;
  panel.panX = Math.max(-0.6, Math.min(0.6, panel.panX + dx));
  panel.panY = Math.max(-0.6, Math.min(0.6, panel.panY + dy));
  dragging.lastX = p.x;
  dragging.lastY = p.y;
  render();
});

canvas.addEventListener('pointerup', () => { dragging = null; });
canvas.addEventListener('pointercancel', () => { dragging = null; });

// --- Export ---------------------------------------------------------------

function exportPng() {
  const size = SIZES[state.size];
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  drawCover(off.getContext('2d'), size.w, size.h, state);
  off.toBlob((blob) => {
    if (!blob) {
      setStatus('Export failed — please try again.');
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vice-cover-' + state.size + '-' + size.w + 'x' + size.h + '.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    setStatus('Exported ' + size.label + ' PNG — check your downloads.');
  }, 'image/png');
}

// --- Shot scenes ----------------------------------------------------------

function applyShotMode(shot) {
  document.body.classList.toggle('shot-cover', shot === 'cover');
  document.body.classList.toggle('shot-editor', shot === 'editor');
}

// --- Wiring ---------------------------------------------------------------

function wire() {
  $('photoInput').addEventListener('change', (evt) => {
    const files = Array.from(evt.target.files || []);
    files.forEach((file) => {
      addUploadedPhoto(file).catch(() => setStatus('That file could not be read as an image.'));
    });
    evt.target.value = '';
  });

  document.querySelectorAll('[data-photo]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.panels[state.selected].source = btn.dataset.photo;
      render();
    });
  });

  document.querySelectorAll('[data-panel]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.selected = Number(btn.dataset.panel);
      render();
    });
  });

  $('zoomRange').addEventListener('input', (evt) => {
    state.panels[state.selected].zoom = Number(evt.target.value);
    render();
  });

  $('fitToggle').addEventListener('click', () => {
    const panel = state.panels[state.selected];
    panel.fit = panel.fit === 'fit' ? 'fill' : 'fit';
    render();
  });

  $('resetPan').addEventListener('click', () => {
    const panel = state.panels[state.selected];
    panel.panX = 0;
    panel.panY = 0;
    panel.zoom = 1;
    render();
  });

  $('titleInput').addEventListener('input', (evt) => {
    state.title = evt.target.value;
    render();
  });

  $('subtitleInput').addEventListener('input', (evt) => {
    state.subtitle = evt.target.value;
    render();
  });

  document.querySelectorAll('[data-grade]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.grade = btn.dataset.grade;
      render();
    });
  });

  document.querySelectorAll('[data-size]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.size = btn.dataset.size;
      render();
    });
  });

  $('exportBtn').addEventListener('click', exportPng);
}

async function boot() {
  wire();
  try {
    await Promise.all([loadSamplePhoto('boulevard'), loadSamplePhoto('pier')]);
  } catch (err) {
    setStatus('Sample photos could not be loaded — upload your own photo.');
  }
  render();
  const params = new URLSearchParams(window.location.search);
  if (params.get('shot')) {
    await runShotScene(window.location.search, {
      loadSamplePhoto,
      setCaption: (text) => { state.title = text; const el = $('titleInput'); if (el) el.value = text; },
      setGrade: (name) => { state.grade = name; },
      setSize: (name) => { state.size = name; },
      applyShotMode,
      render,
    });
  } else {
    window.__shotReady = true;
  }
}

boot();
