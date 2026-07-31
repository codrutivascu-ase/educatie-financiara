/**
 * Comparație între contract de muncă, PFA și SRL cu impozit pe micro.
 *
 * Formulele stau în finance.js; aici este doar interfața. Pagina răspunde
 * la o singură întrebare — „din aceeași sumă, ce îmi rămâne în mână?” —
 * și încearcă să facă vizibil *de ce* răspunsul se schimbă cu venitul:
 * pragurile fiscale nu sunt line, iar la un leu peste ele apare dintr-odată
 * o contribuție pe un an întreg.
 */

/**
 * Numele afișate și ordinea în care apar peste tot în pagină.
 *
 * `fraza` există separat pentru că titlurile nu se pot pune într-o
 * propoziție prin simpla trecere la litere mici: „PFA” ar deveni „pfa”.
 */
const FORME = [
  { cheie: "cim", nume: "Contract de muncă", fraza: "contractul de muncă" },
  { cheie: "pfa", nume: "PFA în sistem real", fraza: "PFA-ul în sistem real" },
  { cheie: "srl", nume: "SRL cu impozit pe micro", fraza: "SRL-ul cu impozit pe micro" },
];

/** Cele patru destinații ale unui leu facturat, cu culorile lor. */
const DESTINATII = [
  { cheie: "netAnual", nume: "Rămâne la tine", indexCuloare: 2 },
  { cheie: "contributii", nume: "Contribuții sociale (CAS, CASS, CAM)", indexCuloare: 0 },
  { cheie: "impozite", nume: "Impozite", indexCuloare: 1 },
  { cheie: "cheltuieli", nume: "Cheltuieli de funcționare", indexCuloare: 6 },
];

/* ------------------------------------------------------------------ */
/* Citirea parametrilor                                                */
/* ------------------------------------------------------------------ */

function citesteOptiuni() {
  const salariuMinim = readNumber("salariu-minim", { min: 100, max: 20000, fallback: 4050 });
  const pragCas = readNumber("prag-cas", { min: 0, max: 60, fallback: 12 });

  return {
    sumaAnuala: readNumber("suma", { min: 0, max: 10000000 }),
    cheltuieliPfa: readNumber("chelt-pfa", { min: 0, max: 5000000 }),
    // Salariatul obligatoriu este tot o cheltuială a firmei, dar îl ținem
    // separat în interfață pentru că este cel mai des uitat din calcul.
    cheltuieliSrl:
      readNumber("chelt-srl", { min: 0, max: 5000000 }) +
      readNumber("cost-angajat", { min: 0, max: 5000000 }),
    salariuMinim,
    dependents: parseInt(document.getElementById("persoane").value, 10) || 0,
    areSalariu: document.getElementById("are-salariu").value === "da",
    cotePfa: {
      pragCasInferior: pragCas,
      pragCasSuperior: pragCas * 2,
      cassMin: readNumber("cass-min", { min: 0, max: 60, fallback: 6 }),
      cassMax: readNumber("cass-max", { min: 1, max: 200, fallback: 60 }),
    },
    coteSrl: {
      micro: readNumber("cota-micro", { min: 0, max: 20, fallback: 1 }),
      dividende: readNumber("cota-dividende", { min: 0, max: 50, fallback: 16 }),
    },
  };
}

/* ------------------------------------------------------------------ */
/* Barele comparative                                                  */
/* ------------------------------------------------------------------ */

/**
 * Câte o bară pentru fiecare formă, toate raportate la aceeași sumă.
 *
 * Barele au aceeași lungime totală tocmai pentru că totalul este identic:
 * ce diferă este cât din el ajunge la tine. Comparația pe lungime ar
 * ascunde exact lucrul de comparat.
 */
function renderBars(rez, suma, castigator) {
  const mount = document.getElementById("forme-bars");
  mount.textContent = "";
  if (suma <= 0) return;

  FORME.forEach((forma) => {
    const r = rez[forma.cheie];

    const row = document.createElement("div");
    row.className = "forma-row";

    const head = document.createElement("div");
    head.className = "forma-head";

    const nume = document.createElement("span");
    nume.className = "forma-nume";
    nume.textContent = forma.nume;
    if (forma.cheie === castigator) {
      const marca = document.createElement("span");
      marca.className = "forma-marca";
      marca.textContent = "cel mai mare net";
      nume.appendChild(marca);
    }
    head.appendChild(nume);

    const valoare = document.createElement("span");
    valoare.className = "forma-valoare";
    valoare.textContent = `${formatRON(r.netAnual)} · ${formatPercent(r.netAnual / suma)}`;
    head.appendChild(valoare);
    row.appendChild(head);

    const bar = document.createElement("div");
    bar.className = "stacked-bar";

    DESTINATII.forEach((d) => {
      const cota = r[d.cheie] / suma;
      if (cota <= 0) return;

      const seg = document.createElement("div");
      seg.className = "segment";
      seg.style.width = `${(cota * 100).toFixed(2)}%`;
      seg.style.background = seriesColor(d.indexCuloare);
      seg.setAttribute("role", "img");
      seg.setAttribute(
        "aria-label",
        `${forma.nume}, ${d.nume}: ${formatRON(r[d.cheie])}, ${formatPercent(cota)}`
      );
      if (cota >= 0.1) {
        seg.textContent = formatPercent(cota);
        seg.classList.add("labelled");
      }
      bar.appendChild(seg);
    });

    row.appendChild(bar);
    mount.appendChild(row);
  });
}

/** Legenda este comună celor trei bare, deci se desenează o singură dată. */
function renderLegend() {
  const legend = document.getElementById("forme-legend");
  legend.textContent = "";

  DESTINATII.forEach((d) => {
    const item = document.createElement("span");
    item.className = "item";
    const sw = document.createElement("span");
    sw.className = "swatch";
    sw.style.background = seriesColor(d.indexCuloare);
    item.appendChild(sw);
    item.appendChild(document.createTextNode(d.nume));
    legend.appendChild(item);
  });
}

/* ------------------------------------------------------------------ */
/* Detalierea pe forme                                                 */
/* ------------------------------------------------------------------ */

/** Pașii calculului pentru fiecare formă, în ordinea în care se aplică. */
function pasiPentru(cheie, rez, opts) {
  const r = rez[cheie];

  if (cheie === "cim") {
    return [
      { eticheta: "Cost total angajator", suma: r.costAnual, nota: "brut + CAM", tip: "total" },
      { eticheta: "− CAM (2,25%)", suma: -r.cam, nota: "plătit peste brut" },
      {
        eticheta: "Salariu brut anual",
        suma: r.brutAnual,
        nota: `${formatRON(r.brutLunar)} pe lună`,
        tip: "subtotal",
      },
      { eticheta: "− CAS, pensie (25%)", suma: -r.cas, nota: "pe tot brutul" },
      { eticheta: "− CASS, sănătate (10%)", suma: -r.cass, nota: "pe tot brutul" },
      { eticheta: "− Impozit pe venit (10%)", suma: -r.impozit, nota: "după contribuții și deducere" },
      { eticheta: "Net anual", suma: r.netAnual, nota: `${formatRON(r.netLunar)} pe lună`, tip: "total" },
    ];
  }

  if (cheie === "pfa") {
    return [
      { eticheta: "Încasări anuale", suma: r.venituri, nota: "facturat, fără TVA", tip: "total" },
      { eticheta: "− Cheltuieli deductibile", suma: -r.cheltuieli, nota: "justificate cu documente" },
      { eticheta: "Venit net", suma: r.venitNet, nota: "baza tuturor calculelor", tip: "subtotal" },
      {
        eticheta: "− CAS, pensie (25%)",
        suma: -r.cas,
        nota:
          r.bazaCas > 0
            ? `pe plafonul de ${formatRON(r.bazaCas)}, nu pe venitul real`
            : "sub prag — nu se datorează",
      },
      {
        eticheta: "− CASS, sănătate (10%)",
        suma: -r.cass,
        nota: `pe o bază de ${formatRON(r.bazaCass)}`,
      },
      { eticheta: "Bază impozabilă", suma: r.bazaImpozabila, nota: "venit net − contribuții", tip: "subtotal" },
      { eticheta: "− Impozit pe venit (10%)", suma: -r.impozit, nota: "" },
      {
        eticheta: "Net anual",
        suma: r.netAnual,
        nota: `${formatRON(r.netAnual / 12)} pe lună, în medie`,
        tip: "total",
      },
    ];
  }

  return [
    { eticheta: "Venituri firmă", suma: r.venituri, nota: "facturat, fără TVA", tip: "total" },
    {
      eticheta: `− Impozit micro (${opts.coteSrl.micro}%)`,
      suma: -r.impozitMicro,
      nota: "pe venituri, nu pe profit — cheltuielile nu îl reduc",
    },
    {
      eticheta: "− Cheltuieli de funcționare",
      suma: -r.cheltuieli,
      nota: "contabilitate, salariatul obligatoriu, comisioane",
    },
    { eticheta: "Profit distribuibil", suma: r.profitDistribuibil, nota: "banii firmei, încă nu ai tăi", tip: "subtotal" },
    {
      eticheta: `− Impozit pe dividende (${opts.coteSrl.dividende}%)`,
      suma: -r.impozitDividende,
      nota: "al doilea impozit, la scoaterea banilor",
    },
    {
      eticheta: "− CASS pe dividende (10%)",
      suma: -r.cass,
      nota:
        r.bazaCass > 0
          ? `pe treapta de ${formatRON(r.bazaCass)}`
          : "sub prima treaptă — nu se datorează",
    },
    {
      eticheta: "Net anual",
      suma: r.netAnual,
      nota: `${formatRON(r.netAnual / 12)} pe lună, în medie`,
      tip: "total",
    },
  ];
}

function renderBreakdown(rez, opts) {
  const mount = document.getElementById("breakdown");
  mount.textContent = "";

  FORME.forEach((forma) => {
    const titlu = document.createElement("h3");
    titlu.textContent = forma.nume;
    titlu.className = "forma-titlu";
    mount.appendChild(titlu);

    pasiPentru(forma.cheie, rez, opts).forEach((pas) => {
      const row = document.createElement("div");
      row.className = "breakdown-row" + (pas.tip ? ` ${pas.tip}` : "");

      const left = document.createElement("div");
      const label = document.createElement("span");
      label.className = "breakdown-label";
      label.textContent = pas.eticheta;
      left.appendChild(label);
      if (pas.nota) {
        const note = document.createElement("span");
        note.className = "breakdown-note";
        note.textContent = pas.nota;
        left.appendChild(note);
      }
      row.appendChild(left);

      const value = document.createElement("span");
      value.className = "breakdown-value";
      value.textContent = formatRON(pas.suma);
      if (pas.suma < 0) value.classList.add("negative");
      row.appendChild(value);

      mount.appendChild(row);
    });
  });
}

/** Aceleași valori, dar aliniate pe coloane, ca să se poată exporta. */
function renderTable(rez) {
  const body = document.getElementById("table-body");
  body.textContent = "";

  const { cim, pfa, srl } = rez;
  const randuri = [
    ["Sumă plătită de client / angajator", cim.costAnual, pfa.venituri, srl.venituri],
    ["Cheltuieli de funcționare", 0, pfa.cheltuieli, srl.cheltuieli],
    ["Contribuții sociale", cim.contributii, pfa.contributii, srl.contributii],
    ["  din care CAS (pensie)", cim.cas, pfa.cas, 0],
    ["  din care CASS (sănătate)", cim.cass, pfa.cass, srl.cass],
    ["  din care CAM (angajator)", cim.cam, 0, 0],
    ["Impozite", cim.impozite, pfa.impozite, srl.impozite],
    ["  din care impozit pe venit / micro", cim.impozit, pfa.impozit, srl.impozitMicro],
    ["  din care impozit pe dividende", 0, 0, srl.impozitDividende],
    ["Net anual", cim.netAnual, pfa.netAnual, srl.netAnual],
    ["Net lunar (medie)", cim.netAnual / 12, pfa.netAnual / 12, srl.netAnual / 12],
  ];

  randuri.forEach((cells) => {
    const tr = document.createElement("tr");
    cells.forEach((cell, i) => {
      const td = document.createElement("td");
      td.textContent = i === 0 ? String(cell) : formatRON(cell);
      tr.appendChild(td);
    });
    body.appendChild(tr);
  });

  // Ultimul rând, cota efectivă, se citește mai bine în procente.
  const tr = document.createElement("tr");
  ["Cât se duce în taxe și costuri", cim.rataEfectiva, pfa.rataEfectiva, srl.rataEfectiva].forEach(
    (cell, i) => {
      const td = document.createElement("td");
      td.textContent = i === 0 ? String(cell) : formatPercent(cell);
      tr.appendChild(td);
    }
  );
  body.appendChild(tr);
}

/* ------------------------------------------------------------------ */
/* Pragurile                                                           */
/* ------------------------------------------------------------------ */

/**
 * Lista pragurilor relevante, cu poziția venitului curent față de fiecare.
 *
 * Este partea din pagină care explică de ce răspunsul „ce formă e mai bună”
 * se schimbă complet de la un venit la altul: nimic nu crește lin.
 */
function renderPraguri(rez, opts) {
  const mount = document.getElementById("praguri");
  mount.textContent = "";

  const sm = opts.salariuMinim;
  const venitNetPfa = rez.pfa.venitNet;
  const dividende = rez.srl.profitDistribuibil;

  const praguri = [
    {
      nume: `CAS la PFA începe (${opts.cotePfa.pragCasInferior} salarii minime)`,
      valoare: opts.cotePfa.pragCasInferior * sm,
      curent: venitNetPfa,
      referinta: "venitul net al PFA",
      efect: `Peste acest venit net apare brusc o contribuție de ${formatRON(
        opts.cotePfa.pragCasInferior * sm * 0.25
      )} pe an.`,
    },
    {
      nume: `Baza CAS urcă la plafonul superior (${opts.cotePfa.pragCasSuperior} salarii minime)`,
      valoare: opts.cotePfa.pragCasSuperior * sm,
      curent: venitNetPfa,
      referinta: "venitul net al PFA",
      efect: "Peste acest nivel CAS nu mai crește deloc — cota efectivă începe să scadă.",
    },
    {
      // Singurul prag care funcționează invers: baza minimă contează
      // tocmai când venitul este *sub* ea.
      nume: `Bază minimă CASS la PFA (${opts.cotePfa.cassMin} salarii minime)`,
      valoare: opts.cotePfa.cassMin * sm,
      curent: venitNetPfa,
      referinta: "venitul net al PFA",
      activ: !opts.areSalariu && venitNetPfa < opts.cotePfa.cassMin * sm,
      efect: opts.areSalariu
        ? "Nu se aplică în cazul tău: ai și un contract de muncă, deci CASS se calculează pe venitul real."
        : "Sub acest venit net, CASS se datorează oricum la această bază — cota efectivă devine foarte mare.",
    },
    {
      nume: `Prima treaptă CASS pe dividende (${FISCAL_FORME.srl.trepteCass[0]} salarii minime)`,
      valoare: FISCAL_FORME.srl.trepteCass[0] * sm,
      curent: dividende,
      referinta: "dividendul brut",
      efect: `La depășire se datorează ${formatRON(
        FISCAL_FORME.srl.trepteCass[0] * sm * 0.1
      )} CASS, indiferent cu cât ai depășit.`,
    },
    {
      nume: `Treapta a doua CASS pe dividende (${FISCAL_FORME.srl.trepteCass[1]} salarii minime)`,
      valoare: FISCAL_FORME.srl.trepteCass[1] * sm,
      curent: dividende,
      referinta: "dividendul brut",
      efect: "Baza CASS se dublează dintr-odată.",
    },
    {
      nume: "Cota micro urcă de la 1% la 3% (60.000 EUR venituri)",
      valoare: 60000 * CURS_EUR_IMPLICIT,
      curent: rez.srl.venituri,
      referinta: "venitul anual al firmei",
      efect: "Se aplică și sub acest prag dacă activitatea este de consultanță sau management.",
    },
    {
      nume: "Ieșirea din regimul micro (100.000 EUR venituri)",
      valoare: 100000 * CURS_EUR_IMPLICIT,
      curent: rez.srl.venituri,
      referinta: "venitul anual al firmei",
      efect: "Peste plafon, firma trece la impozit pe profit de 16%, calculat altfel.",
    },
  ];

  praguri.forEach((p) => {
    const atins = p.curent >= p.valoare;
    const distanta = Math.abs(p.valoare - p.curent);
    // Majoritatea pragurilor se activează la depășire; cele marcate explicit
    // își spun singure când sunt active.
    const activ = p.activ === undefined ? atins : p.activ;

    const row = document.createElement("div");
    row.className = "breakdown-row";

    const left = document.createElement("div");
    const label = document.createElement("span");
    label.className = "breakdown-label";
    label.textContent = p.nume;
    left.appendChild(label);

    const note = document.createElement("span");
    note.className = "breakdown-note";
    note.textContent =
      `${formatRON(p.valoare)} — ${p.referinta} este cu ${formatRON(distanta)} ` +
      `${atins ? "peste" : "sub"} acest prag. ${p.efect}`;
    left.appendChild(note);
    row.appendChild(left);

    const value = document.createElement("span");
    value.className = "breakdown-value";
    value.textContent = activ ? "se aplică" : "nu se aplică";
    if (!activ) value.classList.add("negative");
    row.appendChild(value);

    mount.appendChild(row);
  });
}

/* ------------------------------------------------------------------ */
/* Recalculare                                                         */
/* ------------------------------------------------------------------ */

function recalc() {
  const opts = citesteOptiuni();
  const rez = compareFormeVenit(opts);
  const suma = opts.sumaAnuala;

  document.getElementById("hint-lunar").textContent =
    suma > 0 ? `Aproximativ ${formatRON(suma / 12)} pe lună.` : "Introdu o sumă anuală.";

  FORME.forEach((forma) => {
    const r = rez[forma.cheie];
    const tile = document.getElementById(`stat-${forma.cheie}`);
    tile.textContent = formatRON(r.netAnual);
    tile.classList.toggle("good", forma.cheie === rez.castigator && suma > 0);
    document.getElementById(`stat-${forma.cheie}-pct`).textContent =
      suma > 0 ? `${formatPercent(r.netAnual / suma)} din sumă · ${formatRON(r.netAnual / 12)} pe lună` : "";
  });

  const nete = FORME.map((f) => rez[f.cheie].netAnual);
  const diferenta = Math.max(...nete) - Math.min(...nete);
  document.getElementById("stat-diferenta").textContent = suma > 0 ? formatRON(diferenta) : "—";

  renderBars(rez, suma, rez.castigator);
  renderLegend();
  renderBreakdown(rez, opts);
  renderTable(rez);
  renderPraguri(rez, opts);

  /* --- Concluzie ---------------------------------------------------- */
  const insight = document.getElementById("insight");
  if (suma <= 0) {
    insight.textContent = "Introdu suma anuală ca să vezi comparația.";
    return;
  }

  const castigator = FORME.find((f) => f.cheie === rez.castigator);
  const rCastigator = rez[rez.castigator];
  const alDoilea = rez.clasament[1];
  const frazaAlDoilea = FORME.find((f) => f.cheie === alDoilea.cheie).fraza;

  const explicatie =
    rez.castigator === "cim"
      ? "La venituri mici, contractul de muncă rămâne competitiv pentru că deducerea personală reduce impozitul, iar celelalte forme datorează contribuții la plafoane fixe, indiferent cât încasează."
      : rez.castigator === "pfa"
      ? "PFA-ul câștigă pentru că, peste plafoane, contribuțiile nu mai cresc odată cu venitul, iar banii ajung la tine fără al doilea impozit."
      : "SRL-ul câștigă pentru că impozitul de pe venituri este mic, dar avantajul apare doar dacă veniturile acoperă costurile fixe de funcționare.";

  insight.textContent =
    `Din ${formatRON(suma)} pe an, ${castigator.fraza} îți lasă cel mai mult: ` +
    `${formatRON(rCastigator.netAnual)}, adică ${formatPercent(rCastigator.netAnual / suma)}. ` +
    `Urmează ${frazaAlDoilea}, cu ${formatRON(alDoilea.net)} — o diferență de ` +
    `${formatRON(rCastigator.netAnual - alDoilea.net)} pe an. ${explicatie}`;
}

/* Pornire */
document.querySelectorAll("main input").forEach((el) => el.addEventListener("input", recalc));
document.querySelectorAll("main select").forEach((el) => el.addEventListener("change", recalc));

setupViewToggle();
setupCsvExport("#table-view table", "forme-venit.csv");
persistInputs("forme-venit", recalc);
onChartNeedsRedraw(recalc);
recalc();
