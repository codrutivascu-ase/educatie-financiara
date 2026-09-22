/**
 * Simulator de investiții cu dobândă compusă.
 *
 * Compară trei scenarii de randament pornind de la aceeași contribuție
 * lunară, ca să arate cât din rezultatul final vine din banii depuși și
 * cât din randamentul acumulat în timp.
 */

const SCENARIOS = [
  { id: "economii", name: "Cont de economii", defaultRate: 2 },
  { id: "index", name: "Fond index (ETF)", defaultRate: 7 },
  { id: "actiuni", name: "Acțiuni individuale", defaultRate: 10 },
];

const tooltip = document.getElementById("tooltip");
const rowsEl = document.getElementById("scenario-rows");

/* ------------------------------------------------------------------ */
/* Câmpurile de randament                                              */
/* ------------------------------------------------------------------ */

function renderScenarioRows() {
  rowsEl.textContent = "";
  SCENARIOS.forEach((sc, index) => {
    const row = document.createElement("div");
    row.className = "scenario-row";

    const swatch = document.createElement("span");
    swatch.className = "swatch";
    swatch.style.background = seriesColor(index);
    row.appendChild(swatch);

    const label = document.createElement("label");
    label.className = "name";
    label.htmlFor = `rate-${sc.id}`;
    label.textContent = sc.name;
    row.appendChild(label);

    const input = document.createElement("input");
    input.type = "number";
    input.id = `rate-${sc.id}`;
    input.min = "-20";
    input.max = "30";
    input.step = "0.5";
    input.value = String(sc.defaultRate);
    input.setAttribute("aria-label", `Randament anual (%) pentru ${sc.name}`);
    input.addEventListener("input", recalc);
    row.appendChild(input);

    rowsEl.appendChild(row);
  });
}

/* ------------------------------------------------------------------ */
/* Calculul propriu-zis                                                */
/* ------------------------------------------------------------------ */

/**
 * Evoluția soldului, an cu an, cu depuneri lunare și capitalizare lunară.
 *
 * Contribuția se adaugă la finalul fiecărei luni, iar dobânda se aplică
 * pe soldul existent — modelul uzual pentru un plan de economisire.
 */
function projectBalances(initial, monthly, years, annualRatePct) {
  // Rata lunară echivalentă, calculată compus (nu simpla împărțire la 12).
  const monthlyRate = Math.pow(1 + annualRatePct / 100, 1 / 12) - 1;
  const values = [initial];
  let balance = initial;
  for (let year = 1; year <= years; year++) {
    for (let m = 0; m < 12; m++) {
      balance = balance * (1 + monthlyRate) + monthly;
    }
    values.push(balance);
  }
  return values;
}

function recalc() {
  const initial = readNumber("suma-initiala", { min: 0, max: 10000000 });
  const monthly = readNumber("contributie-lunara", { min: 0, max: 200000 });
  const years = readNumber("orizont", { min: 1, max: 40, fallback: 10, integer: true });
  const inflatie = readNumber("inflatie", { min: 0, max: 20 });

  const totalDepus = initial + monthly * 12 * years;
  document.getElementById("stat-depus").textContent = formatRON(totalDepus);

  const xValues = Array.from({ length: years + 1 }, (_, i) => i);
  const scenarii = SCENARIOS.map((sc, index) => {
    const rateEl = document.getElementById(`rate-${sc.id}`);
    const rate = rateEl
      ? readNumber(rateEl.id, { min: -20, max: 30, fallback: sc.defaultRate })
      : sc.defaultRate;
    return {
      name: sc.name,
      color: seriesColor(index),
      rate,
      values: projectBalances(initial, monthly, years, rate),
    };
  });

  // Banii depuși de tine, an cu an. Este o linie dreaptă — exact contrastul
  // cu curbele de mai sus face vizibil ce anume adaugă dobânda compusă.
  // Arătată ca serie, nu ca linie de referință la valoarea finală: altfel
  // nu s-ar vedea că în primii ani cele două traiectorii sunt aproape egale.
  const depuneri = {
    name: "Bani depuși de tine",
    color: getCssVar("--text-muted"),
    dashed: true,
    values: xValues.map((year) => initial + monthly * 12 * year),
  };

  const series = [depuneri, ...scenarii];

  /* --- Cartonașe pe scenariu ---------------------------------------- */
  const statsEl = document.getElementById("scenario-stats");
  statsEl.textContent = "";
  scenarii.forEach((s) => {
    const finalValue = s.values[s.values.length - 1];
    const castig = finalValue - totalDepus;
    // Puterea de cumpărare reală, după ce scădem efectul inflației.
    const realValue = finalValue / Math.pow(1 + inflatie / 100, years);

    const tile = document.createElement("div");
    tile.className = "stat-tile with-id";
    tile.style.setProperty("--accent-id", s.color);

    const label = document.createElement("div");
    label.className = "label";
    label.textContent = s.name;
    tile.appendChild(label);

    const value = document.createElement("div");
    value.className = "value";
    value.textContent = formatRON(finalValue);
    tile.appendChild(value);

    // Cele două note stau într-un singur element: cartonașele se aliniază
    // pe trei benzi (nume / valoare / note), iar un al patrulea copil ar
    // ieși din banda rezervată.
    const note = document.createElement("div");
    note.style.marginTop = "4px";

    const gain = document.createElement("div");
    gain.className = "label";
    gain.textContent = `din care câștig: ${formatRON(Math.max(0, castig))}`;
    note.appendChild(gain);

    const real = document.createElement("div");
    real.className = "label";
    real.textContent = `în puterea de azi: ${formatRON(realValue)}`;
    note.appendChild(real);

    tile.appendChild(note);

    statsEl.appendChild(tile);
  });

  /* --- Concluzie ---------------------------------------------------- */
  const sorted = [...scenarii].sort(
    (a, b) => a.values[a.values.length - 1] - b.values[b.values.length - 1]
  );
  const worst = sorted[0];
  const best = sorted[sorted.length - 1];
  const diff = best.values[best.values.length - 1] - worst.values[worst.values.length - 1];
  const bestFinal = best.values[best.values.length - 1];
  const proportiaCastig = bestFinal > 0 ? (bestFinal - totalDepus) / bestFinal : 0;

  document.getElementById("insight").textContent =
    `Pe ${years} ${years === 1 ? "an" : "ani"}, diferența dintre „${worst.name}” și „${best.name}” este de ` +
    `${formatRON(diff)}, acesta este costul de oportunitate al randamentului mai mic. ` +
    (proportiaCastig > 0
      ? `În scenariul cel mai bun, ${formatPercent(proportiaCastig)} din suma finală nu vine din banii depuși de tine, ci din randamentul acumulat.`
      : "");

  /* --- Grafic ------------------------------------------------------- */
  renderLineChart(document.getElementById("chart"), tooltip, {
    xValues,
    xFormat: (v) => `an ${v}`,
    yFormat: (v) => formatRON(v),
    yAxisFormat: (v) => formatRONShort(v),
    series,
  });

  renderLegend(document.getElementById("legend"), series);

  /* --- Tabel -------------------------------------------------------- */
  const head = document.getElementById("table-head");
  head.textContent = "";
  ["An", "Bani depuși de tine", ...scenarii.map((s) => s.name)].forEach((text) => {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = text;
    head.appendChild(th);
  });

  const body = document.getElementById("table-body");
  body.textContent = "";
  xValues.forEach((year) => {
    const tr = document.createElement("tr");
    [
      String(year),
      formatRON(depuneri.values[year]),
      ...scenarii.map((s) => formatRON(s.values[year])),
    ].forEach((text) => {
      const td = document.createElement("td");
      td.textContent = text;
      tr.appendChild(td);
    });
    body.appendChild(tr);
  });
}

/** Legenda graficului, cu linie punctată pentru seriile de referință. */
function renderLegend(legend, series) {
  legend.textContent = "";
  series.forEach((s) => {
    const item = document.createElement("span");
    item.className = "item";
    const sw = document.createElement("span");
    sw.className = s.dashed ? "swatch line dashed" : "swatch line";
    // Linia punctată se desenează cu border, deci are nevoie de `color`.
    if (s.dashed) sw.style.color = s.color;
    else sw.style.background = s.color;
    item.appendChild(sw);
    item.appendChild(document.createTextNode(s.name + " "));
    const amount = document.createElement("span");
    amount.className = "amount";
    amount.textContent = formatRON(s.values[s.values.length - 1]);
    item.appendChild(amount);
    legend.appendChild(item);
  });
}

/* ------------------------------------------------------------------ */
/* Simulare cu randament variabil                                      */
/* ------------------------------------------------------------------ */

/** Reținem dacă simularea a fost pornită, ca redesenarea să o păstreze. */
let monteCarloPornit = false;

function ruleazaMonteCarlo() {
  const initial = readNumber("suma-initiala", { min: 0, max: 10000000 });
  const monthly = readNumber("contributie-lunara", { min: 0, max: 200000 });
  const years = readNumber("orizont", { min: 1, max: 40, fallback: 10, integer: true });
  const meanReturnPct = readNumber("mc-randament", { min: -5, max: 20, fallback: 7 });
  const volatilityPct = readNumber("mc-volatilitate", { min: 0, max: 50, fallback: 16 });

  const totalDepus = initial + monthly * 12 * years;

  // Sămânța derivă din parametri: aceleași date dau mereu același rezultat,
  // dar schimbarea unui parametru produce un set nou de trageri.
  const seed = Math.abs(Math.round(initial + monthly * 7 + years * 101 + meanReturnPct * 1000 + volatilityPct * 37)) + 1;

  const r = simulateMonteCarlo({
    initial,
    monthly,
    years,
    meanReturnPct,
    volatilityPct,
    runs: 500,
    seed,
  });

  document.getElementById("mc-results").classList.remove("hidden");
  monteCarloPornit = true;

  const p10 = r.p10[years];
  const p50 = r.p50[years];
  const p90 = r.p90[years];

  document.getElementById("mc-p10").textContent = formatRON(p10);
  document.getElementById("mc-p50").textContent = formatRON(p50);
  document.getElementById("mc-p90").textContent = formatRON(p90);

  const pierdereEl = document.getElementById("mc-pierdere");
  pierdereEl.textContent = formatPercent(r.probLoss);
  pierdereEl.classList.toggle("critical", r.probLoss > 0.2);
  pierdereEl.classList.toggle("good", r.probLoss < 0.05);

  /* --- Concluzie ---------------------------------------------------- */
  const raport = p10 > 0 ? p90 / p10 : 0;
  document.getElementById("mc-insight").textContent =
    `Din 500 de simulări cu randament mediu de ${meanReturnPct}% și volatilitate de ${volatilityPct}%, ` +
    `rezultatul median după ${years} ani este ${formatRON(p50)}. ` +
    `Însă opt din zece rezultate se încadrează între ${formatRON(p10)} și ${formatRON(p90)}, ` +
    `o diferență de ${raport.toFixed(1)} ori între capete. ` +
    (r.probLoss > 0.15
      ? `În ${formatPercent(r.probLoss)} din cazuri ai termina cu mai puțin decât ai depus (${formatRON(totalDepus)}). ` +
        `Acesta este riscul real al unui orizont scurt: nu că randamentul mediu ar fi prost, ci că nu ai timp să treci peste anii proști.`
      : `Doar în ${formatPercent(r.probLoss)} din cazuri ai termina sub suma depusă de ${formatRON(totalDepus)}. ` +
        `Orizontul lung nu elimină oscilațiile, dar reduce mult probabilitatea de a ieși în pierdere.`);

  /* --- Grafic ------------------------------------------------------- */
  const xValues = Array.from({ length: years + 1 }, (_, i) => i);
  const series = [
    {
      name: "Bani depuși de tine",
      color: getCssVar("--text-muted"),
      dashed: true,
      values: xValues.map((year) => initial + monthly * 12 * year),
    },
    { name: "Pesimist (10%)", color: seriesColor(7), values: r.p10 },
    { name: "Median (50%)", color: seriesColor(0), values: r.p50 },
    { name: "Optimist (90%)", color: seriesColor(2), values: r.p90 },
  ];

  renderLineChart(document.getElementById("mc-chart"), tooltip, {
    xValues,
    xFormat: (v) => `an ${v}`,
    yFormat: (v) => formatRON(v),
    yAxisFormat: (v) => formatRONShort(v),
    series,
  });

  renderLegend(document.getElementById("mc-legend"), series);
}

document.getElementById("btn-monte-carlo").addEventListener("click", ruleazaMonteCarlo);

/* Pornire */
setupViewToggle(recalc);
setupCsvExport("#table-view table", "simulare-investitii.csv");
renderScenarioRows();
persistInputs("investitii", recalc);
recalc();

// Dacă există un buget completat, propunem soldul lunar ca sumă investită.
const profil = getProfile();
if (profil.buget && profil.buget.sold > 0) {
  offerPrefill({
    mount: "prefill-slot",
    targetInput: "contributie-lunara",
    value: profil.buget.sold,
    text: `După bugetul tău, îți rămân ${formatRON(profil.buget.sold)} pe lună.`,
    onApply: recalc,
  });
}

onChartNeedsRedraw(() => {
  recalc();
  // Redesenăm și simularea, dacă utilizatorul a pornit-o deja.
  if (monteCarloPornit) ruleazaMonteCarlo();
});
