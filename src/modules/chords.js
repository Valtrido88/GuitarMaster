export class ChordsPractice {
  constructor(getAudioCtx, crowd, achievements) {
    this.getAudioCtx = getAudioCtx; this.crowd = crowd; this.achievements = achievements;
    this.running=false; this._timer=null; this._beatTimer=null; this._bpm=80;
    this._from='C'; this._to='G'; this._hits=0; this._misses=0; this._minutes=3;
  }
  async start({ from, to, bpm }) {
    this._from=from; this._to=to; this._bpm=bpm; this.running=true; this._hits=0; this._misses=0;
    const statusEl = document.getElementById('chords-status');
    statusEl.textContent = `Cambia ${from} → ${to} a ${bpm} BPM`;
    const analyser = await this._getMicAnalyser();
    const interval = (60/this._bpm)*1000;
    const checkBeat = async () => {
      const energy = await this._measureEnergy(analyser);
      const isStrum = energy > 0.08;
      if (isStrum) { this._hits++; this.crowd.cheer(); } else { this._misses++; if (Math.random()<0.3) this.crowd.boo(); }
      statusEl.textContent = `Golpes: ${this._hits} | Fallos: ${this._misses}`;
    };
    this._beatTimer = setInterval(checkBeat, interval);
  }
  stop() {
    if (!this.running) return; this.running=false;
    clearInterval(this._beatTimer); clearTimeout(this._timer);
    const statusEl = document.getElementById('chords-status');
    statusEl.textContent = `Fin. Golpes: ${this._hits} | Fallos: ${this._misses}`;
    const score = Math.max(0, this._hits - this._misses);
    // Registrar detalles de acordes practicados para análisis del profe
    this.achievements.addSession({ type:'chords', minutes: this._minutes, bpm: this._bpm, score, chords: [this._from, this._to] });
  }
  async _getMicAnalyser() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation:true, noiseSuppression:true }, video:false });
    const ctx = this.getAudioCtx(); const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser(); analyser.fftSize = 1024; src.connect(analyser); return analyser;
  }
  async _measureEnergy(analyser) {
    const buf = new Uint8Array(analyser.fftSize); analyser.getByteTimeDomainData(buf);
    let sum = 0; for (let i=0;i<buf.length;i++) { const v=(buf[i]-128)/128; sum += v*v; }
    return Math.sqrt(sum/buf.length);
  }
}
