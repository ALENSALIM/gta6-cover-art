// Vice Cover Studio — fixed screenshot scenes.
// Reads the URL query, drives the app into a deterministic scene, redraws,
// then flags window.__shotReady after two animation frames so a screenshot
// script knows the paint is done.

export function parseShotQuery(search) {
  const q = new URLSearchParams(search || '');
  const shot = q.get('shot') || 'editor';
  const photo = q.get('photo') || '';
  const caption = q.get('caption') || '';
  const grade = q.get('grade') || '';
  const size = q.get('size') || '';
  return { shot, photo, caption, grade, size };
}

// api: { loadSamplePhoto(name), setCaption(text), setGrade(name),
//        setSize(name), applyShotMode(shot), render() }
export async function runShotScene(search, api) {
  const scene = parseShotQuery(search);
  if (scene.photo === 'boulevard' || scene.photo === 'pier') {
    await api.loadSamplePhoto(scene.photo);
  }
  if (scene.caption) api.setCaption(scene.caption);
  if (scene.grade === 'sunset' || scene.grade === 'neon') api.setGrade(scene.grade);
  if (scene.size === 'square' || scene.size === 'portrait' || scene.size === 'story') {
    api.setSize(scene.size);
  }
  api.applyShotMode(scene.shot);
  api.render();
  await new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
  window.__shotReady = true;
}
