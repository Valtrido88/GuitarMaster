export class Metronome {
  constructor(getAudioCtx, onProgress) {
    this.getAudioCtx = getAudioCtx;
    this.onProgress = onProgress;
    this.isRunning = false;
    this._nextNoteTime = 0;
    this._currentBeat = 0;
    this._signature = 4;
    this._bpm = 100;
    this._schedulerId = null;
    this._tapTimes = [];
  }
  start(bpm=100, signature=4) {
    const ctx = this.getAudioCtx();
    this._bpm = bpm; this._signature = signature; this.isRunning = true;
    this._currentBeat = 0;
    this._nextNoteTime = ctx.currentTime + 0.05;
    const scheduleAheadTime = 0.1;
    const tick = () => {
      const now = ctx.currentTime;
      while (this._nextNoteTime < now + scheduleAheadTime) {
        this._scheduleClick(ctx, this._nextNoteTime, this._currentBeat % this._signature === 0);
        const secondsPerBeat = 60.0 / this._bpm;
        this._nextNoteTime += secondsPerBeat;
        this._currentBeat++;
      }
      const progress = ((now % (60/this._bpm)) / (60/this._bpm));
      this.onProgress?.(progress);
      this._schedulerId = setTimeout(tick, 25);
    };
    tick();
  }
  stop() { this.isRunning=false; if (this._schedulerId) clearTimeout(this._schedulerId); this._schedulerId=null; }
  tap() {
    const now = performance.now();
    this._tapTimes.push(now);
    if (this._tapTimes.length > 6) this._tapTimes.shift();
    if (this._tapTimes.length >= 2) {
      const intervals = [];
      for (let i=1;i<this._tapTimes.length;i++) intervals.push(this._tapTimes[i]-this._tapTimes[i-1]);
      const avg = intervals.reduce((a,b)=>a+b,0)/intervals.length;
      const bpm = Math.max(30, Math.min(300, 60000/avg));
      this._bpm = bpm;
      const bpmInput = document.getElementById('metro-bpm');
      if (bpmInput) bpmInput.value = Math.round(bpm);
    }
  }
  _scheduleClick(ctx, time, accent=false) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = accent ? 1000 : 800;
    gain.gain.value = accent ? 0.15 : 0.1;
    osc.connect(gain).connect(ctx.destination);
    osc.start(time);
    osc.stop(time + 0.03);
  }
}
