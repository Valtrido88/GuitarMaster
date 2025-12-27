import { Metronome } from './modules/metronome.js';
import { Tuner } from './modules/tuner.js';
import { Band } from './modules/band.js';
import { Songs } from './modules/songs.js';
import { Exercises } from './modules/exercises.js';
import { ChordsPractice } from './modules/chords.js';
import { Crowd } from './modules/crowd.js';
import { Achievements } from './modules/achievements.js';
import { Progression } from './modules/progression.js';
import { Teacher } from './modules/teacher.js';
import { Advisor } from './modules/advisor.js';

const state = {
  audioCtx: null,
  micStream: null,
  crowdEnabled: true,
  autoBpmRange: false,
  profile: JSON.parse(localStorage.getItem('gm_profile')||'{}'),
  rhythmThreshold: 0.08,
  pitchTolerance: 15
};

// Navegación simple
const views = document.querySelectorAll('.view');
function showView(id) {
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active', b.dataset.view===id));
  views.forEach(v => v.classList.toggle('visible', v.id === id));
}
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const id = btn.dataset.view;
    location.hash = `#${id}`;
    showView(id);
  });
});
window.addEventListener('hashchange', () => {
  const id = (location.hash||'').replace('#','') || 'home';
  showView(id);
});
// Vista inicial por hash, cae en home
showView(((location.hash||'').replace('#','')) || 'home');

// Home: tiles de mapa de modos
document.querySelectorAll('.mode-tile').forEach(tile => {
  tile.addEventListener('click', () => {
    const id = tile.getAttribute('data-view');
    if (id) { location.hash = `#${id}`; showView(id); }
  });
});

// Fondo: usar fallback si no existe assets/bg.jpg
(() => {
  const img = new Image();
  img.onload = () => {/* ok, mantener background-image */};
  img.onerror = () => {
    document.body.classList.remove('background-image');
    document.body.classList.add('background-noimage');
  };
  img.src = 'assets/bg.jpg';
})();

// Audio + Mic
document.getElementById('enable-audio').addEventListener('click', () => {
  if (!state.audioCtx) state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
});
document.getElementById('enable-mic').addEventListener('click', async () => {
  try {
    state.micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
    Tuner.attachStream(state.micStream);
  } catch (e) {
    alert('No se pudo acceder al micrófono: ' + e.message);
  }
});

// Ajustes
const crowdEnabledEl = document.getElementById('crowd-enabled');
crowdEnabledEl.addEventListener('change', () => {
  state.crowdEnabled = crowdEnabledEl.checked;
});
const autoBpmEl = document.getElementById('auto-bpm-range');
autoBpmEl.addEventListener('change', () => { state.autoBpmRange = autoBpmEl.checked; });
// Ajustes adicionales: umbrales
document.getElementById('rhythm-threshold')?.addEventListener('input', (e) => {
  const v = Number(e.target.value); state.rhythmThreshold = isNaN(v)? state.rhythmThreshold : v;
});
document.getElementById('pitch-tolerance')?.addEventListener('input', (e) => {
  const v = Number(e.target.value); state.pitchTolerance = isNaN(v)? state.pitchTolerance : v;
});

// Instancias de módulos
const crowd = new Crowd(() => state.audioCtx ?? (state.audioCtx = new (window.AudioContext||window.webkitAudioContext)()));
const achievements = new Achievements();
const progression = new Progression();
const teacher = new Teacher();
const advisor = new Advisor({ achievements });

// HOME: consejo periódico
const adviceEl = document.getElementById('advice');
setInterval(() => {
  adviceEl.textContent = advisor.nextTip();
}, 7000);

// Utilidades de diagnóstico (micrófono)
async function _diagGetAnalyser() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation:true, noiseSuppression:true }, video:false });
  state.micStream = stream;
  const ctx = state.audioCtx ?? (state.audioCtx = new (window.AudioContext||window.webkitAudioContext)());
  const src = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser(); analyser.fftSize = 1024; src.connect(analyser); return analyser;
}
function _diagEnergy(analyser) {
  const buf = new Uint8Array(analyser.fftSize); analyser.getByteTimeDomainData(buf);
  let sum=0; for (let i=0;i<buf.length;i++){ const v=(buf[i]-128)/128; sum += v*v; }
  return Math.sqrt(sum/buf.length);
}
let _diagPitchActive=false; let _diagPitchSamples=[];
// Diagnóstico: Ritmo (20s)
document.getElementById('diag-ryt-start')?.addEventListener('click', async () => {
  const bpm = Number(document.getElementById('diag-bpm').value)||70;
  const interval = (60/bpm)*1000; const analyser = await _diagGetAnalyser();
  let hits=0, misses=0; const endAt = Date.now()+20000; const card = document.getElementById('diag-ryt-res');
  const timer = setInterval(() => {
    const e = _diagEnergy(analyser);
    const isHit = e > state.rhythmThreshold; if (isHit) hits++; else misses++;
    card.textContent = `Ritmo (aprox): ${(hits/(hits+misses)||0).toFixed(2)} · golpes:${hits} fallos:${misses}`;
    if (Date.now()>=endAt) { clearInterval(timer); const acc = hits/(hits+misses||1); state.profile.rhythmAccuracy = acc; renderSessionPlan(); }
  }, interval);
});
// Diagnóstico: Afinación (10s)
document.getElementById('diag-pitch-start')?.addEventListener('click', async () => {
  await (state.audioCtx ?? (state.audioCtx = new (window.AudioContext||window.webkitAudioContext)()));
  _diagPitchSamples=[]; _diagPitchActive=true; const endAt = Date.now()+10000; const card = document.getElementById('diag-pitch-res');
  const tick = setInterval(() => {
    if (Date.now()>=endAt) { clearInterval(tick); _diagPitchActive=false;
      const vals = _diagPitchSamples.filter(v=>v!=null);
      const meanAbs = vals.length? (vals.reduce((a,b)=>a+Math.abs(b),0)/vals.length): null;
      state.profile.pitchDeviation = meanAbs!=null? meanAbs: null;
      card.textContent = meanAbs!=null? `Afinación (cents abs medio): ${meanAbs.toFixed(1)}` : 'Afinación: —';
      renderSessionPlan();
    }
  }, 200);
});

// METRÓNOMO
const metro = new Metronome(() => state.audioCtx ?? (state.audioCtx = new (window.AudioContext||window.webkitAudioContext)()), progress => {
  const bar = document.getElementById('metro-visual');
  bar.style.setProperty('--p', progress);
  // ancho del indicador
  bar.style.setProperty('--w', `${Math.round(progress*100)}%`);
  bar.style.setProperty('--dummy', 1); // trigger style refresh
  bar.style.setProperty('--accent', '#6ee7ff');
  bar.style.setProperty('--accent2', '#ffc46e');
  bar.style.setProperty('--accent3', '#fff');
  bar.style.setProperty('--accent4', '#000');
  bar.style.setProperty('--accent5', '#333');
  bar.style.setProperty('--accent6', '#666');
  bar.style.setProperty('--accent7', '#999');
  bar.querySelector && (bar.querySelector('::after'), 0);
  bar.style.setProperty('--width', `${Math.round(progress*100)}%`);
  bar.style.setProperty('--height', '18px');
  bar.style.setProperty('--border-radius', '9px');
  bar.style.setProperty('--transition', 'width 0.02s linear');
  bar.style.setProperty('--bg', 'linear-gradient(90deg, var(--accent), var(--accent2))');
  // Fallback simple usando style.width
  bar.style.position = 'relative';
  if (!bar._indicator) {
    const ind = document.createElement('div');
    ind.style.position='absolute'; ind.style.left='0'; ind.style.top='0'; ind.style.bottom='0'; ind.style.width='0%';
    ind.style.background='linear-gradient(90deg, var(--accent), var(--accent2))';
    bar.appendChild(ind); bar._indicator = ind;
  }
  bar._indicator.style.width = `${Math.round(progress*100)}%`;
});
document.getElementById('metro-start').addEventListener('click', () => {
  const bpm = Number(document.getElementById('metro-bpm').value);
  const sig = Number(document.getElementById('metro-signature').value);
  metro.start(bpm, sig);
});
document.getElementById('metro-stop').addEventListener('click', () => metro.stop());
document.getElementById('metro-tap').addEventListener('click', () => metro.tap());

// AFINADOR
const tunerNeedle = document.getElementById('tuner-needle');
Tuner.onUpdate(({ note, freq, cents }) => {
  document.getElementById('tuner-note').textContent = note ?? '—';
  document.getElementById('tuner-freq').textContent = freq ? freq.toFixed(1) : '—';
  document.getElementById('tuner-cents').textContent = cents!=null ? Math.round(cents) : '—';
  const deg = Math.max(-45, Math.min(45, (cents||0))); // aprox 1 cent -> 1 grado
  tunerNeedle.style.setProperty('--deg', deg);
  tunerNeedle.style.setProperty('--dummy', 1);
  tunerNeedle.style.setProperty('position','relative');
  // Fallback para la aguja
  tunerNeedle.style.setProperty('--rotation', `${deg}deg`);
  tunerNeedle.style.setProperty('--transition', 'transform 0.08s ease-out');
  tunerNeedle.style.setProperty('--color', '#fff');
  tunerNeedle.style.setProperty('--height','140px');
  // Ajuste real
  const after = tunerNeedle;
  after.style.setProperty('--x', deg);
  after.style.setProperty('--dummy2', 1);
  tunerNeedle.style.transform = `rotate(${deg}deg)`;
  // Captura durante diagnóstico de afinación
  if (_diagPitchActive) { _diagPitchSamples.push(cents); }
});

// BANDA/KARAOKE
const band = new Band(() => state.audioCtx ?? (state.audioCtx = new (window.AudioContext||window.webkitAudioContext)()), crowd);
const songs = new Songs();
document.getElementById('band-start').addEventListener('click', () => {
  const bpm = Number(document.getElementById('band-bpm').value);
  const chords = document.getElementById('band-chords').value.trim();
  const lyrics = document.getElementById('band-lyrics').value.trim().split(/\n+/);
  band.start({ bpm, chords, lyrics });
});
// Profe proactivo: sugerir cuando cambian los acordes
const bandChordsEl = document.getElementById('band-chords');
function refreshTeacherSuggestion() {
  const str = bandChordsEl.value.trim();
  if (!str) return;
  const suggestion = teacher.proactiveSuggest(str, achievements);
  const card = document.getElementById('band-teacher');
  if (suggestion) {
    card.textContent = `Consejo del profe: ${suggestion.explanation}`;
  } else {
    card.textContent = 'Consejo del profe: —';
  }
}
bandChordsEl.addEventListener('input', refreshTeacherSuggestion);
achievements.onChange(() => refreshTeacherSuggestion());
refreshTeacherSuggestion();
document.getElementById('band-stop').addEventListener('click', () => band.stop());
document.getElementById('band-simplify').addEventListener('click', () => {
  const chordsStr = document.getElementById('band-chords').value.trim();
  const { chords, explanation, capo } = teacher.simplify(chordsStr);
  document.getElementById('band-chords').value = chords;
  const card = document.getElementById('band-teacher');
  card.textContent = `Consejo del profe: ${explanation}`;
  if (state.autoBpmRange) {
    const stats = achievements.getStats();
    const range = advisor._targetBpmRange(stats.rank.id);
    const center = Math.round((range.min + range.max)/2);
    document.getElementById('band-bpm').value = center;
  }
});
document.getElementById('band-apply-suggestion').addEventListener('click', () => {
  const chordsStr = document.getElementById('band-chords').value.trim();
  let suggestion = teacher.proactiveSuggest(chordsStr, achievements);
  if (!suggestion) suggestion = teacher.simplify(chordsStr);
  document.getElementById('band-chords').value = suggestion.chords;
  const card = document.getElementById('band-teacher');
  card.textContent = `Consejo del profe: ${suggestion.explanation}`;
  if (state.autoBpmRange) {
    const stats = achievements.getStats();
    const range = advisor._targetBpmRange(stats.rank.id);
    const center = Math.round((range.min + range.max)/2);
    document.getElementById('band-bpm').value = center;
  }
});

// EJERCICIOS DEDOS
const exercises = new Exercises(() => state.audioCtx ?? (state.audioCtx = new (window.AudioContext||window.webkitAudioContext)()), crowd, achievements);
document.getElementById('ex-start').addEventListener('click', () => {
  exercises.start({ bpm: Number(document.getElementById('ex-bpm').value), minutes: Number(document.getElementById('ex-duration').value) });
});
document.getElementById('ex-stop').addEventListener('click', () => exercises.stop());

// ACORDES
const chordsPractice = new ChordsPractice(() => state.audioCtx ?? (state.audioCtx = new (window.AudioContext||window.webkitAudioContext)()), crowd, achievements);
document.getElementById('chords-start').addEventListener('click', () => {
  const from = document.getElementById('chord-from').value.trim();
  const to = document.getElementById('chord-to').value.trim();
  const bpm = Number(document.getElementById('chords-bpm').value);
  chordsPractice.start({ from, to, bpm });
});
document.getElementById('chords-stop').addEventListener('click', () => chordsPractice.stop());

// Diagnóstico: cambio de acordes (30s)
document.getElementById('diag-chords-start')?.addEventListener('click', async () => {
  const analyser = await _diagGetAnalyser(); const endAt = Date.now()+30000; let lastTs=null; const deltas=[]; const card = document.getElementById('diag-chords-res');
  const poll = setInterval(() => {
    const e = _diagEnergy(analyser);
    if (e > state.rhythmThreshold) { const now=Date.now(); if (lastTs!=null) deltas.push(now-lastTs); lastTs=now; }
    if (Date.now()>=endAt) { clearInterval(poll);
      const avg = deltas.length? deltas.reduce((a,b)=>a+b,0)/deltas.length : null;
      state.profile.chordChangeMs = avg; card.textContent = avg!=null? `Tiempo medio entre rasgueos: ${Math.round(avg)} ms` : 'Cambio de acordes: —';
      renderSessionPlan();
    }
  }, 60);
});

// VERSUS
let versusActive = false;
let versusRound = 0;
let versusScores = { p1:0, p2:0 };
let versusTimer = null;
let versusCurrentPlayer = 'p1';
const versusScoreEl = document.getElementById('versus-score');
const versusStatusEl = document.getElementById('versus-status');
const versusWinnerEl = document.getElementById('versus-winner');

function updateVersusUI() {
  versusScoreEl.textContent = `P1: ${versusScores.p1} | P2: ${versusScores.p2}`;
  versusStatusEl.textContent = versusActive ? `Ronda ${versusRound} · Turno: ${versusCurrentPlayer.toUpperCase()}` : 'Listo para competir';
}
function nextVersusTurn(totalRounds, secondsPerRound) {
  if (!versusActive) return;
  if (versusRound > totalRounds) { endVersus(); return; }
  updateVersusUI();
  clearTimeout(versusTimer);
  versusTimer = setTimeout(() => {
    // cambiar de jugador
    if (versusCurrentPlayer === 'p1') {
      versusCurrentPlayer = 'p2';
    } else {
      versusCurrentPlayer = 'p1';
      versusRound += 1; // tras ambos turnos, siguiente ronda
    }
    nextVersusTurn(totalRounds, secondsPerRound);
  }, secondsPerRound*1000);
}
function endVersus() {
  versusActive = false;
  clearTimeout(versusTimer);
  updateVersusUI();
  if (versusScores.p1 === versusScores.p2) {
    versusWinnerEl.className = 'card warn';
    versusWinnerEl.textContent = 'Empate';
  } else if (versusScores.p1 > versusScores.p2) {
    versusWinnerEl.className = 'card success';
    versusWinnerEl.textContent = 'Ganador: P1';
  } else {
    versusWinnerEl.className = 'card success';
    versusWinnerEl.textContent = 'Ganador: P2';
  }
}
document.getElementById('versus-start').addEventListener('click', () => {
  versusActive = true; versusRound = 1; versusScores = { p1:0, p2:0 }; versusCurrentPlayer = 'p1';
  const totalRounds = Number(document.getElementById('versus-rounds').value);
  const secondsPerRound = Number(document.getElementById('versus-seconds').value);
  versusWinnerEl.textContent = '';
  nextVersusTurn(totalRounds, secondsPerRound);
});
document.getElementById('versus-stop').addEventListener('click', () => { endVersus(); });
document.getElementById('versus-enable-boo').addEventListener('change', (e) => { crowd.enabled = e.target.checked; });

// Integración de eventos del público con jugador activo
crowd.onEvent = (type) => {
  if (!versusActive) return;
  const player = versusCurrentPlayer;
  if (type === 'cheer') versusScores[player] += 1;
  if (type === 'boo') versusScores[player] -= 1;
  updateVersusUI();
};

// Export opcional en window para debug
window.GuitarMaster = { state, metro, band, exercises, chordsPractice, crowd, achievements, progression };

// PROGRESO: render inicial y penalización diaria
function renderProgress() {
  const s = achievements.getStats();
  document.getElementById('rank-name').textContent = s.rank.name;
  document.getElementById('rank-points').textContent = s.points;
  document.getElementById('rank-streak').textContent = s.streakDays;
  document.getElementById('rank-last').textContent = s.lastPracticeDate ? new Date(s.lastPracticeDate).toLocaleDateString() : '—';
  const todayTasks = progression.getTodayPlan(s.rank.id);
  const ul = document.getElementById('daily-list');
  ul.innerHTML = '';
  todayTasks.forEach(task => {
    const li = document.createElement('li');
    const title = document.createElement('div'); title.textContent = task.title;
    const meta = document.createElement('div'); meta.className='meta'; meta.textContent = `${task.minutes} min · ${task.details}`;
    const btn = document.createElement('button'); btn.textContent = 'Completar';
    const done = achievements.hasCompletedTaskToday(task);
    if (done) { btn.textContent = 'Hecho'; btn.disabled = true; }
    else {
      btn.addEventListener('click', () => {
        achievements.completeTask(task);
      });
    }
    li.appendChild(title); li.appendChild(meta); li.appendChild(btn);
    ul.appendChild(li);
  });
  // Aviso de bloqueo por racha
  const nextInfoId = 'rank-next-info';
  let nextInfo = document.getElementById(nextInfoId);
  if (!nextInfo) { nextInfo = document.createElement('div'); nextInfo.id = nextInfoId; nextInfo.className='card'; ul.parentElement.appendChild(nextInfo); }
  if (s.nextRank) {
    nextInfo.innerHTML = `<strong>Siguiente rango:</strong> ${s.nextRank.name} · Requiere racha de ${s.nextRank.reqStreak} días. ${s.blocked? 'Aún no cumplida.': '¡Requisito cumplido!'}`;
  } else {
    nextInfo.textContent = 'Has alcanzado el rango máximo o aún no hay siguiente rango por puntos.';
  }
}
achievements.onChange(() => renderProgress());
achievements.applyDailyPenalty();
renderProgress();

// LOGROS: renderizado en vista
function renderAchievements() {
  const ul = document.getElementById('achievements-list');
  if (!ul) return;
  ul.innerHTML = '';
  const data = achievements.data;
  data.badges.forEach(b => {
    const li = document.createElement('li');
    li.textContent = b.name;
    ul.appendChild(li);
  });
  if (data.badges.length === 0) {
    const li = document.createElement('li'); li.textContent = 'Sin logros aún. ¡Sigue practicando!'; ul.appendChild(li);
  }
}
achievements.onChange(() => renderAchievements());
renderAchievements();

// CANCIONES: cargar dataset y renderizar filtros+lista
(async function initSongs() {
  await songs.load();
  const artistSel = document.getElementById('songs-artist');
  const searchEl = document.getElementById('songs-search');
  const decadeSel = document.getElementById('songs-decade');
  const styleSel = document.getElementById('songs-style');
  const listEl = document.getElementById('songs-list');
  const importInput = document.getElementById('songs-import');
  const importBtn = document.getElementById('songs-import-btn');

  // Poblar artistas
  songs.getArtists().forEach(a => {
    const opt = document.createElement('option'); opt.value=a; opt.textContent=a; artistSel.appendChild(opt);
  });

  function renderList() {
    const results = songs.list({ search: searchEl.value, artist: artistSel.value, decade: decadeSel.value, style: styleSel.value });
    listEl.innerHTML = '';
    results.forEach(it => {
      const li = document.createElement('li');
      const title = document.createElement('div'); title.className='title'; title.textContent = `${it.title} — ${it.artist}`;
      const meta = document.createElement('div'); meta.className='meta'; meta.textContent = `${it.decade} · ${it.style} · ${it.key || ''} · ${it.bpm} BPM`;
      const btn = document.createElement('button'); btn.className='use-btn'; btn.textContent='Cargar en banda';
      btn.addEventListener('click', () => {
        // Rellenar la vista Banda con metadata de la canción
        document.getElementById('band-bpm').value = it.bpm;
        document.getElementById('band-chords').value = it.chords || '';
        const lines = Math.max(1, it.lines || 4);
        document.getElementById('band-lyrics').value = Array.from({length:lines}, (_,i)=>`Sección ${i+1}`).join('\n');
        location.hash = '#band';
        showView('band');
        refreshTeacherSuggestion();
      });
      li.appendChild(title); li.appendChild(meta); li.appendChild(btn);
      listEl.appendChild(li);
    });
  }
  [searchEl, artistSel, decadeSel, styleSel].forEach(el => el.addEventListener('input', renderList));
  importBtn.addEventListener('click', async () => {
    const file = importInput.files?.[0];
    if (!file) { alert('Selecciona un archivo JSON'); return; }
    try { await songs.importFromFile(file); renderList(); alert('Canciones importadas'); }
    catch (e) { alert('Error al importar: ' + e.message); }
  });
  renderList();
  renderAdvisorSuggestions();
})();

function renderAdvisorSuggestions() {
  const ul = document.getElementById('advisor-suggestions');
  if (!ul) return;
  const suggestions = advisor.recommendSongs(achievements, songs, 8);
  ul.innerHTML = '';
  suggestions.forEach(it => {
    const li = document.createElement('li');
    const title = document.createElement('div'); title.className='title'; title.textContent = `${it.title} — ${it.artist}`;
    const meta = document.createElement('div'); meta.className='meta'; meta.textContent = `${it.decade} · ${it.style} · ${it.key || ''} · ${it.bpm} BPM`;
    const btn = document.createElement('button'); btn.className='use-btn'; btn.textContent='Cargar en banda';
    btn.addEventListener('click', () => {
      document.getElementById('band-bpm').value = it.bpm;
      document.getElementById('band-chords').value = it.chords || '';
      const lines = Math.max(1, it.lines || 4);
      document.getElementById('band-lyrics').value = Array.from({length:lines}, (_,i)=>`Sección ${i+1}`).join('\n');
      location.hash = '#band'; showView('band'); refreshTeacherSuggestion();
    });
    li.appendChild(title); li.appendChild(meta); li.appendChild(btn);
    ul.appendChild(li);
  });
}
achievements.onChange(() => renderAdvisorSuggestions());

// Guardar perfil
document.getElementById('diag-save-profile')?.addEventListener('click', () => {
  localStorage.setItem('gm_profile', JSON.stringify(state.profile));
  const p = state.profile;
  const txt = `Perfil · Ritmo: ${((p.rhythmAccuracy||0)).toFixed(2)} · Afinación: ${p.pitchDeviation!=null? p.pitchDeviation.toFixed(1):'—'} cents · Cambio: ${p.chordChangeMs!=null? Math.round(p.chordChangeMs):'—'} ms`;
  const el = document.getElementById('diag-summary'); if (el) el.textContent = txt;
});

// Sesión diaria: plan sencillo basado en perfil
function renderSessionPlan() {
  const cont = document.getElementById('session-plan'); if (!cont) return;
  const p = state.profile||{}; const plan = [];
  plan.push({ id:'warmup', title:'Calentamiento', minutes:2, details:'Palmas + nota larga', action:'startWarmup' });
  if ((p.rhythmAccuracy||0) < 0.7) plan.push({ id:'rhythm', title:'Ritmo', minutes:3, details:'Downstrokes al beat', action:'startRhythmSeg' });
  if ((p.chordChangeMs||999) > 800) plan.push({ id:'chords', title:'Cambio de acordes', minutes:3, details:'C → G a 70 BPM', action:'startChordsSeg' });
  plan.push({ id:'song', title:'Fragmento de canción', minutes:2, details:'Progresión C G Am F · 65 BPM', action:'startSongSeg' });
  cont.innerHTML='';
  plan.forEach(item => {
    const row = document.createElement('div'); row.className='list-item card';
    const title = document.createElement('div'); title.innerHTML = `<strong>${item.title}</strong> · ${item.minutes} min · ${item.details}`;
    const btn = document.createElement('button'); btn.textContent='Iniciar'; btn.addEventListener('click', () => segmentActions[item.action]());
    row.appendChild(title); row.appendChild(btn); cont.appendChild(row);
  });
}
const segmentActions = {
  startWarmup(){ exercises.start({ bpm: 60, minutes: 2 }); },
  startRhythmSeg(){ exercises.start({ bpm: 70, minutes: 3 }); },
  startChordsSeg(){ document.getElementById('chord-from').value='C'; document.getElementById('chord-to').value='G'; document.getElementById('chords-bpm').value=70; chordsPractice.start({ from:'C', to:'G', bpm:70 }); },
  startSongSeg(){ document.getElementById('band-bpm').value=65; document.getElementById('band-chords').value='C G Am F'; document.getElementById('band-lyrics').value='Fragmento 1\nFragmento 2\nFragmento 3\nFragmento 4'; band.start({ bpm:65, chords:'C G Am F', lyrics:['Fragmento 1','Fragmento 2','Fragmento 3','Fragmento 4'] }); }
};
renderSessionPlan();

// Runner de sesión completa
document.getElementById('session-run')?.addEventListener('click', () => { runSession(); });
function _getSessionPlan() {
  const p = state.profile||{}; const plan = [];
  plan.push({ id:'warmup', title:'Calentamiento', minutes:2, action:'startWarmup', stop:'exercises' });
  if ((p.rhythmAccuracy||0) < 0.7) plan.push({ id:'rhythm', title:'Ritmo', minutes:3, action:'startRhythmSeg', stop:'exercises' });
  if ((p.chordChangeMs||999) > 800) plan.push({ id:'chords', title:'Cambio de acordes', minutes:3, action:'startChordsSeg', stop:'chords' });
  plan.push({ id:'song', title:'Fragmento de canción', minutes:2, action:'startSongSeg', stop:'band' });
  return plan;
}
function runSession() {
  const btn = document.getElementById('session-run'); const status = document.getElementById('session-status');
  if (!btn || !status) return; btn.disabled=true; status.textContent='Estado: preparando…';
  const plan = _getSessionPlan(); let idx=0; let countdownInt=null; let stopTimer=null;
  const stopMap = { exercises: () => exercises.stop(), chords: () => chordsPractice.stop(), band: () => band.stop() };
  const next = () => {
    if (idx >= plan.length) { status.textContent='Estado: sesión completa'; btn.disabled=false; return; }
    const seg = plan[idx++]; const totalMs = seg.minutes*60*1000; let remain=totalMs;
    status.textContent = `Estado: ${seg.title} · ${(remain/1000)|0}s`;
    segmentActions[seg.action](); clearInterval(countdownInt); clearTimeout(stopTimer);
    countdownInt = setInterval(() => { remain -= 1000; status.textContent = `Estado: ${seg.title} · ${(remain/1000)|0}s`; }, 1000);
    stopTimer = setTimeout(() => { clearInterval(countdownInt); stopMap[seg.stop]?.(); next(); }, totalMs);
  };
  next();
}
