/* ============================================================
   MR BEWOK MUSIC EDITOR — script.js
   Web Audio API Engine | Full FX Chain
   ============================================================ */

'use strict';

// ── STATE ──────────────────────────────────────────────────────
const state = {
  audioCtx: null,
  sourceNode: null,
  audioBuffer: null,
  isPlaying: false,
  isPaused: false,
  startTime: 0,
  pauseOffset: 0,
  loopEnabled: false,
  playbackRate: 1,
  originalFileName: '',
  animFrameId: null,

  // FX nodes
  gainNode: null,
  bassFilter: null,
  midFilter: null,
  trebleFilter: null,
  reverbNode: null,
  reverbGain: null,
  dryGain: null,
  echoDelay: null,
  echoGain: null,
  echoFeedback: null,
  distortionNode: null,
  compressorNode: null,
  flangerDelay: null,
  flangerGain: null,
  flangerFeedback: null,
  flangerLFO: null,
  analyser: null,
  mergerNode: null,
  splitterNode: null,

  params: {
    volume:     0.8,
    speed:      1.0,
    pitch:      0,
    bass:       0,
    mid:        0,
    treble:     0,
    reverb:     0,
    echo:       0,
    echoDelay:  300,
    distortion: 0,
    stereo:     50,
    compressor: 0,
    flanger:    0,
  }
};

// ── DOM REFS ───────────────────────────────────────────────────
const els = {
  audioFile:       document.getElementById('audioFile'),
  dropZone:        document.getElementById('dropZone'),
  fileInfo:        document.getElementById('fileInfo'),
  fileName:        document.getElementById('fileName'),
  fileSize:        document.getElementById('fileSize'),
  removeFile:      document.getElementById('removeFile'),
  vizCanvas:       document.getElementById('vizCanvas'),
  seekBar:         document.getElementById('seekBar'),
  currentTime:     document.getElementById('currentTime'),
  totalTime:       document.getElementById('totalTime'),
  playBtn:         document.getElementById('playBtn'),
  stopBtn:         document.getElementById('stopBtn'),
  skipBackBtn:     document.getElementById('skipBackBtn'),
  skipFwdBtn:      document.getElementById('skipFwdBtn'),
  loopBtn:         document.getElementById('loopBtn'),
  volumeSlider:    document.getElementById('volumeSlider'),
  volumeVal:       document.getElementById('volumeVal'),
  speedSlider:     document.getElementById('speedSlider'),
  speedVal:        document.getElementById('speedVal'),
  pitchSlider:     document.getElementById('pitchSlider'),
  pitchVal:        document.getElementById('pitchVal'),
  bassSlider:      document.getElementById('bassSlider'),
  bassVal:         document.getElementById('bassVal'),
  midSlider:       document.getElementById('midSlider'),
  midVal:          document.getElementById('midVal'),
  trebleSlider:    document.getElementById('trebleSlider'),
  trebleVal:       document.getElementById('trebleVal'),
  reverbSlider:    document.getElementById('reverbSlider'),
  reverbVal:       document.getElementById('reverbVal'),
  echoSlider:      document.getElementById('echoSlider'),
  echoVal:         document.getElementById('echoVal'),
  echoDelaySlider: document.getElementById('echoDelaySlider'),
  echoDelayVal:    document.getElementById('echoDelayVal'),
  distortionSlider:document.getElementById('distortionSlider'),
  distortionVal:   document.getElementById('distortionVal'),
  stereoSlider:    document.getElementById('stereoSlider'),
  stereoVal:       document.getElementById('stereoVal'),
  compressorSlider:document.getElementById('compressorSlider'),
  compressorVal:   document.getElementById('compressorVal'),
  flangerSlider:   document.getElementById('flangerSlider'),
  flangerVal:      document.getElementById('flangerVal'),
  presetBtns:      document.querySelectorAll('.btn-preset'),
  exportBtn:       document.getElementById('exportBtn'),
  exportFormat:    document.getElementById('exportFormat'),
  exportQuality:   document.getElementById('exportQuality'),
  exportProgress:  document.getElementById('exportProgress'),
  progressFill:    document.getElementById('progressFill'),
  progressLabel:   document.getElementById('progressLabel'),
};

// ── PRESETS ────────────────────────────────────────────────────
const PRESETS = {
  reset:    { speed:1,    pitch:0,  bass:0,   mid:0,   treble:0,  reverb:0,  echo:0,  echoDelay:300, distortion:0,  stereo:50, compressor:0,  flanger:0  },
  rock:     { speed:1.05, pitch:0,  bass:8,   mid:2,   treble:6,  reverb:15, echo:10, echoDelay:200, distortion:45, stereo:70, compressor:60, flanger:0  },
  slow:     { speed:0.75, pitch:-2, bass:3,   mid:0,   treble:-2, reverb:50, echo:30, echoDelay:500, distortion:0,  stereo:55, compressor:20, flanger:5  },
  high:     { speed:1.3,  pitch:2,  bass:5,   mid:5,   treble:8,  reverb:5,  echo:5,  echoDelay:150, distortion:15, stereo:80, compressor:70, flanger:0  },
  reverb:   { speed:0.95, pitch:-1, bass:2,   mid:0,   treble:-3, reverb:90, echo:50, echoDelay:600, distortion:0,  stereo:60, compressor:15, flanger:10 },
  lofi:     { speed:0.92, pitch:-1, bass:6,   mid:-3,  treble:-8, reverb:30, echo:20, echoDelay:400, distortion:8,  stereo:30, compressor:40, flanger:0  },
  bass:     { speed:1,    pitch:0,  bass:18,  mid:0,   treble:-5, reverb:10, echo:0,  echoDelay:300, distortion:20, stereo:50, compressor:80, flanger:0  },
  pop:      { speed:1.02, pitch:1,  bass:4,   mid:3,   treble:7,  reverb:20, echo:15, echoDelay:200, distortion:5,  stereo:65, compressor:55, flanger:0  },
  edm:      { speed:1.1,  pitch:0,  bass:14,  mid:-2,  treble:10, reverb:25, echo:25, echoDelay:180, distortion:30, stereo:90, compressor:75, flanger:20 },
  jazz:     { speed:0.98, pitch:0,  bass:5,   mid:4,   treble:2,  reverb:40, echo:10, echoDelay:350, distortion:0,  stereo:55, compressor:35, flanger:8  },
  metal:    { speed:1.08, pitch:-1, bass:10,  mid:-5,  treble:12, reverb:10, echo:8,  echoDelay:150, distortion:85, stereo:75, compressor:90, flanger:0  },
  '8bit':   { speed:1.15, pitch:6,  bass:-5,  mid:8,   treble:15, reverb:5,  echo:35, echoDelay:250, distortion:60, stereo:40, compressor:30, flanger:15 },
};

// ── AUDIO CONTEXT INIT ─────────────────────────────────────────
function initAudioContext() {
  if (state.audioCtx) return;
  state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  buildFXChain();
}

function buildFXChain() {
  const ctx = state.audioCtx;

  // Analyser
  state.analyser = ctx.createAnalyser();
  state.analyser.fftSize = 256;

  // Master gain
  state.gainNode = ctx.createGain();
  state.gainNode.gain.value = state.params.volume;

  // EQ filters
  state.bassFilter = ctx.createBiquadFilter();
  state.bassFilter.type = 'lowshelf';
  state.bassFilter.frequency.value = 200;

  state.midFilter = ctx.createBiquadFilter();
  state.midFilter.type = 'peaking';
  state.midFilter.frequency.value = 1000;
  state.midFilter.Q.value = 1;

  state.trebleFilter = ctx.createBiquadFilter();
  state.trebleFilter.type = 'highshelf';
  state.trebleFilter.frequency.value = 4000;

  // Reverb (convolution)
  state.reverbNode = ctx.createConvolver();
  state.reverbGain = ctx.createGain();
  state.reverbGain.gain.value = 0;
  state.dryGain = ctx.createGain();
  state.dryGain.gain.value = 1;
  generateReverb();

  // Echo (delay + feedback)
  state.echoDelay = ctx.createDelay(2.0);
  state.echoDelay.delayTime.value = 0.3;
  state.echoGain = ctx.createGain();
  state.echoGain.gain.value = 0;
  state.echoFeedback = ctx.createGain();
  state.echoFeedback.gain.value = 0.3;

  // Distortion
  state.distortionNode = ctx.createWaveShaper();
  state.distortionNode.curve = makeDistortionCurve(0);
  state.distortionNode.oversample = '4x';

  // Compressor
  state.compressorNode = ctx.createDynamicsCompressor();
  state.compressorNode.threshold.value = -24;
  state.compressorNode.knee.value = 30;
  state.compressorNode.ratio.value = 1;
  state.compressorNode.attack.value = 0.003;
  state.compressorNode.release.value = 0.25;

  // Flanger
  state.flangerDelay = ctx.createDelay(0.1);
  state.flangerDelay.delayTime.value = 0.005;
  state.flangerGain = ctx.createGain();
  state.flangerGain.gain.value = 0;
  state.flangerFeedback = ctx.createGain();
  state.flangerFeedback.gain.value = 0.3;
  state.flangerLFO = ctx.createOscillator();
  const flangerLFOGain = ctx.createGain();
  state.flangerLFO.frequency.value = 0.5;
  flangerLFOGain.gain.value = 0.002;
  state.flangerLFO.connect(flangerLFOGain);
  flangerLFOGain.connect(state.flangerDelay.delayTime);
  state.flangerLFO.start();

  // Stereo splitter/merger
  state.splitterNode = ctx.createChannelSplitter(2);
  state.mergerNode = ctx.createChannelMerger(2);

  // ── Connect chain ──
  // source → bass → mid → treble → distortion → compressor → splitter → merger → dry+reverb split → echo → gain → analyser → dest
  // We'll wire inline:
  connectChain();
}

function connectChain() {
  // We'll connect when source is created, because we need to rebuild on each play
}

function connectSource(source) {
  const ctx = state.audioCtx;
  const {
    bassFilter, midFilter, trebleFilter,
    distortionNode, compressorNode,
    dryGain, reverbNode, reverbGain,
    echoDelay, echoGain, echoFeedback,
    flangerDelay, flangerGain, flangerFeedback,
    gainNode, analyser
  } = state;

  // Disconnect previous if any
  try { source.disconnect(); } catch(e) {}

  // EQ chain
  source.connect(bassFilter);
  bassFilter.connect(midFilter);
  midFilter.connect(trebleFilter);
  trebleFilter.connect(distortionNode);
  distortionNode.connect(compressorNode);

  // Dry path
  compressorNode.connect(dryGain);
  dryGain.connect(gainNode);

  // Reverb path
  compressorNode.connect(reverbNode);
  reverbNode.connect(reverbGain);
  reverbGain.connect(gainNode);

  // Echo path
  compressorNode.connect(echoDelay);
  echoDelay.connect(echoGain);
  echoGain.connect(gainNode);
  echoDelay.connect(echoFeedback);
  echoFeedback.connect(echoDelay);

  // Flanger path
  compressorNode.connect(flangerDelay);
  flangerDelay.connect(flangerGain);
  flangerGain.connect(gainNode);
  flangerDelay.connect(flangerFeedback);
  flangerFeedback.connect(flangerDelay);

  // Final
  gainNode.connect(analyser);
  analyser.connect(ctx.destination);
}

// ── REVERB GENERATOR ───────────────────────────────────────────
function generateReverb(seconds = 2) {
  const ctx = state.audioCtx;
  const rate = ctx.sampleRate;
  const len  = rate * seconds;
  const buf  = ctx.createBuffer(2, len, rate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
    }
  }
  state.reverbNode.buffer = buf;
}

// ── DISTORTION CURVE ───────────────────────────────────────────
function makeDistortionCurve(amount) {
  const n = 256;
  const curve = new Float32Array(n);
  const k = amount === 0 ? 0.001 : amount * 4;
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((Math.PI + k) * x) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

// ── FILE LOAD ─────────────────────────────────────────────────
function loadFile(file) {
  if (!file || !file.type.startsWith('audio/')) {
    showToast('❌ File harus berupa audio!', 'error');
    return;
  }
  initAudioContext();
  stopAudio();

  state.originalFileName = file.name.replace(/\.[^/.]+$/, '');
  els.fileName.textContent = file.name;
  els.fileSize.textContent = formatBytes(file.size);
  els.fileInfo.style.display = 'flex';
  els.dropZone.style.display = 'none';

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      state.audioBuffer = await state.audioCtx.decodeAudioData(e.target.result.slice(0));
      els.totalTime.textContent = formatTime(state.audioBuffer.duration);
      els.seekBar.max = state.audioBuffer.duration;
      showToast('✅ Audio berhasil dimuat!', 'success');
      drawWaveformStatic();
    } catch(err) {
      showToast('❌ Gagal decode audio!', 'error');
      console.error(err);
    }
  };
  reader.readAsArrayBuffer(file);
}

// ── PLAYBACK ──────────────────────────────────────────────────
function playAudio(offset = 0) {
  if (!state.audioBuffer) { showToast('⚠️ Upload audio dulu!', 'info'); return; }
  if (state.audioCtx.state === 'suspended') state.audioCtx.resume();

  stopSource();

  const src = state.audioCtx.createBufferSource();
  src.buffer = state.audioBuffer;
  src.playbackRate.value = state.params.speed;
  src.loop = state.loopEnabled;
  src.onended = () => {
    if (!state.loopEnabled && state.isPlaying) {
      state.isPlaying = false;
      state.pauseOffset = 0;
      updatePlayBtn();
      cancelAnimationFrame(state.animFrameId);
      els.seekBar.value = 0;
      els.currentTime.textContent = '0:00';
    }
  };

  connectSource(src);
  state.sourceNode = src;

  const when = state.audioCtx.currentTime;
  src.start(when, offset);
  state.startTime   = when - offset;
  state.pauseOffset = offset;
  state.isPlaying   = true;
  state.isPaused    = false;

  updatePlayBtn();
  animateViz();
  animateSeek();
}

function pauseAudio() {
  if (!state.isPlaying) return;
  state.pauseOffset = state.audioCtx.currentTime - state.startTime;
  stopSource();
  state.isPlaying = false;
  state.isPaused  = true;
  updatePlayBtn();
  cancelAnimationFrame(state.animFrameId);
}

function stopAudio() {
  stopSource();
  state.isPlaying   = false;
  state.isPaused    = false;
  state.pauseOffset = 0;
  updatePlayBtn();
  cancelAnimationFrame(state.animFrameId);
  els.seekBar.value = 0;
  els.currentTime.textContent = '0:00';
  drawWaveformStatic();
}

function stopSource() {
  if (state.sourceNode) {
    try {
      state.sourceNode.onended = null;
      state.sourceNode.stop();
      state.sourceNode.disconnect();
    } catch(e) {}
    state.sourceNode = null;
  }
}

function togglePlay() {
  if (state.isPlaying) {
    pauseAudio();
  } else if (state.isPaused) {
    playAudio(state.pauseOffset);
  } else {
    playAudio(0);
  }
}

function updatePlayBtn() {
  if (state.isPlaying) {
    els.playBtn.textContent = '⏸';
    els.playBtn.classList.add('playing');
  } else {
    els.playBtn.textContent = '▶';
    els.playBtn.classList.remove('playing');
  }
}

// ── SEEK ──────────────────────────────────────────────────────
function animateSeek() {
  if (!state.isPlaying) return;
  const current = state.audioCtx.currentTime - state.startTime;
  const duration = state.audioBuffer ? state.audioBuffer.duration : 0;
  if (current <= duration) {
    els.seekBar.value = current;
    els.currentTime.textContent = formatTime(current);
  }
  state.animFrameId = requestAnimationFrame(animateSeek);
}

els.seekBar.addEventListener('input', () => {
  const t = parseFloat(els.seekBar.value);
  els.currentTime.textContent = formatTime(t);
  if (state.isPlaying || state.isPaused) {
    const wasPlaying = state.isPlaying;
    stopSource();
    state.pauseOffset = t;
    if (wasPlaying) playAudio(t);
  }
});

// ── VISUALIZER ────────────────────────────────────────────────
function drawWaveformStatic() {
  const canvas = els.vizCanvas;
  const ctx2d  = canvas.getContext('2d');
  canvas.width  = canvas.offsetWidth * devicePixelRatio;
  canvas.height = canvas.offsetHeight * devicePixelRatio;
  ctx2d.clearRect(0, 0, canvas.width, canvas.height);

  if (!state.audioBuffer) {
    ctx2d.fillStyle = 'rgba(100,80,255,.15)';
    ctx2d.fillRect(0, canvas.height / 2 - 1, canvas.width, 2);
    return;
  }

  const data = state.audioBuffer.getChannelData(0);
  const step = Math.ceil(data.length / canvas.width);
  const mid  = canvas.height / 2;
  const grad = ctx2d.createLinearGradient(0, 0, canvas.width, 0);
  grad.addColorStop(0, '#8b5cf6');
  grad.addColorStop(0.5, '#06b6d4');
  grad.addColorStop(1, '#ec4899');

  ctx2d.strokeStyle = grad;
  ctx2d.lineWidth = 1.5 * devicePixelRatio;
  ctx2d.shadowColor = '#8b5cf6';
  ctx2d.shadowBlur = 6;
  ctx2d.beginPath();

  for (let i = 0; i < canvas.width; i++) {
    let min = 1, max = -1;
    for (let j = 0; j < step; j++) {
      const d = data[i * step + j];
      if (d < min) min = d;
      if (d > max) max = d;
    }
    ctx2d.moveTo(i, mid + min * mid * 0.9);
    ctx2d.lineTo(i, mid + max * mid * 0.9);
  }
  ctx2d.stroke();
}

function animateViz() {
  if (!state.isPlaying) return;
  const canvas = els.vizCanvas;
  const ctx2d  = canvas.getContext('2d');
  canvas.width  = canvas.offsetWidth * devicePixelRatio;
  canvas.height = canvas.offsetHeight * devicePixelRatio;

  const bufLen = state.analyser.frequencyBinCount;
  const dataArr = new Uint8Array(bufLen);
  state.analyser.getByteFrequencyData(dataArr);

  ctx2d.clearRect(0, 0, canvas.width, canvas.height);

  const barW = (canvas.width / bufLen) * 2.5;
  let x = 0;

  for (let i = 0; i < bufLen; i++) {
    const barH = (dataArr[i] / 255) * canvas.height;
    const hue  = (i / bufLen) * 300 + 200;
    ctx2d.fillStyle = `hsl(${hue}, 90%, 60%)`;
    ctx2d.shadowColor = `hsl(${hue}, 90%, 70%)`;
    ctx2d.shadowBlur = 8;
    ctx2d.fillRect(x, canvas.height - barH, barW - 1, barH);
    x += barW + 1;
    if (x > canvas.width) break;
  }

  state.animFrameId = requestAnimationFrame(animateViz);
}

// ── EFFECT APPLIERS ───────────────────────────────────────────
function applyVolume(v) {
  state.params.volume = v;
  if (state.gainNode) state.gainNode.gain.linearRampToValueAtTime(v, state.audioCtx?.currentTime + 0.05 || 0);
  els.volumeVal.textContent = Math.round(v * 100) + '%';
}

function applySpeed(v) {
  state.params.speed = v;
  if (state.sourceNode) state.sourceNode.playbackRate.value = v;
  els.speedVal.textContent = v.toFixed(2) + 'x';
}

function applyBass(v) {
  state.params.bass = v;
  if (state.bassFilter) state.bassFilter.gain.value = v;
  els.bassVal.textContent = v + ' dB';
}

function applyMid(v) {
  state.params.mid = v;
  if (state.midFilter) state.midFilter.gain.value = v;
  els.midVal.textContent = v + ' dB';
}

function applyTreble(v) {
  state.params.treble = v;
  if (state.trebleFilter) state.trebleFilter.gain.value = v;
  els.trebleVal.textContent = v + ' dB';
}

function applyReverb(v) {
  state.params.reverb = v;
  const wetVal = v / 100;
  const dryVal = 1 - wetVal * 0.5;
  if (state.reverbGain) state.reverbGain.gain.value = wetVal * 1.5;
  if (state.dryGain)    state.dryGain.gain.value = Math.max(0.2, dryVal);
  els.reverbVal.textContent = v + '%';
}

function applyEcho(v) {
  state.params.echo = v;
  if (state.echoGain) state.echoGain.gain.value = v / 100 * 0.8;
  els.echoVal.textContent = v + '%';
}

function applyEchoDelay(v) {
  state.params.echoDelay = v;
  if (state.echoDelay) state.echoDelay.delayTime.value = v / 1000;
  els.echoDelayVal.textContent = v + 'ms';
}

function applyDistortion(v) {
  state.params.distortion = v;
  if (state.distortionNode) state.distortionNode.curve = makeDistortionCurve(v);
  els.distortionVal.textContent = v + '%';
}

function applyCompressor(v) {
  state.params.compressor = v;
  if (state.compressorNode) {
    state.compressorNode.ratio.value = 1 + (v / 100) * 19;
    state.compressorNode.threshold.value = -24 - (v / 100) * 20;
  }
  els.compressorVal.textContent = v + '%';
}

function applyFlanger(v) {
  state.params.flanger = v;
  if (state.flangerGain) state.flangerGain.gain.value = v / 100 * 0.8;
  if (state.flangerFeedback) state.flangerFeedback.gain.value = v / 100 * 0.6;
  if (state.flangerLFO) state.flangerLFO.frequency.value = 0.3 + (v / 100) * 3;
  els.flangerVal.textContent = v + '%';
}

function applyStereo(v) {
  state.params.stereo = v;
  els.stereoVal.textContent = v + '%';
  // Stereo width noted — requires offline render for export
}

function applyPitch(v) {
  state.params.pitch = v;
  els.pitchVal.textContent = (v >= 0 ? '+' : '') + v + ' st';
  // Pitch shift approximated via playback rate + note
  // True pitch shift requires ScriptProcessor or Worklet; this is a visual indicator
  // playback rate combined speed applied for light pitch feel:
  const combined = state.params.speed * Math.pow(2, v / 12);
  if (state.sourceNode) state.sourceNode.playbackRate.value = combined;
}

// ── PRESET APPLICATION ────────────────────────────────────────
function applyPreset(name) {
  const p = PRESETS[name];
  if (!p) return;

  initAudioContext();

  // Sync sliders & params
  const map = [
    ['speed',      'speedSlider',      applySpeed],
    ['pitch',      'pitchSlider',      applyPitch],
    ['bass',       'bassSlider',       applyBass],
    ['mid',        'midSlider',        applyMid],
    ['treble',     'trebleSlider',     applyTreble],
    ['reverb',     'reverbSlider',     applyReverb],
    ['echo',       'echoSlider',       applyEcho],
    ['echoDelay',  'echoDelaySlider',  applyEchoDelay],
    ['distortion', 'distortionSlider', applyDistortion],
    ['stereo',     'stereoSlider',     applyStereo],
    ['compressor', 'compressorSlider', applyCompressor],
    ['flanger',    'flangerSlider',    applyFlanger],
  ];

  map.forEach(([key, sliderId, fn]) => {
    const val = p[key];
    const el  = document.getElementById(sliderId);
    if (el) el.value = val;
    fn(val);
  });

  showToast(`🎛️ Preset "${name.toUpperCase()}" diterapkan!`, 'info');
}

// ── EXPORT ────────────────────────────────────────────────────
async function exportAudio() {
  if (!state.audioBuffer) {
    showToast('⚠️ Tidak ada audio untuk diekspor!', 'error');
    return;
  }

  els.exportBtn.disabled = true;
  els.exportProgress.style.display = 'block';
  setProgress(0, 'Menyiapkan offline render...');

  try {
    const duration  = state.audioBuffer.duration;
    const sampleRate = state.audioBuffer.sampleRate;
    const speed     = state.params.speed;
    const offlineDuration = duration / speed;

    const offlineCtx = new OfflineAudioContext(
      state.audioBuffer.numberOfChannels,
      Math.ceil(offlineDuration * sampleRate),
      sampleRate
    );

    setProgress(10, 'Membangun FX chain...');

    // Build offline FX chain
    const gainNode  = offlineCtx.createGain();
    gainNode.gain.value = state.params.volume;

    const bass = offlineCtx.createBiquadFilter();
    bass.type = 'lowshelf'; bass.frequency.value = 200;
    bass.gain.value = state.params.bass;

    const mid = offlineCtx.createBiquadFilter();
    mid.type = 'peaking'; mid.frequency.value = 1000; mid.Q.value = 1;
    mid.gain.value = state.params.mid;

    const treble = offlineCtx.createBiquadFilter();
    treble.type = 'highshelf'; treble.frequency.value = 4000;
    treble.gain.value = state.params.treble;

    const distortion = offlineCtx.createWaveShaper();
    distortion.curve = makeDistortionCurve(state.params.distortion);
    distortion.oversample = '4x';

    const compressor = offlineCtx.createDynamicsCompressor();
    compressor.threshold.value = -24 - (state.params.compressor / 100) * 20;
    compressor.ratio.value = 1 + (state.params.compressor / 100) * 19;
    compressor.knee.value = 30;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;

    // Reverb
    const reverbConv = offlineCtx.createConvolver();
    const rvRate = offlineCtx.sampleRate;
    const rvLen  = rvRate * 2;
    const rvBuf  = offlineCtx.createBuffer(2, rvLen, rvRate);
    for (let c = 0; c < 2; c++) {
      const d = rvBuf.getChannelData(c);
      for (let i = 0; i < rvLen; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / rvLen, 2.5);
    }
    reverbConv.buffer = rvBuf;
    const reverbGain = offlineCtx.createGain();
    reverbGain.gain.value = state.params.reverb / 100 * 1.5;
    const dryGain = offlineCtx.createGain();
    dryGain.gain.value = Math.max(0.2, 1 - state.params.reverb / 200);

    // Echo
    const echoDelay = offlineCtx.createDelay(2.0);
    echoDelay.delayTime.value = state.params.echoDelay / 1000;
    const echoGain = offlineCtx.createGain();
    echoGain.gain.value = state.params.echo / 100 * 0.8;
    const echoFeedback = offlineCtx.createGain();
    echoFeedback.gain.value = 0.3;

    // Flanger
    const flangerDelay = offlineCtx.createDelay(0.1);
    flangerDelay.delayTime.value = 0.005;
    const flangerGain = offlineCtx.createGain();
    flangerGain.gain.value = state.params.flanger / 100 * 0.8;
    const flangerFB = offlineCtx.createGain();
    flangerFB.gain.value = state.params.flanger / 100 * 0.6;
    const flangerLFO = offlineCtx.createOscillator();
    const flangerLFOGain = offlineCtx.createGain();
    flangerLFO.frequency.value = 0.3 + (state.params.flanger / 100) * 3;
    flangerLFOGain.gain.value = 0.002;
    flangerLFO.connect(flangerLFOGain);
    flangerLFOGain.connect(flangerDelay.delayTime);
    flangerLFO.start();

    // Source
    const src = offlineCtx.createBufferSource();
    src.buffer = state.audioBuffer;
    src.playbackRate.value = speed * Math.pow(2, state.params.pitch / 12);

    // Connect
    src.connect(bass);
    bass.connect(mid);
    mid.connect(treble);
    treble.connect(distortion);
    distortion.connect(compressor);
    compressor.connect(dryGain);
    dryGain.connect(gainNode);
    compressor.connect(reverbConv);
    reverbConv.connect(reverbGain);
    reverbGain.connect(gainNode);
    compressor.connect(echoDelay);
    echoDelay.connect(echoGain);
    echoGain.connect(gainNode);
    echoDelay.connect(echoFeedback);
    echoFeedback.connect(echoDelay);
    compressor.connect(flangerDelay);
    flangerDelay.connect(flangerGain);
    flangerGain.connect(gainNode);
    flangerDelay.connect(flangerFB);
    flangerFB.connect(flangerDelay);
    gainNode.connect(offlineCtx.destination);

    src.start(0);

    setProgress(30, 'Merender audio...');

    const rendered = await offlineCtx.startRendering();

    setProgress(75, 'Mengkonversi ke ' + els.exportFormat.value.toUpperCase() + '...');

    const wavBlob = audioBufferToWav(rendered);
    const url = URL.createObjectURL(wavBlob);

    const a = document.createElement('a');
    const fmt = els.exportFormat.value;
    a.href = url;
    a.download = `${state.originalFileName || 'mr_bewok_edit'}_edited.${fmt === 'mp3' ? 'wav' : fmt}`;
    // Note: browser export is always WAV (MP3 encoding not natively supported)
    document.body.appendChild(a);

    setProgress(95, 'Menyimpan file...');
    await delay(300);

    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setProgress(100, '✅ Ekspor berhasil!');
    showToast('💾 File berhasil diekspor!', 'success');
    await delay(1500);

  } catch(err) {
    console.error(err);
    showToast('❌ Gagal ekspor: ' + err.message, 'error');
  } finally {
    els.exportBtn.disabled = false;
    await delay(800);
    els.exportProgress.style.display = 'none';
    setProgress(0, '');
  }
}

// WAV Encoder
function audioBufferToWav(buffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate  = buffer.sampleRate;
  const numSamples  = buffer.length;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const byteRate = sampleRate * numChannels * bytesPerSample;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = numSamples * numChannels * bytesPerSample;
  const headerSize = 44;
  const buf = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(buf);

  const writeStr = (o, s) => { for(let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let c = 0; c < numChannels; c++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(c)[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
  }
  return new Blob([buf], { type: 'audio/wav' });
}

// ── HELPERS ───────────────────────────────────────────────────
function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function setProgress(pct, label) {
  els.progressFill.style.width = pct + '%';
  els.progressLabel.textContent = label;
}

let toastTimeout;
function showToast(msg, type = 'info') {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  clearTimeout(toastTimeout);
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  toast.classList.add('show');
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 3000);
}

// ── EVENT LISTENERS ───────────────────────────────────────────

// File input
els.audioFile.addEventListener('change', e => {
  if (e.target.files[0]) loadFile(e.target.files[0]);
});

// Drag & drop
els.dropZone.addEventListener('dragover', e => {
  e.preventDefault();
  els.dropZone.classList.add('drag-over');
});
els.dropZone.addEventListener('dragleave', () => els.dropZone.classList.remove('drag-over'));
els.dropZone.addEventListener('drop', e => {
  e.preventDefault();
  els.dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) loadFile(file);
});

// Remove file
els.removeFile.addEventListener('click', () => {
  stopAudio();
  state.audioBuffer = null;
  els.fileInfo.style.display = 'none';
  els.dropZone.style.display = '';
  els.audioFile.value = '';
  els.totalTime.textContent = '0:00';
  els.seekBar.value = 0;
  drawWaveformStatic();
});

// Playback
els.playBtn.addEventListener('click', togglePlay);
els.stopBtn.addEventListener('click', stopAudio);
els.skipBackBtn.addEventListener('click', () => {
  const t = Math.max(0, (state.audioCtx ? state.audioCtx.currentTime - state.startTime : 0) - 5);
  if (state.isPlaying) { stopSource(); playAudio(t); }
  else { state.pauseOffset = t; els.seekBar.value = t; els.currentTime.textContent = formatTime(t); }
});
els.skipFwdBtn.addEventListener('click', () => {
  const dur = state.audioBuffer ? state.audioBuffer.duration : 0;
  const t = Math.min(dur, (state.audioCtx ? state.audioCtx.currentTime - state.startTime : 0) + 5);
  if (state.isPlaying) { stopSource(); playAudio(t); }
  else { state.pauseOffset = t; els.seekBar.value = t; els.currentTime.textContent = formatTime(t); }
});
els.loopBtn.addEventListener('click', () => {
  state.loopEnabled = !state.loopEnabled;
  if (state.sourceNode) state.sourceNode.loop = state.loopEnabled;
  els.loopBtn.classList.toggle('active', state.loopEnabled);
  showToast(state.loopEnabled ? '🔁 Loop aktif' : '🔁 Loop nonaktif', 'info');
});

// Volume
els.volumeSlider.addEventListener('input', e => {
  initAudioContext();
  applyVolume(parseFloat(e.target.value));
});

// Speed
els.speedSlider.addEventListener('input', e => {
  initAudioContext();
  applySpeed(parseFloat(e.target.value));
});

// Pitch
els.pitchSlider.addEventListener('input', e => {
  initAudioContext();
  applyPitch(parseInt(e.target.value));
});

// Bass
els.bassSlider.addEventListener('input', e => {
  initAudioContext();
  applyBass(parseInt(e.target.value));
});

// Mid
els.midSlider.addEventListener('input', e => {
  initAudioContext();
  applyMid(parseInt(e.target.value));
});

// Treble
els.trebleSlider.addEventListener('input', e => {
  initAudioContext();
  applyTreble(parseInt(e.target.value));
});

// Reverb
els.reverbSlider.addEventListener('input', e => {
  initAudioContext();
  applyReverb(parseInt(e.target.value));
});

// Echo
els.echoSlider.addEventListener('input', e => {
  initAudioContext();
  applyEcho(parseInt(e.target.value));
});

// Echo Delay
els.echoDelaySlider.addEventListener('input', e => {
  initAudioContext();
  applyEchoDelay(parseInt(e.target.value));
});

// Distortion
els.distortionSlider.addEventListener('input', e => {
  initAudioContext();
  applyDistortion(parseInt(e.target.value));
});

// Stereo
els.stereoSlider.addEventListener('input', e => {
  initAudioContext();
  applyStereo(parseInt(e.target.value));
});

// Compressor
els.compressorSlider.addEventListener('input', e => {
  initAudioContext();
  applyCompressor(parseInt(e.target.value));
});

// Flanger
els.flangerSlider.addEventListener('input', e => {
  initAudioContext();
  applyFlanger(parseInt(e.target.value));
});

// Presets
els.presetBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    els.presetBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    applyPreset(btn.dataset.preset);
  });
});

// Export
els.exportBtn.addEventListener('click', exportAudio);

// Resize canvas
window.addEventListener('resize', drawWaveformStatic);

// ── INIT ──────────────────────────────────────────────────────
drawWaveformStatic();
console.log('%c🎛️ MR BEWOK Music Editor Loaded', 'color:#8b5cf6;font-size:16px;font-weight:bold;');