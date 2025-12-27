const NOTE_FREQ = {
  'C': 130.81, 'C#':138.59, 'Db':138.59, 'D':146.83, 'D#':155.56, 'Eb':155.56,
  'E':164.81, 'F':174.61, 'F#':185.00, 'Gb':185.00, 'G':196.00, 'G#':207.65, 'Ab':207.65,
  'A':220.00, 'A#':233.08, 'Bb':233.08, 'B':246.94
};
function parseChords(str) {
  return str.split(/\s+/).map(tok => tok.trim()).filter(Boolean);
}

export class Band {
  constructor(getAudioCtx, crowd) {
    this.getAudioCtx = getAudioCtx;
    this.crowd = crowd;
    this.running = false;
    this._timer = null;
    this._beat = 0;
    this._bpm = 90;
    this._lyrics = [];
    this._chords = [];
  }
  start({ bpm, chords, lyrics }) {
    const ctx = this.getAudioCtx();
    this._bpm = bpm; this._lyrics = lyrics || []; this._chords = parseChords(chords||'C G Am F');
    this.running = true; this._beat = 0;
    const interval = (60/this._bpm)*1000;
    this._renderLyrics();
    this._timer = setInterval(() => {
      this._schedulePerc(ctx);
      this._scheduleBass(ctx);
      this._advanceLyrics();
    }, interval);
  }
  stop() { this.running=false; if (this._timer) clearInterval(this._timer); this._timer=null; }
  _schedulePerc(ctx) {
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.type='triangle'; osc.frequency.value = (this._beat%4===0)? 900: 650;
    gain.gain.value = (this._beat%4===0)? 0.12:0.08;
    const t = ctx.currentTime + 0.01;
    osc.connect(gain).connect(ctx.destination);
    osc.start(t); osc.stop(t+0.02);
    this._beat++;
  }
  _scheduleBass(ctx) {
    const chordIndex = Math.floor((this._beat% (this._chords.length*4))/4);
    const chord = this._chords[chordIndex] || 'C';
    const root = NOTE_FREQ[chord.replace(/m|maj7|7|sus2|sus4|add9/,'')] || 130.81;
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.type='sawtooth'; osc.frequency.value = root/2; // bajo
    gain.gain.value = 0.06;
    const t = ctx.currentTime + 0.01; osc.connect(gain).connect(ctx.destination);
    osc.start(t); osc.stop(t+0.12);
  }
  _renderLyrics() {
    const container = document.getElementById('lyrics-view');
    container.innerHTML = '';
    this._lyrics.forEach((line, idx) => {
      const div = document.createElement('div'); div.className='lyrics-line'; div.textContent=line; div.dataset.idx=String(idx);
      container.appendChild(div);
    });
    if (container.firstChild) container.firstChild.classList.add('active');
  }
  _advanceLyrics() {
    // Avanza una línea cada 4 golpes
    if (this._beat%4===0) {
      const container = document.getElementById('lyrics-view');
      const active = container.querySelector('.lyrics-line.active');
      if (active) active.classList.remove('active');
      const nextIdx = ((Number(active?.dataset.idx)||0)+1) % Math.max(1, this._lyrics.length);
      const next = container.querySelector(`.lyrics-line[data-idx="${nextIdx}"]`);
      if (next) next.classList.add('active');
    }
  }
}
