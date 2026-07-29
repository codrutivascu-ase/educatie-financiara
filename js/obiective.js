/**
 * Obiective de economisire.
 *
 * Pornind de la o sumă țintă și un termen, calculează cât trebuie pus
 * deoparte lunar și arată traiectoria până la obiectiv. Opțional ia în
 * calcul și o dobândă, dacă banii stau într-un cont cu randament.
 */

const tooltip = document.getElementById("tooltip");

/**
 * Suma lunară necesară pentru a ajunge la țintă, ținând cont de dobândă.
 *
 * Fără dobândă e o simplă împărțire. Cu dobândă folosim formula valorii
 * viitoare a unei anuități, rezolvată pentru plata lunară.
 */
function requiredMonthlyPayment(target, current, months, annualRatePct) {
  const remaining = Math.max(0, target - current);
  if (months <= 0) return remaining;

  const r = Math.pow(1 + annualRatePct / 100, 1 / 12) - 1;
  if (r === 0) return remaining / months;

  // Suma deja economisită crește și ea singură până la termen.
  const futureOfCurrent = current * Math.pow(1 + r, months);
  const stillNeeded = Math.max(0, target - futureOfCurrent);
  // FV = PMT × ((1+r)^n − 1) / r  →  PMT = FV × r / ((1+r)^n − 1)
  return (stillNeeded * r) / (Math.pow(1 + r, months) - 1);
}

function recalc() {
  const tinta = readNumber("tinta", { min: 0, max: 100000000 });
  const luni = readNumber("termen", { min: 1, max: 240, fallback: 8, integer: true });
  const deja = readNumber("deja-economisit", { min: 0, max: 100000000 });
  const dobanda = readNumber("dobanda-cont", { min: 0, max: 20 });

  const atinsDeja = tinta > 0 && deja >= tinta;
  const lunar = atinsDeja ? 0 : requiredMonthlyPayment(tinta, deja, luni, dobanda);
  const procent = tinta > 0 ? Math.min(1, deja / tinta) : 0;

  /* --- Indicatori --------------------------------------------------- */
  document.getElementById("stat-lunar").textContent = formatRON(lunar);
  document.getElementById("stat-luni").textContent = atinsDeja ? "—" : formatMonths(luni);
  document.getElementById("stat-procent").textContent = formatPercent(procent);

  // Cât din efort îl acoperă dobânda, dacă există.
  const totalDepus = lunar * luni;
  const contributieDobanda = Math.max(0, tinta - deja - totalDepus);
  document.getElementById("stat-dobanda-aport").textContent =
    dobanda > 0 && !atinsDeja ? formatRON(contributieDobanda) : "—";

  /* --- Bara de progres ---------------------------------------------- */
  document.getElementById("meter-label-left").textContent = `${formatRON(deja)} economisiți`;
  document.getElementById("meter-label-right").textContent = `Țintă: ${formatRON(tinta)}`;
  const fill = document.getElementById("meter-fill");
  fill.style.width = `${(procent * 100).toFixed(1)}%`;
  fill.classList.toggle("good", atinsDeja);
  const meter = document.getElementById("meter-track");
  meter.setAttribute("role", "progressbar");
  meter.setAttribute("aria-valuemin", "0");
  meter.setAttribute("aria-valuemax", "100");
  meter.setAttribute("aria-valuenow", String(Math.round(procent * 100)));

  /* --- Concluzie ---------------------------------------------------- */
  const insight = document.getElementById("insight");
  if (tinta <= 0) {
    insight.textContent = "Introdu o sumă țintă ca să vezi cât trebuie să economisești lunar.";
  } else if (atinsDeja) {
    insight.textContent = "Felicitări, ai atins deja ținta propusă. Următorul pas util este să stabilești unde țin acești bani.";
  } else {
    const zilnic = lunar / 30;
    insight.textContent =
      `Trebuie să pui deoparte ${formatRON(lunar)} pe lună timp de ${formatMonths(luni)} ` +
      `ca să ajungi la ${formatRON(tinta)} — aproximativ ${formatRON(zilnic)} pe zi. ` +
      (dobanda > 0
        ? `Dobânda de ${formatPercent(dobanda / 100)} pe an contribuie cu ${formatRON(contributieDobanda)} din total, deci depui efectiv mai puțin.`
        : `Dacă ai ține banii într-un cont cu dobândă, ai avea nevoie de o sumă lunară ceva mai mică.`);
  }

  /* --- Grafic ------------------------------------------------------- */
  const months = Array.from({ length: luni + 1 }, (_, i) => i);
  const r = Math.pow(1 + dobanda / 100, 1 / 12) - 1;
  let balance = deja;
  const values = months.map((m) => {
    if (m === 0) return deja;
    balance = balance * (1 + r) + (atinsDeja ? 0 : lunar);
    return balance;
  });

  renderLineChart(document.getElementById("chart"), tooltip, {
    xValues: months,
    xFormat: (v) => `luna ${v}`,
    yFormat: (v) => formatRON(v),
    yAxisFormat: (v) => formatRONShort(v),
    series: [{ name: "Economii acumulate", color: seriesColor(0), values }],
    targetValue: tinta > 0 ? tinta : null,
    targetLabel: `Țintă: ${formatRON(tinta)}`,
    areaFill: true,
  });

  const legend = document.getElementById("legend");
  legend.textContent = "";
  const item = document.createElement("span");
  item.className = "item";
  const sw = document.createElement("span");
  sw.className = "swatch line";
  sw.style.background = seriesColor(0);
  item.appendChild(sw);
  item.appendChild(document.createTextNode("Economii acumulate"));
  legend.appendChild(item);

  /* --- Tabel -------------------------------------------------------- */
  const body = document.getElementById("table-body");
  body.textContent = "";
  months.forEach((m) => {
    const tr = document.createElement("tr");
    [String(m), formatRON(values[m]), formatPercent(tinta > 0 ? Math.min(1, values[m] / tinta) : 0)].forEach(
      (text) => {
        const td = document.createElement("td");
        td.textContent = text;
        tr.appendChild(td);
      }
    );
    body.appendChild(tr);
  });
}

/* Pornire */
setupViewToggle(recalc);
setupCsvExport("#table-view table", "obiectiv-economisire.csv");
persistInputs("obiective", recalc);
recalc();
onChartNeedsRedraw(recalc);
