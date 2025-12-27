export class Songs {
  constructor() {
    this.items = [];
    this.loaded = false;
  }
  async load() {
    if (this.loaded) return;
    try {
      const res = await fetch('assets/songs.json');
      if (!res.ok) throw new Error('No se pudo cargar songs.json');
      this.items = await res.json();
      this.loaded = true;
    } catch (e) {
      // Dataset mínimo por defecto
      this.items = [
        { title:'Wonderwall', artist:'Oasis', decade:'1990s', style:'Rock', bpm:87, key:'F#m', chords:'Em G D A', lines:4 },
        { title:'Knockin’ on Heaven’s Door', artist:'Bob Dylan', decade:'1970s', style:'Folk', bpm:68, key:'G', chords:'G D Am G', lines:4 },
        { title:'Stand By Me', artist:'Ben E. King', decade:'1960s', style:'Pop', bpm:120, key:'A', chords:'A F#m D E', lines:4 },
        { title:'Hotel California', artist:'Eagles', decade:'1970s', style:'Rock', bpm:75, key:'Bm', chords:'Bm F# A E G D Em F#', lines:8 },
        { title:'Back In Black', artist:'AC/DC', decade:'1980s', style:'Rock', bpm:94, key:'E', chords:'E D A', lines:4 },
        { title:'Sweet Child O’ Mine', artist:'Guns N’ Roses', decade:'1980s', style:'Rock', bpm:125, key:'D', chords:'D C G', lines:4 },
        { title:'Imagine', artist:'John Lennon', decade:'1970s', style:'Pop', bpm:76, key:'C', chords:'C F Am Dm G', lines:4 },
        { title:'Blue Bossa', artist:'Kenny Dorham', decade:'1960s', style:'Jazz', bpm:140, key:'Cm', chords:'Cm Fm Dm7b5 G7 Cm', lines:4 },
        { title:'Autumn Leaves', artist:'Joseph Kosma', decade:'1940s', style:'Jazz', bpm:120, key:'Em', chords:'Em7 A7 Dmaj7 Gmaj7 C#m7 F#7 Bm', lines:8 },
        { title:'Nothing Else Matters', artist:'Metallica', decade:'1990s', style:'Metal', bpm:46, key:'E', chords:'Em D C G B7', lines:4 },
        { title:'Hallelujah', artist:'Leonard Cohen', decade:'1980s', style:'Folk', bpm:56, key:'C', chords:'C Am C Am F G', lines:6 },
        { title:'Wish You Were Here', artist:'Pink Floyd', decade:'1970s', style:'Rock', bpm:60, key:'G', chords:'G C D Em', lines:4 },
      ];
      this.loaded = true;
    }
    // merge con user dataset
    try {
      const user = JSON.parse(localStorage.getItem('gm_songs_user')||'[]');
      if (Array.isArray(user)) this.items = [...this.items, ...user];
    } catch {}
  }
  list({ search='', artist='', decade='', style='' }={}) {
    const s = search.trim().toLowerCase();
    return this.items.filter(it =>
      (!artist || it.artist === artist) &&
      (!decade || it.decade === decade) &&
      (!style || it.style === style) &&
      (!s || it.title.toLowerCase().includes(s) || it.artist.toLowerCase().includes(s))
    );
  }
  getArtists() { return Array.from(new Set(this.items.map(i=>i.artist))).sort(); }

  async importFromFile(file) {
    const text = await file.text();
    const arr = JSON.parse(text);
    if (!Array.isArray(arr)) throw new Error('El JSON debe ser un array');
    const current = JSON.parse(localStorage.getItem('gm_songs_user')||'[]');
    const merged = [...current, ...arr];
    localStorage.setItem('gm_songs_user', JSON.stringify(merged));
    // actualizar items en memoria
    this.items = [...this.items, ...arr];
  }
}
