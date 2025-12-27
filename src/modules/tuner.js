// Utilidad: detección de pitch por autocorrelación
function autoCorrelate(buf, sampleRate) {
  // Basado en autocorrelación simplificada
  const SIZE = buf.length;
  let rms = 0;
  for (let i=0;i<SIZE;i++) rms += buf[i]*buf[i];
  rms = Math.sqrt(rms/SIZE);
  if (rms < 0.01) return -1; // señal muy baja
  let bestOffset = -1;
  let bestCorrelation = 0;
  let lastCorrelation = 1;
  const maxSamples = Math.floor(SIZE/2);
  for (let offset=MIN_SAMPLES; offset<maxSamples; offset++) {
    let correlation = 0;
    for (let i=0;i<maxSamples;i++) correlation += Math.abs((buf[i]) - (buf[i+offset]));
    correlation = 1 - (correlation/maxSamples);
    if (correlation > 0.9 && correlation > lastCorrelation) { bestCorrelation = correlation; bestOffset = offset; }
    lastCorrelation = correlation;
  }
  if (bestCorrelation > 0.01) {
    const freq = sampleRate / bestOffset;
    return freq;
  }
  return -1;
}

const MIN_SAMPLES = 32;
const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
function noteFromFrequency(freq) {
  const n = Math.round(12 * (Math.log(freq/440)/Math.log(2))) + 69; // A4=440
  const name = NOTE_NAMES[n % 12];
  const octave = Math.floor(n/12) - 1;
  return { name, octave, midi: n };
}
function centsOff(freq, midi) {
  const target = 440 * Math.pow(2, (midi-69)/12);
  return 1200 * Math.log(freq/target)/Math.log(2);
}

export const Tuner = (() => {
  let analyser, buffer, callback;
  let audioCtx;
  function attachStream(stream) {
    audioCtx = audioCtx || new (window.AudioContext||window.webkitAudioContext)();
    const src = audioCtx.createMediaStreamSource(stream);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    src.connect(analyser);
    buffer = new Float32Array(analyser.fftSize);
    loop();
  }
  function onUpdate(cb) { callback = cb; }
  function loop() {
    if (!analyser) return;
    analyser.getFloatTimeDomainData(buffer);
    const freq = autoCorrelate(buffer, audioCtx.sampleRate);
    if (freq !== -1) {
      const { name, octave, midi } = noteFromFrequency(freq);
      const cents = centsOff(freq, midi);
      callback?.({ note: `${name}${octave}`, freq, cents });
    } else {
      callback?.({ note: null, freq: null, cents: null });
    }
    requestAnimationFrame(loop);
  }
  return { attachStream, onUpdate };
})();
