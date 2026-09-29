/**
 * Obiective de economisire.
 *
 * Pornind de la o sumă țintă și un termen, calculează cât trebuie pus
 * deoparte lunar și arată traiectoria până la obiectiv. Opțional ia în
 * calcul și o dobândă, dacă banii stau într-un cont cu randament.
 */

const tooltip = document.getElementById("tooltip");

function recalc() {
  const tinta = readNumber("tinta", { min: 0, max: 10000000 });
  const luni = readNumber("termen", { min: 1, max: 240, fallback: 8, integer: true });
  const deja = readNumber("deja-economisit", { min: 0, max: 10000000 });
  const dobanda = readNumber("dobanda-cont", { min: 0, max: 20 });
  const capitalizare = Number(document.getElementById("capitalizare").value) || 12;

  const atinsDeja = tinta > 0 && deja >= tinta;
  const lunar = atinsDeja ? 0 : requiredMonthlySaving(tinta, deja, luni, dobanda, capitalizare);
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
    insight.textContent = "Este necesară introducerea unei sume țintă pentru calcularea contribuției lunare.";
  } else if (atinsDeja) {
    insight.textContent = "Suma economisită este egală cu sau mai mare decât ținta stabilită. Nu mai este necesară o contribuție lunară suplimentară.";
  } else {
    const zilnic = lunar / 30;
    insight.textContent =
      `Trebuie să pui deoparte ${formatRON(lunar)} pe lună timp de ${formatMonths(luni)} ` +
      `ca să ajungi la ${formatRON(tinta)}, adică aproximativ ${formatRON(zilnic)} pe zi. ` +
      (dobanda > 0
        ? `Dobânda de ${formatPercent(dobanda / 100)} pe an contribuie cu ${formatRON(contributieDobanda)} din total, deci depui efectiv mai puțin.`
        : `Dacă ai ține banii într-un cont cu dobândă, ai avea nevoie de o sumă lunară ceva mai mică.`);
  }

  /* --- Grafic ------------------------------------------------------- */
  const months = Array.from({ length: luni + 1 }, (_, i) => i);
  const values = savingsBalances(deja, atinsDeja ? 0 : lunar, luni, dobanda, capitalizare);

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
document.querySelectorAll("#parametri input, #parametri select").forEach((el) => {
  el.addEventListener("input", recalc);
  el.addEventListener("change", recalc);
});
document.getElementById("btn-calculeaza").addEventListener("click", recalc);
setupViewToggle(recalc);
setupCsvExport("#table-view table", "obiectiv-economisire.csv");
persistInputs("obiective", recalc);
recalc();
onChartNeedsRedraw(recalc);
