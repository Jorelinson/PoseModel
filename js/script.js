// ── CONFIG ──────────────────────────────────
const MODEL_URL = '../model/';
const LABELS = [
  'Paz',
  'Mano abierta',
  'Puño'
];

const EMOJIS = {
  'Paz':          '✌️',
  'Mano abierta': '✋',
  'Puño':         '✊',
};

// ── STATE ────────────────────────────────────
let model, webcam;
let animFrame = null;
let mode = 'idle'; // idle | camera | image

// ── DOM REFS ─────────────────────────────────
const $ = id => document.getElementById(id);

const loadingOverlay  = $('loadingOverlay');
const video           = $('video');
const canvas          = $('canvas');
const skeletonCanvas  = $('skeletonCanvas');
const imagePreview    = $('imagePreview');
const idleState       = $('idleState');
const btnCamera       = $('btnCamera');
const btnAnalyze      = $('btnAnalyze');
const btnStop         = $('btnStop');
const fileInput       = $('fileInput');
const uploadZone      = $('uploadZone');
const resultName      = $('resultName');
const resultEmoji     = $('resultEmoji');
const resultConf      = $('resultConfidence');
const confBar         = $('confidenceBar');
const probList        = $('probList');
const statusDot       = $('statusDot');
const statusText      = $('statusText');
const statusStrip     = $('statusStrip');
const stripPulse      = $('stripPulse');
const stripText       = $('stripText');
const toast           = $('toast');


// ── INIT LEGEND ──────────────────────────────


// Init prob bars
probList.innerHTML = LABELS.map(l => `
  <div class="prob-row" id="prob-${l.replace(/\s/g, '_')}">
    <span class="prob-name">${EMOJIS[l] || ''} ${l}</span>
    <div class="prob-bar-wrap">
      <div class="prob-bar" id="bar-${l.replace(/\s/g, '_')}"></div>
    </div>
    <span class="prob-pct" id="pct-${l.replace(/\s/g, '_')}">0%</span>
  </div>
`).join('');

// ── LOAD MODEL ───────────────────────────────
async function loadModel() {
  try {
    const modelURL    = MODEL_URL + 'model.json';
    const metadataURL = MODEL_URL + 'metadata.json';
    model = await tmPose.load(modelURL, metadataURL);
    loadingOverlay.style.display = 'none';
    showToast('Modelo cargado correctamente ✓', 'success');
  } catch (e) {
    console.error(e);
    loadingOverlay.querySelector('.loader-text').textContent = 'Error al cargar el modelo';
    showToast('Error al cargar el modelo', 'error');
  }
}

// ── CAMERA MODE ──────────────────────────────
btnCamera.addEventListener('click', async () => {
  if (mode === 'camera') return;
  stopAll();
  mode = 'camera';

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user' }
    });
    video.srcObject = stream;
    video.style.display = 'block';
    idleState.style.display = 'none';
    imagePreview.style.display = 'none';

    video.onloadedmetadata = () => {
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      skeletonCanvas.width  = video.videoWidth;
      skeletonCanvas.height = video.videoHeight;
      setStatus('active', 'CÁMARA ACTIVA');
      setStrip(true, 'Detectando en tiempo real...');
      setBadge('active', 'en vivo');
      btnStop.disabled    = false;
      btnCamera.disabled  = true;
      loopCamera();
    };
  } catch (e) {
    showToast('No se pudo acceder a la cámara', 'error');
    mode = 'idle';
  }
});

async function loopCamera() {
  if (mode !== 'camera') return;
  if (video.readyState >= 2) {
    await predict(video);
  }
  animFrame = requestAnimationFrame(loopCamera);
}

// ── IMAGE MODE ───────────────────────────────
uploadZone.addEventListener('dragover', e => {
  e.preventDefault();
  uploadZone.classList.add('drag-over');
});

uploadZone.addEventListener('dragleave', () => {
  uploadZone.classList.remove('drag-over');
});

uploadZone.addEventListener('drop', e => {
  e.preventDefault();
  uploadZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) loadImage(file);
});

fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) loadImage(fileInput.files[0]);
});

function loadImage(file) {
  if (mode === 'camera') stopAll();
  const url = URL.createObjectURL(file);
  imagePreview.src = url;
  imagePreview.style.display = 'block';
  idleState.style.display = 'none';
  video.style.display = 'none';
  mode = 'image';
  btnAnalyze.disabled = false;
  btnStop.disabled    = false;
  setStatus('warn', 'IMAGEN CARGADA');
  setStrip(false, 'Imagen lista → presiona "Analizar imagen"');
  setBadge('warn', 'imagen lista');
  showToast('Imagen cargada. Presiona Analizar.', 'success');
  resetResult();
}

btnAnalyze.addEventListener('click', async () => {
  if (!imagePreview.src || mode !== 'image') return;
  await predict(imagePreview);
  setStatus('active', 'ANÁLISIS COMPLETO');
  setBadge('active', 'analizado');
});

// ── STOP ─────────────────────────────────────
btnStop.addEventListener('click', stopAll);

function stopAll() {
  if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
  if (video.srcObject) {
    video.srcObject.getTracks().forEach(t => t.stop());
    video.srcObject = null;
  }
  video.style.display = 'none';
  imagePreview.style.display = 'none';
  idleState.style.display = 'flex';
  mode = 'idle';
  btnCamera.disabled  = false;
  btnAnalyze.disabled = true;
  btnStop.disabled    = true;
  fileInput.value = '';

  const ctx = skeletonCanvas.getContext('2d');
  ctx.clearRect(0, 0, skeletonCanvas.width, skeletonCanvas.height);

  setStatus('idle', 'ESPERANDO INPUT');
  setStrip(false, 'Modelo listo · Selecciona un modo para comenzar');
  setBadge('idle', 'en espera');
  resetResult();
}

// ── PREDICT ──────────────────────────────────
async function predict(input) {
  if (!model) return;

  try {
    const { pose, posenetOutput } = await model.estimatePose(input);
    const predictions = await model.predict(posenetOutput);

    // Draw skeleton
    if (pose) {
      const ctx = skeletonCanvas.getContext('2d');
      ctx.clearRect(0, 0, skeletonCanvas.width, skeletonCanvas.height);
      drawSkeleton(ctx, pose, skeletonCanvas.width, skeletonCanvas.height, input);
    }

    // Find top prediction
    let top = predictions.reduce((a, b) =>
      a.probability > b.probability ? a : b
    );

    // Update result card
    resultName.textContent = top.className;
    resultName.classList.remove('idle');
    resultEmoji.textContent = EMOJIS[top.className] || '🖐️';

    // Animate emoji
    resultEmoji.style.transform = 'scale(1.25)';
    setTimeout(() => resultEmoji.style.transform = 'scale(1)', 250);

    const pct = Math.round(top.probability * 100);
    resultConf.textContent = `Confianza: ${pct}%`;
    confBar.style.width = pct + '%';

    // Update probability bars
    predictions.forEach(p => {
      const key   = p.className.replace(/\s/g, '_');
      const row   = $('prob-' + key);
      const bar   = $('bar-' + key);
      const pctEl = $('pct-' + key);
      const v     = Math.round(p.probability * 100);
      if (bar)   bar.style.width = v + '%';
      if (pctEl) pctEl.textContent = v + '%';
      if (row)   row.classList.toggle('top', p.className === top.className);
    });

  } catch (e) {
    console.warn('Predict error:', e);
  }
}

// ── DRAW SKELETON ─────────────────────────────
function drawSkeleton(ctx, pose, cw, ch, source) {
  let sw, sh;
  if (source.tagName === 'VIDEO') {
    sw = source.videoWidth;
    sh = source.videoHeight;
  } else {
    sw = source.naturalWidth || source.width;
    sh = source.naturalHeight || source.height;
  }

  const scaleX = cw / sw;
  const scaleY = ch / sh;

  ctx.save();
  if (source.tagName === 'VIDEO') {
    ctx.scale(-1, 1);
    ctx.translate(-cw, 0);
  }

  const CONNECTIONS = [
    [5,6],[5,7],[6,8],[7,9],[8,10],
    [11,12],[11,13],[12,14],[13,15],[14,16],
    [5,11],[6,12]
  ];

  // Lines — terracotta tint
  ctx.strokeStyle = 'rgba(181, 96, 58, 0.55)';
  ctx.lineWidth = 2;
  CONNECTIONS.forEach(([a, b]) => {
    const kpA = pose.keypoints[a];
    const kpB = pose.keypoints[b];
    if (kpA.score > 0.3 && kpB.score > 0.3) {
      ctx.beginPath();
      ctx.moveTo(kpA.position.x * scaleX, kpA.position.y * scaleY);
      ctx.lineTo(kpB.position.x * scaleX, kpB.position.y * scaleY);
      ctx.stroke();
    }
  });

  // Keypoints
  pose.keypoints.forEach(kp => {
    if (kp.score > 0.3) {
      ctx.beginPath();
      ctx.arc(kp.position.x * scaleX, kp.position.y * scaleY, 4, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(200, 120, 80, 0.85)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(245, 237, 224, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  });

  ctx.restore();
}

// ── UI HELPERS ───────────────────────────────
function resetResult() {
  resultName.textContent = 'Sin detección';
  resultName.classList.add('idle');
  resultEmoji.textContent = '—';
  resultConf.textContent = 'Confianza: —';
  confBar.style.width = '0%';

  LABELS.forEach(l => {
    const key   = l.replace(/\s/g, '_');
    const bar   = $('bar-' + key);
    const pctEl = $('pct-' + key);
    const row   = $('prob-' + key);
    if (bar)   bar.style.width = '0%';
    if (pctEl) pctEl.textContent = '0%';
    if (row)   row.classList.remove('top');
  });
}

function setStatus(state, text) {
  statusDot.className = 'label-dot '
    + (state === 'active' ? 'active' : state === 'warn' ? 'warn' : '');
  statusText.textContent = text;
}

function setStrip(running, text) {
  statusStrip.classList.toggle('running', running);
  stripText.textContent = text;
}



let toastTimer;
function showToast(msg, type = '') {
  toast.textContent = msg;
  toast.className = 'show ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.className = ''; }, 3200);
}

// ── BOOT ─────────────────────────────────────
loadModel();