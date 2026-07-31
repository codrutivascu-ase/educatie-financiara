/**
 * Funcții financiare comune (credite, amortizare, dobândă compusă).
 * Sunt funcții pure — primesc numere, returnează numere.
 */

/**
 * Rata lunară pentru un credit cu rate egale (anuitate).
 *
 * Formula: P × r / (1 − (1+r)^−n), unde r este dobânda lunară.
 * La dobândă 0 se reduce la simpla împărțire a sumei la număr de luni.
 *
 * @param {number} principal suma împrumutată
 * @param {number} annualRatePct dobânda anuală, în procente (ex. 6.5)
 * @param {number} months numărul de rate
 */
function monthlyPayment(principal, annualRatePct, months) {
  if (principal <= 0 || months <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  if (r === 0) return principal / months;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

/**
 * Construiește graficul de rambursare lună cu lună.
 *
 * La fiecare rată, dobânda se calculează pe soldul rămas, iar restul
 * ratei reduce principalul. De aceea la începutul creditului plătești
 * aproape numai dobândă, iar spre final aproape numai principal.
 *
 * @param {number} principal
 * @param {number} annualRatePct
 * @param {number} months durata contractuală
 * @param {number} [extraMonthly] sumă plătită suplimentar în fiecare lună
 * @returns {{schedule: Array, monthsUsed: number, totalInterest: number,
 *            totalPaid: number, monthlyPaymentBase: number}}
 */
function buildAmortizationSchedule(principal, annualRatePct, months, extraMonthly = 0) {
  const r = annualRatePct / 100 / 12;
  const basePayment = monthlyPayment(principal, annualRatePct, months);
  const schedule = [];
  let balance = principal;
  let totalInterest = 0;
  let month = 0;

  // Limita superioară previne o buclă infinită dacă rata nu acoperă dobânda.
  const maxMonths = months + 1200;

  while (balance > 0.5 && month < maxMonths) {
    month += 1;
    const interest = balance * r;
    let principalPaid = basePayment - interest + extraMonthly;

    // Dacă rata nu acoperă nici măcar dobânda, soldul ar crește la infinit.
    if (principalPaid <= 0) break;

    let payment = basePayment + extraMonthly;
    // Ultima rată este doar cât a mai rămas de plată.
    if (principalPaid > balance) {
      principalPaid = balance;
      payment = principalPaid + interest;
    }
    balance = Math.max(0, balance - principalPaid);
    totalInterest += interest;
    schedule.push({ month, payment, interest, principal: principalPaid, balance });

    if (month >= months && extraMonthly === 0) break;
  }

  return {
    schedule,
    monthsUsed: schedule.length,
    totalInterest,
    totalPaid: principal + totalInterest,
    monthlyPaymentBase: basePayment,
  };
}

/**
 * Simulează achitarea mai multor datorii cu un buget lunar total fix.
 *
 * Ambele strategii plătesc minimul la toate datoriile, apoi trimit tot
 * ce rămâne către o singură datorie „țintă”:
 *
 *   avalanche — datoria cu cea mai mare dobândă (cost total minim);
 *   snowball  — datoria cu cel mai mic sold (prima victorie vine repede,
 *               ceea ce ajută motivația chiar dacă plătești ceva mai mult).
 *
 * @param {Array<{name:string, balance:number, rate:number, minPayment:number}>} debts
 * @param {number} monthlyBudget bugetul lunar total disponibil
 * @param {"avalanche"|"snowball"} strategy
 */
function simulateDebtPayoff(debts, monthlyBudget, strategy) {
  const items = debts.map((d) => ({ ...d, balance: d.balance }));
  const totalMin = items.reduce((s, d) => s + d.minPayment, 0);

  // Fără acoperirea minimelor, simularea nu are sens.
  if (monthlyBudget < totalMin) {
    return { months: Infinity, totalInterest: Infinity, timeline: [], payoffOrder: [], feasible: false };
  }

  let month = 0;
  let totalInterest = 0;
  const timeline = [];
  const payoffOrder = [];
  const maxMonths = 1200;

  while (items.some((d) => d.balance > 0.5) && month < maxMonths) {
    month += 1;
    let budget = monthlyBudget;

    // 1. Dobânda lunii se adaugă la fiecare sold.
    items.forEach((d) => {
      if (d.balance <= 0.5) return;
      const interest = (d.balance * d.rate) / 100 / 12;
      d.balance += interest;
      totalInterest += interest;
    });

    // 2. Plătim minimul la fiecare datorie activă.
    items.forEach((d) => {
      if (d.balance <= 0.5) return;
      const pay = Math.min(d.minPayment, d.balance, budget);
      d.balance -= pay;
      budget -= pay;
    });

    // 3. Restul bugetului merge integral către datoria-țintă.
    const active = items.filter((d) => d.balance > 0.5);
    if (active.length > 0 && budget > 0) {
      const target = active.reduce((best, d) => {
        if (strategy === "avalanche") return d.rate > best.rate ? d : best;
        return d.balance < best.balance ? d : best;
      }, active[0]);
      const pay = Math.min(budget, target.balance);
      target.balance -= pay;
      budget -= pay;
    }

    // Reținem ordinea în care se sting datoriile.
    items.forEach((d) => {
      if (d.balance <= 0.5 && !payoffOrder.some((p) => p.name === d.name)) {
        payoffOrder.push({ name: d.name, month });
      }
    });

    timeline.push(items.reduce((s, d) => s + Math.max(0, d.balance), 0));
  }

  return { months: month, totalInterest, timeline, payoffOrder, feasible: true };
}

/* ==================================================================== */
/* Simulare cu randament variabil (Monte Carlo)                         */
/* ==================================================================== */

/**
 * Generator pseudo-aleator cu sămânță (mulberry32).
 *
 * Folosim un generator cu sămânță fixă, nu Math.random(), pentru ca
 * aceleași date introduse să producă mereu același grafic. Altfel
 * simularea s-ar schimba la fiecare redesenare (redimensionare, schimbare
 * de temă), iar utilizatorul ar crede că valorile sunt arbitrare.
 *
 * @param {number} seed
 * @returns {() => number} funcție care întoarce numere în [0, 1)
 */
function seededRandom(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Transformă două numere uniforme într-unul cu distribuție normală
 * standard (metoda Box-Muller).
 */
function normalFrom(rand) {
  let u = 0;
  // log(0) este −infinit, deci respingem exact zero.
  while (u === 0) u = rand();
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Simulează evoluția unui portofoliu cu randament anual aleator.
 *
 * Spre deosebire de proiecția cu randament constant, aici fiecare an
 * primește un randament extras dintr-o distribuție normală. Rezultatul
 * nu mai este o curbă, ci o plajă de rezultate posibile — ceea ce
 * seamănă mult mai bine cu ce se întâmplă în realitate pe bursă.
 *
 * Randamentele sunt aplicate ca randamente logaritmice, ca soldul să nu
 * poată deveni negativ (o scădere de 100% este limita, nu un punct de
 * trecere în minus).
 *
 * @param {object} opts
 * @param {number} opts.initial suma inițială
 * @param {number} opts.monthly contribuția lunară
 * @param {number} opts.years orizontul, în ani
 * @param {number} opts.meanReturnPct randamentul mediu anual, în procente
 * @param {number} opts.volatilityPct abaterea standard anuală, în procente
 * @param {number} [opts.runs] numărul de simulări
 * @param {number} [opts.seed] sămânța generatorului
 * @returns {{p10:number[], p50:number[], p90:number[], finals:number[],
 *            probLoss:number, worst:number, best:number}}
 */
function simulateMonteCarlo({
  initial,
  monthly,
  years,
  meanReturnPct,
  volatilityPct,
  runs = 500,
  seed = 12345,
}) {
  const rand = seededRandom(seed);
  const mu = meanReturnPct / 100;
  const sigma = Math.max(0, volatilityPct / 100);
  const totalContributed = initial + monthly * 12 * years;

  // paths[an][simulare] — reținem toți anii ca să putem calcula percentile.
  const paths = Array.from({ length: years + 1 }, () => new Array(runs));

  for (let run = 0; run < runs; run++) {
    let balance = initial;
    paths[0][run] = balance;

    for (let year = 1; year <= years; year++) {
      // Randament logaritmic: media aritmetică se corectează cu σ²/2,
      // altfel simularea ar avea o medie sistematic mai mare decât cea cerută.
      const drift = Math.log(1 + mu) - (sigma * sigma) / 2;
      const annualFactor = Math.exp(drift + sigma * normalFrom(rand));
      const monthlyFactor = Math.pow(annualFactor, 1 / 12);

      for (let m = 0; m < 12; m++) {
        balance = balance * monthlyFactor + monthly;
      }
      paths[year][run] = balance;
    }
  }

  /** Percentila cerută dintr-un an, prin sortare directă. */
  function percentile(values, p) {
    const sorted = [...values].sort((a, b) => a - b);
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.round((p / 100) * (sorted.length - 1))));
    return sorted[idx];
  }

  const finals = paths[years];
  return {
    p10: paths.map((yearValues) => percentile(yearValues, 10)),
    p50: paths.map((yearValues) => percentile(yearValues, 50)),
    p90: paths.map((yearValues) => percentile(yearValues, 90)),
    finals,
    // Cât de des ajungi să ai mai puțin decât ai depus — riscul real perceput.
    probLoss: finals.filter((v) => v < totalContributed).length / runs,
    worst: Math.min(...finals),
    best: Math.max(...finals),
  };
}

/* ==================================================================== */
/* Salariu brut → net (România)                                         */
/* ==================================================================== */

/**
 * Cotele de contribuții valabile pentru un contract de muncă standard.
 * Sunt expuse ca obiect pentru ca pagina să le poată afișa și pentru ca
 * o modificare legislativă să se facă într-un singur loc.
 */
const CONTRIBUTII = {
  cas: 0.25, // pensie, reținută de la salariat
  cass: 0.1, // sănătate, reținută de la salariat
  impozit: 0.1, // impozit pe venit
  cam: 0.0225, // contribuția asiguratorie pentru muncă, plătită de angajator
};

/** Cota din brut care merge la Pilonul II (din cei 25% CAS). */
const COTA_PILON2 = 0.0475;

/** Plafonul lunar deductibil la Pilon III (400 EUR/an, la ~5 lei/EUR). */
const PLAFON_PILON3_LUNAR = (400 * 5) / 12;

/**
 * Deducerea personală de bază.
 *
 * Se acordă integral până la nivelul salariului minim brut, apoi scade
 * treptat și dispare complet peste salariul minim + 2.000 lei. Procentul
 * de pornire depinde de numărul de persoane aflate în întreținere.
 *
 * Este o aproximare liniară a tabelului din lege — legea folosește
 * intervale de câte 100 de lei, deci pot apărea diferențe de câțiva lei.
 *
 * @param {number} gross salariul brut lunar
 * @param {number} minWage salariul minim brut pe economie
 * @param {number} dependents persoane în întreținere (0-4+)
 */
function deducerePersonala(gross, minWage, dependents = 0) {
  const PROCENTE = [0.2, 0.25, 0.3, 0.35, 0.45];
  const pct = PROCENTE[Math.min(dependents, PROCENTE.length - 1)];
  const deducereMaxima = minWage * pct;

  if (gross <= minWage) return deducereMaxima;
  if (gross > minWage + 2000) return 0;

  // Între cele două praguri, deducerea scade proporțional cu depășirea.
  const factor = 1 - (gross - minWage) / 2000;
  return deducereMaxima * factor;
}

/**
 * Calculează salariul net pornind de la brut.
 *
 * @param {number} gross salariul brut lunar
 * @param {object} [opts]
 * @param {number} [opts.minWage] salariul minim brut pe economie
 * @param {number} [opts.dependents] persoane în întreținere
 * @param {boolean} [opts.pillar3] dacă se reține contribuție la Pilon III
 * @param {number} [opts.pillar3Amount] suma lunară la Pilon III
 * @returns {{gross:number, cas:number, cass:number, deducere:number,
 *            bazaImpozabila:number, impozit:number, net:number,
 *            cam:number, costTotalAngajator:number, taxRate:number}}
 */
function salariuNet(gross, opts = {}) {
  const { minWage = 4050, dependents = 0, pillar3Amount = 0 } = opts;

  if (gross <= 0) {
    return {
      gross: 0, cas: 0, cass: 0, deducere: 0, bazaImpozabila: 0,
      impozit: 0, net: 0, cam: 0, costTotalAngajator: 0, taxRate: 0,
    };
  }

  const cas = gross * CONTRIBUTII.cas;
  const cass = gross * CONTRIBUTII.cass;
  const deducere = deducerePersonala(gross, minWage, dependents);

  // Pilonul III este deductibil la calculul impozitului, în limita legală.
  const deducerePilon3 = Math.min(pillar3Amount, PLAFON_PILON3_LUNAR);

  const bazaImpozabila = Math.max(0, gross - cas - cass - deducere - deducerePilon3);
  const impozit = bazaImpozabila * CONTRIBUTII.impozit;
  const net = gross - cas - cass - impozit - pillar3Amount;
  const cam = gross * CONTRIBUTII.cam;

  return {
    gross,
    cas,
    cass,
    deducere,
    bazaImpozabila,
    impozit,
    net,
    cam,
    costTotalAngajator: gross + cam,
    // Cât din costul total al angajatorului ajunge efectiv la angajat.
    taxRate: (gross + cam - net) / (gross + cam),
  };
}

/**
 * Brutul necesar pentru un net dorit, găsit prin căutare binară.
 *
 * Relația brut → net nu este liniară (deducerea personală scade în trepte),
 * deci nu există o formulă inversă simplă.
 */
function brutDinNet(targetNet, opts = {}) {
  if (targetNet <= 0) return 0;
  let low = targetNet;
  let high = targetNet * 3 + 10000;

  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2;
    if (salariuNet(mid, opts).net < targetNet) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

/* ==================================================================== */
/* Forme de organizare a venitului: CIM, PFA, SRL cu impozit pe micro   */
/* ==================================================================== */

/**
 * Parametrii fiscali folosiți la compararea celor trei forme.
 *
 * Sunt strânși într-un singur obiect pentru că aproape toți se schimbă
 * anual prin lege, iar pagina îi expune ca inputuri editabile. Pragurile
 * sunt exprimate în număr de salarii minime, nu în lei, pentru că așa
 * sunt scrise și în Codul fiscal — se actualizează singure când se
 * modifică salariul minim.
 */
const FISCAL_FORME = {
  an: 2026,
  salariuMinim: 4050,
  pfa: {
    cas: 25,
    cass: 10,
    impozit: 10,
    // CAS se datorează în trepte: sub 12 salarii minime nu se datorează
    // deloc, între 12 și 24 se calculează la 12, peste 24 se calculează la 24.
    pragCasInferior: 12,
    pragCasSuperior: 24,
    // CASS se calculează pe venitul net efectiv, dar închis între aceste limite.
    cassMin: 6,
    cassMax: 60,
  },
  srl: {
    micro: 1, // 1% pentru venituri sub 60.000 EUR, 3% peste sau la anumite coduri CAEN
    dividende: 16,
    cass: 10,
    // Pentru dividende, CASS nu se calculează pe venitul realizat, ci pe
    // treapta în care acesta se încadrează — de aici saltul brusc la prag.
    trepteCass: [6, 12, 24],
  },
};

/**
 * Contract individual de muncă, pornind de la costul total al angajatorului.
 *
 * Comparația dintre forme are sens doar dacă toate pleacă de la aceeași
 * sumă plătită de cel care cumpără munca. La un salariat, acea sumă nu
 * este brutul, ci brutul plus CAM — de aceea calculul pornește invers,
 * din cost către brut.
 *
 * Calculul lunar nu poate fi înlocuit cu unul anual împărțit la 12,
 * pentru că deducerea personală se aplică lunar și în trepte.
 *
 * @param {object} opts
 * @param {number} opts.costAnual suma anuală plătită de angajator
 * @param {number} [opts.salariuMinim]
 * @param {number} [opts.dependents] persoane în întreținere
 * @returns {{costAnual:number, brutLunar:number, brutAnual:number,
 *            cam:number, cas:number, cass:number, impozit:number,
 *            netLunar:number, netAnual:number, cheltuieli:number,
 *            contributii:number, impozite:number, rataEfectiva:number}}
 */
function venitCIM({ costAnual, salariuMinim = FISCAL_FORME.salariuMinim, dependents = 0 }) {
  const costLunar = Math.max(0, costAnual) / 12;
  const brutLunar = costLunar / (1 + CONTRIBUTII.cam);
  const r = salariuNet(brutLunar, { minWage: salariuMinim, dependents });

  const contributii = (r.cas + r.cass + r.cam) * 12;
  const impozite = r.impozit * 12;
  const netAnual = r.net * 12;

  return {
    costAnual: Math.max(0, costAnual),
    brutLunar,
    brutAnual: brutLunar * 12,
    cam: r.cam * 12,
    cas: r.cas * 12,
    cass: r.cass * 12,
    impozit: impozite,
    netLunar: r.net,
    netAnual,
    cheltuieli: 0,
    contributii,
    impozite,
    rataEfectiva: costAnual > 0 ? (costAnual - netAnual) / costAnual : 0,
  };
}

/**
 * PFA în sistem real: venit net = încasări − cheltuieli deductibile.
 *
 * Ordinea contează și nu este intuitivă: CAS și CASS se calculează pe
 * venitul net, iar impozitul de 10% se aplică pe ce rămâne *după* ele.
 * De aceea un PFA nu plătește 45% din venit, cum ar sugera adunarea
 * cotelor, ci vizibil mai puțin.
 *
 * Pragurile produc discontinuități reale: la un leu peste 12 salarii
 * minime apare dintr-odată CAS pe un an întreg. Modelul le păstrează
 * exact pentru că tocmai ele sunt lecția.
 *
 * @param {object} opts
 * @param {number} opts.venituri încasările anuale, fără TVA
 * @param {number} [opts.cheltuieli] cheltuieli deductibile anuale
 * @param {number} [opts.salariuMinim]
 * @param {boolean} [opts.areSalariu] dacă persoana are și un contract de
 *        muncă — atunci baza minimă de 6 salarii minime la CASS nu se aplică,
 *        pentru că CASS este deja plătită pe salariu
 * @param {object} [opts.cote] suprascrie cotele implicite
 */
function venitPFA({
  venituri,
  cheltuieli = 0,
  salariuMinim = FISCAL_FORME.salariuMinim,
  areSalariu = false,
  cote = {},
}) {
  const c = { ...FISCAL_FORME.pfa, ...cote };
  const incasari = Math.max(0, venituri);
  const costuri = Math.max(0, cheltuieli);
  const venitNet = Math.max(0, incasari - costuri);

  /* --- CAS: în trepte, pe praguri exprimate în salarii minime --------- */
  const pragJos = c.pragCasInferior * salariuMinim;
  const pragSus = c.pragCasSuperior * salariuMinim;
  let bazaCas = 0;
  if (venitNet >= pragSus) bazaCas = pragSus;
  else if (venitNet >= pragJos) bazaCas = pragJos;
  const cas = bazaCas * (c.cas / 100);

  /* --- CASS: pe venitul net, dar închis între o limită de jos și una de sus */
  let bazaCass = 0;
  if (incasari > 0) {
    const plafonJos = areSalariu ? 0 : c.cassMin * salariuMinim;
    const plafonSus = c.cassMax * salariuMinim;
    bazaCass = Math.min(Math.max(venitNet, plafonJos), plafonSus);
  }
  const cass = bazaCass * (c.cass / 100);

  /* --- Impozitul, pe ce rămâne după contribuții ----------------------- */
  const bazaImpozabila = Math.max(0, venitNet - cas - cass);
  const impozit = bazaImpozabila * (c.impozit / 100);

  const netAnual = venitNet - cas - cass - impozit;

  return {
    venituri: incasari,
    cheltuieli: costuri,
    venitNet,
    bazaCas,
    cas,
    bazaCass,
    cass,
    bazaImpozabila,
    impozit,
    netAnual,
    contributii: cas + cass,
    impozite: impozit,
    rataEfectiva: incasari > 0 ? (incasari - netAnual) / incasari : 0,
  };
}

/**
 * SRL plătitor de impozit pe veniturile microîntreprinderilor, cu banii
 * scoși ca dividende.
 *
 * Două lucruri sunt ușor de ratat aici:
 *
 *   1. impozitul micro se aplică pe *venituri*, nu pe profit — cheltuielile
 *      nu îl reduc, spre deosebire de impozitul pe profit;
 *   2. banii ajung la asociat abia după al doilea impozit, cel pe dividende,
 *      plus CASS pe treaptă. Suma vizibilă în contul firmei nu este suma
 *      pe care o poți folosi.
 *
 * Modelul presupune că întreg profitul se distribuie ca dividende în același
 * an. Un asociat care lasă banii în firmă amână al doilea impozit.
 *
 * @param {object} opts
 * @param {number} opts.venituri încasările anuale ale firmei
 * @param {number} [opts.cheltuieli] cheltuielile anuale de funcționare
 *        (contabilitate, salariatul obligatoriu, comisioane bancare)
 * @param {number} [opts.salariuMinim]
 * @param {object} [opts.cote] suprascrie cotele implicite
 */
function venitSRLMicro({
  venituri,
  cheltuieli = 0,
  salariuMinim = FISCAL_FORME.salariuMinim,
  cote = {},
}) {
  const c = { ...FISCAL_FORME.srl, ...cote };
  const incasari = Math.max(0, venituri);
  const costuri = Math.max(0, cheltuieli);

  const impozitMicro = incasari * (c.micro / 100);
  // Impozitul micro este el însuși o cheltuială a firmei, deci reduce
  // profitul care poate fi distribuit.
  const profitDistribuibil = Math.max(0, incasari - costuri - impozitMicro);

  const impozitDividende = profitDistribuibil * (c.dividende / 100);

  /* --- CASS pe dividende: în trepte, pe dividendul brut ---------------- */
  let bazaCass = 0;
  for (const trepte of c.trepteCass) {
    if (profitDistribuibil >= trepte * salariuMinim) bazaCass = trepte * salariuMinim;
  }
  const cass = bazaCass * (c.cass / 100);

  const netAnual = Math.max(0, profitDistribuibil - impozitDividende - cass);

  return {
    venituri: incasari,
    cheltuieli: costuri,
    impozitMicro,
    profitDistribuibil,
    impozitDividende,
    bazaCass,
    cass,
    netAnual,
    contributii: cass,
    impozite: impozitMicro + impozitDividende,
    rataEfectiva: incasari > 0 ? (incasari - netAnual) / incasari : 0,
  };
}

/**
 * Rulează aceeași sumă anuală prin toate cele trei forme.
 *
 * Baza comună este suma pe care o plătește cel care cumpără munca: costul
 * total al angajatorului la un contract de muncă, respectiv factura emisă
 * de PFA sau SRL. Orice altă bază (brutul, de exemplu) ar avantaja artificial
 * salariul, pentru că ar ascunde CAM.
 *
 * @returns {{cim:object, pfa:object, srl:object, castigator:string}}
 */
function compareFormeVenit({
  sumaAnuala,
  cheltuieliPfa = 0,
  cheltuieliSrl = 0,
  salariuMinim = FISCAL_FORME.salariuMinim,
  dependents = 0,
  areSalariu = false,
  cotePfa = {},
  coteSrl = {},
}) {
  const cim = venitCIM({ costAnual: sumaAnuala, salariuMinim, dependents });
  const pfa = venitPFA({
    venituri: sumaAnuala,
    cheltuieli: cheltuieliPfa,
    salariuMinim,
    areSalariu,
    cote: cotePfa,
  });
  const srl = venitSRLMicro({
    venituri: sumaAnuala,
    cheltuieli: cheltuieliSrl,
    salariuMinim,
    cote: coteSrl,
  });

  const clasament = [
    { cheie: "cim", net: cim.netAnual },
    { cheie: "pfa", net: pfa.netAnual },
    { cheie: "srl", net: srl.netAnual },
  ].sort((a, b) => b.net - a.net);

  return { cim, pfa, srl, castigator: clasament[0].cheie, clasament };
}

/* ==================================================================== */
/* Pensii                                                               */
/* ==================================================================== */

/**
 * Reperul folosit pentru Pilonul I: raportul dintre pensia medie aflată
 * în plată și câștigul salarial mediu net, la nivelul întregului sistem.
 *
 * Pilonul I nu este un cont care se acumulează, deci nu poate fi proiectat
 * ca pilonii II și III. Singura estimare onestă este să presupunem că
 * raportul de astăzi dintre pensii și salarii se menține — de aceea valorile
 * de mai jos sunt expuse explicit și pot fi modificate din interfață.
 *
 * Sursa: câștigul salarial mediu net (INS) și pensia medie de asigurări
 * sociale de stat (CNPP), valori medii pentru 2025, rotunjite. Ambele se
 * publică lunar și se schimbă des — verifică-le înainte de a te baza pe ele.
 */
const REPER_PILON1 = {
  an: 2025,
  pensieMedie: 2900,
  salariuNetMediu: 5300,
};

/** Rata de înlocuire care rezultă din reperele de mai sus (~55%). */
const RATA_INLOCUIRE_PILON1 =
  (REPER_PILON1.pensieMedie / REPER_PILON1.salariuNetMediu) * 100;

/**
 * Oprește creșterea salariului la un plafon.
 *
 * O creștere procentuală constantă aplicată timp de treizeci și ceva de ani
 * duce la salarii care nu există: 5% pe an transformă 8.000 de lei în peste
 * 44.000. Contribuțiile proiectate de acolo sunt la fel de nerealiste, iar
 * rezultatul final pare mult mai bun decât ar fi.
 *
 * Plafonul nu poate coborî sub salariul de pornire: dacă cineva câștigă deja
 * peste el, proiecția îi păstrează salariul constant în loc să i-l taie.
 *
 * @param {number} salary salariul rezultat din creștere
 * @param {number} startSalary salariul de la care s-a pornit
 * @param {number} [cap] plafonul; fără el, salariul crește neîngrădit
 */
function capSalary(salary, startSalary, cap = Infinity) {
  if (!isFinite(cap) || cap <= 0) return salary;
  return Math.min(salary, Math.max(cap, startSalary));
}

/**
 * Estimează pensia din Pilonul I aplicând o rată de înlocuire salariului
 * net din ultimul an de activitate.
 *
 * Este deliberat o regulă de trei, nu formula legală: punctajul din legea
 * pensiilor depinde de întregul istoric de contribuții și de valoarea
 * punctului de referință de la data pensionării, două lucruri care nu pot
 * fi cunoscute azi. Rata de înlocuire spune, în schimb, ceva verificabil:
 * cât din salariu au primit ca pensie cei care s-au pensionat până acum.
 *
 * @param {object} opts
 * @param {number} opts.grossSalary salariul brut lunar de azi
 * @param {number} opts.currentAge vârsta actuală
 * @param {number} opts.retirementAge vârsta de pensionare
 * @param {number} opts.wageGrowthPct creșterea anuală a salariului, %
 * @param {number} opts.replacementRatePct rata de înlocuire presupusă, %
 * @param {number} [opts.minWage] salariul minim brut, pentru deducere
 * @param {number} [opts.salaryCap] plafonul peste care salariul nu mai crește
 * @returns {{yearsToRetire:number, grossAtRetirement:number,
 *            netAtRetirement:number, monthlyPension:number}}
 */
function estimatePillar1({
  grossSalary,
  currentAge,
  retirementAge,
  wageGrowthPct,
  replacementRatePct,
  minWage = 4050,
  salaryCap = Infinity,
}) {
  const yearsToRetire = Math.max(0, Math.round(retirementAge - currentAge));
  const grossAtRetirement = capSalary(
    grossSalary * Math.pow(1 + wageGrowthPct / 100, yearsToRetire),
    grossSalary,
    salaryCap
  );
  const netAtRetirement = salariuNet(grossAtRetirement, { minWage }).net;

  return {
    yearsToRetire,
    grossAtRetirement,
    netAtRetirement,
    monthlyPension: netAtRetirement * (replacementRatePct / 100),
  };
}

/**
 * Proiectează pensia acumulată în pilonii II și III până la pensionare.
 *
 * Modelul presupune că salariul crește anual cu un procent constant și că
 * randamentul fondurilor este de asemenea constant — ambele simplificări.
 * Contribuția la Pilonul II este un procent din brut, deci crește odată
 * cu salariul; cea la Pilonul III este o sumă fixă aleasă de utilizator.
 *
 * @param {object} opts
 * @param {number} opts.grossSalary salariul brut lunar de azi
 * @param {number} opts.currentAge vârsta actuală
 * @param {number} opts.retirementAge vârsta de pensionare
 * @param {number} opts.wageGrowthPct creșterea anuală a salariului, %
 * @param {number} opts.pillar2ReturnPct randamentul anual al Pilonului II, %
 * @param {number} opts.pillar3Monthly contribuția lunară la Pilon III
 * @param {number} opts.pillar3ReturnPct randamentul anual al Pilonului III, %
 * @param {number} [opts.existingPillar2] sold deja acumulat în Pilon II
 * @param {number} [opts.salaryCap] plafonul peste care salariul nu mai crește
 * @returns {{years:number[], pillar2:number[], pillar3:number[],
 *            contributed2:number, contributed3:number,
 *            final2:number, final3:number, total:number}}
 */
function projectPension({
  grossSalary,
  currentAge,
  retirementAge,
  wageGrowthPct,
  pillar2ReturnPct,
  pillar3Monthly,
  pillar3ReturnPct,
  existingPillar2 = 0,
  salaryCap = Infinity,
}) {
  const yearsToRetire = Math.max(0, Math.round(retirementAge - currentAge));
  const r2 = Math.pow(1 + pillar2ReturnPct / 100, 1 / 12) - 1;
  const r3 = Math.pow(1 + pillar3ReturnPct / 100, 1 / 12) - 1;

  const years = [0];
  const pillar2 = [existingPillar2];
  const pillar3 = [0];

  let balance2 = existingPillar2;
  let balance3 = 0;
  let contributed2 = 0;
  let contributed3 = 0;
  let salary = grossSalary;

  for (let y = 1; y <= yearsToRetire; y++) {
    const monthly2 = salary * COTA_PILON2;
    for (let m = 0; m < 12; m++) {
      balance2 = balance2 * (1 + r2) + monthly2;
      balance3 = balance3 * (1 + r3) + pillar3Monthly;
      contributed2 += monthly2;
      contributed3 += pillar3Monthly;
    }
    // Salariul crește până la plafon, apoi rămâne acolo — la fel și
    // contribuția la Pilonul II, care este un procent din el.
    salary = capSalary(salary * (1 + wageGrowthPct / 100), grossSalary, salaryCap);

    years.push(y);
    pillar2.push(balance2);
    pillar3.push(balance3);
  }

  return {
    years,
    pillar2,
    pillar3,
    contributed2,
    contributed3,
    final2: balance2,
    final3: balance3,
    total: balance2 + balance3,
  };
}

/* ==================================================================== */
/* Inflație și cost de oportunitate                                     */
/* ==================================================================== */

/**
 * Cât valorează astăzi o sumă din trecut, sau invers.
 *
 * @param {number} amount suma nominală
 * @param {number} years numărul de ani (negativ pentru trecut)
 * @param {number} inflationPct inflația medie anuală, %
 */
function adjustForInflation(amount, years, inflationPct) {
  return amount * Math.pow(1 + inflationPct / 100, years);
}

/**
 * Puterea de cumpărare pierdută dacă banii stau într-un cont fără dobândă
 * (sau cu o dobândă mai mică decât inflația).
 *
 * @returns {{nominal:number[], real:number[], lostPct:number}}
 */
function purchasingPower(amount, years, inflationPct, interestPct = 0) {
  const nominal = [];
  const real = [];
  for (let y = 0; y <= years; y++) {
    const nom = amount * Math.pow(1 + interestPct / 100, y);
    nominal.push(nom);
    real.push(nom / Math.pow(1 + inflationPct / 100, y));
  }
  return {
    nominal,
    real,
    lostPct: amount > 0 ? 1 - real[real.length - 1] / amount : 0,
  };
}
