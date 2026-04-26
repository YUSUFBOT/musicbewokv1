/* ============================================
   MR BEWOK MUSIC EDITOR PRO v3.2 FIXED
   Multi-Track + Trim + Export Engine
   ============================================ */
'use strict';

// ============================================
// TRACK STORE
// ============================================
const TRACKS = [];
let ACTIVE_ID = null;

// ============================================
// AUDIO ENGINE STATE
// ============================================
const AE = {
  ctx: null,
  src: null,
  gain: null,
  gainBoost: null,
  compressor: null,
  panner: null,
  analyser: null,
  subBass: null, bass: null, mid: null, hiMid: null, treble2: null,
  reverbConv: null, reverbWet: null, reverbDry: null,
  delayNode: null, delayWet: null, delayDry: null,
  distNode: null, distWet: null, distDry: null,
  chorusNode: null, chorusWet: null, chorusDry: null,
  phaserNode: null, phaserWet: null, phaserDry: null,

  isPlaying: false,
  isMuted: false,
  isLooped: false,
  startOffset: 0,
  startTime: 0,
  playbackRate: 1.0,
  pitchCents: 0,
  autoPanTimer: null,
  autoPanAngle: 0,
};

// ============================================
// DEFAULT SETTINGS PER TRACK
// ============================================
function defaultSettings() {
  return {
    volume: 100, speed: 100, pitch: 0, detune: 0,
    eq60: 0, eq250: 0, eq1k: 0, eq4k: 0, eq16k: 0,
    reverb: 0, delay: 0, delayTime: 0.3,
    distortion: 0, chorus: 0, phaser: 0,
    compressor: -20, gainBoost: 0,
    panning: 0, treble: 0, subBass: 0, autoPan: 0,
    normalize: false, nightcore: false, vaporwave: false, lofi: false, eightD: false,
    trimStart: 0, trimEnd: -1,
  };
}

// ============================================
// DOM REFERENCES
// ============================================
const $ = id => document.getElementById(id);
const D = {
  fileInput:    $('fileInput'),
  trackList:    $('trackList'),
  emptyState:   $('emptyState'),
  trackCount:   $('trackCount'),
  noTrack:      $('noTrack'),
  editor:       $('editor'),
  tibIcon:      $('tibIcon'),
  tibName:      $('tibName'),
  tibMeta:      $('tibMeta'),
  btnExport:    $('btnExport'),
  vizCanvas:    $('vizCanvas'),
  timeCur:      $('timeCur'),
  timeTot:      $('timeTot'),
  seekBar:      $('seekBar'),
  btnPlay:      $('btnPlay'),
  btnStop:      $('btnStop'),
  btnRew:       $('btnRew'),
  btnFwd:       $('btnFwd'),
  btnLoop:      $('btnLoop'),
  btnMute:      $('btnMute'),
  sdot:         $('sdot'),
  stext:        $('stext'),
  // Basic
  volume:$('volume'),           volumeVal:$('volumeVal'),
  speed:$('speed'),             speedVal:$('speedVal'),
  pitch:$('pitch'),             pitchVal:$('pitchVal'),
  detune:$('detune'),           detuneVal:$('detuneVal'),
  gainBoost:$('gainBoost'),     gainBoostVal:$('gainBoostVal'),
  compressor:$('compressor'),   compressorVal:$('compressorVal'),
  panning:$('panning'),         panningVal:$('panningVal'),
  subBass:$('subBass'),         subBassVal:$('subBassVal'),
  treble:$('treble'),           trebleVal:$('trebleVal'),
  autoPan:$('autoPan'),         autoPanVal:$('autoPanVal'),
  // EQ
  eq60:$('eq60'),   eq60Val:$('eq60Val'),
  eq250:$('eq250'), eq250Val:$('eq250Val'),
  eq1k:$('eq1k'),   eq1kVal:$('eq1kVal'),
  eq4k:$('eq4k'),   eq4kVal:$('eq4kVal'),
  eq16k:$('eq16k'), eq16kVal:$('eq16kVal'),
  // FX
  reverb:$('reverb'),         reverbVal:$('reverbVal'),
  delay:$('delay'),           delayVal:$('delayVal'),
  delayTime:$('delayTime'),   delayTimeVal:$('delayTimeVal'),
  distortion:$('distortion'), distortionVal:$('distortionVal'),
  chorus:$('chorus'),         chorusVal:$('chorusVal'),
  phaser:$('phaser'),         phaserVal:$('phaserVal'),
  btnNormalize:$('btnNormalize'), btnNightcore:$('btnNightcore'),
  btnVaporwave:$('btnVaporwave'), btnLofi:$('btnLofi'),
  btn8D:$('btn8D'),
  // Trim
  trimCanvas:$('trimCanvas'),
  trimRegion:$('trimRegion'),
  trimL:$('trimL'),
  trimR:$('trimR'),
  trimPlayhead:$('trimPlayhead'),
  trimStart:$('trimStart'),
  trimEnd:$('trimEnd'),
  trimDuration:$('trimDuration'),
  trimStatus:$('trimStatus'),
  btnTrimPreview:$('btnTrimPreview'),
  btnTrimApply:$('btnTrimApply'),
  // Export
  exportModal:$('exportModal'),
  exportInfo:$('exportInfo'),
  expFormat:$('expFormat'),
  expSampleRate:$('expSampleRate'),
  expSizeEst:$('expSizeEst'),
  expWarn:$('expWarn'),
  expProgress:$('expProgress'),
  expProgFill:$('expProgFill'),
  expProgLabel:$('expProgLabel'),
  expGo:$('expGo'),
  expCancel:$('expCancel'),
  modalClose:$('modalClose'),
  toast:$('toast'),
  // Pitch buttons
  pmHigh:$('pmHigh'),
  pmNorm:$('pmNorm'),
  pmLow:$('pmLow'),
};

// ============================================
// AUDIO CONTEXT INIT
// ============================================
function initAC() {
  if (AE.ctx) return;
  AE.ctx = new (window.AudioContext || window.webkitAudioContext)();
  buildGraph();
}

function buildGraph() {
  const c = AE.ctx;

  AE.gain       = c.createGain();
  AE.gain.gain.value = 1;

  AE.gainBoost  = c.createGain();
  AE.gainBoost.gain.value = 1;

  AE.compressor = c.createDynamicsCompressor();
  AE.compressor.threshold.value = -20;
  AE.compressor.ratio.value = 4;

  AE.panner     = c.createStereoPanner();
  AE.panner.pan.value = 0;

  AE.analyser   = c.createAnalyser();
  AE.analyser.fftSize = 1024;
  AE.analyser.smoothingTimeConstant = 0.8;

  AE.subBass  = mkFilter('lowshelf',  60,    0);
  AE.bass     = mkFilter('peaking',   250,   0);
  AE.mid      = mkFilter('peaking',   1000,  0);
  AE.hiMid    = mkFilter('peaking',   4000,  0);
  AE.treble2  = mkFilter('highshelf', 16000, 0);

  AE.reverbConv = mkConvolver();
  AE.reverbWet  = c.createGain(); AE.reverbWet.gain.value = 0;
  AE.reverbDry  = c.createGain(); AE.reverbDry.gain.value = 1;

  AE.delayNode  = c.createDelay(2.0); AE.delayNode.delayTime.value = 0.3;
  AE.delayWet   = c.createGain(); AE.delayWet.gain.value = 0;
  AE.delayDry   = c.createGain(); AE.delayDry.gain.value = 1;

  AE.distNode   = c.createWaveShaper(); AE.distNode.curve = distCurve(0);
  AE.distWet    = c.createGain(); AE.distWet.gain.value = 0;
  AE.distDry    = c.createGain(); AE.distDry.gain.value = 1;

  // Chorus: LFO-modulated delay for chorus effect
  AE.chorusDelay = c.createDelay(0.1); AE.chorusDelay.delayTime.value = 0.025;
  AE.chorusLFO   = c.createOscillator(); AE.chorusLFO.frequency.value = 1.5;
  AE.chorusLFOGain = c.createGain(); AE.chorusLFOGain.gain.value = 0;
  AE.chorusWet   = c.createGain(); AE.chorusWet.gain.value = 0;
  AE.chorusDry   = c.createGain(); AE.chorusDry.gain.value = 1;
  AE.chorusLFO.connect(AE.chorusLFOGain);
  AE.chorusLFOGain.connect(AE.chorusDelay.delayTime);
  AE.chorusLFO.start();

  // Phaser: all-pass filter chain for phaser effect
  AE.phaserFilters = [];
  for (let i = 0; i < 4; i++) {
    const f = c.createBiquadFilter();
    f.type = 'allpass';
    f.frequency.value = 1000;
    f.Q.value = 10;
    AE.phaserFilters.push(f);
    if (i > 0) AE.phaserFilters[i - 1].connect(f);
  }
  AE.phaserLFO  = c.createOscillator(); AE.phaserLFO.frequency.value = 0.5;
  AE.phaserLFOGain = c.createGain(); AE.phaserLFOGain.gain.value = 0;
  AE.phaserLFO.connect(AE.phaserLFOGain);
  AE.phaserLFOGain.connect(AE.phaserFilters[0].frequency);
  AE.phaserWet  = c.createGain(); AE.phaserWet.gain.value = 0;
  AE.phaserDry  = c.createGain(); AE.phaserDry.gain.value = 1;
  AE.phaserLFO.start();

  // Chain: src → EQ → gainBoost → compressor → panner → gain → analyser → fx → dst
  AE.subBass.connect(AE.bass);
  AE.bass.connect(AE.mid);
  AE.mid.connect(AE.hiMid);
  AE.hiMid.connect(AE.treble2);
  AE.treble2.connect(AE.gainBoost);
  AE.gainBoost.connect(AE.compressor);
  AE.compressor.connect(AE.panner);
  AE.panner.connect(AE.gain);
  AE.gain.connect(AE.analyser);

  // Reverb send/return
  AE.analyser.connect(AE.reverbWet);
  AE.analyser.connect(AE.reverbDry);
  AE.reverbWet.connect(AE.reverbConv);
  AE.reverbConv.connect(c.destination);
  AE.reverbDry.connect(c.destination);

  // Delay send/return
  AE.analyser.connect(AE.delayWet);
  AE.analyser.connect(AE.delayDry);
  AE.delayWet.connect(AE.delayNode);
  AE.delayNode.connect(c.destination);
  AE.delayDry.connect(c.destination);

  // Distortion send/return
  AE.analyser.connect(AE.distWet);
  AE.analyser.connect(AE.distDry);
  AE.distWet.connect(AE.distNode);
  AE.distNode.connect(c.destination);
  AE.distDry.connect(c.destination);

  // Chorus send/return
  AE.analyser.connect(AE.chorusWet);
  AE.analyser.connect(AE.chorusDry);
  AE.chorusWet.connect(AE.chorusDelay);
  AE.chorusDelay.connect(c.destination);
  AE.chorusDry.connect(c.destination);

  // Phaser send/return
  AE.analyser.connect(AE.phaserWet);
  AE.analyser.connect(AE.phaserDry);
  AE.phaserWet.connect(AE.phaserFilters[0]);
  AE.phaserFilters[AE.phaserFilters.length - 1].connect(c.destination);
  AE.phaserDry.connect(c.destination);
}

function mkFilter(type, freq, gainVal) {
  const f = AE.ctx.createBiquadFilter();
  f.type = type; f.frequency.value = freq; f.gain.value = gainVal;
  return f;
}

function mkConvolver() {
  const c = AE.ctx;
  const cv = c.createConvolver();
  const len = c.sampleRate * 2.5;
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
    }
  }
  cv.buffer = buf;
  return cv;
}

function distCurve(amt) {
  const n = 256;
  const curve = new Float32Array(n);
  const k = amt * 4;
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

// ============================================
// FILE LOADING
// ============================================
D.fileInput.addEventListener('change', e => {
  Array.from(e.target.files).forEach(f => loadFile(f));
  e.target.value = '';
});

// Drag & drop on sidebar
const sidebar = $('sidebar');
sidebar.addEventListener('dragover', e => {
  e.preventDefault();
  sidebar.classList.add('drag');
});
sidebar.addEventListener('dragleave', () => sidebar.classList.remove('drag'));
sidebar.addEventListener('drop', e => {
  e.preventDefault();
  sidebar.classList.remove('drag');
  Array.from(e.dataTransfer.files)
    .filter(f => f.type.startsWith('audio/'))
    .forEach(f => loadFile(f));
});

// Drag & drop on body
document.body.addEventListener('dragover', e => e.preventDefault());
document.body.addEventListener('drop', e => {
  e.preventDefault();
  Array.from(e.dataTransfer.files)
    .filter(f => f.type.startsWith('audio/'))
    .forEach(f => loadFile(f));
});

function loadFile(file) {
  if (!file.type.startsWith('audio/')) {
    showToast('❌ Format tidak didukung');
    return;
  }
  if (!AE.ctx) initAC();
  if (AE.ctx.state === 'suspended') AE.ctx.resume();

  const id = Date.now() + Math.random();
  const track = {
    id,
    name: file.name.replace(/\.[^/.]+$/, ''),
    size: file.size,
    file,
    buffer: null,
    settings: defaultSettings(),
  };
  TRACKS.push(track);
  renderTrackList();
  showToast(`⏳ Loading: ${track.name}`);

  const reader = new FileReader();
  reader.onload = ev => {
    AE.ctx.decodeAudioData(
      ev.target.result,
      buf => {
        track.buffer = buf;
        track.settings.trimStart = 0;
        track.settings.trimEnd   = buf.duration;
        renderTrackList();
        showToast(`✅ ${track.name}`);
        if (!ACTIVE_ID) selectTrack(id);
      },
      () => {
        showToast(`❌ Gagal decode: ${track.name}`);
        const idx = TRACKS.indexOf(track);
        if (idx !== -1) TRACKS.splice(idx, 1);
        renderTrackList();
      }
    );
  };
  reader.onerror = () => showToast(`❌ Gagal baca file: ${track.name}`);
  reader.readAsArrayBuffer(file);
}

// ============================================
// TRACK LIST UI
// ============================================
function renderTrackList() {
  D.trackCount.textContent = `${TRACKS.length} track${TRACKS.length !== 1 ? 's' : ''}`;

  if (TRACKS.length === 0) {
    D.trackList.innerHTML = '';
    D.trackList.appendChild(D.emptyState);
    return;
  }
  if (D.emptyState.parentNode) D.emptyState.remove();

  D.trackList.innerHTML = '';
  TRACKS.forEach(t => {
    const div = document.createElement('div');
    div.className = 'track-item'
      + (t.id === ACTIVE_ID ? ' active' : '')
      + (AE.isPlaying && t.id === ACTIVE_ID ? ' playing' : '');
    div.dataset.id = t.id;

    const dur = t.buffer ? fmtTime(t.buffer.duration) : '...';
    const mb  = (t.size / 1024 / 1024).toFixed(1);
    div.innerHTML = `
      <span class="ti-icon">${t.buffer ? '🎵' : '⏳'}</span>
      <div class="ti-info">
        <div class="ti-name" title="${escHtml(t.name)}">${escHtml(t.name)}</div>
        <div class="ti-dur">${dur} · ${mb}MB</div>
      </div>
      <button class="ti-del" data-del="${t.id}" title="Hapus">✕</button>`;

    div.addEventListener('click', e => {
      if (e.target.dataset.del) {
        deleteTrack(e.target.dataset.del);
        return;
      }
      if (t.buffer) selectTrack(t.id);
    });
    D.trackList.appendChild(div);
  });
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function deleteTrack(id) {
  const idx = TRACKS.findIndex(t => String(t.id) === String(id));
  if (idx === -1) return;
  if (String(ACTIVE_ID) === String(id)) {
    stopAudio();
    ACTIVE_ID = null;
    D.noTrack.style.display = 'flex';
    D.editor.style.display  = 'none';
  }
  TRACKS.splice(idx, 1);
  renderTrackList();
  showToast('🗑 Track dihapus');
}

function selectTrack(id) {
  const track = TRACKS.find(t => String(t.id) === String(id));
  if (!track || !track.buffer) return;
  stopAudio();
  ACTIVE_ID = id;
  renderTrackList();
  D.noTrack.style.display = 'none';
  D.editor.style.display  = 'block';
  D.tibName.textContent = track.name;
  D.tibMeta.textContent = `${fmtTime(track.buffer.duration)} · ${(track.size/1024/1024).toFixed(2)}MB · ${track.buffer.sampleRate}Hz · ${track.buffer.numberOfChannels}ch`;
  D.timeTot.textContent = fmtTime(track.buffer.duration);
  AE.startOffset = 0;
  loadSettingsToUI(track.settings);
  updateTrimUI(track);
  drawTrimWaveform(track);
  startViz();
  play();
}

// ============================================
// PLAYBACK
// ============================================
function play() {
  const track = activeTrack();
  if (!track || !track.buffer || AE.isPlaying) return;
  if (AE.ctx.state === 'suspended') AE.ctx.resume();

  const s = AE.ctx.createBufferSource();
  s.buffer = track.buffer;
  s.playbackRate.value = AE.playbackRate;
  s.detune.value = AE.pitchCents;
  s.loop = AE.isLooped;
  s.connect(AE.subBass);

  // FIX: onended only resets state when audio ends NATURALLY (not when stopped/paused).
  // Guard is: AE.isPlaying must still be true when onended fires.
  // Since pause()/stop() set AE.isPlaying=false BEFORE calling src.stop(),
  // this callback will be a no-op when pausing or stopping.
  s.onended = () => {
    if (!AE.isPlaying) return; // paused or stopped manually — do nothing
    if (!AE.isLooped) {
      AE.isPlaying = false;
      AE.startOffset = 0;
      D.btnPlay.textContent = '▶';
      renderTrackList();
      setStatus('STOPPED', '');
    }
  };

  AE.src = s;
  AE.startTime = AE.ctx.currentTime;
  s.start(0, AE.startOffset);
  AE.isPlaying = true;
  D.btnPlay.textContent = '⏸';
  renderTrackList();
  setStatus('PLAYING', 'playing');
  startSeekTick();
}

// FIX: AE.isPlaying is set to false BEFORE src.stop() so that the onended
// callback sees isPlaying=false and does NOT reset startOffset to 0.
// Previously the order was reversed, causing resume-from-beginning bug.
function pause() {
  if (!AE.isPlaying) return;
  const track = activeTrack();
  const maxDur = track?.buffer?.duration || 0;

  // Save current buffer position before stopping
  AE.startOffset = Math.min(
    (AE.ctx.currentTime - AE.startTime) * AE.playbackRate + AE.startOffset,
    maxDur
  );

  // CRITICAL FIX: set isPlaying=false BEFORE stop() so onended won't reset startOffset
  AE.isPlaying = false;
  try { AE.src.stop(); } catch (e) {}
  AE.src = null;

  D.btnPlay.textContent = '▶';
  renderTrackList();
  setStatus('PAUSED', 'paused');
}

function stopAudio() {
  // FIX: set isPlaying=false BEFORE stop() for consistency
  AE.isPlaying = false;
  if (AE.src) {
    try { AE.src.stop(); } catch (e) {}
    AE.src = null;
  }
  AE.startOffset = 0;
  D.btnPlay.textContent = '▶';
  D.seekBar.value = 0;
  D.timeCur.textContent = '0:00';
  if (D.trimPlayhead) D.trimPlayhead.style.left = '0%';
  renderTrackList();
  setStatus('STOPPED', '');
}

function togglePlay() {
  if (AE.isPlaying) pause();
  else play();
}

function seekTo(pct) {
  const t = activeTrack();
  if (!t) return;
  const was = AE.isPlaying;

  // FIX: set isPlaying=false BEFORE stop()
  if (AE.isPlaying) {
    AE.isPlaying = false;
    try { AE.src.stop(); } catch (e) {}
    AE.src = null;
  }

  AE.startOffset = (pct / 1000) * t.buffer.duration;
  if (was) play();
  else D.timeCur.textContent = fmtTime(AE.startOffset);
}

// FIX: skipRel now adds/subtracts `sec` directly in buffer time,
// not `sec * playbackRate`. Buffer offsets are in audio seconds, not real-time seconds.
function skipRel(sec) {
  const t = activeTrack();
  if (!t) return;
  const was = AE.isPlaying;

  // FIX: set isPlaying=false BEFORE stop()
  if (AE.isPlaying) {
    AE.isPlaying = false;
    try { AE.src.stop(); } catch (e) {}
    AE.src = null;
  }

  // FIX: was `sec * AE.playbackRate` which caused wrong skip amount at non-1x speeds
  AE.startOffset = Math.max(0, Math.min(t.buffer.duration, AE.startOffset + sec));
  if (was) play();
  else D.timeCur.textContent = fmtTime(AE.startOffset);
}

let seekTick = null;
function startSeekTick() {
  if (seekTick) clearInterval(seekTick);
  seekTick = setInterval(() => {
    if (!AE.isPlaying) return;
    const t = activeTrack();
    if (!t) return;
    const elapsed = (AE.ctx.currentTime - AE.startTime) * AE.playbackRate + AE.startOffset;
    const dur = t.buffer.duration;
    const clamped = Math.min(elapsed, dur);
    D.seekBar.value = (clamped / dur) * 1000;
    D.timeCur.textContent = fmtTime(clamped);
    if (D.trimPlayhead) D.trimPlayhead.style.left = (clamped / dur) * 100 + '%';
  }, 80);
}

// ============================================
// VISUALIZER
// ============================================
let vizRAF = null;
function startViz() {
  const canvas = D.vizCanvas;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width  = canvas.offsetWidth  || canvas.clientWidth  || 300;
    canvas.height = canvas.offsetHeight || canvas.clientHeight || 90;
  }
  resize();
  window.addEventListener('resize', resize);

  const arr = new Uint8Array(AE.analyser.frequencyBinCount);
  if (vizRAF) cancelAnimationFrame(vizRAF);

  function draw() {
    vizRAF = requestAnimationFrame(draw);
    AE.analyser.getByteFrequencyData(arr);
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.fillRect(0, 0, W, H);
    const bw = (W / arr.length) * 2.5;
    let x = 0;
    for (let i = 0; i < arr.length; i++) {
      const v  = arr[i] / 255;
      const bh = v * H * 0.88;
      const hue = (i / arr.length) * 260 + 180;
      const g = ctx.createLinearGradient(0, H, 0, H - bh);
      g.addColorStop(0, `hsla(${hue},85%,${40 + v * 30}%,.9)`);
      g.addColorStop(1, `hsla(${hue + 40},85%,78%,.7)`);
      ctx.fillStyle = g;
      ctx.shadowBlur = 7;
      ctx.shadowColor = `hsla(${hue},100%,65%,.5)`;
      ctx.fillRect(x, H - bh, bw - 1, bh);
      x += bw + 1;
      if (x > W) break;
    }
  }
  draw();
}

// ============================================
// TRIM MODULE
// ============================================
function drawTrimWaveform(track) {
  const canvas = D.trimCanvas;
  if (!canvas || !track || !track.buffer) return;

  const rect = canvas.getBoundingClientRect();
  canvas.width  = rect.width  || canvas.offsetWidth  || 600;
  canvas.height = rect.height || canvas.offsetHeight || 80;

  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const data = track.buffer.getChannelData(0);
  const step = Math.ceil(data.length / W);

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(0,0,0,.4)';
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < W; i++) {
    let max = 0;
    for (let j = 0; j < step; j++) {
      const s = Math.abs(data[i * step + j] || 0);
      if (s > max) max = s;
    }
    const barH = max * H * 0.9;
    const hue = 180 + (i / W) * 120;
    ctx.fillStyle = `hsla(${hue},80%,55%,.8)`;
    ctx.fillRect(i, H / 2 - barH / 2, 1, barH);
  }
}

function updateTrimUI(track) {
  if (!track || !track.buffer) return;
  const dur = track.buffer.duration;
  const ts  = track.settings.trimStart;
  const te  = track.settings.trimEnd < 0 ? dur : track.settings.trimEnd;
  D.trimStart.value = ts.toFixed(1);
  D.trimEnd.value   = te.toFixed(1);
  D.trimStart.max   = dur;
  D.trimEnd.max     = dur;
  updateTrimDisplay(ts, te, dur);
}

function updateTrimDisplay(ts, te, dur) {
  const pctL = (ts / dur) * 100;
  const pctR = (te / dur) * 100;
  D.trimRegion.style.left  = pctL + '%';
  D.trimRegion.style.right = (100 - pctR) + '%';
  D.trimDuration.textContent = (te - ts).toFixed(1) + ' s';
}

function applyTrimFromInputs() {
  const track = activeTrack();
  if (!track || !track.buffer) return;
  const dur = track.buffer.duration;
  let ts = parseFloat(D.trimStart.value) || 0;
  let te = parseFloat(D.trimEnd.value) || dur;
  ts = Math.max(0, Math.min(ts, dur));
  te = Math.max(ts + 0.1, Math.min(te, dur));
  D.trimStart.value = ts.toFixed(1);
  D.trimEnd.value   = te.toFixed(1);
  track.settings.trimStart = ts;
  track.settings.trimEnd   = te;
  updateTrimDisplay(ts, te, dur);
}

D.trimStart.addEventListener('input', applyTrimFromInputs);
D.trimEnd.addEventListener('input', applyTrimFromInputs);

// Drag trim handles
(function () {
  let dragging = null;

  function onDrag(e) {
    const track = activeTrack();
    if (!track || !track.buffer) return;
    const wrap   = D.trimCanvas.parentElement;
    const rect   = wrap.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const pct    = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const dur    = track.buffer.duration;

    if (dragging === 'l') {
      const v = Math.min(pct * dur, track.settings.trimEnd - 0.1);
      track.settings.trimStart = v;
      D.trimStart.value = v.toFixed(1);
    }
    if (dragging === 'r') {
      const v = Math.max(pct * dur, track.settings.trimStart + 0.1);
      track.settings.trimEnd = v;
      D.trimEnd.value = v.toFixed(1);
    }
    updateTrimDisplay(track.settings.trimStart, track.settings.trimEnd, dur);
  }

  D.trimL.addEventListener('mousedown',  () => dragging = 'l');
  D.trimR.addEventListener('mousedown',  () => dragging = 'r');
  D.trimL.addEventListener('touchstart', () => dragging = 'l', { passive: true });
  D.trimR.addEventListener('touchstart', () => dragging = 'r', { passive: true });
  document.addEventListener('mousemove', e => { if (dragging) onDrag(e); });
  document.addEventListener('touchmove', e => { if (dragging) onDrag(e); }, { passive: true });
  document.addEventListener('mouseup',  () => dragging = null);
  document.addEventListener('touchend', () => dragging = null);
})();

// Trim templates
const TRIM_TPLS = {
  intro30:  t => ({ s: 0,                      e: Math.min(30, t) }),
  first60:  t => ({ s: 0,                      e: Math.min(60, t) }),
  chorus:   t => ({ s: Math.max(0, t/2 - 15),  e: Math.min(t, t/2 + 15) }),
  last30:   t => ({ s: Math.max(0, t - 30),    e: t }),
  ring15:   t => ({ s: 0,                      e: Math.min(15, t) }),
  ring30:   t => ({ s: 0,                      e: Math.min(30, t) }),
  custom60: t => ({ s: 0,                      e: Math.min(60, t) }),
  full:     t => ({ s: 0,                      e: t }),
};

document.querySelectorAll('.tpl-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const track = activeTrack();
    if (!track || !track.buffer) return;
    const dur = track.buffer.duration;
    const fn  = TRIM_TPLS[btn.dataset.tpl];
    if (!fn) return;
    const { s, e } = fn(dur);
    track.settings.trimStart = s;
    track.settings.trimEnd   = e;
    D.trimStart.value = s.toFixed(1);
    D.trimEnd.value   = e.toFixed(1);
    updateTrimDisplay(s, e, dur);
    document.querySelectorAll('.tpl-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    showToast(`✂ Template: ${btn.textContent}`);
  });
});

D.btnTrimPreview.addEventListener('click', () => {
  const track = activeTrack();
  if (!track) return;
  const ts = track.settings.trimStart;
  stopAudio();
  AE.startOffset = ts;
  play();
  D.trimStatus.textContent = `▶ Preview dari ${fmtTime(ts)} → ${fmtTime(track.settings.trimEnd)}`;
});

D.btnTrimApply.addEventListener('click', () => {
  const track = activeTrack();
  if (!track || !track.buffer) return;

  const ts = track.settings.trimStart;
  const te = track.settings.trimEnd < 0 ? track.buffer.duration : track.settings.trimEnd;

  if (te - ts < 0.5) {
    showToast('❌ Durasi minimal 0.5 detik');
    return;
  }

  const sr    = track.buffer.sampleRate;
  const ch    = track.buffer.numberOfChannels;
  const startS = Math.floor(ts * sr);
  const endS   = Math.min(Math.floor(te * sr), track.buffer.length);
  const len    = endS - startS;
  const newBuf = AE.ctx.createBuffer(ch, len, sr);

  for (let c = 0; c < ch; c++) {
    const src = track.buffer.getChannelData(c);
    const dst = newBuf.getChannelData(c);
    for (let i = 0; i < len; i++) dst[i] = src[startS + i];
  }

  stopAudio();
  track.buffer = newBuf;
  track.settings.trimStart = 0;
  track.settings.trimEnd   = newBuf.duration;
  track.size = len * ch * 4;

  D.tibMeta.textContent = `${fmtTime(newBuf.duration)} · ${(track.size/1024/1024).toFixed(2)}MB`;
  D.timeTot.textContent = fmtTime(newBuf.duration);
  AE.startOffset = 0;
  updateTrimUI(track);
  drawTrimWaveform(track);
  renderTrackList();
  D.trimStatus.textContent = `✅ Trim diterapkan! Durasi baru: ${fmtTime(newBuf.duration)}`;
  showToast(`✅ Trim applied: ${fmtTime(newBuf.duration)}`);
});

// ============================================
// EXPORT MODULE
// ============================================
D.btnExport.addEventListener('click', openExportModal);
D.modalClose.addEventListener('click', closeExportModal);
D.expCancel.addEventListener('click', closeExportModal);
D.exportModal.addEventListener('click', e => {
  if (e.target === D.exportModal) closeExportModal();
});

function openExportModal() {
  const track = activeTrack();
  if (!track || !track.buffer) return;
  D.exportModal.style.display = 'flex';
  D.expProgress.style.display = 'none';
  updateExportEstimate();
}

function closeExportModal() {
  D.exportModal.style.display = 'none';
  D.expProgress.style.display = 'none';
}

D.expFormat.addEventListener('change', updateExportEstimate);
D.expSampleRate.addEventListener('change', updateExportEstimate);

function updateExportEstimate() {
  const track = activeTrack();
  if (!track || !track.buffer) return;
  const ts  = track.settings.trimStart || 0;
  const te  = (track.settings.trimEnd < 0) ? track.buffer.duration : (track.settings.trimEnd || track.buffer.duration);
  const dur = te - ts;
  const fmt = D.expFormat.value;
  const sr  = parseInt(D.expSampleRate.value);
  const ch  = track.buffer.numberOfChannels;

  let sizeBytes;
  if (fmt === 'wav') {
    sizeBytes = dur * sr * ch * 2;
  } else {
    const kbps = fmt === 'mp3-128' ? 128 : fmt === 'mp3-96' ? 96 : 64;
    sizeBytes = (kbps * 1000 / 8) * dur;
  }

  const sizeMB = sizeBytes / 1024 / 1024;
  D.expSizeEst.textContent = `~${sizeMB.toFixed(1)} MB  (${fmtTime(dur)})`;
  D.exportInfo.innerHTML   = `Track: <b>${escHtml(track.name)}</b><br>Durasi: ${fmtTime(dur)}<br>Channels: ${ch}`;
  D.expWarn.style.display  = sizeMB > 10 ? 'block' : 'none';
  D.expGo.disabled = false;
}

D.expGo.addEventListener('click', async () => {
  const track = activeTrack();
  if (!track || !track.buffer) return;
  D.expGo.disabled = true;
  D.expProgress.style.display = 'block';
  setExportProgress(5, 'Preparing audio...');

  try {
    const fmt = D.expFormat.value;
    const sr  = parseInt(D.expSampleRate.value);
    const ts  = track.settings.trimStart || 0;
    const te  = (track.settings.trimEnd < 0) ? track.buffer.duration : (track.settings.trimEnd || track.buffer.duration);

    setExportProgress(15, 'Rendering offline...');
    const rendered = await renderOffline(track, ts, te, sr);

    setExportProgress(60, 'Encoding...');
    const blob = bufferToWav(rendered);
    const ext  = 'wav';

    setExportProgress(90, 'Creating download...');
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `MRBEWOK_${track.name}_edited.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);

    const sizeMB = (blob.size / 1024 / 1024).toFixed(1);
    setExportProgress(100, `✅ Done! ${sizeMB}MB`);
    showToast(`✅ Exported: ${sizeMB}MB`);
    setTimeout(closeExportModal, 1800);
  } catch (err) {
    console.error(err);
    setExportProgress(0, '❌ Error: ' + err.message);
    showToast('❌ Export gagal');
    D.expGo.disabled = false;
  }
});

function setExportProgress(pct, label) {
  D.expProgFill.style.width   = pct + '%';
  D.expProgLabel.textContent  = label;
}

async function renderOffline(track, ts, te, targetSR) {
  const buf    = track.buffer;
  const ch     = buf.numberOfChannels;
  const durSec = te - ts;

  const maxSec    = (10 * 1024 * 1024) / (2 * ch * targetSR);
  const actualDur = Math.min(durSec, maxSec);

  const offCtx = new OfflineAudioContext(ch, Math.ceil(actualDur * targetSR), targetSR);
  const s      = offCtx.createBufferSource();
  const sets   = track.settings;

  s.buffer = buf;
  s.playbackRate.value = sets.speed / 100;
  s.detune.value = (sets.pitch * 100) + sets.detune;

  const fSub    = mkOffFilter(offCtx, 'lowshelf',  60,    sets.eq60  || sets.subBass || 0);
  const fBass   = mkOffFilter(offCtx, 'peaking',   250,   sets.eq250 || 0);
  const fMid    = mkOffFilter(offCtx, 'peaking',   1000,  sets.eq1k  || 0);
  const fHiMid  = mkOffFilter(offCtx, 'peaking',   4000,  sets.eq4k  || 0);
  const fTreble = mkOffFilter(offCtx, 'highshelf', 16000, sets.eq16k || sets.treble || 0);

  const gain  = offCtx.createGain();
  gain.gain.value = (sets.volume / 100) * (sets.normalize ? 2 : 1);

  const gb = offCtx.createGain();
  gb.gain.value = Math.pow(10, (sets.gainBoost || 0) / 20);

  const pan = offCtx.createStereoPanner();
  pan.pan.value = sets.panning || 0;

  const comp = offCtx.createDynamicsCompressor();
  comp.threshold.value = sets.compressor || -20;

  const revConv = mkOffConvolver(offCtx);
  const revWet  = offCtx.createGain(); revWet.gain.value = (sets.reverb || 0) / 100 * 0.7;
  const revDry  = offCtx.createGain(); revDry.gain.value = 1 - (sets.reverb || 0) / 100 * 0.35;

  const del    = offCtx.createDelay(2.0); del.delayTime.value = sets.delayTime || 0.3;
  const delWet = offCtx.createGain(); delWet.gain.value = (sets.delay || 0) / 100;
  const delDry = offCtx.createGain(); delDry.gain.value = 1 - (sets.delay || 0) / 100 * 0.5;

  const distWaveShaper = offCtx.createWaveShaper();
  distWaveShaper.curve = distCurve(sets.distortion || 0);
  const distWet = offCtx.createGain(); distWet.gain.value = (sets.distortion || 0) / 100 * 0.6;
  const distDry = offCtx.createGain(); distDry.gain.value = 1 - (sets.distortion || 0) / 100 * 0.3;

  s.connect(fSub); fSub.connect(fBass); fBass.connect(fMid);
  fMid.connect(fHiMid); fHiMid.connect(fTreble);
  fTreble.connect(gb); gb.connect(comp); comp.connect(pan); pan.connect(gain);

  gain.connect(revWet); gain.connect(revDry);
  revWet.connect(revConv); revConv.connect(offCtx.destination);
  revDry.connect(offCtx.destination);

  gain.connect(delWet); gain.connect(delDry);
  delWet.connect(del); del.connect(offCtx.destination);
  delDry.connect(offCtx.destination);

  gain.connect(distWet); gain.connect(distDry);
  distWet.connect(distWaveShaper); distWaveShaper.connect(offCtx.destination);
  distDry.connect(offCtx.destination);

  s.start(0, ts, actualDur);
  return await offCtx.startRendering();
}

function mkOffFilter(ctx, type, freq, gainVal) {
  const f = ctx.createBiquadFilter();
  f.type = type; f.frequency.value = freq; f.gain.value = gainVal;
  return f;
}

function mkOffConvolver(ctx) {
  const cv  = ctx.createConvolver();
  const len = Math.floor(ctx.sampleRate * 1.5);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
    }
  }
  cv.buffer = buf;
  return cv;
}

function bufferToWav(buffer) {
  const numCh     = buffer.numberOfChannels;
  const sr        = buffer.sampleRate;
  const len       = buffer.length;
  const blockAlign = numCh * 2;
  const byteRate   = sr * blockAlign;
  const dataLen    = len * blockAlign;
  const wavBuf     = new ArrayBuffer(44 + dataLen);
  const view       = new DataView(wavBuf);

  function ws(off, str) {
    for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i));
  }
  ws(0, 'RIFF');
  view.setUint32(4, 36 + dataLen, true);
  ws(8, 'WAVE');
  ws(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numCh, true);
  view.setUint32(24, sr, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  ws(36, 'data');
  view.setUint32(40, dataLen, true);

  let off = 44;
  for (let i = 0; i < len; i++) {
    for (let c = 0; c < numCh; c++) {
      const s = Math.max(-1, Math.min(1, buffer.getChannelData(c)[i]));
      view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      off += 2;
    }
  }
  return new Blob([wavBuf], { type: 'audio/wav' });
}

// ============================================
// CONTROLS → AUDIO ENGINE
// ============================================
function ctrlBind(id, valId, applyFn, fmtFn) {
  const el = D[id];
  if (!el) return;
  el.addEventListener('input', () => {
    if (D[valId]) D[valId].textContent = fmtFn(el.value);
    applyFn(+el.value);
    saveCurrentSettings();
  });
}

ctrlBind('volume',     'volumeVal',     v => { if (AE.gain) AE.gain.gain.value = AE.isMuted ? 0 : v / 100; }, v => v + '%');
ctrlBind('speed',      'speedVal',      v => { AE.playbackRate = v / 100; if (AE.src) AE.src.playbackRate.value = v / 100; }, v => (v / 100).toFixed(2) + '×');
ctrlBind('pitch',      'pitchVal',      () => { applyDetune(); updatePitchBtns(); }, v => v + ' st');
ctrlBind('detune',     'detuneVal',     () => applyDetune(), v => v + ' ¢');
ctrlBind('gainBoost',  'gainBoostVal',  v => { if (AE.gainBoost) AE.gainBoost.gain.value = Math.pow(10, v / 20); }, v => (v > 0 ? '+' : '') + v + ' dB');
ctrlBind('compressor', 'compressorVal', v => { if (AE.compressor) AE.compressor.threshold.value = v; }, v => v + ' dB');
ctrlBind('panning',    'panningVal',    v => { if (AE.panner) AE.panner.pan.value = v; }, v => +v < -0.05 ? 'L ' + Math.round(Math.abs(v) * 100) : +v > 0.05 ? 'R ' + Math.round(v * 100) : 'C');
ctrlBind('subBass',    'subBassVal',    v => { if (AE.subBass) AE.subBass.gain.value = v; }, v => (v > 0 ? '+' : '') + v + ' dB');
ctrlBind('treble',     'trebleVal',     v => { if (AE.treble2) AE.treble2.gain.value = v; }, v => (v > 0 ? '+' : '') + v + ' dB');
ctrlBind('autoPan',    'autoPanVal',    v => { v > 0 ? startAutoPan(v) : stopAutoPan(); }, v => +v === 0 ? 'OFF' : parseFloat(v).toFixed(1) + ' Hz');
ctrlBind('eq60',   'eq60Val',   v => { if (AE.subBass) AE.subBass.gain.value = v; }, v => (v > 0 ? '+' : '') + v);
ctrlBind('eq250',  'eq250Val',  v => { if (AE.bass)    AE.bass.gain.value    = v; }, v => (v > 0 ? '+' : '') + v);
ctrlBind('eq1k',   'eq1kVal',   v => { if (AE.mid)     AE.mid.gain.value     = v; }, v => (v > 0 ? '+' : '') + v);
ctrlBind('eq4k',   'eq4kVal',   v => { if (AE.hiMid)   AE.hiMid.gain.value   = v; }, v => (v > 0 ? '+' : '') + v);
ctrlBind('eq16k',  'eq16kVal',  v => { if (AE.treble2) AE.treble2.gain.value  = v; }, v => (v > 0 ? '+' : '') + v);
ctrlBind('reverb',     'reverbVal',     v => { if (AE.reverbWet) AE.reverbWet.gain.value = v / 100 * 0.7; if (AE.reverbDry) AE.reverbDry.gain.value = 1 - v / 100 * 0.35; }, v => v + '%');
ctrlBind('delay',      'delayVal',      v => { if (AE.delayWet) AE.delayWet.gain.value = v / 100; if (AE.delayDry) AE.delayDry.gain.value = 1 - v / 100 * 0.5; }, v => v + '%');
ctrlBind('delayTime',  'delayTimeVal',  v => { if (AE.delayNode) AE.delayNode.delayTime.value = v; }, v => parseFloat(v).toFixed(2) + 's');
ctrlBind('distortion', 'distortionVal', v => {
  if (AE.distNode) AE.distNode.curve = distCurve(v);
  if (AE.distWet)  AE.distWet.gain.value = v / 100 * 0.6;
  if (AE.distDry)  AE.distDry.gain.value = 1 - v / 100 * 0.3;
}, v => v + '%');
// FIX: Chorus now actually connected to audio graph
ctrlBind('chorus', 'chorusVal', v => {
  if (AE.chorusWet)  AE.chorusWet.gain.value  = v / 100 * 0.5;
  if (AE.chorusDry)  AE.chorusDry.gain.value  = 1 - v / 100 * 0.25;
  if (AE.chorusLFOGain) AE.chorusLFOGain.gain.value = v / 100 * 0.002;
}, v => v + '%');
// FIX: Phaser now actually connected to audio graph
ctrlBind('phaser', 'phaserVal', v => {
  if (AE.phaserWet) AE.phaserWet.gain.value  = v / 100 * 0.5;
  if (AE.phaserDry) AE.phaserDry.gain.value  = 1 - v / 100 * 0.25;
  if (AE.phaserLFOGain) AE.phaserLFOGain.gain.value = v / 100 * 800;
}, v => v + '%');

function applyDetune() {
  const cents = (+D.pitch.value * 100) + (+D.detune.value);
  AE.pitchCents = cents;
  if (AE.src) AE.src.detune.value = cents;
}

// Speed presets
document.querySelectorAll('.sp-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.sp-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    D.speed.value = btn.dataset.s;
    D.speed.dispatchEvent(new Event('input'));
  });
});

// Pitch mode buttons
D.pmHigh.addEventListener('click', () => { D.pitch.value = 8;  D.pitch.dispatchEvent(new Event('input')); });
D.pmNorm.addEventListener('click', () => { D.pitch.value = 0;  D.pitch.dispatchEvent(new Event('input')); });
D.pmLow.addEventListener('click',  () => { D.pitch.value = -8; D.pitch.dispatchEvent(new Event('input')); });

function updatePitchBtns() {
  const v = +D.pitch.value;
  [D.pmHigh, D.pmNorm, D.pmLow].forEach(b => b.classList.remove('active'));
  if (v > 0) D.pmHigh.classList.add('active');
  else if (v < 0) D.pmLow.classList.add('active');
  else D.pmNorm.classList.add('active');
}

// EQ Presets
const EQ_P = {
  flat:  [ 0,  0,  0,  0,  0],
  bass:  [10,  8,  0, -2, -2],
  vocal: [-4, -2,  4,  6,  4],
  pop:   [-2,  0,  4,  4,  2],
  rock:  [ 6,  4, -2,  4,  6],
  jazz:  [ 4,  2, -2,  2,  4],
  lofi:  [ 8,  6, -4, -8,-12],
  club:  [ 8,  6,  2,  4,  6],
};
document.querySelectorAll('.ep-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const p = EQ_P[btn.dataset.p];
    if (!p) return;
    ['eq60','eq250','eq1k','eq4k','eq16k'].forEach((id, i) => {
      D[id].value = p[i];
      D[id].dispatchEvent(new Event('input'));
    });
    showToast(`🎛 EQ: ${btn.dataset.p.toUpperCase()}`);
  });
});

// Special FX toggles
function mkToggle(btn, onFn, offFn, label) {
  btn.addEventListener('click', () => {
    const on = btn.classList.toggle('active');
    on ? onFn() : offFn();
    showToast(on ? `✅ ${label} ON` : `${label} OFF`);
    saveCurrentSettings();
  });
}

mkToggle(
  D.btnNormalize,
  () => { if (AE.gainBoost) AE.gainBoost.gain.value = 2; },
  () => { if (AE.gainBoost) AE.gainBoost.gain.value = Math.pow(10, (+D.gainBoost.value) / 20); },
  '⚡ Normalize'
);
mkToggle(D.btnNightcore, () => applyMode('nightcore'), resetAllSettings, '🌙 Nightcore');
mkToggle(D.btnVaporwave, () => applyMode('vaporwave'), resetAllSettings, '🌊 Vaporwave');
mkToggle(D.btnLofi,      () => applyMode('lofi'),      resetAllSettings, '☕ Lo-Fi');
mkToggle(
  D.btn8D,
  () => { D.autoPan.value = 1; D.autoPan.dispatchEvent(new Event('input')); D.reverb.value = 40; D.reverb.dispatchEvent(new Event('input')); },
  () => { D.autoPan.value = 0; D.autoPan.dispatchEvent(new Event('input')); D.reverb.value = 0;  D.reverb.dispatchEvent(new Event('input')); },
  '🎧 8D Audio'
);

// Auto Pan
function startAutoPan(spd) {
  stopAutoPan();
  AE.autoPanTimer = setInterval(() => {
    AE.autoPanAngle += (spd * 20) / 1000 * Math.PI * 2;
    const v = Math.sin(AE.autoPanAngle);
    if (AE.panner) AE.panner.pan.value = v;
    D.panning.value = v;
    D.panningVal.textContent = v < -0.05 ? 'L ' + Math.round(Math.abs(v) * 100) : v > 0.05 ? 'R ' + Math.round(v * 100) : 'C';
  }, 20);
}
function stopAutoPan() {
  if (AE.autoPanTimer) { clearInterval(AE.autoPanTimer); AE.autoPanTimer = null; }
  AE.autoPanAngle = 0;
}

// ============================================
// SOUND MODES
// ============================================
const MODES = {
  slow:       { speed:  65, pitch:  -2, eq: [ 4,  6,  0, -2, -4], rev: 20, del: 10 },
  fast:       { speed: 150, pitch:   2, eq: [-2,  0,  2,  2,  4], rev:  0, del:  0 },
  bass:       { speed: 100, pitch:   0, eq: [14, 10,  2,  0, -2], rev: 10, del:  5 },
  vocal:      { speed: 100, pitch:   2, eq: [-4, -2,  4,  8,  6], rev: 15, del:  8 },
  nightcore:  { speed: 135, pitch:   5, eq: [ 4,  2,  0,  4,  6], rev: 10, del:  5 },
  vaporwave:  { speed:  70, pitch:  -5, eq: [ 6,  4, -2, -4, -6], rev: 60, del: 40 },
  lofi:       { speed:  90, pitch:  -1, eq: [ 8,  6, -4, -8,-12], rev: 30, del: 20 },
  radio:      { speed: 100, pitch:   0, eq: [-6, -4,  6,  8, -4], rev:  0, del:  0 },
  underwater: { speed:  80, pitch:  -3, eq: [10,  8, -6,-12,-18], rev: 70, del: 50 },
  telephone:  { speed: 100, pitch:   0, eq: [-12,-6,  8, 10,-12], rev:  0, del:  0 },
  concert:    { speed: 100, pitch:   0, eq: [ 2,  0,  0,  0,  2], rev: 75, del: 30 },
  deepbass:   { speed:  85, pitch:  -4, eq: [18, 12,  0, -2, -4], rev: 15, del:  5 },
  chipmunk:   { speed: 160, pitch:  12, eq: [ 0, -2,  4,  6,  8], rev:  5, del:  0 },
  robot:      { speed: 100, pitch:   0, eq: [ 0,  0,  6, 10, -6], rev: 20, del: 35 },
  echo:       { speed: 100, pitch:   0, eq: [ 2,  0,  0,  2,  2], rev: 30, del: 60 },
};

document.querySelectorAll('.smode').forEach(btn => {
  btn.addEventListener('click', () => {
    const m = btn.dataset.m;
    if (m === 'reset') {
      document.querySelectorAll('.smode').forEach(b => b.classList.remove('active'));
      resetAllSettings();
      showToast('🔄 Reset!');
      return;
    }
    document.querySelectorAll('.smode').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    applyMode(m);
    showToast(`✨ Mode: ${btn.textContent}`);
  });
});

function applyMode(m) {
  const cfg = MODES[m];
  if (!cfg) return;
  D.speed.value = cfg.speed; D.speed.dispatchEvent(new Event('input'));
  D.pitch.value = cfg.pitch; D.pitch.dispatchEvent(new Event('input'));
  D.reverb.value = cfg.rev; D.reverb.dispatchEvent(new Event('input'));
  D.delay.value  = cfg.del; D.delay.dispatchEvent(new Event('input'));
  ['eq60','eq250','eq1k','eq4k','eq16k'].forEach((id, i) => {
    D[id].value = cfg.eq[i];
    D[id].dispatchEvent(new Event('input'));
  });
  document.querySelectorAll('.sp-btn').forEach(b => {
    b.classList.toggle('active', +b.dataset.s === cfg.speed);
  });
}

// ============================================
// SAVE / LOAD SETTINGS
// ============================================
function saveCurrentSettings() {
  const track = activeTrack();
  if (!track) return;
  const sliders = ['volume','speed','pitch','detune','gainBoost','compressor',
    'panning','subBass','treble','autoPan','eq60','eq250','eq1k','eq4k','eq16k',
    'reverb','delay','delayTime','distortion','chorus','phaser'];
  sliders.forEach(k => {
    if (D[k] !== undefined && !isNaN(D[k].value)) {
      track.settings[k] = +D[k].value;
    }
  });
  track.settings.normalize = D.btnNormalize.classList.contains('active');
  track.settings.nightcore = D.btnNightcore.classList.contains('active');
  track.settings.vaporwave = D.btnVaporwave.classList.contains('active');
  track.settings.lofi      = D.btnLofi.classList.contains('active');
  track.settings.eightD    = D.btn8D.classList.contains('active');
}

function loadSettingsToUI(s) {
  const sliders = ['volume','speed','pitch','detune','gainBoost','compressor',
    'panning','subBass','treble','autoPan','eq60','eq250','eq1k','eq4k','eq16k',
    'reverb','delay','delayTime','distortion','chorus','phaser'];
  sliders.forEach(k => {
    if (D[k] !== undefined && s[k] !== undefined) {
      D[k].value = s[k];
      D[k].dispatchEvent(new Event('input'));
    }
  });
  D.btnNormalize.classList.toggle('active', !!s.normalize);
  D.btnNightcore.classList.toggle('active', !!s.nightcore);
  D.btnVaporwave.classList.toggle('active', !!s.vaporwave);
  D.btnLofi.classList.toggle('active',      !!s.lofi);
  D.btn8D.classList.toggle('active',        !!s.eightD);
  updatePitchBtns();
  document.querySelectorAll('.sp-btn').forEach(b => {
    b.classList.toggle('active', +b.dataset.s === s.speed);
  });
}

function resetAllSettings() {
  const defaults = defaultSettings();
  const track = activeTrack();
  if (track) {
    const ts = track.settings.trimStart;
    const te = track.settings.trimEnd;
    Object.assign(track.settings, defaults);
    track.settings.trimStart = ts;
    track.settings.trimEnd   = te;
  }
  loadSettingsToUI(defaults);
  [D.btnNormalize, D.btnNightcore, D.btnVaporwave, D.btnLofi, D.btn8D].forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.smode').forEach(b => b.classList.remove('active'));
  stopAutoPan();
}

// ============================================
// TRANSPORT EVENTS
// ============================================
D.btnPlay.addEventListener('click', togglePlay);
D.btnStop.addEventListener('click', stopAudio);
D.btnRew.addEventListener('click', () => skipRel(-10));
D.btnFwd.addEventListener('click', () => skipRel(+10));
D.seekBar.addEventListener('input', () => seekTo(+D.seekBar.value));

D.btnLoop.addEventListener('click', () => {
  AE.isLooped = !AE.isLooped;
  D.btnLoop.classList.toggle('active', AE.isLooped);
  if (AE.src) AE.src.loop = AE.isLooped;
  showToast(AE.isLooped ? '🔁 Loop ON' : 'Loop OFF');
});

D.btnMute.addEventListener('click', () => {
  AE.isMuted = !AE.isMuted;
  D.btnMute.textContent = AE.isMuted ? '🔇 Unmute' : '🔊 Mute';
  D.btnMute.classList.toggle('active', AE.isMuted);
  if (AE.gain) AE.gain.gain.value = AE.isMuted ? 0 : +D.volume.value / 100;
  showToast(AE.isMuted ? '🔇 Muted' : '🔊 Unmuted');
});

// ============================================
// TABS
// ============================================
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    const panel = document.getElementById('tab-' + tab.dataset.tab);
    if (panel) panel.classList.add('active');
    if (tab.dataset.tab === 'trim') {
      const t = activeTrack();
      if (t) { drawTrimWaveform(t); updateTrimUI(t); }
    }
  });
});

// ============================================
// HELPERS
// ============================================
function activeTrack() {
  return TRACKS.find(t => t.id === ACTIVE_ID) || null;
}

function fmtTime(s) {
  const ss = Math.floor(Math.max(0, s));
  return `${Math.floor(ss / 60)}:${String(ss % 60).padStart(2, '0')}`;
}

function setStatus(txt, cls) {
  D.stext.textContent = txt;
  D.sdot.className = 'sdot' + (cls ? ' ' + cls : '');
}

let toastTimer;
function showToast(msg) {
  D.toast.textContent = msg;
  D.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => D.toast.classList.remove('show'), 2400);
}

// ============================================
// KEYBOARD SHORTCUTS
// ============================================
document.addEventListener('keydown', e => {
  if (!ACTIVE_ID) return;
  const tag = document.activeElement.tagName;
  if (['INPUT','TEXTAREA','SELECT'].includes(tag)) return;
  switch (e.code) {
    case 'Space':       e.preventDefault(); togglePlay(); break;
    case 'ArrowLeft':   skipRel(-5); break;
    case 'ArrowRight':  skipRel(+5); break;
    case 'ArrowUp':
      D.volume.value = Math.min(150, +D.volume.value + 5);
      D.volume.dispatchEvent(new Event('input'));
      break;
    case 'ArrowDown':
      D.volume.value = Math.max(0, +D.volume.value - 5);
      D.volume.dispatchEvent(new Event('input'));
      break;
    case 'KeyM': D.btnMute.click(); break;
    case 'KeyL': D.btnLoop.click(); break;
    case 'KeyS': stopAudio(); break;
    case 'KeyR': resetAllSettings(); showToast('🔄 Reset'); break;
    case 'KeyE': openExportModal(); break;
  }
});

// ============================================
// RESIZE HANDLER
// ============================================
window.addEventListener('resize', () => {
  const t = activeTrack();
  const trimPanel = document.getElementById('tab-trim');
  if (t && trimPanel && trimPanel.classList.contains('active')) {
    drawTrimWaveform(t);
  }
});

// ============================================
// INIT
// ============================================
updatePitchBtns();
