export class Progression {
  constructor() {
    this.levels = {
      novato: [
        { type:'fingers', title:'1-2-3-4 a 60 BPM', minutes:5, bpm:60, details:'Todas las cuerdas', score:10 },
        { type:'metronome', title:'Metrónomo 5 min', minutes:5, bpm:60, details:'Pulso estable', score:8 },
        { type:'tuner', title:'Afina tu guitarra', minutes:3, bpm:0, details:'E2–E4', score:5 },
      ],
      aprendiz: [
        { type:'fingers', title:'1-2-3-4 a 80 BPM', minutes:7, bpm:80, details:'Variar posiciones', score:12 },
        { type:'chords', title:'Cambios C↔G a 70 BPM', minutes:6, bpm:70, details:'4/4', score:12 },
        { type:'band', title:'Karaoke 2 compases por línea', minutes:5, bpm:70, details:'C G Am F', score:10 },
      ],
      intermedio: [
        { type:'fingers', title:'Patrón 1-3-2-4 a 100 BPM', minutes:8, bpm:100, details:'Alternate picking', score:14 },
        { type:'chords', title:'Cambios C→G→Am→F a 90 BPM', minutes:8, bpm:90, details:'Resaltar 1er tiempo', score:14 },
        { type:'band', title:'Karaoke con síncopa ligera', minutes:6, bpm:85, details:'Letra 4 líneas', score:12 },
      ],
      avanzado: [
        { type:'fingers', title:'Chromáticos a 120 BPM', minutes:10, bpm:120, details:'2 cuerdas por patrón', score:16 },
        { type:'chords', title:'Cambios rápidos (2 por compás)', minutes:8, bpm:110, details:'C G Am F', score:16 },
        { type:'band', title:'Progresión II-V-I', minutes:8, bpm:100, details:'Dm G C', score:14 },
      ],
      experto: [
        { type:'fingers', title:'Secuencias 3 notas por cuerda 140 BPM', minutes:12, bpm:140, details:'Mayor', score:18 },
        { type:'chords', title:'Triadas inversión 1 y 2', minutes:10, bpm:120, details:'Metronome fuerte', score:18 },
        { type:'band', title:'Karaoke con subdivisión 8th', minutes:10, bpm:110, details:'Resaltar sílabas', score:16 },
      ],
      maestro: [
        { type:'fingers', title:'Alternado 160 BPM', minutes:12, bpm:160, details:'Economía de picking', score:20 },
        { type:'chords', title:'Progresiones extendidas (maj7, m7)', minutes:12, bpm:120, details:'4/4', score:20 },
        { type:'band', title:'Karaoke con acentos desplazados', minutes:12, bpm:115, details:'Letra desafiante', score:18 },
      ],
      leyenda: [
        { type:'fingers', title:'Resistencia 180 BPM', minutes:15, bpm:180, details:'3 notas por cuerda mixto', score:25 },
        { type:'chords', title:'Cambios complejos a contratiempo', minutes:15, bpm:130, details:'II-V-I varias tonalidades', score:25 },
        { type:'band', title:'Karaoke full canción', minutes:15, bpm:120, details:'Estructura completa', score:22 },
      ],
    };
  }
  getTodayPlan(rankId) {
    return this.levels[rankId] || this.levels.novato;
  }
}
