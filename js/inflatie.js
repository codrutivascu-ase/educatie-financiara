/**
 * Calculator de inflație.
 *
 * Două întrebări separate, pentru că oamenii le pun separat:
 *  1. cât ar valora azi o sumă din trecut (retrospectiv);
 *  2. cât va mai valora o sumă păstrată în cont (prospectiv).
 *
 * A doua este cea care schimbă comportamentul, prima este cea care
 * face efectul credibil — de aceea apar în această ordine.
 */

const tooltip = document.getElementById("tooltip");

/* ------------------------------------------------------------------ */
/* Retrospectiv: cât valorează azi banii de atunci                     */
/* ------------------------------------------------------------------ */

function recalcTrecut() {
  const suma = readNumber("suma-trecut", { min: 0, max: 100000000 });
  const ani = readNumber("ani-trecut", { min: 1, max: 40, fallback: 10, integer: true });
  const inflatie = readNumber("inflatie-trecut", { min: 0, max: 50, fallback: 6 });

  // Aceeași putere de cumpărare, exprimată în lei de astăzi.
  const echivalent = adjustForInflation(suma, ani, inflatie);
  const crestere = suma > 0 ? echivalent / suma - 1 : 0;

  document.getElementById("stat-echivalent").textContent = formatRON(echivalent);
  document.getElementById("stat-crestere").textContent = formatPercent(crestere);

  document.getElementById("insight-trecut").textContent =
    suma <= 0
      ? "Introdu o sumă ca să vezi echivalentul de astăzi."
      : `Ce cumpărai cu ${formatRON(suma)} acum ${ani} ${ani === 1 ? "an" : "ani"} costă astăzi ` +
        `aproximativ ${formatRON(echivalent)}. Altfel spus, prețurile au crescut cu ${formatPercent(crestere)} ` +
        `în această perioadă, la o inflație medie de ${inflatie}% pe an. ` +
        `Dacă salariul tău nu a crescut cel puțin la fel de mult, ai pierdut putere de cumpărare.`;
}

/* ------------------------------------------------------------------ */
/* Prospectiv: cât pierde o sumă care stă                              */
/* ------------------------------------------------------------------ */

function recalcViitor() {
  const suma = readNumber("suma-viitor", { min: 0, max: 100000000 });
  const ani = readNumber("ani-viitor", { min: 1, max: 40, fallback: 10, integer: true });
  const dobanda = readNumber("dobanda-cont", { min: 0, max: 30 });
  const inflatie = readNumber("inflatie-viitor", { min: 0, max: 50, fallback: 5 });

  const rezultat = purchasingPower(suma, ani, inflatie, dobanda);
  const nominalFinal = rezultat.nominal[ani];
  const realFinal = rezultat.real[ani];

  // Randamentul real anual: cel nominal, corectat de inflație.
  const randamentReal = (1 + dobanda / 100) / (1 + inflatie / 100) - 1;

  document.getElementById("stat-nominal").textContent = formatRON(nominalFinal);

  const realEl = document.getElementById("stat-real");
  realEl.textContent = formatRON(realFinal);
  realEl.classList.toggle("critical", realFinal < suma);
  realEl.classList.toggle("good", realFinal > suma);

  const realAnualEl = document.getElementById("stat-real-anual");
  realAnualEl.textContent = formatPercent(randamentReal);
  realAnualEl.classList.toggle("critical", randamentReal < 0);
  realAnualEl.classList.toggle("good", randamentReal > 0);

  const pierdereEl = document.getElementById("stat-pierdere");
  pierdereEl.textContent = formatRON(Math.max(0, suma - realFinal));
  pierdereEl.classList.toggle("critical", realFinal < suma);

  /* --- Concluzie ---------------------------------------------------- */
  const insight = document.getElementById("insight-viitor");
  if (suma <= 0) {
    insight.textContent = "Introdu o sumă ca să vezi efectul.";
  } else if (randamentReal < 0) {
    insight.textContent =
      `Cu o dobândă de ${dobanda}% și o inflație de ${inflatie}%, randamentul real este ` +
      `${formatPercent(randamentReal)} pe an. După ${ani} ani, cei ${formatRON(suma)} vor mai cumpăra ` +
      `cât cumpără astăzi ${formatRON(realFinal)}, o pierdere de ${formatPercent(rezultat.lostPct)} ` +
      `din puterea de cumpărare, fără să apară vreodată un minus în extras.`;
  } else if (randamentReal === 0) {
    insight.textContent =
      `Dobânda egalează exact inflația: îți păstrezi puterea de cumpărare, dar nu câștigi nimic în termeni reali.`;
  } else {
    insight.textContent =
      `Dobânda de ${dobanda}% depășește inflația de ${inflatie}%, deci randamentul real este pozitiv: ` +
      `${formatPercent(randamentReal)} pe an. Este o situație rar întâlnită pe perioade lungi, așa că ` +
      `verifică dacă dobânda este garantată pe toată durata sau doar promoțională.`;
  }

  /* --- Grafic ------------------------------------------------------- */
  const xValues = Array.from({ length: ani + 1 }, (_, i) => i);
  const series = [
    { name: "Sold nominal", color: seriesColor(0), values: rezultat.nominal },
    { name: "Putere de cumpărare", color: seriesColor(1), values: rezultat.real },
  ];

  renderLineChart(document.getElementById("chart"), tooltip, {
    xValues,
    xFormat: (v) => `an ${v}`,
    yFormat: (v) => formatRON(v),
    yAxisFormat: (v) => formatRONShort(v),
    series,
    targetValue: suma > 0 ? suma : null,
    targetLabel: `Suma inițială: ${formatRON(suma)}`,
  });

  const legend = document.getElementById("legend");
  legend.textContent = "";
  series.forEach((s) => {
    const item = document.createElement("span");
    item.className = "item";
    const sw = document.createElement("span");
    sw.className = "swatch line";
    sw.style.background = s.color;
    item.appendChild(sw);
    item.appendChild(document.createTextNode(s.name + " "));
    const amount = document.createElement("span");
    amount.className = "amount";
    amount.textContent = formatRON(s.values[s.values.length - 1]);
    item.appendChild(amount);
    legend.appendChild(item);
  });

  /* --- Tabel -------------------------------------------------------- */
  const body = document.getElementById("table-body");
  body.textContent = "";
  xValues.forEach((year) => {
    const tr = document.createElement("tr");
    const pierdere = rezultat.nominal[year] - rezultat.real[year];
    [
      String(year),
      formatRON(rezultat.nominal[year]),
      formatRON(rezultat.real[year]),
      formatRON(pierdere),
    ].forEach((text) => {
      const td = document.createElement("td");
      td.textContent = text;
      tr.appendChild(td);
    });
    body.appendChild(tr);
  });
}

function recalc() {
  recalcTrecut();
  recalcViitor();
}

/* Pornire */
setupViewToggle(recalcViitor);
setupCsvExport("#table-view table", "efect-inflatie.csv");
persistInputs("inflatie", recalc);
recalc();
onChartNeedsRedraw(recalcViitor);
