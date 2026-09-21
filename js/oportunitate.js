/**
 * Cost de oportunitate: ce ar fi devenit o cheltuială dacă rămânea investită.
 *
 * Toate frecvențele se reduc la o contribuție lunară echivalentă, ca să
 * existe un singur model de calcul. Excepția este cheltuiala unică, unde
 * suma intră o dată la început și de acolo doar se compune.
 */

const tooltip = document.getElementById("tooltip");

/**
 * Câte plăți pe lună înseamnă fiecare frecvență.
 *
 * Cheia `zilnic` a rămas cu sensul „zi lucrătoare” pentru că este deja
 * salvată în browserul utilizatorilor; ziua calendaristică a primit o
 * cheie proprie, ca o alegere veche să nu-și schimbe înțelesul.
 */
const FRECVENTE = {
  unic: { perLuna: 0, eticheta: "o singură dată" },
  lunar: { perLuna: 1, eticheta: "pe lună" },
  // 365,25 / 12 — media zilelor dintr-o lună, inclusiv anii bisecți.
  zilnic_calendar: { perLuna: 365.25 / 12, eticheta: "în fiecare zi" },
  // 21 de zile lucrătoare este media pe an (252 / 12).
  zilnic: { perLuna: 21, eticheta: "în fiecare zi lucrătoare" },
  anual: { perLuna: 1 / 12, eticheta: "o dată pe an" },
};

/** Frecvența cerută, cu revenire la „lunar” dacă valoarea salvată nu mai există. */
function frecventaInfo(cheie) {
  return FRECVENTE[cheie] || FRECVENTE.lunar;
}

/**
 * Evoluția paralelă a celor două scenarii, an cu an.
 *
 * @returns {{cheltuit:number[], investit:number[]}}
 */
function proiecteaza(suma, frecventa, ani, randamentPct) {
  const perLuna = frecventaInfo(frecventa).perLuna;
  const lunar = suma * perLuna;
  const initial = frecventa === "unic" ? suma : 0;
  const rataLunara = Math.pow(1 + randamentPct / 100, 1 / 12) - 1;

  const cheltuit = [initial];
  const investit = [initial];
  let sold = initial;
  let total = initial;

  for (let an = 1; an <= ani; an++) {
    for (let m = 0; m < 12; m++) {
      sold = sold * (1 + rataLunara) + lunar;
      total += lunar;
    }
    cheltuit.push(total);
    investit.push(sold);
  }

  return { cheltuit, investit };
}

function recalc() {
  const suma = readNumber("suma", { min: 0, max: 1000000 });
  const frecventa = document.getElementById("frecventa").value;
  const ani = readNumber("orizont", { min: 1, max: 40, fallback: 20, integer: true });
  const randament = readNumber("randament", { min: 0, max: 20, fallback: 7 });
  const inflatie = readNumber("inflatie", { min: 0, max: 30, fallback: 4 });

  const { cheltuit, investit } = proiecteaza(suma, frecventa, ani, randament);
  const totalCheltuit = cheltuit[ani];
  const totalInvestit = investit[ani];
  const cost = totalInvestit - totalCheltuit;
  // Aceeași sumă finală, exprimată în puterea de cumpărare de astăzi.
  const real = totalInvestit / Math.pow(1 + inflatie / 100, ani);

  const info = frecventaInfo(frecventa);
  document.getElementById("stat-cheltuit").textContent = formatRON(totalCheltuit);
  document.getElementById("stat-cheltuit-detaliu").textContent =
    frecventa === "unic"
      ? "o plată unică"
      : `${formatRON(suma)} ${info.eticheta}, timp de ${ani} ani`;
  document.getElementById("stat-investit").textContent = formatRON(totalInvestit);
  document.getElementById("stat-cost").textContent = formatRON(cost);
  document.getElementById("stat-real").textContent = formatRON(real);

  /* --- Concluzie ---------------------------------------------------- */
  const insight = document.getElementById("insight");
  if (suma <= 0) {
    insight.textContent = "Introdu o sumă sau alege un exemplu de mai sus.";
  } else if (frecventa === "unic") {
    const multiplu = totalCheltuit > 0 ? totalInvestit / totalCheltuit : 0;
    insight.textContent =
      `O cheltuială unică de ${formatRON(suma)} ar fi devenit ${formatRON(totalInvestit)} în ${ani} ani ` +
      `la un randament de ${randament}%, adică de ${multiplu.toFixed(1)} ori mai mult. ` +
      `În puterea de cumpărare de astăzi, asta înseamnă aproximativ ${formatRON(real)}, ` +
      `deci prețul real al achiziției este mai aproape de această valoare decât de cea de pe etichetă.`;
  } else {
    const proportieCastig = totalInvestit > 0 ? cost / totalInvestit : 0;
    insight.textContent =
      `${formatRON(suma)} ${info.eticheta} înseamnă ${formatRON(totalCheltuit)} cheltuiți în ${ani} ani. ` +
      `Aceiași bani investiți ar fi ajuns la ${formatRON(totalInvestit)}, din care ${formatPercent(proportieCastig)} ` +
      `nu ar fi venit din buzunarul tău, ci din randament. ` +
      `Cheltuielile recurente mici sunt cele mai scumpe pe termen lung tocmai pentru că nu par o decizie.`;
  }

  /* --- Grafic ------------------------------------------------------- */
  const xValues = Array.from({ length: ani + 1 }, (_, i) => i);
  const series = [
    { name: "Total cheltuit", color: seriesColor(1), values: cheltuit },
    { name: "Dacă era investit", color: seriesColor(2), values: investit },
  ];

  renderLineChart(document.getElementById("chart"), tooltip, {
    xValues,
    xFormat: (v) => `an ${v}`,
    yFormat: (v) => formatRON(v),
    yAxisFormat: (v) => formatRONShort(v),
    series,
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
  xValues.forEach((an) => {
    const tr = document.createElement("tr");
    [
      String(an),
      formatRON(cheltuit[an]),
      formatRON(investit[an]),
      formatRON(investit[an] - cheltuit[an]),
    ].forEach((text) => {
      const td = document.createElement("td");
      td.textContent = text;
      tr.appendChild(td);
    });
    body.appendChild(tr);
  });
}

/* ------------------------------------------------------------------ */
/* Exemplele rapide                                                    */
/* ------------------------------------------------------------------ */

document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    const suma = document.getElementById("suma");
    const frecventa = document.getElementById("frecventa");
    suma.value = chip.dataset.suma;
    frecventa.value = chip.dataset.tip;

    // Marcăm vizual exemplul activ, ca utilizatorul să știe de unde a pornit.
    document.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");

    // Evenimentele declanșează salvarea înregistrată de persistInputs.
    suma.dispatchEvent(new Event("input", { bubbles: true }));
    frecventa.dispatchEvent(new Event("change", { bubbles: true }));
    recalc();
  });
});

document.getElementById("frecventa").addEventListener("change", recalc);

/* ------------------------------------------------------------------ */
/* Pornire și legătura cu bugetul                                      */
/* ------------------------------------------------------------------ */

setupViewToggle(recalc);
setupCsvExport("#table-view table", "cost-oportunitate.csv");
persistInputs("oportunitate", recalc);
recalc();

// Dacă utilizatorul are un buget completat, propunem suma cheltuită pe
// „dorințe” — categoria unde costul de oportunitate este cel mai relevant.
const profil = getProfile();
if (profil.buget && profil.buget.dorinte > 0) {
  offerPrefill({
    mount: "prefill-slot",
    targetInput: "suma",
    value: profil.buget.dorinte,
    text: `În bugetul tău, cheltuielile marcate ca „dorință” însumează ${formatRON(profil.buget.dorinte)} pe lună.`,
    onApply: () => {
      const frecventa = document.getElementById("frecventa");
      frecventa.value = "lunar";
      frecventa.dispatchEvent(new Event("change", { bubbles: true }));
      recalc();
    },
  });
}

onChartNeedsRedraw(recalc);
