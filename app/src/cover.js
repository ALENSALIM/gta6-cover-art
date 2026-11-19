// Vice Cover Studio — cover drawing.
// Draws the whole multi-panel poster onto any canvas 2D context at any
// width and height, so the live preview and the exported PNG share one
// code path. Original design: no game artwork, logos or fonts are used.

export const SIZES = {
  square: { w: 1080, h: 1080, label: 'Square 1080 x 1080' },
  portrait: { w: 1080, h: 1350, label: 'Portrait 1080 x 1350' },
  story: { w: 1080, h: 1920, label: 'Story 1080 x 1920' },
};

export const GRADES = {
  sunset: { name: 'Vice Sunset', accent: '#ffb347', shadow: '#ff7a1a' },
  neon: { name: 'Neon Night', accent: '#39e6ff', shadow: '#ff2fb3' },
};

// One large hero panel on the left, three smaller panels stacked on the
// right, separated by thin light gutters. Slightly uneven right-hand rows
// keep the grid dynamic instead of a plain grid.
export function layoutPanels(w, h) {
  const g = Math.max(4, Math.round(Math.min(w, h) * 0.014));
  const heroW = Math.round((w - g) * 0.6);
  const rx = heroW + g;
  const rw = w - rx;
  const avail = h - 2 * g;
  const rows = [0.34, 0.37, 0.29];
  const panels = [{ x: 0, y: 0, w: heroW, h }];
  let y = 0;
  for (let i = 0; i < 3; i++) {
    const rh = Math.round(avail * rows[i]);
    panels.push({ x: rx, y, w: rw, h: rh });
    y += rh + g;
  }
  // Give the last row whatever height is left so the grid ends flush.
  panels[3].h = h - panels[3].y;
  return panels;
}

function drawPhotoInto(ctx, rect, img, panel) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (!img || !img.naturalWidth) {
    const grad = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
    grad.addColorStop(0, '#2a2140');
    grad.addColorStop(1, '#120e1e');
    ctx.fillStyle = grad;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = Math.max(2, rect.w * 0.004);
    for (let d = -rect.h; d < rect.w; d += Math.max(24, rect.w * 0.08)) {
      ctx.beginPath();
      ctx.moveTo(rect.x + d, rect.y + rect.h);
      ctx.lineTo(rect.x + d + rect.h, rect.y);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const base = panel.fit === 'fit'
    ? Math.min(rect.w / iw, rect.h / ih)
    : Math.max(rect.w / iw, rect.h / ih);
  const zoom = panel.zoom || 1;
  const dw = iw * base * zoom;
  const dh = ih * base * zoom;
  const dx = rect.x + (rect.w - dw) / 2 + (panel.panX || 0) * rect.w;
  const dy = rect.y + (rect.h - dh) / 2 + (panel.panY || 0) * rect.h;
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
  // Thin light frame so each panel reads as its own poster tile.
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = Math.max(1, Math.min(rect.w, rect.h) * 0.004);
  ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
  ctx.restore();
}

function applyGrade(ctx, w, h, grade) {
  ctx.save();
  if (grade === 'neon') {
    // Cool neon night: deep blue base, magenta and cyan glows, vignette.
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(8, 8, 48, 0.30)';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'screen';
    let glow = ctx.createRadialGradient(w * 0.85, h * 0.08, 0, w * 0.85, h * 0.08, w * 0.55);
    glow.addColorStop(0, 'rgba(255, 47, 179, 0.38)');
    glow.addColorStop(1, 'rgba(255, 47, 179, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    glow = ctx.createRadialGradient(w * 0.08, h * 0.92, 0, w * 0.08, h * 0.92, w * 0.55);
    glow.addColorStop(0, 'rgba(57, 230, 255, 0.34)');
    glow.addColorStop(1, 'rgba(57, 230, 255, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = 'rgba(40, 20, 120, 0.22)';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
    vig.addColorStop(0, 'rgba(0, 0, 16, 0)');
    vig.addColorStop(1, 'rgba(0, 0, 16, 0.42)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
  } else {
    // Vice Sunset: warm orange-to-magenta-to-purple wash rising from
    // the bottom, warm tint, gently lifted shadows.
    let wash = ctx.createLinearGradient(0, h, 0, 0);
    wash.addColorStop(0, 'rgba(255, 110, 40, 0.52)');
    wash.addColorStop(0.45, 'rgba(214, 48, 120, 0.30)');
    wash.addColorStop(1, 'rgba(88, 32, 128, 0.22)');
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = 'rgba(255, 150, 60, 0.20)';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = 'rgba(255, 210, 140, 0.25)';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    const lift = ctx.createLinearGradient(0, h, 0, h * 0.55);
    lift.addColorStop(0, 'rgba(255, 235, 210, 0.10)');
    lift.addColorStop(1, 'rgba(255, 235, 210, 0)');
    ctx.fillStyle = lift;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();
}

function fitTitleLines(ctx, text, maxW, startSize) {
  const words = text.split(/\s+/).filter(Boolean);
  let size = startSize;
  let lines = [text];
  while (size > startSize * 0.45) {
    ctx.font = `900 ${Math.round(size)}px "Arial Narrow", "Helvetica Neue", Arial, sans-serif`;
    lines = [];
    let line = '';
    for (const word of words) {
      const trial = line ? line + ' ' + word : word;
      if (ctx.measureText(trial).width <= maxW || !line) {
        line = trial;
      } else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
    if (lines.length <= 2 && lines.every((l) => ctx.measureText(l).width <= maxW)) return { lines, size };
    size *= 0.92;
  }
  ctx.font = `900 ${Math.round(size)}px "Arial Narrow", "Helvetica Neue", Arial, sans-serif`;
  return { lines, size };
}

function drawLettering(ctx, w, h, state) {
  const grade = GRADES[state.grade] || GRADES.sunset;
  const pad = Math.round(w * 0.045);
  const maxW = w - pad * 2;
  const title = (state.title || 'VICE CITY').toUpperCase();
  const subtitle = (state.subtitle || '').toUpperCase();

  ctx.save();
  // Slight tilt for poster energy, anchored near the bottom-left.
  ctx.translate(pad, 0);
  ctx.rotate(-0.012);

  const startSize = Math.round(Math.min(w, h * 0.9) * 0.115);
  const { lines, size } = fitTitleLines(ctx, title, maxW, startSize);
  const lineH = size * 1.02;
  const titleBlockH = lines.length * lineH;
  const subH = subtitle ? Math.round(w * 0.034) + Math.round(w * 0.03) : 0;
  const bottom = h - Math.round(h * 0.035);
  let y = bottom - titleBlockH;

  // Subtitle: small accent-colour tagline above the title, with a bar.
  if (subtitle) {
    const subSize = Math.round(w * 0.034);
    ctx.font = `800 ${subSize}px "Helvetica Neue", Arial, sans-serif`;
    try { ctx.letterSpacing = '0.28em'; } catch (e) { /* older canvas */ }
    const subY = y - Math.round(w * 0.028);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,0.9)';
    ctx.lineWidth = Math.max(2, subSize * 0.14);
    ctx.strokeText(subtitle, 0, subY);
    ctx.fillStyle = grade.accent;
    ctx.fillText(subtitle, 0, subY);
    try { ctx.letterSpacing = '0px'; } catch (e) { /* older canvas */ }
    ctx.fillStyle = grade.accent;
    ctx.fillRect(0, subY - subSize - Math.round(w * 0.012), Math.round(w * 0.09), Math.max(3, Math.round(w * 0.006)));
    const titleTop = bottom - titleBlockH;
    let ty = titleTop + size;
    for (const line of lines) {
      drawTitleLine(ctx, line, size, grade, ty);
      ty += lineH;
    }
    ctx.restore();
    return;
  }

  let ty = y + size;
  for (const line of lines) {
    drawTitleLine(ctx, line, size, grade, ty);
    ty += lineH;
  }
  ctx.restore();
}

function drawTitleLine(ctx, line, size, grade, baselineY) {
  ctx.font = `900 ${Math.round(size)}px "Arial Narrow", "Helvetica Neue", Arial, sans-serif`;
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  // Crisp black outline first, then the white fill with a coloured glow.
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.95)';
  ctx.lineWidth = Math.max(3, size * 0.17);
  ctx.strokeText(line, 0, baselineY);
  ctx.shadowColor = grade.shadow;
  ctx.shadowBlur = size * 0.32;
  ctx.shadowOffsetY = size * 0.05;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(line, 0, baselineY);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}

// The one drawing entry point: panels, grade, then lettering on top.
export function drawCover(ctx, w, h, state) {
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#0b0a12';
  ctx.fillRect(0, 0, w, h);
  const rects = layoutPanels(w, h);
  const panels = state.panels || [];
  for (let i = 0; i < rects.length; i++) {
    const panel = panels[i] || { source: 'boulevard', zoom: 1, panX: 0, panY: 0, fit: 'fill' };
    const img = state.photos ? state.photos.get(panel.source) : null;
    drawPhotoInto(ctx, rects[i], img, panel);
  }
  applyGrade(ctx, w, h, state.grade || 'sunset');
  // Thin light gutters read as the frame: redraw the outer border.
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = Math.max(2, w * 0.003);
  ctx.strokeRect(1, 1, w - 2, h - 2);
  drawLettering(ctx, w, h, state);
  ctx.restore();
}
