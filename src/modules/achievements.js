const RANKS = [
  { id: 'novato', name: 'Novato', min: 0, reqStreak: 0 },
  { id: 'aprendiz', name: 'Aprendiz', min: 10, reqStreak: 0 },
  { id: 'intermedio', name: 'Intermedio', min: 25, reqStreak: 3 },
  { id: 'avanzado', name: 'Avanzado', min: 45, reqStreak: 5 },
  { id: 'experto', name: 'Experto', min: 70, reqStreak: 7 },
  { id: 'maestro', name: 'Maestro', min: 95, reqStreak: 7 },
  { id: 'leyenda', name: 'Leyenda', min: 120, reqStreak: 30 },
];
function rankFromPoints(points) {
  let current = RANKS[0];
  for (const r of RANKS) { if (points >= r.min) current = r; }
  return current;
}

export class Achievements {
  constructor() {
    this.key = 'gm_achievements_v3';
    this.data = this._load() || { sessions: [], badges: [], points: 0, lastPracticeDate: null, streakDays: 0, currentRankId: 'novato', dailyDone: {} };
    this.listeners = [];
  }
  _load() { try { return JSON.parse(localStorage.getItem(this.key)); } catch { return null; } }
  _save() { localStorage.setItem(this.key, JSON.stringify(this.data)); this._emit(); }
  _emit() { this.listeners.forEach(l=>l(this.data)); }
  onChange(cb) { this.listeners.push(cb); }

  applyDailyPenalty() {
    const today = new Date(); today.setHours(0,0,0,0);
    if (!this.data.lastPracticeDate) return; // primera vez, nada
    const last = new Date(this.data.lastPracticeDate); last.setHours(0,0,0,0);
    const diffDays = Math.floor((today - last)/(1000*60*60*24));
    if (diffDays <= 0) return;
    // Penalización: por cada día sin entrenar, −1 punto
    this.data.points = Math.max(0, this.data.points - diffDays);
    // romper racha
    this.data.streakDays = 0;
    this._tryPromote();
    this._save();
  }

  addSession({ type, minutes, bpm, score, chords }) {
    const when = new Date().toISOString();
    this.data.sessions.push({ when, type, minutes, bpm, score, chords });
    // puntos base por sesión
    const base = Math.max(1, Math.floor((minutes||0)/5));
    const speed = Math.max(0, Math.floor((bpm||60)/60));
    const perf = Math.max(0, Math.floor((score||0)/10));
    const gain = base + speed + perf;
    this.data.points += gain;
    // actualizar fecha y racha
    const today = new Date(); today.setHours(0,0,0,0);
    const last = this.data.lastPracticeDate ? new Date(this.data.lastPracticeDate) : null;
    if (last) {
      last.setHours(0,0,0,0);
      const diffDays = Math.floor((today - last)/(1000*60*60*24));
      if (diffDays === 1) this.data.streakDays += 1;
      else if (diffDays === 0) this.data.streakDays = Math.max(this.data.streakDays, 1);
      else this.data.streakDays = 1; // se reanuda racha
    } else {
      this.data.streakDays = 1;
    }
    this.data.lastPracticeDate = today.toISOString();
    this._evaluateBadges();
    this._tryPromote();
    this._save();
  }

  getChordDifficultyMap() {
    const map = new Map();
    for (const s of this.data.sessions) {
      if (s.type !== 'chords' || !Array.isArray(s.chords)) continue;
      const weight = Math.max(-10, Math.min(10, (s.score||0) - Math.max(0, (s.bpm||0)-80)/20));
      for (const c of s.chords) {
        const key = String(c).trim();
        map.set(key, (map.get(key)||0) + weight);
      }
    }
    return map; // valores negativos sugieren dificultad
  }

  _tryPromote() {
    const points = this.data.points || 0;
    const currentIdx = RANKS.findIndex(r=>r.id===this.data.currentRankId);
    let nextIdx = currentIdx;
    // comprobar si puntos dan para avanzar
    for (let i=currentIdx+1; i<RANKS.length; i++) {
      if (points >= RANKS[i].min) nextIdx = i; else break;
    }
    if (nextIdx > currentIdx) {
      const candidate = RANKS[nextIdx];
      const meetsStreak = (this.data.streakDays || 0) >= (candidate.reqStreak || 0);
      if (meetsStreak) {
        this.data.currentRankId = candidate.id;
      }
      // si no cumple racha, se mantiene en el rango actual
    }
  }

  completeTask(task) {
    const todayKey = new Date().toISOString().substring(0,10);
    const id = this._taskId(task);
    this.data.dailyDone[todayKey] = this.data.dailyDone[todayKey] || [];
    if (this.data.dailyDone[todayKey].includes(id)) return; // ya hecho hoy
    this.data.dailyDone[todayKey].push(id);
    this.addSession({ type: task.type, minutes: task.minutes, bpm: task.bpm, score: task.score ?? 10 });
    this._save();
  }

  hasCompletedTaskToday(task) {
    const todayKey = new Date().toISOString().substring(0,10);
    const id = this._taskId(task);
    return (this.data.dailyDone[todayKey]||[]).includes(id);
  }

  _taskId(task) { return `${task.type}:${task.title}`; }

  getStats() {
    const points = this.data.points || 0;
    const current = RANKS.find(r=>r.id===this.data.currentRankId) || RANKS[0];
    // próximo rango potencial por puntos
    const next = RANKS.find(r=>r.min > current.min && points >= r.min) || RANKS.find(r=>r.min > current.min) || null;
    const blocked = next ? (this.data.streakDays || 0) < (next.reqStreak || 0) : false;
    return { points, rank: current, lastPracticeDate: this.data.lastPracticeDate, streakDays: this.data.streakDays, nextRank: next, blocked };
  }

  _evaluateBadges() {
    const totalMinutes = this.data.sessions.reduce((a,s)=>a+(s.minutes||0),0);
    const days = new Set(this.data.sessions.map(s=>s.when.substring(0,10))).size;
    const maxBpm = Math.max(0, ...this.data.sessions.map(s=>s.bpm||0));
    const pushUnique = (id, name) => { if (!this.data.badges.find(b=>b.id===id)) this.data.badges.push({ id, name }); };
    if (totalMinutes >= 60) pushUnique('hour', '¡1 hora practicada!');
    if (days >= 7) pushUnique('streak7', 'Racha de 7 días');
    if (maxBpm >= 140) pushUnique('speed140', 'Metrónomo a 140 BPM');
    if (this.data.sessions.filter(s=>s.type==='chords').length >= 10) pushUnique('chords10', '10 sesiones de acordes');
  }
}
