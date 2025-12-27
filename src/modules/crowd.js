export class Crowd {
  constructor(getAudioCtx) {
    this.getAudioCtx = getAudioCtx;
    this.enabled = true;
    this.onEvent = null; // 'cheer' | 'boo'
  }
  cheer() {
    if (!this.enabled) return;
    this._speech('¡Bien!');
    this.onEvent?.('cheer');
    this._noiseBurst(0.12);
  }
  boo() {
    if (!this.enabled) return;
    this._speech('¡Buuu!');
    this.onEvent?.('boo');
    this._noiseBurst(0.18, 200);
  }
  _speech(text) {
    try {
      const s = new SpeechSynthesisUtterance(text);
      s.lang = 'es-ES';
      window.speechSynthesis.speak(s);
    } catch {}
  }
  _noiseBurst(duration=0.15, lowFreq=120) {
    const ctx = this.getAudioCtx();
    const bufferSize = Math.floor(ctx.sampleRate*duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i=0;i<bufferSize;i++) data[i] = (Math.random()*2-1) * (1 - i/bufferSize);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    let filter = ctx.createBiquadFilter();
    filter.type = 'lowshelf'; filter.frequency.value = lowFreq; filter.gain.value = 8;
    const gain = ctx.createGain(); gain.gain.value = 0.2;
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start();
  }
}
