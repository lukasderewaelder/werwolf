// Verfügbare Audio-Dateien (alle CC0, Quellen in docs/QUELLEN.md). Wird die Datei weggelassen, spielt audio.js einen
// synthetischen Ersatz. Die Pegelwerte (gain) gleichen die Lautstärke der Stücke an (gemessen mit tools/prepare-audio.mjs).
export const AUDIO = {
  howl: 'assets/audio/wolf.mp3',
  rooster: 'assets/audio/hahn.mp3',
  gong: 'assets/audio/gong.mp3',
  bell: 'assets/audio/glocke.mp3',
  death: 'assets/audio/tod.mp3',
  win: 'assets/audio/sieg.mp3',
};

// Musik: Stücke laufen nacheinander und werden überblendet.
export const MUSIC = {
  night: [{ src: 'assets/audio/nacht-1.mp3', gain: 0.52 }, { src: 'assets/audio/nacht-2.mp3', gain: 0.85 }],
  day: [{ src: 'assets/audio/tag-1.mp3', gain: 0.86 }, { src: 'assets/audio/tag-2.mp3', gain: 0.51 }],
};
