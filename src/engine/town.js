// Die Gemeinde: Gebäude und Berufe (Regelheft S. 16–19, eigene Kurztexte).
// once = einmalige Fähigkeit, danach gibt der Bewohner sein Berufsplättchen ab. Ein neuer Bewohner (Vagabund) darf sie wieder nutzen.

export const BUILDINGS = {
  farm:   { name: 'Bauernhof', job: 'Bauer', code: 'Ba', max: 6, text: 'Ab der zweiten Runde bestimmen die Bauern einen von ihnen zum Hauptmann. Ein toter Hauptmann wird nur unter Bauern ersetzt, gibt es keinen Bauern mehr, gibt es keinen Hauptmann.' },
  church: { name: 'Kirche', job: 'Beichtvater', code: 'Ki', once: true, text: 'Einmal: Er nimmt einem Mitspieler die Beichte ab und bestimmt eine Person, die ihm sofort heimlich ihre Karte zeigt.' },
  shack:  { name: 'Bruchbude', job: 'Quacksalber', code: 'Bb', once: true, text: 'Einmal: Er gibt einer Person ihre einmalige Berufsfähigkeit zurück, sie darf sie noch einmal nutzen.' },
  bakery: { name: 'Bäckerei', job: 'Bäcker', code: 'Bä', text: 'Jede Nacht öffnet er kurz die Augen, sobald die Werwölfe eingeschlafen sind, und schläft gleich wieder ein.' },
  barber: { name: 'Barbierladen', job: 'Barbier', code: 'Bs', once: true, text: 'Einmal, jederzeit am Tag: Er schaltet eine Person aus. War sie ein Werwolf, überlebt er, sonst scheidet auch er aus. Keine Vagabunden.' },
  inn:    { name: 'Wirtshaus', job: 'Wirt', code: 'Wi', text: 'Werwölfe fressen ihn nicht, das Dorf jagt ihn nicht fort. Er stimmt immer allein vor den anderen. Stimmt er gegen jemanden, der danach ausscheidet (auch wenn er begnadigt wird), verliert er Schutz und Plättchen.' },
  manor:  { name: 'Herrensitz', job: 'Schlossherr', code: 'He', once: true, text: 'Einmal nach einer Abstimmung: Er begnadigt die verurteilte Person (auch sich selbst). Sie scheidet nicht aus und deckt ihre Karte nicht auf.' },
  school: { name: 'Schulhaus', job: 'Lehrerin', code: 'Sc', text: 'Jeden Tag schließt sie bis zu zwei Personen von der Abstimmung aus (auch den Wirt, nie Vagabunden). Sie selbst stimmt nie ab.' },
  vogt:   { name: 'Haus des Vogts', job: 'Vogt', code: 'Vo', text: 'Weist leer stehende Gebäude Vagabunden zu. Mit seinem Ausscheiden endet die Zuteilung, sein Haus bleibt leer.' },
};
export const BUILDING_KEYS = Object.keys(BUILDINGS);
export const DEFAULT_TOWN = { farm: 2, church: 1, bakery: 1, inn: 1, school: 1, vogt: 1 };

export const buildingTotal = (sel) => BUILDING_KEYS.reduce((a, k) => a + (sel?.[k] || 0), 0);
