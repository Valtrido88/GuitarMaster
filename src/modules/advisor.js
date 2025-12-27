export class Advisor {
  constructor({ achievements }) { this.achievements = achievements; this._idx = 0; }
  nextTip() {
    const data = this.achievements.data;
    const totalMinutes = data.sessions.reduce((a,s)=>a+(s.minutes||0),0);
    const tips = [
      'Empieza con el metrónomo a 60–80 BPM.',
      'Haz 10 minutos de 1-2-3-4 en cada cuerda.',
      'Practica cambios C → G → Am → F en 4/4.',
      'Afina antes de cada sesión para mejorar consistencia.',
      'Divide la canción en secciones y sube el BPM gradualmente.',
      'Usa el karaoke para ajustar el ritmo con la letra.',
      'Si fallas el pulso, baja 10 BPM y vuelve a subir.',
      'Registra tus sesiones para desbloquear logros por racha.',
    ];
    if (totalMinutes < 30) tips.unshift('Sé constante: 5–10 min diarios valen más que 1 hora ocasional.');
    const tip = tips[this._idx % tips.length]; this._idx++;
    return tip;
  }
  recommendSongs(achievements, songs, limit=10) {
    if (!songs.items || songs.items.length===0) return [];
    const stats = achievements.getStats();
    const diffMap = achievements.getChordDifficultyMap?.() || new Map();
    const target = this._targetBpmRange(stats.rank.id);
    const scoreSong = (s) => {
      const bpmScore = -Math.abs((s.bpm||90) - ((target.min+target.max)/2));
      const chordTokens = (s.chords||'').split(/\s+/).filter(Boolean);
      let diffPenalty = 0;
      for (const t of chordTokens) {
        const val = diffMap.get(t) || diffMap.get(t.replace(/m|maj7|7|sus2|sus4|add9/g,'')) || 0;
        if (val < 0) diffPenalty += Math.abs(val);
      }
      const styleBonus = 0; // futuro: preferir estilos practicados
      return bpmScore - diffPenalty + styleBonus;
    };
    const ranked = songs.items
      .filter(s => (s.bpm||80) >= target.min-20 && (s.bpm||80) <= target.max+20)
      .map(s => ({ s, score: scoreSong(s) }))
      .sort((a,b)=>b.score-a.score)
      .slice(0, limit)
      .map(x=>x.s);
    return ranked;
  }
  _targetBpmRange(rankId) {
    const map = {
      novato: { min: 60, max: 90 },
      aprendiz: { min: 70, max: 100 },
      intermedio: { min: 80, max: 110 },
      avanzado: { min: 90, max: 120 },
      experto: { min: 100, max: 130 },
      maestro: { min: 105, max: 140 },
      leyenda: { min: 110, max: 160 },
    };
    return map[rankId] || { min: 80, max: 120 };
  }
}
