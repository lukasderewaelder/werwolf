// Kleine Brücke, damit audio.js den Zustand lesen kann, ohne die Oberfläche zu importieren.
let ref = null;
export const bind = (getter) => { ref = getter; };
export const S = () => ref();
