export class Exercises {
  constructor(getAudioCtx, crowd, achievements) {
    this.getAudioCtx = getAudioCtx;
    this.crowd = crowd; this.achievements = achievements;
    this.running = false; this._timer = null; this._beatTimer = null;
    this._bpm = 80; this._minutes = 5;
    this._hits = 0; this._misses = 0;
  }
  async start({ bpm, minutes }) {
    this._bpm = bpm; this._minutes = minutes; this.running = true; this._hits=0; this._misses=0;
    const ctx = this.getAudioCtx();
    const statusEl = document.getElementById('ex-status');
    statusEl.textContent = `Ejercicio en marcha: ${minutes} min a ${bpm} BPM`;
    // metrónomo suave integrado
    const interval = (60/this._bpm)*1000;
    let beatIndex = 0;
    const analyser = await this._getMicAnalyser();
    const energyWindowMs = 160;
    const checkBeat = async () => {
      // medir energía en ventana
      const energy = await this._measureEnergy(analyser, energyWindowMs);
      const isHit = energy > 0.08; // umbral simple
      if (isHit) { this._hits++; this.crowd.cheer(); } else { this._misses++; }
      statusEl.textContent = `Golpes: ${this._hits} | Fallos: ${this._misses}`;
      beatIndex = (beatIndex+1)%4;
    };
    this._beatTimer = setInterval(checkBeat, interval);
    this._timer = setTimeout(() => this.stop(), minutes*60*1000);
  }
  stop() {
    if (!this.running) return; this.running=false;
    clearInterval(this._beatTimer); clearTimeout(this._timer);
    const statusEl = document.getElementById('ex-status');
    statusEl.textContent = `Fin. Golpes: ${this._hits} | Fallos: ${this._misses}`;
    const score = Math.max(0, this._hits - this._misses);
    this.achievements.addSession({ type:'fingers', minutes: this._minutes, bpm: this._bpm, score });
  }
  async _getMicAnalyser() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression:true }, video:false });
    const ctx = this.getAudioCtx();
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser(); analyser.fftSize = 1024;
    src.connect(analyser);
    return analyser;
  }
  async _measureEnergy(analyser, windowMs) {
    const buf = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(buf);
    let sum = 0; for (let i=0;i<buf.length;i++) { const v=(buf[i]-128)/128; sum += v*v; }
    return Math.sqrt(sum/buf.length);
  }
}
