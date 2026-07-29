/**
 * Modelul de date al bugetului — funcții pure, fără DOM.
 *
 * Separat de interfață din două motive: se poate testa (vezi
 * tests/buget.test.js) și pentru că regulile de agregare sunt partea în
 * care greșelile costă cel mai mult — un total calculat greșit dă un
 * sfat greșit.
 *
 * Structura salvată:
 *   {
 *     version: 2,
 *     lunaCurenta: "2026-07",
 *     luni: {
 *       "2026-07": {
 *         venituri:   [{ id, nume, suma, tip }],
 *         cheltuieli: [{ id, nume, grupa, planificat, real, frecventaLuni, slot }]
 *       }
 *     }
 *   }
 */

/** Cele trei destinații posibile ale unui leu, conform regulii 50/30/20. */
const GRUPE = {
  nevoi: { eticheta: "Nevoie", tinta: 0.5 },
  dorinte: { eticheta: "Dorință", tinta: 0.3 },
  economii: { eticheta: "Economii", tinta: 0.2 },
};

/** Cât de des apare o cheltuială, în luni. */
const FRECVENTE_CHELTUIALA = [
  { luni: 1, eticheta: "Lunar" },
  { luni: 3, eticheta: "Trimestrial" },
  { luni: 6, eticheta: "Semestrial" },
  { luni: 12, eticheta: "Anual" },
];

/**
 * Câte categorii pot primi o culoare proprie în grafic.
 *
 * Paleta are opt culori distincte inclusiv pentru daltonism. A noua nu se
 * generează și nu se reia — categoriile fără slot se adună în „Altele”.
 * În tabel apar toate, individual.
 *
 * „Altele” nu consumă un slot: fiind un rest, nu o categorie, primește
 * un gri neutru. Astfel toate cele opt culori rămân pentru categorii
 * reale — inclusiv pentru cea de economii, care altfel ar fi ajuns
 * prima în gruparea „Altele” din structura implicită.
 */
const SLOTURI_CULOARE = 8;

/* ------------------------------------------------------------------ */
/* Construcție și migrare                                              */
/* ------------------------------------------------------------------ */

/** Cheia unei luni: "2026-07". Sortabilă alfabetic, deci și cronologic. */
function cheieLuna(date = new Date()) {
  const an = date.getFullYear();
  const luna = String(date.getMonth() + 1).padStart(2, "0");
  return `${an}-${luna}`;
}

/** "2026-07" → "iulie 2026" */
const NUME_LUNI = [
  "ianuarie", "februarie", "martie", "aprilie", "mai", "iunie",
  "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie",
];

function numeLuna(cheie) {
  const [an, luna] = String(cheie).split("-");
  const index = parseInt(luna, 10) - 1;
  if (!NUME_LUNI[index]) return cheie;
  return `${NUME_LUNI[index]} ${an}`;
}

/** Cheia lunii dinaintea celei date. */
function lunaAnterioara(cheie) {
  const [an, luna] = String(cheie).split("-").map(Number);
  const d = new Date(an, luna - 1, 1);
  d.setMonth(d.getMonth() - 1);
  return cheieLuna(d);
}

/** Cheia lunii de după cea dată. */
function lunaUrmatoare(cheie) {
  const [an, luna] = String(cheie).split("-").map(Number);
  const d = new Date(an, luna - 1, 1);
  d.setMonth(d.getMonth() + 1);
  return cheieLuna(d);
}

/** Categoriile propuse la prima folosire, cu grupa lor. */
const CATEGORII_IMPLICITE = [
  { nume: "Locuință", grupa: "nevoi" },
  { nume: "Utilități", grupa: "nevoi" },
  { nume: "Alimente", grupa: "nevoi" },
  { nume: "Transport", grupa: "nevoi" },
  { nume: "Sănătate", grupa: "nevoi" },
  { nume: "Divertisment", grupa: "dorinte" },
  { nume: "Abonamente", grupa: "dorinte" },
  { nume: "Economii", grupa: "economii" },
];

/** Șabloane de pornire, pentru cine nu știe de unde să înceapă. */
const SABLOANE = {
  student: {
    eticheta: "Student",
    descriere: "Chirie împărțită, fără mașină, venit din bursă sau part-time.",
    venituri: [{ nume: "Part-time / bursă", suma: 2500, tip: "fix" }],
    cheltuieli: [
      { nume: "Chirie (parte)", grupa: "nevoi", planificat: 900, frecventaLuni: 1 },
      { nume: "Utilități", grupa: "nevoi", planificat: 200, frecventaLuni: 1 },
      { nume: "Alimente", grupa: "nevoi", planificat: 600, frecventaLuni: 1 },
      { nume: "Transport", grupa: "nevoi", planificat: 100, frecventaLuni: 1 },
      { nume: "Telefon și internet", grupa: "nevoi", planificat: 60, frecventaLuni: 1 },
      { nume: "Ieșiri", grupa: "dorinte", planificat: 300, frecventaLuni: 1 },
      { nume: "Abonamente", grupa: "dorinte", planificat: 60, frecventaLuni: 1 },
      { nume: "Economii", grupa: "economii", planificat: 200, frecventaLuni: 1 },
    ],
  },
  singur: {
    eticheta: "Salariat, locuiește singur",
    descriere: "Un venit, chirie sau rată întreagă, cheltuieli obișnuite.",
    venituri: [{ nume: "Salariu net", suma: 6000, tip: "fix" }],
    cheltuieli: [
      { nume: "Chirie / rată", grupa: "nevoi", planificat: 2000, frecventaLuni: 1 },
      { nume: "Utilități", grupa: "nevoi", planificat: 450, frecventaLuni: 1 },
      { nume: "Alimente", grupa: "nevoi", planificat: 1000, frecventaLuni: 1 },
      { nume: "Transport", grupa: "nevoi", planificat: 400, frecventaLuni: 1 },
      { nume: "Telefon și internet", grupa: "nevoi", planificat: 100, frecventaLuni: 1 },
      { nume: "Asigurare locuință", grupa: "nevoi", planificat: 600, frecventaLuni: 12 },
      { nume: "Restaurant și ieșiri", grupa: "dorinte", planificat: 600, frecventaLuni: 1 },
      { nume: "Abonamente", grupa: "dorinte", planificat: 120, frecventaLuni: 1 },
      { nume: "Îmbrăcăminte", grupa: "dorinte", planificat: 200, frecventaLuni: 1 },
      { nume: "Vacanță", grupa: "dorinte", planificat: 4000, frecventaLuni: 12 },
      { nume: "Fond de urgență", grupa: "economii", planificat: 700, frecventaLuni: 1 },
    ],
  },
  familie: {
    eticheta: "Familie cu un copil",
    descriere: "Două venituri, cheltuieli de familie, costuri școlare.",
    venituri: [
      { nume: "Salariu 1", suma: 7000, tip: "fix" },
      { nume: "Salariu 2", suma: 5500, tip: "fix" },
      { nume: "Alocație", suma: 300, tip: "fix" },
    ],
    cheltuieli: [
      { nume: "Rată locuință", grupa: "nevoi", planificat: 3200, frecventaLuni: 1 },
      { nume: "Utilități", grupa: "nevoi", planificat: 800, frecventaLuni: 1 },
      { nume: "Alimente", grupa: "nevoi", planificat: 2200, frecventaLuni: 1 },
      { nume: "Transport și combustibil", grupa: "nevoi", planificat: 900, frecventaLuni: 1 },
      { nume: "Grădiniță / școală", grupa: "nevoi", planificat: 800, frecventaLuni: 1 },
      { nume: "Sănătate", grupa: "nevoi", planificat: 300, frecventaLuni: 1 },
      { nume: "Asigurări", grupa: "nevoi", planificat: 2400, frecventaLuni: 12 },
      { nume: "Ieșiri și activități", grupa: "dorinte", planificat: 700, frecventaLuni: 1 },
      { nume: "Abonamente", grupa: "dorinte", planificat: 150, frecventaLuni: 1 },
      { nume: "Vacanță", grupa: "dorinte", planificat: 9000, frecventaLuni: 12 },
      { nume: "Fond de urgență", grupa: "economii", planificat: 1000, frecventaLuni: 1 },
      { nume: "Investiții", grupa: "economii", planificat: 500, frecventaLuni: 1 },
    ],
  },
};

/** O lună goală, cu categoriile implicite și sume zero. */
function lunaNoua() {
  return {
    venituri: [{ id: 1, nume: "Salariu net", suma: 0, tip: "fix" }],
    cheltuieli: CATEGORII_IMPLICITE.map((c, i) => ({
      id: i + 1,
      nume: c.nume,
      grupa: c.grupa,
      planificat: 0,
      real: 0,
      frecventaLuni: 1,
      slot: i < SLOTURI_CULOARE ? i : null,
    })),
  };
}

/** Construiește o lună dintr-un șablon. */
function lunaDinSablon(cheie) {
  const s = SABLOANE[cheie];
  if (!s) return lunaNoua();
  return {
    venituri: s.venituri.map((v, i) => ({ id: i + 1, nume: v.nume, suma: v.suma, tip: v.tip })),
    cheltuieli: s.cheltuieli.map((c, i) => ({
      id: i + 1,
      nume: c.nume,
      grupa: c.grupa,
      planificat: c.planificat,
      real: 0,
      frecventaLuni: c.frecventaLuni,
      slot: i < SLOTURI_CULOARE ? i : null,
    })),
  };
}

/** Starea inițială a aplicației, cu o singură lună — cea curentă. */
function stareNoua() {
  const cheie = cheieLuna();
  return { version: 2, lunaCurenta: cheie, luni: { [cheie]: lunaNoua() } };
}

/** Un număr pozitiv dintr-o valoare de orice tip; 0 dacă nu se poate. */
function pozitiv(v) {
  const n = parseFloat(v);
  return isFinite(n) && n > 0 ? n : 0;
}

/**
 * Aduce orice stare salvată la forma curentă.
 *
 * Versiunea 1 avea un singur venit și o listă plată de cheltuieli, fără
 * lună și fără distincția plan/realizat. O convertim în luna curentă:
 * sumele vechi devin „planificat”, pentru că asta erau de fapt.
 *
 * @param {any} raw obiectul citit din localStorage
 * @returns {object} stare validă în versiunea 2
 */
function migreazaStare(raw) {
  if (!raw || typeof raw !== "object") return stareNoua();

  // Deja în format nou — validăm și returnăm.
  if (raw.version === 2 && raw.luni && typeof raw.luni === "object") {
    return normalizeazaStare(raw);
  }

  // Format vechi: { venit, expenses: [{ name, type, amount }] }
  if (Array.isArray(raw.expenses)) {
    const cheie = cheieLuna();
    const venit = pozitiv(raw.venit);
    const cheltuieli = raw.expenses.map((e, i) => ({
      id: i + 1,
      nume: typeof e.name === "string" ? e.name : "",
      // Vechiul model avea doar nevoi/dorințe; economiile erau restul.
      grupa: e.type === "dorinte" ? "dorinte" : "nevoi",
      planificat: pozitiv(e.amount),
      real: 0,
      frecventaLuni: 1,
      slot: i < SLOTURI_CULOARE ? i : null,
    }));

    return normalizeazaStare({
      version: 2,
      lunaCurenta: cheie,
      luni: {
        [cheie]: {
          venituri: [{ id: 1, nume: "Salariu net", suma: venit, tip: "fix" }],
          cheltuieli,
        },
      },
    });
  }

  return stareNoua();
}

/**
 * Curăță o stare de valori nevalide, ca restul codului să nu mai verifice.
 * Orice câmp lipsă sau corupt primește o valoare implicită rezonabilă.
 */
function normalizeazaStare(raw) {
  const luni = {};

  Object.keys(raw.luni || {}).forEach((cheie) => {
    // Acceptăm doar chei de forma AAAA-LL.
    if (!/^\d{4}-\d{2}$/.test(cheie)) return;
    const sursa = raw.luni[cheie] || {};

    const venituri = (Array.isArray(sursa.venituri) ? sursa.venituri : []).map((v, i) => ({
      id: i + 1,
      nume: typeof v.nume === "string" ? v.nume : "",
      suma: pozitiv(v.suma),
      tip: v.tip === "variabil" ? "variabil" : "fix",
    }));

    const cheltuieli = (Array.isArray(sursa.cheltuieli) ? sursa.cheltuieli : []).map((c, i) => ({
      id: i + 1,
      nume: typeof c.nume === "string" ? c.nume : "",
      grupa: GRUPE[c.grupa] ? c.grupa : "nevoi",
      planificat: pozitiv(c.planificat),
      real: pozitiv(c.real),
      frecventaLuni: FRECVENTE_CHELTUIALA.some((f) => f.luni === c.frecventaLuni)
        ? c.frecventaLuni
        : 1,
      slot: Number.isInteger(c.slot) && c.slot >= 0 && c.slot < SLOTURI_CULOARE ? c.slot : null,
    }));

    luni[cheie] = { venituri, cheltuieli };
  });

  // Fără nicio lună validă, pornim de la zero.
  if (Object.keys(luni).length === 0) return stareNoua();

  const lunaCurenta = luni[raw.lunaCurenta] ? raw.lunaCurenta : Object.keys(luni).sort().pop();

  return { version: 2, lunaCurenta, luni };
}

/* ------------------------------------------------------------------ */
/* Sloturi de culoare                                                  */
/* ------------------------------------------------------------------ */

/**
 * Cel mai mic slot de culoare neocupat, sau null dacă toate sunt luate.
 *
 * Slotul rămâne al categoriei cât timp aceasta există, deci culoarea nu
 * se schimbă când adaugi sau reordonezi altceva. Când o categorie este
 * ștearsă, slotul ei se eliberează pentru următoarea.
 */
function slotLiber(cheltuieli) {
  const ocupate = new Set(cheltuieli.map((c) => c.slot).filter((s) => s !== null));
  for (let s = 0; s < SLOTURI_CULOARE; s++) {
    if (!ocupate.has(s)) return s;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Agregări                                                            */
/* ------------------------------------------------------------------ */

/**
 * Suma pe care o cheltuială o consumă în fiecare lună.
 *
 * O asigurare de 1.200 lei plătită o dată pe an costă 100 lei pe lună,
 * chiar dacă banii pleacă într-o singură lună. Este cea mai frecventă
 * scăpare dintr-un buget lunar: cheltuielile rare par să nu existe până
 * în luna în care apar.
 */
function lunarEchivalent(cheltuiala) {
  const frecventa = cheltuiala.frecventaLuni || 1;
  return (cheltuiala.planificat || 0) / frecventa;
}

function totalVenit(luna) {
  return luna.venituri.reduce((s, v) => s + (v.suma || 0), 0);
}

/** Totalul planificat, exprimat ca sumă lunară echivalentă. */
function totalPlanificat(luna) {
  return luna.cheltuieli.reduce((s, c) => s + lunarEchivalent(c), 0);
}

/** Totalul chiar cheltuit în luna respectivă. */
function totalReal(luna) {
  return luna.cheltuieli.reduce((s, c) => s + (c.real || 0), 0);
}

/**
 * Totalurile pe cele trei grupe.
 * @param {"planificat"|"real"} camp ce se însumează
 */
function peGrupa(luna, camp = "planificat") {
  const rezultat = { nevoi: 0, dorinte: 0, economii: 0 };
  luna.cheltuieli.forEach((c) => {
    const valoare = camp === "real" ? c.real || 0 : lunarEchivalent(c);
    rezultat[c.grupa] = (rezultat[c.grupa] || 0) + valoare;
  });
  return rezultat;
}

/**
 * Indicatorii principali ai unei luni.
 *
 * „Nealocat” este partea din venit care nu are nicio destinație — nici
 * cheltuială, nici economie. Într-un buget complet trebuie să fie zero:
 * fiecare leu are un rost, chiar dacă acela este „economii”.
 */
function indicatori(luna, camp = "planificat") {
  const venit = totalVenit(luna);
  const grupe = peGrupa(luna, camp);
  const cheltuieliCurente = grupe.nevoi + grupe.dorinte;
  const economii = grupe.economii;
  const alocat = cheltuieliCurente + economii;
  const nealocat = venit - alocat;

  return {
    venit,
    grupe,
    cheltuieliCurente,
    economii,
    alocat,
    nealocat,
    // Rata de economisire include atât economiile planificate explicit,
    // cât și ce rămâne nealocat — ambele sunt bani care nu s-au cheltuit.
    rataEconomisire: venit > 0 ? (economii + Math.max(0, nealocat)) / venit : 0,
    // Cheltuielile totale, pentru fondul de urgență: economiile nu intră,
    // pentru că nu trebuie înlocuite dacă rămâi fără venit.
    cheltuieliPentruFond: cheltuieliCurente,
  };
}

/**
 * Diferența dintre plan și realitate, pe categorii.
 *
 * `diferenta` pozitivă înseamnă depășire. Sunt incluse doar categoriile
 * cu activitate — o categorie planificată zero și cheltuită zero nu spune
 * nimic și ar dilua lista.
 */
function abateri(luna) {
  return luna.cheltuieli
    .map((c) => {
      const planificatLunar = lunarEchivalent(c);
      const real = c.real || 0;
      return {
        id: c.id,
        nume: c.nume,
        grupa: c.grupa,
        planificat: planificatLunar,
        real,
        diferenta: real - planificatLunar,
        procent: planificatLunar > 0 ? real / planificatLunar - 1 : null,
      };
    })
    .filter((a) => a.planificat > 0 || a.real > 0)
    .sort((a, b) => Math.abs(b.diferenta) - Math.abs(a.diferenta));
}

/** Există măcar o sumă introdusă la „cheltuit efectiv”? */
function areDateReale(luna) {
  return luna.cheltuieli.some((c) => (c.real || 0) > 0);
}

/**
 * Evoluția lunilor, în ordine cronologică.
 *
 * Folosește cifrele reale acolo unde există și pe cele planificate în
 * rest, ca graficul să nu aibă goluri. Fiecare punct spune care variantă
 * a fost folosită, ca interfața să poată marca diferența.
 */
function evolutie(stare) {
  return Object.keys(stare.luni)
    .sort()
    .map((cheie) => {
      const luna = stare.luni[cheie];
      const real = areDateReale(luna);
      const ind = indicatori(luna, real ? "real" : "planificat");
      return {
        cheie,
        eticheta: numeLuna(cheie),
        venit: ind.venit,
        cheltuieli: ind.cheltuieliCurente,
        economii: ind.economii + Math.max(0, ind.nealocat),
        rataEconomisire: ind.rataEconomisire,
        dinDateReale: real,
      };
    });
}

/* ------------------------------------------------------------------ */
/* Repere pe categorii                                                 */
/* ------------------------------------------------------------------ */

/**
 * Praguri orientative, ca procent din venitul net.
 *
 * Nu sunt norme — sunt intervale în care se încadrează majoritatea
 * bugetelor echilibrate. Depășirea unuia nu este o greșeală, dar
 * înseamnă că altceva trebuie să fie sub reper.
 */
const REPERE = [
  { cuvinte: ["locuin", "chirie", "rata locu", "ipotec"], eticheta: "Locuință", maxim: 0.35 },
  { cuvinte: ["utilit", "intretinere", "întreținere", "gaz", "curent"], eticheta: "Utilități", maxim: 0.1 },
  { cuvinte: ["aliment", "mancare", "mâncare", "cumparaturi"], eticheta: "Alimente", maxim: 0.15 },
  { cuvinte: ["transport", "combustibil", "benzin", "masina", "mașina"], eticheta: "Transport", maxim: 0.15 },
  { cuvinte: ["restaurant", "iesir", "ieșir", "divertis"], eticheta: "Ieșiri", maxim: 0.1 },
  { cuvinte: ["abonament"], eticheta: "Abonamente", maxim: 0.05 },
];

/** Textul, fără diacritice și cu litere mici — pentru potrivirea reperelor. */
function faraDiacritice(text) {
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[șş]/g, "s")
    .replace(/[țţ]/g, "t");
}

/** Reperul care se potrivește denumirii unei categorii, dacă există. */
function reperPentru(nume) {
  const n = faraDiacritice(nume);
  return REPERE.find((r) => r.cuvinte.some((c) => n.includes(faraDiacritice(c)))) || null;
}

/**
 * Categoriile care depășesc reperul lor, cu cât și cu ce sugestie.
 * Lista este goală atunci când totul este în limite — cazul bun.
 */
function depasiriRepere(luna) {
  const venit = totalVenit(luna);
  if (venit <= 0) return [];

  return luna.cheltuieli
    .map((c) => {
      const reper = reperPentru(c.nume);
      if (!reper) return null;
      const lunar = lunarEchivalent(c);
      const cota = lunar / venit;
      if (cota <= reper.maxim) return null;
      return {
        nume: c.nume,
        eticheta: reper.eticheta,
        cota,
        maxim: reper.maxim,
        exces: lunar - venit * reper.maxim,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.exces - a.exces);
}
