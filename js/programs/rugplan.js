// Rugplan: the 12-week schedule from the research document, as data plus one buildDay().
// A future schedule is a new file like this one, registered in programs/index.js.
import { worstPain } from '../engine.js';

const LIGHT_WEEKS = [4, 8, 12];
const TEST_MOMENT = { 4: 't1', 8: 't2', 12: 'end' };

const PHASES = [
  { id: 1, cls: 'p1', name: 'Fundament', weeks: [1, 4], focus: 'Techniek, uithouding en vertrouwen',
    effort: 'Houd 2 tot 3 herhalingen over en zak in 3 tellen.' },
  { id: 2, cls: 'p2', name: 'Kracht', weeks: [5, 8], focus: 'Deadlift en rugstrekkers met gewicht',
    effort: 'Houd ongeveer 2 herhalingen over.' },
  { id: 3, cls: 'p3', name: 'Belastbaar', weeks: [9, 12], focus: 'Snelheid en draaien, hiken en dansen',
    effort: 'Houd bij de hoofdoefeningen 1 tot 2 herhalingen over. Snelle oefeningen doe je fris en licht.' },
];
const phaseOf = (week) => PHASES.find((p) => week >= p.weeks[0] && week <= p.weeks[1]) || PHASES[0];

// ---------- exercises ----------
// measure: reps | sec | m | min. load: show a kg field. rest: seconds for the rest timer.

const EX = {
  rdl: {
    name: 'Roemeense deadlift', es: 'peso muerto rumano', measure: 'reps', load: true, rest: 120, step: 2.5,
    how: 'Stang dicht langs je benen. Duw je billen naar achteren met licht gebogen knieën tot je de achterkant van je benen voelt. Kom omhoog door je heupen naar voren te duwen. Rug lang, niet hol.',
    why: 'Leert de heupscharnier: de beweging waarmee je tilt en vooroverbuigt. Rugstrekkers, billen en hamstrings werken samen.',
    adjust: 'Haal je de bovenkant van de herhalingen, met 2 in de tank en groen of oranje? Neem de volgende keer 2,5 kg meer.',
  },
  trapbar: {
    name: 'Trap bar deadlift', es: 'peso muerto con barra hexagonal', measure: 'reps', load: true, rest: 150, step: 2.5,
    how: 'Sta in het midden van de stang en pak de handvatten. Borst omhoog en duw de vloer weg. Rustig neerzetten, rug lang.',
    why: 'Zwaar tillen met een rechtere rug dan bij een gewone deadlift. Deadlifts werken even goed tegen pijn als lichte oefeningen, en maken je sterk voor tillen in het dagelijks leven.',
    adjust: 'Begin in week 5 met een gewicht dat je 10 keer kunt tillen. Geen trap bar? Doe een kettlebell-deadlift of een Roemeense deadlift.',
  },
  backext: {
    name: 'Back extension 45°', es: 'hiperextensiones en el banco de 45 grados', measure: 'reps', load: true, rest: 90, step: 2.5,
    how: 'Heupbotten net boven het kussen. Houd een schijf tegen je borst, zak rustig omlaag en kom omhoog tot je lichaam één lijn is. Niet verder doorstrekken.',
    why: 'Je rugstrekkers zijn je zwakke schakel: veel zwakker dan je buikspieren. Gerichte training van de lage rugstrekkers vermindert pijn, en 1 keer per week tot bijna falen lijkt al genoeg.',
    adjust: 'Fase 1: bovenin 2 tellen vasthouden. Fase 2: laat in de laatste set je rug rustig ronden en strek hem weer op. Fase 3: zak in 3 tellen. Bovenkant gehaald met 2 in de tank? Volgende keer 2,5 kg erbij.',
  },
  bss: {
    name: 'Bulgaarse split squat', es: 'sentadilla búlgara', measure: 'reps', load: true, rest: 90, step: 2,
    how: 'Achterste voet op een bank, voorste voet zo ver naar voren dat je recht omlaag kunt zakken. Knie boven je voet, duw omhoog via je voorste hiel.',
    why: 'Kracht en controle op één been, voor dansen, trappen en bergaf lopen.',
    adjust: 'Begin rechts. Wiebel je veel, houd je dan met één hand vast. Bovenkant gehaald? Pak de volgende dumbbells.',
  },
  copen1: {
    name: 'Copenhagen-plank op je knie', es: 'plancha Copenhague', measure: 'sec', load: false, rest: 45,
    how: 'Onderarm op de grond, bovenste knie op een bank, onderste been los. Til je heup op en houd je lichaam recht. Te zwaar? Zijplank op je onderarm en voeten, met je bovenste been 20 cm omhoog.',
    why: 'Traint je zijkant en je heupspieren. Wie pijn krijgt van lang staan, houdt een zijplank korter vol.',
    adjust: 'Houd je 45 s rustig vol? Dan ben je klaar voor je enkel op de bank in fase 2.',
  },
  copen2: {
    name: 'Copenhagen-plank op je enkel', es: 'plancha Copenhague', measure: 'sec', load: false, rest: 45,
    how: 'Zoals in fase 1, maar met je bovenste enkel op de bank. Een langere hefboom, dus zwaarder.',
    why: 'Traint je zijkant en je heupspieren, nu zwaarder.',
    adjust: 'Lukt 30 s niet? Ga terug naar je knie op de bank en bouw opnieuw op.',
  },
  sideRow: {
    name: 'Zijplank met kabelroeien', es: 'plancha lateral con remo en polea', measure: 'reps', load: true, rest: 45, step: 1,
    how: 'Zijplank op je onderarm naast een kabel. Trek met je vrije hand de kabel naar je toe zonder te draaien. Alternatief: Copenhagen-plank waarin je je heup rustig laat zakken en weer optilt.',
    why: 'Je zijkant houdt stand terwijl je armen of heupen bewegen, zoals bij leiden en draaien in het dansen.',
    adjust: 'Begin licht. Zakt je heup weg, kies dan de rustigere variant.',
  },
  row: {
    name: 'Kabelroeien zittend', es: 'remo sentado en polea', measure: 'reps', load: true, rest: 75, step: 2.5,
    how: 'Rug lang. Trek de greep naar je buik en breng je schouderbladen naar achteren en omlaag. Rustig terug.',
    why: 'Een sterke bovenrug, zodat je borstkas en ribben vrij kunnen bewegen.',
    adjust: 'Bovenkant gehaald met 2 in de tank? Een stap zwaarder.',
  },
  row1: {
    name: 'Eenarmig kabelroeien staand', es: 'remo a una mano en polea, de pie', measure: 'reps', load: true, rest: 60, step: 2.5,
    how: 'Sta in spreidstand naast de kabel en trek met één arm. Je romp draait niet mee.',
    why: 'Trekken en draaien tegenhouden tegelijk: je romp blijft stil terwijl je arm werkt.',
    adjust: 'Draai je mee, neem dan minder gewicht.',
  },
  pallof: {
    name: 'Pallof press staand', es: 'press Pallof', measure: 'reps', load: true, rest: 45, step: 2.5,
    how: 'Sta zijwaarts naast de kabel, handen tegen je borst. Duw recht naar voren, houd 2 tellen vast en kom terug. Niet meedraaien en gewoon doorademen.',
    why: 'Leert je romp draaien tegenhouden zonder alles vast te zetten.',
    adjust: 'Te makkelijk? Een stap verder van de kabel af, of een stap zwaarder.',
  },
  pallofK: {
    name: 'Pallof press halfknielend', es: 'press Pallof', measure: 'reps', load: true, rest: 45, step: 2.5,
    how: 'Op één knie, de knie aan de kabelkant omlaag. Duw recht naar voren en houd 2 tellen vast.',
    why: 'Zonder steun van je benen doet je romp meer werk.',
    adjust: 'Wiebel je, zet je knieën dan iets breder.',
  },
  medball: {
    name: 'Medicijnbal tegen de muur', es: 'lanzamientos de balón medicinal contra la pared', measure: 'reps', load: true, rest: 60,
    how: 'Sta zijwaarts naar een muur. Draai vanuit je heupen en gooi de bal van 3 tot 4 kg krachtig tegen de muur. Vangen en opnieuw.',
    why: 'Snel draaien opbouwen, gecontroleerd. Voorbereiding op padel en Dominicaanse bachata.',
    adjust: 'Fris en licht doen. Wordt het slordig, stop dan de set.',
  },
  soren: {
    name: 'Biering-Sørensen-houding', es: 'isométrico en el banco de hiperextensiones', measure: 'sec', load: true, rest: 60,
    how: 'Op de rugstrekbank, heupen op de rand en voeten vast. Gewicht tegen je borst en houd je bovenlijf horizontaal.',
    why: 'Uithouding van je rugstrekkers. Weinig uithouding voorspelt rugklachten. Dit is ook je test.',
    adjust: 'Houd je 60 s vol met groen? In de volgende fase komt er gewicht bij.',
  },
  hipthrust: {
    name: 'Hip thrust met stang', es: 'hip thrust con barra', measure: 'reps', load: true, rest: 120, step: 5,
    how: 'Bovenrug tegen een bank, stang met kussen op je heupen. Duw je heupen omhoog tot je lichaam recht is, kin licht naar je borst. Bovenin geen holle rug.',
    why: 'Sterke bilspieren nemen werk over van je onderrug.',
    adjust: 'Bovenkant gehaald met 2 in de tank? 2,5 tot 5 kg erbij.',
  },
  revhyper: {
    name: 'Reverse hyper of benen heffen op een bank', es: 'hiperextensión inversa', measure: 'reps', load: true, rest: 60, step: 1,
    how: 'Op je buik op een bank, heupen op de rand. Til je gestrekte benen tot horizontaal, met enkelgewichten, en laat ze rustig zakken.',
    why: 'Traint rugstrekkers en billen vanaf de andere kant, met weinig druk op je rug.',
    adjust: '3 × 12 makkelijk? Zwaardere enkelgewichten.',
  },
  kickback: {
    name: 'Heupextensie aan de kabel (kickback)', es: 'patada de glúteo en polea', measure: 'reps', load: true, rest: 60, step: 1,
    how: 'Kabel laag, enkelband om je enkel. Sta met je gezicht naar het station en houd je vast. Til je gestrekte been naar achteren, zonder je onderrug hol te maken of je bovenlijf naar voren te kantelen. Knijp bovenin je bil samen en laat rustig terugkomen. Geen kabel? Op je buik op een bank met een lichte dumbbell tussen je voeten, of met een bandlus om je enkels.',
    why: 'Traint je bilspieren vanaf de achterkant, met weinig druk op je rug.',
    adjust: '3 × 12 per been makkelijk? Een stap zwaarder.',
  },
  lowerback: {
    name: 'Lowerbackmachine', es: 'máquina de lumbares', measure: 'reps', load: true, rest: 120, step: 2.5,
    how: 'Stel de machine zo in dat je heupen vast zitten en alleen je rug beweegt. Rustig buigen en strekken, tot bijna falen.',
    why: 'Gerichte training van je lage rugstrekkers. Eén keer per week tot bijna falen lijkt al genoeg.',
    adjust: 'Geen machine? Neem de 45-gradenbank. Haal je 12 herhalingen, dan een stap zwaarder.',
  },
  kbswing: {
    name: 'Kettlebell swing', es: 'swing con kettlebell (pesa rusa)', measure: 'reps', load: true, rest: 75, step: 4,
    how: 'Een heupscharnier, geen squat. Laat de kettlebell tussen je benen door zwaaien en duw je heupen krachtig naar voren. Je armen zijn alleen touwen.',
    why: 'Snelle heupkracht met een rug die stevig is maar niet verkrampt.',
    adjust: 'Begin licht. Voel je het in je rug in plaats van in je billen, neem dan een lichtere kettlebell.',
  },
  stepup: {
    name: 'Step-up op kniehoogte', es: 'subida al cajón', measure: 'reps', load: true, rest: 75, step: 2,
    how: 'Hele voet op de box. Duw jezelf omhoog via je hiel, zonder af te zetten met je achterste been. Rustig weer omlaag.',
    why: 'Hikevoorbereiding: bergop lopen met controle.',
    adjust: 'Bovenkant gehaald? Zwaardere dumbbells.',
  },
  stepupPack: {
    name: 'Step-up met rugzak', es: 'subida al cajón con mochila', measure: 'reps', load: true, rest: 75, step: 1,
    how: 'Zoals de gewone step-up, met 6 tot 8 kg in een rugzak.',
    why: 'Zo voelt een dagtocht bergop.',
    adjust: 'Gaat 12 per been makkelijk? Doe er een fles water bij.',
  },
  slrdl: {
    name: 'Eenbenige Roemeense deadlift', es: 'peso muerto rumano a una pierna', measure: 'reps', load: true, rest: 60, step: 2,
    how: 'Op één been. Scharnier vanuit je heup en strek je andere been lang naar achteren. Houd je bekken recht en klap niet open.',
    why: 'Balans en heupcontrole op één been, belangrijk voor je bilspieren.',
    adjust: 'Wiebelig? Houd een hand tegen de muur.',
  },
  stepdown: {
    name: 'Zijwaartse step-down', es: 'bajada lateral del escalón', measure: 'reps', load: false, rest: 60,
    how: 'Sta op een verhoging. Zak met één been zijwaarts naar de grond in 4 tellen, tik en kom weer omhoog. Knie boven je voet, bekken recht.',
    why: 'Bergaf lopen zonder dat je knie of bekken wegzakt.',
    adjust: 'Te zwaar? Kies een lagere verhoging.',
  },
  abdCable: {
    name: 'Heupabductie aan de kabel', es: 'abducción de cadera en polea', measure: 'reps', load: true, rest: 45, step: 1,
    how: 'Kabel aan je enkel. Breng je been zijwaarts en iets naar achteren, zonder je romp te kantelen. Rustig terug. Een machine mag ook.',
    why: 'Je middelste bilspier is vaak zwakker aan de pijnlijke kant. Daarom begin je rechts.',
    adjust: 'Bovenkant gehaald? Een stap zwaarder.',
  },
  monster: {
    name: 'Monster walk met band', es: 'monster walk con banda', measure: 'm', load: false, rest: 45,
    how: 'Band om je voeten of boven je knieën, licht door je knieën. Kleine passen schuin vooruit, knieën naar buiten.',
    why: 'Je heupspieren aan de zijkant in beweging, voor dansen en hiken.',
    adjust: 'Te licht? Een zwaardere band.',
  },
  airplane: {
    name: 'Hip airplane', es: 'avión de cadera', measure: 'reps', load: true, rest: 45,
    how: 'Op één been met je bovenlijf naar voren. Draai je bekken open en weer dicht, gecontroleerd, met een lichte dumbbell. Vasthouden mag.',
    why: 'Heupcontrole bij draaien op één been, precies wat dansen vraagt.',
    adjust: 'Begin zonder gewicht als het wiebelt.',
  },
  latpull: {
    name: 'Lat pulldown of pull-ups', es: 'jalón al pecho o dominadas', measure: 'reps', load: true, rest: 75, step: 2.5,
    variants: [{ id: 'lat', label: 'Lat pulldown', field: 'kg' }, { id: 'pull', label: 'Pull-ups', field: 'band' }],
    how: 'Lat pulldown: trek de stang naar je bovenborst met je schouders laag en laat rustig terugkomen. Pull-ups: hang volledig, trek je borst naar de stang en zak rustig. Kies hieronder wat je doet en vul het gewicht of de kleur van je band in.',
    why: 'Trekken, voor een sterke bovenrug.',
    adjust: 'Bovenkant gehaald? Bij de lat pulldown een stap zwaarder, bij pull-ups een lichtere band of geen band.',
  },
  pushup: {
    name: 'Push-ups', es: 'flexiones', measure: 'reps', load: false, field: 'height', rest: 75,
    how: 'Lichaam in één lijn, borst naar je handen, ellebogen schuin langs je lichaam. Handen op de vloer of verhoogd op een bank of stang. Vul de hoogte van je handen in cm in (0 is de vloer). Lager is zwaarder.',
    why: 'Duwen, in balans met het trekken.',
    adjust: 'Bovenkant gehaald? Je handen ongeveer 10 cm lager, of je voeten hoger.',
  },
  pullup: {
    name: 'Pull-ups', es: 'dominadas', measure: 'reps', load: true, rest: 120,
    variants: [{ id: 'pull', label: 'Met band', field: 'band' }, { id: 'weighted', label: 'Met gewicht', field: 'kg' }],
    how: 'Volledig hangen, trek je borst naar de stang en zak rustig. Stop elke set 2 herhalingen voor je maximum. Vul de kleur van je band in, of kies geen band. In fase 3 kies je Met gewicht.',
    why: 'Je calisthenics-kracht onderhouden zonder je rug te belasten.',
    adjust: 'Bovenkant gehaald? Een lichtere band of geen band. In fase 3 met extra gewicht aan een riem of in een rugzak.',
  },
  ohpK: {
    name: 'Overhead press halfknielend', es: 'press de hombro arrodillado a una rodilla', measure: 'reps', load: true, rest: 75, step: 1,
    how: 'Op één knie. Druk een dumbbell recht omhoog, ribben laag, geen holle rug.',
    why: 'Boven je hoofd duwen terwijl je romp stil blijft.',
    adjust: 'Trek je je rug hol, neem dan minder gewicht.',
  },
  ohp: {
    name: 'Overhead press', es: 'press militar', measure: 'reps', load: true, rest: 90, step: 1,
    how: 'Staand. Druk de stang of dumbbells recht omhoog. Billen en buik licht aan, ribben laag.',
    why: 'Kracht boven je hoofd zonder je onderrug hol te trekken.',
    adjust: 'Bovenkant gehaald? 1 tot 2,5 kg erbij.',
  },
  chop: {
    name: 'Kabel-chop en -lift', es: 'leñador en polea', measure: 'reps', load: true, rest: 45, step: 2.5,
    how: 'Diagonaal van hoog naar laag (chop) en van laag naar hoog (lift). De beweging komt uit je heupen en bovenrug, je onderrug blijft rustig.',
    why: 'Gecontroleerd leren draaien, als opbouw naar dansen en padel.',
    adjust: 'Fase 1 licht, fase 2 zwaarder.',
  },
  landmine: {
    name: 'Landmine-rotatie', es: 'rotación con landmine', measure: 'reps', load: true, rest: 60, step: 2.5,
    how: 'Stang in een hoek of landmine, beide handen aan het uiteinde. Draai de stang van heup naar heup en laat je voeten en heupen meedraaien.',
    why: 'Draaien onder belasting, gecontroleerd.',
    adjust: 'Begin met de lege stang.',
  },
  suitcase: {
    name: 'Suitcase carry', es: 'paseo de maleta', measure: 'm', load: true, rest: 60, step: 4,
    how: 'Een zware kettlebell in één hand. Loop rechtop zonder scheef te hangen en adem rustig.',
    why: 'Je zijkant houdt je recht, zoals met een rugzak of boodschappen.',
    adjust: 'Loop je kaarsrecht en rustig? Dan mag het zwaarder.',
  },
  farmer: {
    name: 'Farmer carry', es: 'paseo del granjero', measure: 'm', load: true, rest: 60, step: 4,
    how: 'Een zwaar gewicht in elke hand. Rechtop lopen, schouders laag.',
    why: 'Dragen, voor lange dagtochten met een rugzak.',
    adjust: 'Zwaarder als je rustig en recht blijft lopen.',
  },
  treadmill: {
    name: 'Loopband op helling', es: 'cinta inclinada', measure: 'min', load: false, rest: 0,
    how: 'Stevig lopen op 6 tot 10% helling, zonder de leuning vast te houden.',
    why: 'Hikevoorbereiding: bergop lopen, straks met rugzak.',
    adjust: 'Te makkelijk? Iets steiler of iets sneller.',
  },
  birddog: {
    name: 'Bird dog', es: 'bird dog', measure: 'reps', load: false, rest: 30,
    how: 'Op handen en knieën. Strek één arm en het andere been lang uit, houd 5 tellen vast en wissel.',
    why: 'Een lichte oefening voor tijdens een opvlamming: je rug beweegt, zonder zware belasting.',
    adjust: 'Doet het pijn boven oranje? Maak de beweging kleiner.',
  },
  sideplank: {
    name: 'Zijplank', es: 'plancha lateral', measure: 'sec', load: false, rest: 30,
    how: 'Op je onderarm en voeten, of op je knieën. Lichaam in één lijn.',
    why: 'Je zijkant blijft actief tijdens een opvlamming.',
    adjust: 'Op je knieën is prima tijdens een opvlamming.',
  },
  sorenShort: {
    name: 'Korte Biering-Sørensen-houding', es: 'isométrico en el banco de hiperextensiones', measure: 'sec', load: false, rest: 45,
    how: 'Op de rugstrekbank, zonder gewicht. Korte houdingen, bovenlijf horizontaal.',
    why: 'Je rugstrekkers blijven werken, met weinig belasting.',
    adjust: 'Stop ruim voor het zwaar wordt.',
  },
};

// ---------- sessions ----------

const SESSIONS = {
  A: {
    title: 'Sportschool A', sub: 'Rugstrekkers en heupscharnier',
    1: [
      { ex: 'rdl', sets: 3, reps: [8, 10] },
      { ex: 'backext', sets: 3, reps: [10, 12], kg: '7,5–10 kg', note: 'Bovenin 2 tellen vasthouden' },
      { ex: 'bss', sets: 3, reps: [10, 10], side: 'per been' },
      { ex: 'copen1', sets: 3, reps: [30, 45], side: 'per kant', note: 'Of zijplank met je bovenste been omhoog' },
      { ex: 'row', sets: 3, reps: [8, 12] },
      { ex: 'pallof', sets: 3, reps: [10, 10], side: 'per kant' },
      { ex: 'soren', sets: 2, reps: [45, 60], kg: '5 kg tegen je borst' },
    ],
    2: [
      { ex: 'trapbar', sets: 4, reps: [6, 8], note: 'Begin met een gewicht dat je 10 keer kunt tillen' },
      { ex: 'backext', sets: 3, reps: [8, 10], kg: '12,5–17,5 kg', note: 'Laatste set: rug rustig laten ronden en weer opstrekken' },
      { ex: 'bss', sets: 3, reps: [8, 8], side: 'per been', note: 'Zwaarder dan in fase 1' },
      { ex: 'copen2', sets: 3, reps: [30, 45], side: 'per kant' },
      { ex: 'row1', sets: 3, reps: [10, 10], side: 'per kant', note: 'In spreidstand' },
      { ex: 'pallofK', sets: 3, reps: [10, 10], side: 'per kant' },
      { ex: 'soren', sets: 2, reps: [45, 60], kg: '10 kg' },
    ],
    3: [
      { ex: 'trapbar', sets: 4, reps: [4, 6] },
      { ex: 'backext', sets: 3, reps: [6, 8], kg: '17,5 kg of meer', note: 'Zak in 3 tellen' },
      { ex: 'bss', sets: 4, reps: [6, 6], side: 'per been' },
      { ex: 'sideRow', sets: 3, reps: [8, 8], side: 'per kant', note: 'Of Copenhagen met heupdips' },
      { ex: 'row1', sets: 3, reps: [8, 8], side: 'per kant', note: 'Zwaarder dan in fase 2' },
      { ex: 'medball', sets: 3, reps: [5, 5], side: 'per kant', kg: '3–4 kg' },
      { ex: 'soren', sets: 2, reps: [45, 60], kg: '10–15 kg' },
    ],
  },
  B: {
    title: 'Sportschool B', sub: 'Heupen en hikevoorbereiding',
    // Kort genoeg voor een uur: wat er onderaan staat en als optie is gemarkeerd, laat je liggen als de tijd op is.
    1: [
      { ex: 'hipthrust', sets: 3, reps: [8, 12] },
      { ex: 'stepup', sets: 3, reps: [8, 8], side: 'per been' },
      { ex: 'abdCable', sets: 2, reps: [10, 12], side: 'per kant', note: 'Rechts 1 set extra. Houd de enkelband om voor de volgende oefening' },
      { ex: 'kickback', sets: 2, reps: [12, 12], side: 'per been', note: 'Met dezelfde enkelband als de heupabductie' },
      { ex: 'latpull', sets: 3, reps: [6, 10], note: 'Wissel af met de push-ups' },
      { ex: 'pushup', sets: 3, reps: [8, 12], note: 'Wissel af met de lat pulldown of pull-ups' },
      { ex: 'suitcase', sets: 2, reps: [20, 30], side: 'per kant', note: 'Zware kettlebell' },
      { ex: 'chop', sets: 2, reps: [8, 8], side: 'per kant', note: 'Licht. Alleen van hoog naar laag is genoeg', opt: true },
    ],
    2: [
      { ex: 'hipthrust', sets: 4, reps: [6, 8] },
      { ex: 'lowerback', sets: 2, setsText: '1–2', reps: [8, 12], note: 'Tot bijna falen' },
      { ex: 'stepup', sets: 3, reps: [8, 8], side: 'per been', note: 'Zwaardere dumbbells' },
      { ex: 'abdCable', sets: 2, reps: [8, 10], side: 'per kant' },
      { ex: 'pullup', sets: 3, reps: null, repsText: '2 voor je max', variant: 'pull', note: 'Wissel af met de overhead press' },
      { ex: 'ohpK', sets: 3, reps: [8, 8] },
      { ex: 'suitcase', sets: 2, reps: [20, 30], side: 'per kant', note: 'Zwaarder' },
      { ex: 'chop', sets: 2, reps: [8, 8], side: 'per kant', note: 'Zwaarder dan in fase 1', opt: true },
    ],
    3: [
      { ex: 'hipthrust', sets: 3, reps: [5, 6], note: 'Zwaar' },
      { ex: 'kbswing', sets: 3, reps: [10, 15] },
      { ex: 'stepupPack', sets: 3, reps: [12, 12], side: 'per been', kg: '6–8 kg in je rugzak' },
      { ex: 'stepdown', sets: 2, reps: [8, 8], side: 'per been', note: '4 tellen omlaag' },
      { ex: 'pullup', sets: 3, reps: null, repsText: 'met gewicht', variant: 'weighted', note: 'Wissel af met de overhead press' },
      { ex: 'ohp', sets: 3, reps: [6, 8] },
      { ex: 'farmer', sets: 2, reps: [20, 30] },
      { ex: 'landmine', sets: 2, reps: [8, 8], side: 'per kant', opt: true },
      { ex: 'airplane', sets: 2, reps: [5, 5], side: 'per kant', note: 'Lichte dumbbell', opt: true },
    ],
  },
};

const FLARE_SESSION = [
  { ex: 'sideplank', sets: 2, reps: [20, 30], side: 'per kant' },
  { ex: 'birddog', sets: 2, reps: [5, 5], side: 'per kant', note: '5 tellen vasthouden' },
  { ex: 'hipthrust', sets: 2, reps: [8, 10], note: 'De helft van je gewone gewicht' },
  { ex: 'sorenShort', sets: 2, reps: [20, 30], note: 'Zonder gewicht' },
];

const GYM_WARMUP = [
  { id: 'w1', name: '90/90-ademhaling', target: '2 rondes van 5, voeten tegen de muur' },
  { id: 'w2', name: 'Kat-koe', target: '8 rustige herhalingen' },
  { id: 'w3', name: '90/90-heupwissels zittend', target: '5 per kant' },
  { id: 'w4', name: 'Bird dog', target: '5 per kant, 5 tellen vasthouden' },
  { id: 'w5', name: 'Heupabductie in zijlig', target: '10 per kant, rechts eerst' },
  { id: 'w6', name: 'Aanloopsets', target: '2 lichte sets van de eerste oefening' },
];

function setsText(e, light) {
  let s = e.setsText || String(e.sets);
  if (light) {
    if (e.setsText) {
      const [a, b] = e.setsText.split('–').map(Number);
      const lo = Math.max(1, a - 1); const hi = Math.max(1, (b || a) - 1);
      s = lo === hi ? String(lo) : `${lo}–${hi}`;
    } else s = String(Math.max(1, e.sets - 1));
  }
  return s;
}

function targetText(e, light) {
  const ex = EX[e.ex];
  const unit = { sec: ' s', m: ' m', min: ' min' }[ex.measure] || '';
  let reps = '';
  if (e.repsText) reps = e.repsText;
  else if (e.reps) reps = e.reps[0] === e.reps[1] ? `${e.reps[0]}${unit}` : `${e.reps[0]}–${e.reps[1]}${unit}`;
  let s;
  if (ex.measure === 'min' && e.sets === 1) s = reps;
  else if (e.repsText) s = `${setsText(e, light)} sets, ${reps}`;
  else s = `${setsText(e, light)} × ${reps}`;
  if (e.side) s += ` ${e.side}`;
  if (e.kg) s += `, ${e.kg}`;
  if (light) s += ', licht';
  return s;
}

/** The exercises of a session in a given week. */
function session(letter, week, { light = false, flare = false } = {}) {
  const base = SESSIONS[letter];
  const phase = phaseOf(week).id;
  const list = flare ? FLARE_SESSION : base[phase];
  return {
    letter, title: flare ? `${base.title}, flareversie` : base.title, sub: flare ? 'Rustig: de helft van het gewicht en de sets' : base.sub,
    phase, light: light && !flare, flare,
    warmup: GYM_WARMUP,
    exercises: list.map((e) => {
      const ex = EX[e.ex];
      const sets = light && !flare ? Math.max(1, e.sets - 1) : e.sets;
      return {
        id: e.ex, name: ex.name, es: ex.es, measure: ex.measure, load: ex.load, rest: ex.rest, step: ex.step || 2.5,
        field: ex.field || null, variants: ex.variants || null, variant: e.variant || (ex.variants ? ex.variants[0].id : null),
        sets, reps: e.reps, side: e.side, note: e.note, kgHint: e.kg, opt: !!e.opt,
        target: targetText(e, light && !flare),
      };
    }),
  };
}

// ---------- home routine and dance ----------

/** Timer segments for holds: per set `reps` holds with a short release between, a rest between sets. */
function holdSegments({ sets, reps, hold = 5, release = 2, rest = 15, setLabel = null }) {
  const seg = [];
  for (let s = 0; s < sets; s++) {
    const pre = setLabel ? setLabel(s) : `Set ${s + 1}`;
    for (let r = 0; r < reps; r++) {
      seg.push({ label: `${pre}, vasthouden ${r + 1} van ${reps}`, sec: hold, kind: 'run', quiet: true });
      if (r < reps - 1) seg.push({ label: 'Loslaten', sec: release, kind: 'walk', quiet: true });
    }
    if (s < sets - 1) seg.push({ label: 'Even rust', sec: rest, kind: 'walk' });
  }
  return seg;
}

/** Timer segments that switch sides: right, left, right, left. */
function sideSegments({ rounds, sec, rest = 10 }) {
  const seg = [];
  for (let i = 0; i < rounds; i++) {
    seg.push({ label: `${i % 2 ? 'Links' : 'Rechts'}, ronde ${Math.floor(i / 2) + 1}`, sec, kind: 'run' });
    if (i < rounds - 1) seg.push({ label: 'Wissel', sec: rest, kind: 'walk' });
  }
  return seg;
}
const perSide = (s) => (s % 2 ? 'Links' : 'Rechts');

/**
 * The home routine: feet, upper back and shoulders, which the gym sessions leave out.
 * Hips, side and back extensors are trained in sessions A and B and before dancing.
 */
function homeItems(phase, week = 1) {
  const oneLeg = phase >= 2;
  const foot = !oneLeg
    ? { target: `3 × 8, telkens 5 s vasthouden, ${week <= 2 ? 'zittend' : 'staand'}`,
      cue: `${week <= 2 ? 'Zittend' : 'Staand'}, beide voeten tegelijk. Trek de bal van je voet naar je hiel, zodat je voetboog omhoog komt. Tenen lang, niet krullen.`,
      segments: holdSegments({ sets: 3, reps: 8 }) }
    : { target: phase === 2 ? '2 × 8 per voet, 5 s vasthouden, op één been' : '2 × 8 per voet, op één been in een kleine plié',
      cue: phase === 2
        ? 'Op één been. Trek de bal van je voet naar je hiel, zodat je voetboog omhoog komt. Tenen lang, niet krullen.'
        : 'Op één been in een kleine plié, knie boven je tweede teen. Voetboog omhoog, tenen lang.',
      segments: holdSegments({ sets: 4, reps: 8, setLabel: perSide }) };
  const balance = { 1: 'ogen open', 2: 'ogen dicht', 3: 'zwaai rustig met je vrije been' }[phase];
  return [
    { id: 'h1', name: '90/90-ademhaling', target: '1 minuut, 5 trage ademhalingen', info: 'h1', timer: { sec: 60, label: '90/90-ademhaling' },
      cue: 'Op je rug, onderbenen op een stoel. Traag in door je neus, lang uit.' },
    { id: 'roller', name: 'Bovenrug strekken over een foamroller', target: '2 × 8', info: 'roller',
      cue: 'Roller dwars onder je schouderbladen, handen achter je hoofd. Strek over de roller, je onderrug blijft rustig.' },
    { id: 'openbook', name: 'Open book half-knielend', target: '8 per kant, rustig', info: 'openbook',
      cue: 'Eén knie op de grond, handen achter je hoofd. Knijp de bil van je knielende been aan en draai je borst open naar je voorste been.' },
    { id: 'rotatie', name: 'Externe rotatie in zijlig', target: '2 × 12–15 per kant, 1–2 kg', info: 'rotatie',
      cue: 'Opgerolde handdoek tussen je elleboog en je zij. Draai je onderarm omhoog, schouder laag.' },
    { id: 'borst', name: 'Borstspier rekken in een deuropening', target: '2 × 30 s per kant', info: 'borst',
      timer: { segments: sideSegments({ rounds: 4, sec: 30 }) },
      cue: 'Onderarm tegen de deurpost, elleboog op schouderhoogte. Draai je borst weg tot je rek voelt onder je sleutelbeen.' },
    { id: 'tenen', name: 'Tenen spreiden', target: '2 × 10, telkens 5 s vasthouden, staand', info: 'tenen',
      timer: { segments: holdSegments({ sets: 2, reps: 10 }) },
      cue: 'Op blote voeten. Til je tenen op, zet je kleine teen naar buiten neer en je grote teen naar binnen.' },
    { id: 'kortevoet', name: 'Korte voet', target: foot.target, info: 'kortevoet', timer: { segments: foot.segments }, cue: foot.cue },
    { id: 'eenbeen', name: 'Op één been staan', target: `2 × 30 s per been, ${balance}`, info: 'eenbeen',
      timer: { segments: sideSegments({ rounds: 4, sec: 30 }) },
      cue: 'Op blote voeten, knie zacht. Voetboog actief en je enkel recht boven je voet: niet naar binnen laten zakken.' },
    { id: 'h6', name: 'Tennisbal onder je bil', target: '60–90 s, als hij vastzit', optional: true, info: 'h6',
      timer: { sec: 90, label: 'Tennisbal' }, cue: 'Bal onder de bil die vastzit, rustig rollen.' },
  ];
}

const DANCE_ITEMS = [
  { id: 'd1', name: 'Warming-up', target: '6 minuten: ademen, heupcirkels, body rolls', info: 'dwarm' },
  { id: 'd2', name: 'Heupabductie tot je bil brandt', target: '2 rondes per kant, vlak voor de les', info: 'dabd' },
  { id: 'd3', name: 'Tijdens de uitleg blijven bewegen', target: 'Gewicht verplaatsen, om de 15 min voorover', info: 'dstand' },
  { id: 'd4', name: 'Na afloop de 90/90-houding', target: '2 minuten, benen op een stoel', info: 'd90', timer: { sec: 120, label: '90/90-houding' } },
];
const DANCE_FLARE_ITEMS = [
  { id: 'd1', name: 'Rustige warming-up', target: '6 minuten: ademen, heupcirkels, body rolls', info: 'dwarm' },
  { id: 'd5', name: 'Korter en rustiger dansen', target: 'Sensual in plaats van Dominicaans of zouk', info: 'flare' },
  { id: 'd4', name: 'Na afloop de 90/90-houding', target: '2 minuten, benen op een stoel', info: 'd90', timer: { sec: 120, label: '90/90-houding' } },
];

// ---------- walking, running, standing ----------

const WALK = {
  1: { min: 30, text: '30 min, met armzwaai', goal: '3 tot 4' },
  2: { min: 40, text: '35–40 min, met heuvels of trappen', goal: '3 tot 4' },
  3: { min: 45, text: '40–45 min, met 4–6 kg in je rugzak', goal: '3' },
};

const RUN_STEPS = [
  { n: 1, reps: 8, run: 1, walk: 2, total: 8, text: '8 × 1 min hardlopen, 2 min wandelen' },
  { n: 2, reps: 6, run: 2, walk: 2, total: 12, text: '6 × 2 min hardlopen, 2 min wandelen' },
  { n: 3, reps: 5, run: 3, walk: 1.5, total: 15, text: '5 × 3 min hardlopen, 1,5 min wandelen' },
  { n: 4, reps: 4, run: 4, walk: 1.5, total: 16, text: '4 × 4 min hardlopen, 1,5 min wandelen' },
  { n: 5, reps: 3, run: 6, walk: 1.5, total: 18, text: '3 × 6 min hardlopen, 1,5 min wandelen' },
  { n: 6, reps: 2, run: 10, walk: 2, total: 20, text: '2 × 10 min hardlopen, 2 min wandelen' },
  { n: 7, reps: 1, run: 20, walk: 0, total: 20, text: '20 min aan één stuk' },
];

/** Timer segments for a run step: walk in, intervals, walk out. */
function runSegments(step) {
  const s = RUN_STEPS[step - 1];
  const seg = [{ label: 'Inwandelen', sec: 300, kind: 'walk' }];
  for (let i = 0; i < s.reps; i++) {
    seg.push({ label: `Hardlopen ${i + 1} van ${s.reps}`, sec: s.run * 60, kind: 'run' });
    if (i < s.reps - 1 && s.walk) seg.push({ label: 'Wandelen', sec: s.walk * 60, kind: 'walk' });
  }
  seg.push({ label: 'Uitwandelen', sec: 300, kind: 'walk' });
  return seg;
}

/** Next run step from earlier runs: green +1, orange the same, red -1; repeat in test weeks. */
function runStepFor(date, api) {
  const logs = Object.keys(api.days).filter((d) => d < date).sort();
  let next = 1; let last = null;
  for (const d of logs) {
    const doc = api.days[d];
    for (const id of ['walk', 'walk2']) {
      const w = doc.tasks && doc.tasks[id];
      if (!w || w.mode !== 'run' || !w.step || !(w.min > 0)) continue;
      last = w.step;
      const wk = api.weekInfo(d).week;
      // Colour while running and the morning after: the worst of the two counts.
      const c = worstPain(w.pain, doc.after);
      if (c === 'r') next = Math.max(1, w.step - 1);
      else if (c === 'g' && !LIGHT_WEEKS.includes(wk)) next = Math.min(7, w.step + 1);
      else next = w.step;
    }
  }
  const now = api.weekInfo(date).week;
  if (LIGHT_WEEKS.includes(now) && last) return last;
  return next;
}

const LONG_LADDER = [45, 60, 75, 90, 105, 120, 150, 180, 210, 240];
const WALK_LIGHT = [4, 8];
function longTarget(week, delay) {
  let before = 0;
  for (let i = 1; i < week; i++) if (!WALK_LIGHT.includes(i)) before++;
  const at = (i) => LONG_LADDER[Math.max(0, Math.min(LONG_LADDER.length - 1, i))];
  if (WALK_LIGHT.includes(week)) return Math.floor((at(before - 1 - delay) * 0.8) / 15) * 15;
  return at(before - delay);
}
/** Each orange or red long walk in an earlier week repeats a step. */
function longDelay(date, api) {
  const monday = api.mondayOf(date);
  let delay = 0;
  for (const [d, doc] of Object.entries(api.days)) {
    if (d >= monday) continue;
    const l = doc.tasks && doc.tasks.long;
    const c = l && worstPain(l.pain, doc.after);
    if (l && l.min > 0 && (c === 'o' || c === 'r')) delay++;
  }
  return delay;
}
function whereToWalk(week) {
  if (week <= 6) return 'In de stad: Madrid Río, de Casa de Campo of El Retiro.';
  if (week <= 9) return 'Valle de la Fuenfría vanuit Cercedilla, met de Cercanías C-8 vanaf Atocha of Chamartín. Keer om waar sneeuw of ijs begint.';
  return 'Camino Schmid vanaf de Puerto de Navacerrada (bus 691 vanaf Moncloa), als er geen sneeuw ligt. Anders de Fuenfría.';
}

const STAND_STEPS = [
  { min: 15, sit: 30, blocks: 5 },
  { min: 20, sit: 30, blocks: 5 },
  { min: 25, sit: 25, blocks: 5 },
  { min: 30, sit: 20, blocks: 5 },
  { min: 40, sit: 20, blocks: 4 },
  { min: 45, sit: 15, blocks: 4 },
];
const standStep = (week, delay = 0) => STAND_STEPS[Math.min(5, Math.max(0, Math.ceil(Math.max(1, week - delay) / 2) - 1))];

// ---------- tests ----------

const TESTS = {
  moments: [
    { id: 'start', label: 'Starttest', short: 'Start', week: 0 },
    { id: 't1', label: 'Test 1', short: 'Wk 4', week: 4 },
    { id: 't2', label: 'Test 2', short: 'Wk 8', week: 8 },
    { id: 'end', label: 'Eindtest', short: 'Eind', week: 12 },
  ],
  fields: [
    { id: 'soren', part: 'gym', label: 'Rugstrekkers (Biering-Sørensen)', short: 'Rugstrekkers', unit: 's', info: 't-soren', timer: 240 },
    { id: 'flex', part: 'gym', label: 'Buikspieren (McGill-flexietest)', short: 'Buikspieren', unit: 's', info: 't-flex', timer: 300 },
    { id: 'sideL', part: 'gym', label: 'Zijplank links', unit: 's', info: 't-side', timer: 300 },
    { id: 'sideR', part: 'gym', label: 'Zijplank rechts', unit: 's', info: 't-side', timer: 300 },
    { id: 'stand', part: 'home', label: 'Staan tot je pijn 3 van 10 is', short: 'Staan tot pijn 3', unit: 'min', info: 't-stand' },
    { id: 'walk', part: 'home', label: 'Langste wandeling deze week', short: 'Langste wandeling', unit: 'min', info: 't-walk' },
    { id: 'rHike', part: 'home', label: 'Hoe goed lukt 3 uur hiken?', short: '3 uur hiken', unit: '/10', scale: true, info: 't-goals' },
    { id: 'rDance', part: 'home', label: 'Hoe goed lukt 3 uur dansen?', short: '3 uur dansen', unit: '/10', scale: true, info: 't-goals' },
    { id: 'rStand', part: 'home', label: 'Hoe goed lukt 60 minuten staan?', short: '60 min staan', unit: '/10', scale: true, info: 't-goals' },
    { id: 'pain', part: 'home', label: 'Gemiddelde pijn deze week', short: 'Pijn', unit: '/10', scale: true, info: 't-pain' },
  ],
  ratios: [
    { id: 'fe', label: 'Buik : rug', target: 'onder 1,0', need: ['flex', 'soren'], calc: (v) => v.flex / v.soren, ok: (r) => r < 1 },
    { id: 'se', label: 'Zijplank : rug', target: 'onder 0,75', need: ['sideL', 'sideR', 'soren'], calc: (v) => (v.sideL + v.sideR) / 2 / v.soren, ok: (r) => r < 0.75 },
    { id: 'lr', label: 'Links en rechts', target: 'binnen 5%', pct: true, need: ['sideL', 'sideR'], calc: (v) => Math.abs(v.sideL - v.sideR) / Math.max(v.sideL, v.sideR), ok: (r) => r <= 0.05 },
  ],
};

// ---------- the day ----------

const ICON = { gym: 'dumbbell', stand: 'stand', walk: 'walk', run: 'run', long: 'mountain', home: 'home', dance: 'music', test: 'flag', flare: 'flame', breath: 'wind' };

function buildDay(ctx) {
  const { date, dow, info, run, api } = ctx;
  const tasks = []; const banners = [];
  const hikeDow = run.hikeDay === 'sat' ? 6 : 7;
  const restDow = hikeDow === 7 ? 6 : 7;
  const tests = run.tests || {};
  const startDone = (part) => !!(tests.start && tests.start[`${part}At`]);

  const testTask = (moment, part, required) => ({
    id: part === 'gym' ? 'testGym' : 'testHome', kind: 'test', moment, part, required, icon: ICON.test,
    title: part === 'gym' ? `${moment === 'start' ? 'Starttest' : 'Test'} in de sportschool` : `${moment === 'start' ? 'Starttest' : 'Test'} thuis`,
    sub: part === 'gym' ? 'Rugstrekkers, buikspieren en zijplanken' : 'Staan, je doelen en je pijn',
    info: 'tests',
  });

  if (info.pre) {
    banners.push({ kind: 'pre', title: info.daysToStart === 1 ? 'Morgen begin je' : `Nog ${info.daysToStart} dagen tot de start`,
      text: 'Doe de starttest als je wilt, dan zie je straks precies hoeveel je vooruit gaat.' });
    tasks.push(testTask('start', 'gym', false), testTask('start', 'home', false));
    return { tasks, banners };
  }
  if (info.finished) {
    banners.push({ kind: 'finished', title: 'Je schema is klaar', text: 'Kijk bij Voortgang hoe het ging. Een nieuw schema start je bij Instellingen.' });
    return { tasks, banners };
  }
  if (info.pause) {
    banners.push({ kind: 'pause', title: 'Pauzeweek', text: 'Vakantie of ziek: je schema wacht een week. Blijf wandelen als het kan.' });
    tasks.push({ id: 'walk', kind: 'walk', title: 'Wandelen als het kan', sub: 'Zo lang als prettig is', target: 30, required: false, icon: ICON.walk, info: 'walk' });
    return { tasks, banners };
  }

  const flare = api.flareState(date);
  const realWeek = info.week;
  const week = flare && flare.recovery ? Math.max(1, realWeek - 1) : realWeek;
  const phase = phaseOf(week);
  const light = LIGHT_WEEKS.includes(realWeek);
  const moment = TEST_MOMENT[realWeek];

  if (flare && flare.day) {
    banners.push({ kind: 'flare', title: `Opvlamming, dag ${flare.day}`, text: 'Blijf bewegen, maar zet de belasting een paar dagen terug. Vermijd lang stilstaan.' });
    tasks.push({ id: 'fwalk', kind: 'counter', title: 'Kort en stevig wandelen', sub: '3 tot 4 keer 10 tot 20 min', count: 4, min: 3, required: true, icon: ICON.walk, info: 'flare' });
    tasks.push({ id: 'fbreath', kind: 'counter', title: '90/90-ademhaling', sub: '2 tot 3 keer 5 min', count: 3, min: 2, required: true, icon: ICON.breath, info: 'h1', timer: { sec: 300, label: '90/90-ademhaling' } });
    if (dow === 1 || dow === 4) {
      const s = dow === 1 ? 'B' : 'A';
      tasks.push({ id: 'gym', kind: 'gym', session: s, flare: true, title: `Sportschool ${s}, flareversie`, sub: 'Zijplank, bird dog, hip thrust en korte houdingen', required: true, icon: ICON.gym, info: 'flare' });
    }
    if (dow === 2 || dow === 3) {
      tasks.push({ id: 'dance', kind: 'list', items: DANCE_FLARE_ITEMS, allowNA: true, title: dow === 2 ? 'Zouk, rustig' : 'Danstraining, rustig', sub: 'Korter en rustiger, of overslaan', required: true, icon: ICON.dance, info: 'flare' });
    }
    tasks.push({ id: 'fease', kind: 'check', title: 'Verlichting', sub: 'Warmte, tennisbal en fijne houdingen', required: false, icon: ICON.flare, info: 'flare' });
    return { tasks, banners, week: realWeek, effWeek: week, phase, light, flare };
  }

  if (flare && flare.recovery) {
    banners.push({ kind: 'recovery', title: 'Herstel na je opvlamming', text: `Tot en met dag 7 doe je het niveau van week ${week}. Daarna ga je verder met het schema.` });
  }
  if (light && dow === 1) {
    banners.push({ kind: 'light', title: moment ? 'Lichte week en testweek' : 'Lichte week', text: 'In de sportschool 1 set minder en ongeveer 10% minder gewicht. Donderdag test je in de sportschool, zaterdag thuis.' });
  }
  if ((realWeek === 5 || realWeek === 9) && dow === 1 && !flare) {
    banners.push({ kind: 'phase', title: `Fase ${phase.id}: ${phase.name.toLowerCase()}`, text: `${phase.focus}. ${phase.effort}` });
  }

  // standing
  const standDelay = run.standDelay || 0;
  const st = standStep(week, standDelay);
  const standTask = (blocks, weekend) => ({
    id: 'stand', kind: 'blocks', blocks, min: st.min, sit: st.sit, weekend,
    title: weekend ? 'Even staan' : 'Staanblokken',
    sub: weekend ? `${blocks} × ${st.min} min, bijvoorbeeld tijdens het koken` : `${blocks} × ${st.min} min, ${st.sit} min zitten ertussen`,
    required: true, icon: ICON.stand, info: 'stand',
  });
  const prevStep = standStep(week - 1, standDelay);
  if (dow === 1 && week > 1 && prevStep.min !== st.min) {
    banners.push({ kind: 'stand', action: 'stand-delay', title: `Nieuwe staanstap: ${st.min} minuten`,
      text: 'Waren je ochtenden rustig en bleven de blokken groen of oranje? Dan ga je door. Anders blijf je 2 weken op de vorige stap.' });
  }

  const walkTask = (id, required, allowRun) => {
    const w = WALK[phase.id];
    const t = {
      id, kind: 'walk', title: required ? 'Stevige wandeling' : 'Korte stevige wandeling',
      sub: required ? (phase.id === 3 && id === 'walk' ? w.text : w.text.replace(', met 4–6 kg in je rugzak', '')) : 'Mag, hoeft niet',
      target: required ? w.min : 20, required, icon: ICON.walk, info: 'walk',
    };
    if (allowRun && realWeek >= 3) {
      const step = runStepFor(date, api);
      t.run = { step, ...RUN_STEPS[step - 1], segments: runSegments(step) };
    }
    return t;
  };

  switch (dow) {
    case 1: {
      const s = session('B', week, { light });
      tasks.push({ id: 'gym', kind: 'gym', session: 'B', title: 'Sportschool B', sub: `${s.sub}, 60 min`, required: true, icon: ICON.gym, info: 'gymB', light });
      if (realWeek === 1 && !startDone('gym')) tasks.push(testTask('start', 'gym', false));
      tasks.push(standTask(st.blocks, false));
      break;
    }
    case 2:
    case 3: {
      const zouk = dow === 2;
      tasks.push({ id: 'dance', kind: 'list', items: DANCE_ITEMS, allowNA: true, title: zouk ? 'Zoukavond' : 'Danstraining',
        sub: zouk ? '3 uur, met warming-up en staantips' : '2 tot 3 uur, met warming-up en staantips', required: true, icon: ICON.dance, info: 'dance' });
      tasks.push(standTask(Math.max(1, st.blocks - 1), false));
      break;
    }
    case 4: {
      const s = session('A', week, { light });
      tasks.push({ id: 'gym', kind: 'gym', session: 'A', title: 'Sportschool A', sub: `${s.sub}, 60 min`, required: true, icon: ICON.gym, info: 'gymA', light });
      if (moment) tasks.push(testTask(moment, 'gym', true));
      tasks.push(standTask(st.blocks, false));
      break;
    }
    case 5:
      tasks.push(walkTask('walk', true, hikeDow === 7));
      tasks.push(homeTask(phase.id, restDow, week));
      tasks.push(standTask(st.blocks, false));
      break;
    default: {
      if (dow === hikeDow) {
        const target = longTarget(week, longDelay(date, api));
        const plain = longTarget(week, 0);
        tasks.push({ id: 'long', kind: 'long', title: realWeek === 12 ? 'De hike van 4 uur' : 'Lange wandeling', sub: target >= 60 ? fmtHours(target) : `${target} min`,
          target, repeated: target < plain, pack: realWeek >= 7 ? 'Neem een dagrugzak van 3 tot 5 kg mee.' : '', where: whereToWalk(realWeek),
          required: true, icon: ICON.long, info: 'long' });
      } else if (dow === restDow) {
        tasks.push(homeTask(phase.id, restDow, week));
        if (moment) tasks.push(testTask(moment, 'home', true));
        if (realWeek === 1 && !startDone('home')) tasks.push(testTask('start', 'home', false));
        tasks.push(standTask(2, true));
        tasks.push(walkTask('walk2', false, hikeDow === 6));
      }
    }
  }
  return { tasks, banners, week: realWeek, effWeek: week, phase, light, flare };
}

/** The home routine: on Friday and the free weekend day, but any day of the week counts. */
function homeTask(phaseId, restDow, week) {
  const items = homeItems(phaseId, week);
  const n = items.filter((i) => !i.optional).length;
  return { id: 'home', kind: 'list', items, unit: 'oefeningen', flexDows: [5, restDow], open: 'home',
    title: 'Thuisroutine', sub: `${n} oefeningen, 20 min`, required: true, icon: ICON.home, info: 'home' };
}

/** What counts as training for the morning-after check: the gym, a long walk, a run. */
function trainingOn(doc) {
  if (!doc) return [];
  const out = [];
  const g = doc.gym;
  if (g && (g.done || Object.values(g.ex || {}).some((e) => (e.sets || []).some((x) => x && x.ok)))) out.push(`sportschool ${g.s}`);
  const t = doc.tasks || {};
  if (t.long && t.long.min > 0) out.push('je lange wandeling');
  if ((t.walk && t.walk.mode === 'run' && t.walk.min > 0) || (t.walk2 && t.walk2.mode === 'run' && t.walk2.min > 0)) out.push('hardlopen');
  return out;
}

function fmtHours(min) {
  const h = Math.floor(min / 60); const m = min % 60;
  if (!h) return `${m} min`;
  return m ? `${h} uur ${m} min` : `${h} uur`;
}

// ---------- info texts (the i-buttons) ----------

const INFO = {
  gymA: { title: 'Sportschool A', md: `Rugstrekkers en de heupscharnier: tillen, buigen en je romp stil houden.

**Hoe zwaar**
- Fase 1: houd 2 tot 3 herhalingen over en zak in 3 tellen.
- Fase 2: houd er ongeveer 2 over.
- Fase 3: bij de hoofdoefeningen 1 tot 2.

**Opbouwen:** haal je de bovenkant van de herhalingen, met 2 in de tank en groen of oranje? Neem de volgende keer 2,5 tot 5% meer. Ritmo stelt dat gewicht voor.

Laat minstens 48 uur tussen training A en B.` },
  gymB: { title: 'Sportschool B', md: `Bilspieren, eenbenige kracht en hikevoorbereiding.

**Hoe zwaar**
- Fase 1: houd 2 tot 3 herhalingen over en zak in 3 tellen.
- Fase 2: houd er ongeveer 2 over.
- Fase 3: bij de hoofdoefeningen 1 tot 2. Snelle oefeningen doe je fris en licht.

**Opbouwen:** haal je de bovenkant van de herhalingen, met 2 in de tank en groen of oranje? Neem de volgende keer 2,5 tot 5% meer.` },
  stand: { title: 'Staan aan je bureau', md: `Staan train je zoals een spier: net onder je grens, regelmatig en steeds iets langer.

- Zet de timer. Loop na elk blok 2 tot 5 minuten rond en ga daarna zitten.
- Zet ongeveer 1 minuut op elke 4 een voet op een laag krukje en wissel. Verplaats je gewicht, knieën zacht, lang uitademen.
- Pijn 3 van 10 voordat het blok om is? Ga zitten of loop even. Tik dan **Gestopt** aan: zo telt het blok gewoon mee.
- Op dinsdag en woensdag doe je 1 blok minder, want je staat 's avonds al bij het dansen.
- Ga pas naar de volgende stap als je ochtenden rustig waren en de blokken groen of oranje bleven. Lukt dat niet, blijf dan 2 weken op dezelfde stap.` },
  walk: { title: 'Stevige wandeling', md: `Stevig betekent: je kunt nog praten maar niet zingen, en je armen zwaaien mee. Slenteren belast je rug statisch, stevig lopen niet.

- **Week 1 tot 4:** 3 tot 4 keer 30 minuten per week.
- **Week 5 tot 8:** 3 tot 4 keer 35 tot 40 minuten, met heuvels of trappen.
- **Week 9 tot 12:** 3 keer 40 tot 45 minuten, waarvan 1 keer met 4 tot 6 kg in je rugzak.

Liefst aan één stuk. Op een drukke dag mag je opsplitsen, bijvoorbeeld 2 × 20 minuten. Naar de sportschool of je dansles lopen telt ook: tik dan op **Wandeling erbij**.

Vanaf week 3 mag je deze wandeling af en toe vervangen door hardlopen.` },
  run: { title: 'Hardlopen', md: `Hardlopen is niet slecht voor je onderrug. Bij hardlopers komt rugpijn weinig voor, en een loop-wandelschema verminderde pijn bij mensen met chronische rugpijn.

- Hooguit 1 keer per week, niet op de dag voor je lange wandeling, en niet tijdens een opvlamming.
- Loop in praattempo: je kunt nog hele zinnen zeggen. Op een loopband is 7 tot 10 km/u een goed begin.
- Kleine, lichte passen. Schouders, buik en billen los, armen zwaaien mee.

**Opbouwen:** groen tijdens het lopen en de ochtend erna? Volgende keer 1 stap verder. Oranje: herhaal de stap. Rood: 1 stap terug. In de testweken herhaal je je vorige stap. Ritmo rekent je stap zelf uit.

Bleef stap 1 twee keer oranje of rood? Doe dezelfde intervallen dan op de crosstrainer of fiets.` },
  long: { title: 'Lange wandeling', md: `Je bouwt op naar een hike van 4 uur in week 12.

- Loop hem in één keer. Pauzes om te drinken, te eten of 5 minuten te zitten mogen, net als op een echte hike.
- Kleurt hij oranje of rood? Dan herhaal je die stap de week erna. Ritmo past het doel dan vanzelf aan.
- Vanaf week 7 neem je een dagrugzak van 3 tot 5 kg mee.
- In januari en februari kan er in de Sierra sneeuw liggen: keer om waar sneeuw of ijs begint, en kijk vooraf naar de verwachting van AEMET.` },
  home: { title: 'Thuisroutine', md: `Ongeveer 20 minuten voor wat in de sportschool niet aan bod komt: je voeten, je bovenrug en je schouders.

- **Voeten:** korte voet, tenen spreiden en op één been staan. Ze trainen de kleine spieren die je voetboog dragen, zodat je enkel minder naar binnen zakt.
- **Bovenrug:** strekken over een foamroller en de draai half-knielend, zodat buigen en draaien meer uit je bovenrug komen dan uit je onderrug.
- **Schouders:** externe rotatie en rekken in een deuropening, tegen schouders die van bureauwerk naar binnen draaien.

Je heupen, je zijkant en je rugstrekkers train je al in training A en B, en vlak voor het dansen. Reken vooral op winst voor je dansen en je houding. Of het je rugpijn vermindert, is minder zeker. Meer uitleg staat bij Theorie.

**Extra:** doe tijdens een staanblok aan je bureau af en toe een korte voet of spreid je tenen. Zo oefen je ze vaker dan 2 keer per week.

**Wanneer:** op vrijdag en op de weekenddag zonder lange wandeling. Lukt dat niet, doe hem dan op een andere dag van dezelfde week: dan telt hij ook mee.` },
  dance: { title: 'Je dansavond', md: `**Voor de les:** de warming-up van 6 minuten, en daarna 2 rondes heupabductie per kant tot je bil brandt. Mensen die van lang staan rugpijn kregen, hadden minder pijn als ze eerst zo'n vermoeiende heupoefening deden.

**Tijdens de uitleg:**
- Blijf bewegen: verplaats je gewicht, wieg mee of loop een paar passen.
- Buig elke 15 minuten 5 seconden ontspannen voorover, met hangende armen. Even hurken mag ook.
- Duurt de uitleg langer? Zet een voet op een bankje, of ga zitten.
- Pijn 3 van 10? Even zitten of lopen.

**Na afloop:** 2 minuten in de 90/90-houding.

Danst er een avond niet? Tik dan op **Vervalt**: dat telt niet tegen je sticker.` },
  dwarm: { title: 'Warming-up voor het dansen', md: `1. Staand 5 trage ademhalingen met een lange uitademing. Schouders en ribben laten zakken.
2. Heupcirkels: 5 per kant, beide richtingen.
3. Kat-koe staand, handen op je knieën: 6 keer.
4. Zijwaartse uitvalspas: 6 per kant.
5. Body rolls van klein naar groot: 8 keer.
6. Hip airplane of op 1 been balanceren: 3 per kant.

Dans daarna eerst 2 tot 3 rustigere nummers, bijvoorbeeld sensual bachata, voordat je Dominicaans of zouk danst.` },
  dabd: { title: 'Heupabductie voor de les', md: `Staand met een band om je enkels, of liggend op je zij: 2 rondes per kant tot je bil goed brandt.

Mensen die van lang staan rugpijn kregen, hadden minder pijn tijdens 2 uur staan als ze vooraf zo'n vermoeiende heupoefening deden. Het was een kleine studie, dus kijk of het bij jou werkt.` },
  dstand: { title: 'Tijdens de uitleg', md: `- Blijf bewegen: verplaats je gewicht, wieg mee of loop een paar passen. Mensen die van staan rugpijn krijgen, bewegen minder met hun onderrug.
- Buig elke 15 minuten 5 seconden ontspannen voorover. Na 2 uur staan scheelde dat 36% rugpijn.
- Zet een voet op een bankje of rand en wissel af, of ga zitten.
- Laat je billen los en houd je knieën zacht.` },
  d90: { title: '90/90-houding', md: `Lig op je rug met je onderbenen op een stoel, knieën en heupen in 90 graden. Adem rustig en lang uit en laat buik en billen los.` },
  flare: { title: 'Flareplan', md: `Een opvlamming hoort bij herstel met golven en betekent geen nieuwe schade. Blijf bewegen, maar zet de belasting een paar dagen terug.

**Dag 1 tot 3**
- Wandel kort en stevig: 3 tot 4 keer per dag 10 tot 20 minuten. Vermijd lang stilstaan.
- Doe 2 tot 3 keer per dag 5 minuten 90/90-ademhaling.
- Kies houdingen die verlichten: liggen met je benen op een stoel, op je zij met een kussen tussen je knieën, of zitten.
- Warmte helpt: een kruik of een warme douche van 15 tot 20 minuten. Een tennisbal onder je bil mag ook.
- Train in de flareversie: de helft van het gewicht en de sets. Zijplank, bird dog, hip thrust en korte Biering-Sørensen-houdingen. Geen zware deadlift.
- Dans korter en rustiger: sensual in plaats van Dominicaans of zouk.

**Dag 4 tot 7:** het niveau van de week ervoor. Daarna weer gewoon verder.

Doof gevoel rond je schaamstreek, problemen met plassen of krachtverlies in een been? Ga dezelfde dag naar een arts.` },
  tests: { title: 'Testen', md: `Je test aan het begin en in week 4, 8 en 12. Zo zie je of je rugstrekkers inlopen op je buikspieren en of je langer kunt staan.

- **Rugstrekkers:** op je buik op de rugstrekbank, heupen op de rand, voeten vast, armen gekruist. Houd je bovenlijf horizontaal tot je zakt. Stop bij 240 s.
- **Buikspieren:** zit met knieën en heupen in 90 graden en je rug in 60 graden tegen een steun, armen gekruist. Laat iemand de steun 10 cm terugschuiven en houd vast tot je houding verandert.
- **Zijplank:** op je onderarm en voeten, lichaam recht, tot je heup zakt.
- **Staan:** hoeveel minuten tot je pijn 3 van 10 is, tijdens een gewone taak zoals koken. In week 12 test je of 60 minuten lukt.

Ritmo rekent de verhoudingen uit. Gezonde jonge vrouwen hielden hun rugstrekkers ongeveer 2 keer zo lang vol als hun buikspieren.` },
  't-soren': { title: 'Rugstrekkertest', md: 'Op je buik op de rugstrekbank, heupen op de rand, voeten vast, armen gekruist voor je borst. Houd je bovenlijf horizontaal tot je zakt. Stop bij 240 seconden.' },
  't-flex': { title: 'Buikspiertest', md: 'Zit met knieën en heupen in 90 graden en je rug in 60 graden tegen een steun, armen gekruist. Laat iemand de steun 10 cm terugschuiven en houd vast tot je houding verandert. Geen hulp? Een stevige kussenstapel die je zelf wegschuift werkt ook.' },
  't-side': { title: 'Zijplanktest', md: 'Op je onderarm en voeten, lichaam in een rechte lijn, tot je heup zakt. Links en rechts mogen hooguit 5% verschillen.' },
  't-stand': { title: 'Staantest', md: 'Hoeveel minuten sta je tijdens een gewone taak, zoals koken, voordat je pijn 3 van 10 is? In week 12 kijk je of 60 minuten lukt. Doel: van 20 tot 40 naar 60 minuten of meer.' },
  't-walk': { title: 'Langste wandeling', md: 'De duur van je langste wandeling deze week. Ritmo vult je lange wandeling alvast in.' },
  't-goals': { title: 'Je eigen doelen', md: 'Een cijfer van 0 tot 10 voor hoe goed het nu zou lukken. Je wilt dit elke 4 weken zien stijgen.' },
  't-pain': { title: 'Gemiddelde pijn', md: 'Je gemiddelde pijn van de afgelopen week, van 0 tot 10. Ritmo stelt een cijfer voor uit wat je per dag invulde. Je wilt dit zien dalen, ook als het golft.' },
  pain: { title: 'Het stoplicht', md: `- **Groen, 0 tot 2 van 10:** gewoon doorgaan en opbouwen.
- **Oranje, 3 tot 5 van 10:** mag, als je de volgende ochtend weer op je gewone niveau zit.
- **Rood, boven 5, of de volgende ochtend duidelijk erger:** doe de volgende keer een stap terug, met minder gewicht of 1 set minder.

De ochtend erna telt het zwaarst. Daarom vraagt Ritmo de dag na de sportschool, je lange wandeling of hardlopen hoe je rug zich voelde. Voelde je tijdens het trainen niets bijzonders, dan hoef je daar niets in te vullen.

Oefenen met wat pijn levert op korte termijn zelfs iets meer op dan pijnvrij oefenen. Pijn tijdens het oefenen betekent dus niet dat je schade doet.` },
  after: { title: 'De ochtend erna', md: `Hoe je rug zich de ochtend na een training voelt, zegt het meest over hoeveel belasting hij aankan.

- **Zoals normaal:** de training was goed te verdragen. De volgende keer mag je opbouwen.
- **Iets meer, maar het zakt:** de volgende keer houd je hetzelfde gewicht, dezelfde wandeltijd of dezelfde hardloopstap.
- **Duidelijk erger:** de volgende keer zet Ritmo een stap terug: ongeveer 10% minder gewicht, of de vorige stap.

Dit is het pijnmonitoringmodel uit je plan (Thomeé 1997).` },
  h1: { title: '90/90-ademhaling', md: `Lig op je rug met je onderbenen op een stoel. Adem traag in door je neus en lang uit: ribben laten zakken, buik en billen los.

**Waarom:** het helpt het beschermende aanspannen los te laten, en je begint de routine rustig.

**In het Spaans:** *respiración 90/90*` },
  roller: { title: 'Bovenrug over een foamroller', md: `**Hoe:** leg een foamroller dwars onder je bovenrug, ter hoogte van je schouderbladen. Handen achter je hoofd, billen op de grond. Strek je bovenrug over de roller terwijl je uitademt, en kom terug: 2 × 8. Schuif de roller na 4 herhalingen een stukje hoger. Je onderrug blijft rustig en wordt niet hol.

**Waarom:** bij een cambré hoort de achteroverbuiging uit je bovenrug te komen. Is die stijf, dan neemt je onderrug het over.

**Geen foamroller?** Plak twee tennisballen met tape aan elkaar en leg ze links en rechts van je wervelkolom. Een stevig opgerolde handdoek kan ook.

**In het Spaans:** *extensión torácica con foam roller*` },
  openbook: { title: 'Open book half-knielend', md: `**Hoe:** zet één knie op de grond (op een kussen of opgevouwen handdoek) en je andere voet voor je, beide knieën ongeveer in 90 graden. Knijp de bil van je knielende been aan, zodat je onderrug niet hol gaat. Handen achter je hoofd. Draai je borst en ellebogen open naar de kant van je voorste been, kijk mee en adem uit. Rustig terug: 8 per kant.

**Meer voelen:** houd bij elke herhaling 3 tot 5 ademhalingen vast en ga bij elke uitademing iets verder. Voel je weinig in je bovenrug, dan draait je bekken waarschijnlijk mee: knijp je bil harder aan en houd je heupen recht naar voren.

**Waarom:** je leert draaien vanuit je bovenrug, zodat je onderrug minder hoeft mee te draaien. Half-knielend moet je zelf je bekken stil houden, en dat geeft meestal een diepere draaiing dan liggend. Handig voor body rolls en draaien in het dansen.

**In het Spaans:** *rotación torácica en media rodilla*` },
  rotatie: { title: 'Externe rotatie in zijlig', md: `**Hoe:** lig op je zij met een opgerolde handdoek tussen je bovenste elleboog en je zij, elleboog in 90 graden. Draai je onderarm met het gewicht omhoog, zover als je schouder laag en naar achteren blijft. 2 tellen omhoog, 3 tellen omlaag: 2 × 12 tot 15 per kant.

**Waarom:** traint de spieren achter in je schouder die je arm naar buiten draaien, als tegenwicht voor schouders die naar binnen draaien. In zijlig werken die spieren het hardst.

**Aanpassen:** begin met 1 kg, of een fles water van 1 liter. Gaan 15 herhalingen goed en zijn alleen de laatste 2 zwaar? Neem dan 2 kg.

**In het Spaans:** *rotación externa de hombro tumbada de lado*` },
  borst: { title: 'Borstspier rekken in een deuropening', md: `**Hoe:** zet je onderarm tegen de deurpost, met je elleboog op schouderhoogte en in 90 graden. Zet het been aan dezelfde kant een stap naar voren en draai je borst rustig weg, tot je rek voelt voor in je borst, onder je sleutelbeen. Schouder laag: 2 × 30 s per kant.

**Waarom:** van drie rekoefeningen maakte deze de kleine borstspier het langst. Die spier trekt je schouder naar voren als hij kort is.

**Voel je het in je schouder** in plaats van in je borst, of tintelt je arm? Zet je elleboog dan wat lager.

**In het Spaans:** *estiramiento del pectoral en el marco de la puerta*` },
  tenen: { title: 'Tenen spreiden', md: `**Hoe:** sta op blote voeten. Til al je tenen op, zet je kleine teen naar buiten neer en daarna je grote teen naar binnen, zodat je tenen gespreid staan. Druk ze zacht in de grond en houd 5 tellen vast: 2 × 10.

**Waarom:** traint de spier aan de binnenkant van je voet, die je voetboog en je grote teen op hun plek houdt. Staand werkt die spier harder dan zittend.

**Lukt het nog niet?** Help in het begin met je vingers, of oefen eerst zittend. Het gaat vaak pas na een paar weken.

**In het Spaans:** *separación de los dedos del pie*` },
  kortevoet: { title: 'Korte voet', md: `**Hoe:** trek de bal van je voet richting je hiel, zodat je voetboog omhoog komt. Je tenen blijven lang en ontspannen: niet krullen of in de grond klauwen. Houd 5 tellen vast en ontspan.

- **Week 1 en 2:** zittend, beide voeten tegelijk: 3 × 8.
- **Week 3 en 4:** staand op twee benen: 3 × 8.
- **Fase 2:** op één been: 2 × 8 per voet.
- **Fase 3:** op één been in een kleine plié, met je knie boven je tweede teen: 2 × 8 per voet.

**Waarom:** van de oefeningen voor de kleine voetspieren leek deze het meest effectief. Die spieren houden je voetboog op hoogte, zodat je enkel minder naar binnen zakt.

**Geef het tijd:** de oefening is lastig om te leren, en in de studies kwam een duidelijk effect pas na meer dan 6 weken. Laat iemand meekijken die je voeten kent.

**In het Spaans:** *ejercicio de pie corto*` },
  eenbeen: { title: 'Op één been staan', md: `**Hoe:** sta op één been op blote voeten, knie zacht. Houd je voetboog actief zoals bij de korte voet, met je enkel recht boven je voet: laat hem niet naar binnen zakken. 2 × 30 s per been.

- **Fase 1:** ogen open.
- **Fase 2:** ogen dicht. Houd je vast als het nodig is.
- **Fase 3:** ogen open, en zwaai rustig met je vrije been naar voren en achteren.

**Waarom:** zo gebruik je je voetspieren in de houding waarin je danst. Op één been staan en met je vrije been zwaaien was in een vergelijking van 9 voetoefeningen een van de oefeningen waarbij je voetboogspier het hardst werkte.

**In het Spaans:** *equilibrio a una pierna*` },
  h6: { title: 'Tennisbal', md: `Leg een tennis- of massagebal onder de bil die vastzit en rol rustig 60 tot 90 seconden. Het geeft verlichting, de oefeningen doen het echte werk.

**In het Spaans:** *masaje con pelota de tenis*` },
};

export default {
  id: 'rugplan-2026',
  name: 'Rugplan',
  title: 'Rugplan, 12 weken',
  weeks: 12,
  defaultStart: '2026-11-23',
  phases: PHASES,
  phaseOf,
  lightWeeks: LIGHT_WEEKS,
  testMoment: TEST_MOMENT,
  exercises: EX,
  session,
  homeItems,
  trainingOn,
  runSteps: RUN_STEPS,
  runSegments,
  standStep,
  standSteps: STAND_STEPS,
  longTarget,
  tests: TESTS,
  info: INFO,
  buildDay,
};
