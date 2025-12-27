const SHARP_SCALE = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const FLAT_MAP = { 'Db':'C#', 'Eb':'D#', 'Gb':'F#', 'Ab':'G#', 'Bb':'A#' };
const HARD_ROOTS = new Set(['F','F#','Gb','G#','Ab','A#','Bb','C#','Db','D#','Eb','B','Bm','Cm','C#m','D#m','F#m','G#m','A#m']);
const EASY_ROOTS = new Set(['C','D','E','G','A','Am','Em','Dm']);

function normalizeRoot(root) { return FLAT_MAP[root] || root; }
function parseChordToken(tok) {
  // root: letter + optional #/b; suffix: rest
  const m = tok.match(/^([A-G](?:#|b)?)(.*)$/);
  if (!m) return { root:null, suffix:tok };
  return { root: normalizeRoot(m[1]), suffix: m[2] };
}
function transposeRoot(root, steps) {
  const r = normalizeRoot(root);
  const i = SHARP_SCALE.indexOf(r);
  if (i < 0) return root;
  let ni = (i + steps) % SHARP_SCALE.length; if (ni < 0) ni += SHARP_SCALE.length;
  return SHARP_SCALE[ni];
}
function difficultyScore(tokens) {
  let score = 0;
  tokens.forEach(t => {
    const { root } = parseChordToken(t);
    if (!root) return;
    const isMinor = /m(?!aj)/.test(t); // 'm' not part of 'maj'
    const base = isMinor ? root+'m' : root;
    if (HARD_ROOTS.has(base)) score += 2;
    else if (!EASY_ROOTS.has(base)) score += 1;
  });
  return score;
}
function tokensFromString(str) { return str.split(/\s+/).map(s=>s.trim()).filter(Boolean); }
function stringFromTokens(tokens) { return tokens.join(' '); }

function applySubstitutions(tokens) {
  const map = new Map([
    ['F', 'Fmaj7'], ['Fm','Fm7'], ['Bm','Bm7'], ['B','B7'],
  ]);
  return tokens.map(t => map.get(t) || t);
}

export class Teacher {
  simplify(chordStr) {
    const tokens = tokensFromString(chordStr);
    const baseScore = difficultyScore(tokens);
    // Try transpositions to reduce difficulty
    let best = { steps: 0, tokens, score: baseScore };
    for (let s=-6; s<=6; s++) {
      const trans = tokens.map(t => {
        const { root, suffix } = parseChordToken(t);
        if (!root) return t;
        const newRoot = transposeRoot(root, s);
        return newRoot + suffix;
      });
      const score = difficultyScore(trans);
      if (score < best.score) best = { steps: s, tokens: trans, score };
    }
    // If still not easy enough, apply soft substitutions
    let finalTokens = best.tokens;
    let finalScore = best.score;
    if (finalScore > Math.max(2, baseScore - 1)) {
      const sub = applySubstitutions(finalTokens);
      const subScore = difficultyScore(sub);
      if (subScore <= finalScore) { finalTokens = sub; finalScore = subScore; }
    }
    // Explanation
    let explanation = 'Acordes ya optimizados.';
    let capo = null;
    if (best.steps !== 0) {
      const dir = best.steps > 0 ? 'arriba' : 'abajo';
      const stepsAbs = Math.abs(best.steps);
      capo = stepsAbs;
      explanation = `Transpuesto ${stepsAbs} semitonos hacia ${dir}. Usa cejilla en traste ${capo} para conservar la tonalidad original.`;
    } else if (finalTokens !== tokens) {
      explanation = 'Se aplicaron sustituciones (maj7/m7/7) para suavizar cejillas.';
    }
    return { chords: stringFromTokens(finalTokens), explanation, capo };
  }
  proactiveSuggest(chordStr, achievements) {
    const tokens = tokensFromString(chordStr);
    const diffMap = achievements.getChordDifficultyMap?.();
    if (!diffMap) return null;
    const problemSet = new Set();
    for (const t of tokens) {
      const { root } = parseChordToken(t);
      if (!root) continue;
      const candidates = [t, root, root+'m'];
      if (candidates.some(k => (diffMap.get(k)||0) < 0)) problemSet.add(t);
    }
    if (problemSet.size === 0) return null;
    const simplified = this.simplify(chordStr);
    simplified.explanation = `He detectado acordes que te cuestan (${Array.from(problemSet).join(', ')}). ${simplified.explanation}`;
    return simplified;
  }
}
