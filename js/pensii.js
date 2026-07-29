/**
 * Proiecție pentru cele trei piloane de pensie.
 *
 * Pilonii II și III se acumulează, deci se pot proiecta an cu an și apar
 * în grafic. Pilonul I nu are un sold care crește undeva, deci este tratat
 * separat, ca rată de înlocuire aplicată salariului net de la pensionare —
 * a-l desena pe același grafic ar sugera o comparație care nu are sens.
 */

const tooltip = document.getElementById("tooltip");

/** Durata presupusă a pensiei, folosită ca să traducem soldul în venit lunar. */
const ANI_DE_PENSIE = 20;

function recalc() {
  const brut = readNumber("salariu-brut", { min: 0, max: 1e7 });
  const varsta = readNumber("varsta", { min: 18, max: 70, fallback: 30, integer: true });
  const varstaPensie = readNumber("varsta-pensie", { min: 45, max: 75, fallback: 65, integer: true });
  const soldExistent = readNumber("sold-pilon2", { min: 0, max: 1e8 });
  const crestereSalariu = readNumber("crestere-salariu", { min: 0, max: 20, fallback: 5 });
  const randamentP2 = readNumber("randament-p2", { min: 0, max: 20, fallback: 7 });
  const pilon3Lunar = readNumber("pilon3-lunar", { min: 0, max: 100000 });
  const randamentP3 = readNumber("randament-p3", { min: 0, max: 20, fallback: 7 });
  const inflatie = readNumber("inflatie", { min: 0, max: 20, fallback: 4 });
  const rataInlocuire = readNumber("rata-inlocuire", {
    min: 0,
    max: 100,
    fallback: Math.round(RATA_INLOCUIRE_PILON1),
  });

  const aniRamasi = Math.max(0, varstaPensie - varsta);

  const r = projectPension({
    grossSalary: brut,
    currentAge: varsta,
    retirementAge: varstaPensie,
    wageGrowthPct: crestereSalariu,
    pillar2ReturnPct: randamentP2,
    pillar3Monthly: pilon3Lunar,
    pillar3ReturnPct: randamentP3,
    existingPillar2: soldExistent,
  });

  const real = r.total / Math.pow(1 + inflatie / 100, aniRamasi);
  const venitLunar = r.total / (ANI_DE_PENSIE * 12);

  /* --- Cartonașe ----------------------------------------------------- */
  document.getElementById("tile-p2").style.setProperty("--accent-id", seriesColor(0));
  document.getElementById("tile-p3").style.setProperty("--accent-id", seriesColor(2));

  document.getElementById("stat-p2").textContent = formatRON(r.final2);
  document.getElementById("stat-p2-contrib").textContent =
    `din care ${formatRON(r.contributed2)} contribuit`;
  document.getElementById("stat-p3").textContent = formatRON(r.final3);
  document.getElementById("stat-p3-contrib").textContent =
    pilon3Lunar > 0 ? `din care ${formatRON(r.contributed3)} contribuit` : "nu contribui la Pilonul III";
  document.getElementById("stat-total").textContent = formatRON(r.total);
  document.getElementById("stat-real").textContent = formatRON(real);
  document.getElementById("stat-lunar").textContent = formatRON(venitLunar);

  /* --- Concluzie ----------------------------------------------------- */
  const insight = document.getElementById("insight");
  if (aniRamasi <= 0) {
    insight.textContent =
      "Vârsta de pensionare este egală sau mai mică decât vârsta actuală, deci nu mai există perioadă de acumulare.";
  } else {
    const contribuitTotal = r.contributed2 + r.contributed3;
    const dinRandament = r.total - contribuitTotal - soldExistent;
    const proportie = r.total > 0 ? dinRandament / r.total : 0;

    let comparatieP3 = "";
    if (pilon3Lunar > 0) {
      const raport = r.final2 > 0 ? r.final3 / r.final2 : 0;
      comparatieP3 =
        ` Contribuția voluntară de ${formatRON(pilon3Lunar)} pe lună adaugă ${formatRON(r.final3)} — ` +
        `adică ${formatPercent(raport)} peste ce ai primi din Pilonul II singur.`;
    } else {
      comparatieP3 =
        " Nu contribui la Pilonul III. Introdu o sumă mai sus ca să vezi ce diferență ar face, " +
        "ținând cont că primii 400 EUR pe an sunt deductibili fiscal.";
    }

    insight.textContent =
      `În ${aniRamasi} ani până la pensionare acumulezi aproximativ ${formatRON(r.total)}. ` +
      `Din această sumă, ${formatPercent(proportie)} nu vine din contribuții, ci din randamentul acumulat. ` +
      `În puterea de cumpărare de astăzi, echivalentul este ${formatRON(real)} — ` +
      `diferența față de cifra nominală este exact efectul inflației pe ${aniRamasi} ani.` +
      comparatieP3;
  }

  /* --- Pilonul I ------------------------------------------------------ */
  const p1 = estimatePillar1({
    grossSalary: brut,
    currentAge: varsta,
    retirementAge: varstaPensie,
    wageGrowthPct: crestereSalariu,
    replacementRatePct: rataInlocuire,
  });

  // Toate cifrele de aici sunt nominale, la data pensionării. Le raportăm
  // la salariul de atunci, nu la cel de azi — altfel procentul n-ar avea sens.
  const venitTotalLunar = p1.monthlyPension + venitLunar;
  const inlocuireTotala = p1.netAtRetirement > 0 ? venitTotalLunar / p1.netAtRetirement : 0;

  document.getElementById("tile-p1").style.setProperty("--accent-id", seriesColor(4));

  document.getElementById("stat-net-final").textContent = formatRON(p1.netAtRetirement);
  document.getElementById("stat-net-final-detaliu").textContent =
    aniRamasi > 0
      ? `dintr-un brut de ${formatRON(p1.grossAtRetirement)}, peste ${aniRamasi} ani`
      : "salariul net de astăzi";

  document.getElementById("stat-p1").textContent = formatRON(p1.monthlyPension);
  document.getElementById("stat-p1-detaliu").textContent = `${rataInlocuire}% din salariul net`;

  document.getElementById("stat-venit-total").textContent = formatRON(venitTotalLunar);
  document.getElementById("stat-inlocuire-totala").textContent = formatPercent(inlocuireTotala);

  document.getElementById("reper-p1").textContent =
    `În ${REPER_PILON1.an}, pensia medie de asigurări sociale de stat era de aproximativ ` +
    `${formatRON(REPER_PILON1.pensieMedie)} pe lună, iar câștigul salarial mediu net de aproximativ ` +
    `${formatRON(REPER_PILON1.salariuNetMediu)} — un raport de ${formatPercent(RATA_INLOCUIRE_PILON1 / 100)}.`;

  const insightP1 = document.getElementById("insight-p1");
  if (brut <= 0) {
    insightP1.textContent = "Introdu un salariu brut ca să vezi estimarea pentru Pilonul I.";
  } else {
    const pierdere = 1 - rataInlocuire / 100;
    insightP1.textContent =
      `La ${rataInlocuire}% rată de înlocuire, pensia publică ar fi de ${formatRON(p1.monthlyPension)} pe lună — ` +
      `cu ${formatPercent(pierdere)} mai puțin decât salariul net din ultimul an de muncă. ` +
      (venitLunar > 0
        ? `Retragerile din pilonii II și III adaugă ${formatRON(venitLunar)} pe lună timp de ${ANI_DE_PENSIE} de ani, ` +
          `deci ajungi la ${formatPercent(inlocuireTotala)} din salariul de atunci. ` +
          (inlocuireTotala < 0.7
            ? "Sub 70% înseamnă o scădere sesizabilă a nivelului de trai — diferența trebuie acoperită din economii proprii."
            : "Peste 70% este pragul de la care majoritatea oamenilor nu resimt o schimbare bruscă a nivelului de trai.")
        : "Fără pilonii II și III, aceasta ar fi singura ta sursă de venit la pensie.");
  }

  /* --- Deducerea fiscală --------------------------------------------- */
  const anual = pilon3Lunar * 12;
  const plafonAnual = PLAFON_PILON3_LUNAR * 12;
  const deductibil = Math.min(anual, plafonAnual);
  const economieFiscala = deductibil * CONTRIBUTII.impozit;

  document.getElementById("stat-p3-anual").textContent = formatRON(anual);
  document.getElementById("stat-deductibil").textContent = formatRON(deductibil);
  document.getElementById("stat-economie-fiscala").textContent = formatRON(economieFiscala);

  document.getElementById("insight-deducere").textContent =
    anual <= 0
      ? `Plafonul deductibil este de 400 EUR pe an, adică aproximativ ${formatRON(plafonAnual)}. ` +
        `O contribuție până la acest nivel îți reduce impozitul cu 10% din suma contribuită.`
      : anual <= plafonAnual
        ? `Toată contribuția ta este deductibilă. Statul îți returnează ${formatRON(economieFiscala)} pe an ` +
          `sub forma unui impozit mai mic — un randament cert de 10%, înainte de orice câștig al fondului.`
        : `Contribui ${formatRON(anual)} pe an, dar doar ${formatRON(deductibil)} sunt deductibili. ` +
          `Suma peste plafon nu mai are avantaj fiscal, deci merită comparată cu un cont propriu de investiții, ` +
          `care este mai flexibil și de obicei are comisioane mai mici.`;

  /* --- Grafic --------------------------------------------------------- */
  const series = [
    { name: "Pilon II", color: seriesColor(0), values: r.pillar2 },
  ];
  if (pilon3Lunar > 0) {
    series.push({ name: "Pilon III", color: seriesColor(2), values: r.pillar3 });
    series.push({
      name: "Total",
      color: seriesColor(6),
      values: r.pillar2.map((v, i) => v + r.pillar3[i]),
    });
  }

  renderLineChart(document.getElementById("chart"), tooltip, {
    xValues: r.years,
    // Etichetăm cu vârsta, nu cu numărul anului: e mai ușor de raportat la tine.
    xFormat: (v) => `${varsta + v} ani`,
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

  /* --- Tabel ---------------------------------------------------------- */
  const body = document.getElementById("table-body");
  body.textContent = "";
  r.years.forEach((an) => {
    const tr = document.createElement("tr");
    [
      String(an),
      String(varsta + an),
      formatRON(r.pillar2[an]),
      formatRON(r.pillar3[an]),
      formatRON(r.pillar2[an] + r.pillar3[an]),
    ].forEach((text) => {
      const td = document.createElement("td");
      td.textContent = text;
      tr.appendChild(td);
    });
    body.appendChild(tr);
  });
}

/* Pornire */
setupViewToggle(recalc);
setupCsvExport("#table-view table", "proiectie-pensie.csv");
persistInputs("pensii", recalc);
recalc();

// Dacă utilizatorul a folosit calculatorul de salariu, propunem brutul de acolo.
const profilSalariu = readJSON("ef-inputs-salariu", null);
if (profilSalariu && profilSalariu.brut) {
  offerPrefill({
    mount: "prefill-slot",
    targetInput: "salariu-brut",
    value: parseFloat(profilSalariu.brut),
    text: "Ai calculat deja un salariu în modulul „Salariu brut → net”.",
    onApply: recalc,
  });
}

onChartNeedsRedraw(recalc);
