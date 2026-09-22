/**
 * Calculator de datorii.
 *
 * Trei părți:
 *   1. Eligibilitate — gradul de îndatorare față de pragul uzual de 40%.
 *   2. Graficul de rambursare și costul total al creditului.
 *   3. Efectul plății anticipate, plus comparația avalanșă vs. bulgăre
 *      pentru cazul în care ai mai multe datorii simultan.
 *
 * Monede: creditul pentru locuință este calculat în euro, pentru că în
 * euro se negociază prețurile locuințelor în România. Veniturile și
 * datoriile de consum rămân în lei, iar conversia se face doar acolo
 * unde cele două trebuie comparate — la gradul de îndatorare.
 */

const tooltip = document.getElementById("tooltip");

/** Pragul de îndatorare peste care băncile din România refuză de regulă. */
const DTI_LIMIT = 0.4;
/** Sub acest prag situația este confortabilă. */
const DTI_COMFORT = 0.35;

document.querySelectorAll("main input").forEach((el) => el.addEventListener("input", recalc));

/* ------------------------------------------------------------------ */
/* Bara principal vs. dobândă                                          */
/* ------------------------------------------------------------------ */

function renderCostBar(principal, totalInterest) {
  const bar = document.getElementById("cost-bar");
  const legend = document.getElementById("cost-legend");
  bar.textContent = "";
  legend.textContent = "";

  const total = principal + totalInterest;
  if (total <= 0) return;

  [
    { name: "Principal (suma împrumutată)", value: principal, color: seriesColor(0) },
    { name: "Dobândă (costul creditului)", value: totalInterest, color: seriesColor(1) },
  ].forEach((p) => {
    // Bara ține de creditul pentru locuință, deci este exprimată în euro.
    const share = p.value / total;

    const seg = document.createElement("div");
    seg.className = "segment";
    seg.style.width = `${(share * 100).toFixed(2)}%`;
    seg.style.background = p.color;
    seg.setAttribute("tabindex", "0");
    seg.setAttribute("role", "img");
    seg.setAttribute("aria-label", `${p.name}: ${formatEUR(p.value)}, ${formatPercent(share)}`);
    if (share >= 0.08) {
      seg.textContent = formatPercent(share);
      seg.classList.add("labelled");
    }

    function show(x, y) {
      tooltip.textContent = "";
      const head = document.createElement("div");
      head.className = "tt-head";
      head.textContent = p.name;
      tooltip.appendChild(head);
      const row = document.createElement("div");
      row.className = "tt-row";
      const strong = document.createElement("strong");
      strong.textContent = formatEUR(p.value);
      row.appendChild(strong);
      row.appendChild(document.createTextNode(` · ${formatPercent(share)}`));
      tooltip.appendChild(row);
      positionTooltip(tooltip, x, y);
      tooltip.classList.add("visible");
    }

    seg.addEventListener("mousemove", (e) => show(e.clientX, e.clientY));
    seg.addEventListener("mouseleave", () => tooltip.classList.remove("visible"));
    seg.addEventListener("focus", () => {
      const r = seg.getBoundingClientRect();
      show(r.left + r.width / 2, r.top);
    });
    seg.addEventListener("blur", () => tooltip.classList.remove("visible"));
    bar.appendChild(seg);

    const item = document.createElement("span");
    item.className = "item";
    const sw = document.createElement("span");
    sw.className = "swatch";
    sw.style.background = p.color;
    item.appendChild(sw);
    item.appendChild(document.createTextNode(p.name + " "));
    const amount = document.createElement("span");
    amount.className = "amount";
    amount.textContent = formatEUR(p.value);
    item.appendChild(amount);
    legend.appendChild(item);
  });
}

/* ------------------------------------------------------------------ */
/* Avalanșă vs. bulgăre de zăpadă                                      */
/* ------------------------------------------------------------------ */

function renderStrategies() {
  const box = document.getElementById("strategy-result");
  box.textContent = "";

  // Trei datorii tipice, cu dobânzi foarte diferite.
  const debts = [
    { name: "Credit rapid (IFN)", balance: readNumber("d1-sold", { min: 0, max: 1000000 }), rate: readNumber("d1-rata", { min: 0, max: 100 }), minPayment: readNumber("d1-min", { min: 0, max: 100000 }) },
    { name: "Credit de nevoi personale", balance: readNumber("d2-sold", { min: 0, max: 1000000 }), rate: readNumber("d2-rata", { min: 0, max: 100 }), minPayment: readNumber("d2-min", { min: 0, max: 100000 }) },
    { name: "Rate la magazin", balance: readNumber("d3-sold", { min: 0, max: 1000000 }), rate: readNumber("d3-rata", { min: 0, max: 100 }), minPayment: readNumber("d3-min", { min: 0, max: 100000 }) },
  ].filter((d) => d.balance > 0);

  const buget = readNumber("buget-datorii", { min: 0, max: 200000 });

  if (debts.length === 0) {
    box.appendChild(makeNote("Este necesară cel puțin o datorie pentru compararea strategiilor."));
    return;
  }

  const avalanche = simulateDebtPayoff(debts, buget, "avalanche");
  const snowball = simulateDebtPayoff(debts, buget, "snowball");

  if (!avalanche.feasible) {
    const totalMin = debts.reduce((s, d) => s + d.minPayment, 0);
    box.appendChild(
      makeNote(
        `Bugetul lunar de ${formatRON(buget)} nu acoperă nici măcar plățile minime, care însumează ${formatRON(totalMin)}. ` +
          `Într-o astfel de situație datoria crește de la sine, iar primul pas este renegocierea sau consilierea de specialitate, nu o strategie de plată.`
      )
    );
    return;
  }

  const row = document.createElement("div");
  row.className = "stat-row";
  [
    { label: "Avalanșă (dobânda cea mai mare întâi)", sim: avalanche, color: seriesColor(0) },
    { label: "Bulgăre (soldul cel mai mic întâi)", sim: snowball, color: seriesColor(2) },
  ].forEach((s) => {
    const tile = document.createElement("div");
    tile.className = "stat-tile with-id";
    tile.style.setProperty("--accent-id", s.color);

    const label = document.createElement("div");
    label.className = "label";
    label.textContent = s.label;
    tile.appendChild(label);

    const value = document.createElement("div");
    value.className = "value";
    value.textContent = formatMonths(s.sim.months);
    tile.appendChild(value);

    // Notele stau grupate: cartonașele se aliniază pe trei benzi
    // (etichetă / valoare / note), iar un al patrulea copil ar ieși din ele.
    const note = document.createElement("div");
    note.style.marginTop = "4px";

    const sub = document.createElement("div");
    sub.className = "label";
    sub.textContent = `dobândă totală: ${formatRON(s.sim.totalInterest)}`;
    note.appendChild(sub);

    // Ordinea în care dispar datoriile — argumentul principal al metodei bulgăre.
    if (s.sim.payoffOrder.length) {
      const order = document.createElement("div");
      order.className = "label";
      order.style.marginTop = "4px";
      order.textContent =
        "ordine: " + s.sim.payoffOrder.map((p) => p.name).join(" → ");
      note.appendChild(order);
    }

    tile.appendChild(note);

    row.appendChild(tile);
  });
  box.appendChild(row);

  const diff = snowball.totalInterest - avalanche.totalInterest;
  const monthsDiff = snowball.months - avalanche.months;
  let text;
  if (Math.abs(diff) < 1 && monthsDiff === 0) {
    text = "În acest caz cele două strategii dau exact același rezultat: ordinea datoriilor coincide.";
  } else {
    text =
      `Metoda avalanșă te costă cu ${formatRON(Math.abs(diff))} mai puțină dobândă` +
      (monthsDiff !== 0 ? ` și scapi cu ${formatMonths(Math.abs(monthsDiff))} mai devreme` : "") +
      `. Metoda bulgăre stinge însă prima datorie mai repede, ceea ce pentru mulți oameni face diferența între a continua planul și a-l abandona.`;
  }
  box.appendChild(makeNote(text));
}

function makeNote(text) {
  const p = document.createElement("p");
  p.className = "insight";
  p.textContent = text;
  return p;
}

/* ------------------------------------------------------------------ */
/* Recalculare                                                         */
/* ------------------------------------------------------------------ */

function recalc() {
  // Creditul pentru locuință: sume în euro.
  const principal = readNumber("suma-credit", { min: 0, max: 2000000 });
  const rate = readNumber("dobanda", { min: 0, max: 50 });
  const years = readNumber("perioada", { min: 1, max: 35, fallback: 25, integer: true });
  const months = years * 12;
  const curs = readNumber("curs", { min: 1, max: 20, fallback: CURS_EUR_IMPLICIT });
  // Veniturile și celelalte rate: sume în lei, așa cum sunt încasate și plătite.
  const venit = readNumber("venit-net", { min: 0, max: 200000 });
  const alteRate = readNumber("alte-rate", { min: 0, max: 100000 });

  const base = buildAmortizationSchedule(principal, rate, months, 0);
  const rataLunara = base.monthlyPaymentBase;
  // Gradul de îndatorare compară lucruri din monede diferite, deci rata
  // trebuie adusă în lei. Cursul este presupus constant — nu este.
  const rataLunaraLei = rataLunara * curs;

  /* --- Eligibilitate ------------------------------------------------ */
  const grad = venit > 0 ? (rataLunaraLei + alteRate) / venit : 0;
  document.getElementById("stat-rata-elig").textContent = formatEUR(rataLunara);
  document.getElementById("stat-rata-elig-lei").textContent =
    `adică ${formatRON(rataLunaraLei)} la un curs de ${curs.toFixed(2).replace(".", ",")} lei`;

  const gradEl = document.getElementById("stat-grad");
  gradEl.textContent = venit > 0 ? formatPercent(grad) : "—";
  gradEl.classList.toggle("good", venit > 0 && grad <= DTI_COMFORT);
  gradEl.classList.toggle("critical", venit > 0 && grad > DTI_LIMIT);

  // Cât ar rămâne efectiv de trăit după plata ratelor.
  const ramas = venit - rataLunaraLei - alteRate;
  const ramasEl = document.getElementById("stat-ramas");
  ramasEl.textContent = venit > 0 ? formatRON(ramas) : "—";
  ramasEl.classList.toggle("critical", venit > 0 && ramas < 0);

  const msg = document.getElementById("eligibility-msg");
  if (venit <= 0) {
    msg.textContent = "Este necesară introducerea venitului net lunar pentru estimarea gradului de îndatorare.";
  } else if (grad <= DTI_COMFORT) {
    msg.textContent =
      `Grad de îndatorare ${formatPercent(grad)}, sub pragul uzual de 40%. ` +
      `După rate ți-ar rămâne ${formatRON(ramas)} pe lună pentru toate celelalte cheltuieli.`;
  } else if (grad <= DTI_LIMIT) {
    msg.textContent =
      `Grad de îndatorare ${formatPercent(grad)}, aproape de pragul uzual de 40%. ` +
      `Ai șanse, dar la limită, iar marja pentru cheltuieli neprevăzute este mică.`;
  } else {
    msg.textContent =
      `Grad de îndatorare ${formatPercent(grad)}, peste pragul uzual de 40% folosit de bănci. ` +
      `Ai nevoie de un credit mai mic, un avans mai mare sau o perioadă mai lungă.`;
  }

  /* --- Costul total ------------------------------------------------- */
  document.getElementById("stat-rata").textContent = formatEUR(rataLunara);
  document.getElementById("stat-dobanda-totala").textContent = formatEUR(base.totalInterest);
  document.getElementById("stat-total-platit").textContent = formatEUR(base.totalPaid);

  const supraCost = principal > 0 ? base.totalInterest / principal : 0;
  document.getElementById("stat-supracost").textContent =
    principal > 0 ? formatPercent(supraCost) : "—";

  renderCostBar(principal, base.totalInterest);

  /* --- Graficul soldului, eșantionat anual -------------------------- */
  const xValues = Array.from({ length: years + 1 }, (_, i) => i);
  const balances = xValues.map((y) => {
    if (y === 0) return principal;
    const idx = Math.min(y * 12, base.schedule.length) - 1;
    return base.schedule[idx] ? base.schedule[idx].balance : 0;
  });

  renderLineChart(document.getElementById("chart"), tooltip, {
    xValues,
    xFormat: (v) => `an ${v}`,
    yFormat: (v) => formatEUR(v),
    yAxisFormat: (v) => formatEURShort(v),
    series: [{ name: "Sold rămas de plată", color: seriesColor(0), values: balances }],
    areaFill: true,
  });

  const chartLegend = document.getElementById("chart-legend");
  chartLegend.textContent = "";
  const item = document.createElement("span");
  item.className = "item";
  const sw = document.createElement("span");
  sw.className = "swatch line";
  sw.style.background = seriesColor(0);
  item.appendChild(sw);
  item.appendChild(document.createTextNode("Sold rămas de plată"));
  chartLegend.appendChild(item);

  /* --- Tabelul lunar ------------------------------------------------ */
  const tableBody = document.getElementById("table-body");
  tableBody.textContent = "";
  base.schedule.forEach((row) => {
    const tr = document.createElement("tr");
    [
      String(row.month),
      formatEUR(row.payment),
      formatEUR(row.interest),
      formatEUR(row.principal),
      formatEUR(row.balance),
    ].forEach((text) => {
      const td = document.createElement("td");
      td.textContent = text;
      tr.appendChild(td);
    });
    tableBody.appendChild(tr);
  });

  /* --- Plata anticipată --------------------------------------------- */
  const extra = readNumber("extra-lunar", { min: 0, max: 100000 });
  const withExtra = buildAmortizationSchedule(principal, rate, months, extra);

  document.getElementById("stat-fara-durata").textContent = formatMonths(base.monthsUsed);
  document.getElementById("stat-fara-dobanda").textContent = formatEUR(base.totalInterest);
  document.getElementById("stat-cu-durata").textContent = formatMonths(withExtra.monthsUsed);
  document.getElementById("stat-cu-dobanda").textContent = formatEUR(withExtra.totalInterest);

  const economie = base.totalInterest - withExtra.totalInterest;
  const luniMaiDevreme = base.monthsUsed - withExtra.monthsUsed;
  document.getElementById("stat-economie").textContent = formatEUR(Math.max(0, economie));
  document.getElementById("stat-luni-mai-devreme").textContent = formatMonths(Math.max(0, luniMaiDevreme));

  const prepayInsight = document.getElementById("prepay-insight");
  if (extra <= 0) {
    prepayInsight.textContent = "O sumă suplimentară lunară permite estimarea economiei obținute prin rambursare anticipată.";
  } else {
    // Randamentul implicit al plății anticipate este chiar dobânda creditului:
    // fiecare euro plătit în avans „câștigă” dobânda pe care n-o mai plătești.
    prepayInsight.textContent =
      `Plătind ${formatEUR(extra)} (${formatRON(extra * curs)}) în plus în fiecare lună, termini creditul cu ` +
      `${formatMonths(Math.max(0, luniMaiDevreme))} mai devreme și economisești ` +
      `${formatEUR(Math.max(0, economie))} din dobândă. ` +
      `Practic, acei bani „câștigă” un randament garantat egal cu dobânda creditului (${formatPercent(rate / 100)}), ` +
      `ceea ce este mult față de un depozit bancar, dar verifică întâi dacă banca percepe comision de rambursare anticipată.`;
  }

  renderStrategies();
}

/* Pornire */
setupViewToggle(recalc);
setupCsvExport("#table-view table", "grafic-rambursare.csv");
// Cheie nouă: valorile salvate înainte erau în lei, iar acum câmpurile
// creditului sunt în euro. Reîncărcarea lor ar fi arătat un credit de
// 300.000 de euro fără ca utilizatorul să fi schimbat ceva.
persistInputs("datorii-eur", recalc);
recalc();
onChartNeedsRedraw(recalc);
