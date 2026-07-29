/**
 * Comparator „chirie vs. cumpărare”.
 *
 * Modelul compară averea netă a două persoane cu exact același capital
 * inițial și aceeași disponibilitate lunară de plată:
 *
 *   Cumpărătorul  — dă avansul pe casă, plătește rata + întreținerea.
 *   Chiriașul     — investește avansul la bursă, plătește chiria.
 *
 * În fiecare lună, cel care are cheltuiala mai mică investește diferența.
 * Fără această regulă comparația ar fi părtinitoare: ar arăta doar cine
 * plătește mai puțin, nu ce se întâmplă cu banii economisiți.
 */

const tooltip = document.getElementById("tooltip");

/** Recalculează totul la orice modificare a unui câmp. */
document.querySelectorAll("main input").forEach((el) => el.addEventListener("input", recalc));

/**
 * Rulează simularea lună cu lună.
 * @returns {object} seriile de date necesare graficului și tabelului
 */
function simulate(params) {
  const {
    pret, avans, dobandaCredit, loanMonths, cresterePretAnual,
    intretinerePct, costAchizitiePct, chirieInitiala,
    cresterChirieAnual, randamentAnual, horizonMonths,
  } = params;

  const principalCredit = Math.max(0, pret - avans);
  const schedule = buildAmortizationSchedule(principalCredit, dobandaCredit, loanMonths, 0);
  const rataLunara = schedule.monthlyPaymentBase;

  // Ratele anuale devin rate lunare echivalente (creștere compusă).
  const lunarPiata = Math.pow(1 + randamentAnual / 100, 1 / 12) - 1;
  const lunarImobil = Math.pow(1 + cresterePretAnual / 100, 1 / 12) - 1;
  const lunarChirie = Math.pow(1 + cresterChirieAnual / 100, 1 / 12) - 1;

  // Taxele de achiziție (notar, intabulare, comision) se plătesc o dată,
  // din buzunarul cumpărătorului — chiriașul le păstrează investite.
  const costAchizitie = (pret * costAchizitiePct) / 100;

  let homeValue = pret;
  let chirie = chirieInitiala;
  let portofoliuChirias = avans;             // chiriașul investește avansul
  let portofoliuCumparator = 0;              // cumpărătorul pornește fără investiții
  let costAchizitieRamas = costAchizitie;

  const years = [0];
  const homeValues = [pret];
  const mortgageBalances = [principalCredit];
  const buyerNetWorth = [avans - costAchizitie];
  const buyerPortfolios = [0];
  const renterPortfolios = [avans];
  const renterNetWorth = [avans];

  for (let m = 1; m <= horizonMonths; m++) {
    const mortgageBalance = m <= schedule.schedule.length ? schedule.schedule[m - 1].balance : 0;

    // Cheltuiala lunară a fiecăruia.
    const intretinere = (homeValue * intretinerePct) / 100 / 12;
    const cheltuialaCumparator = (m <= loanMonths ? rataLunara : 0) + intretinere;
    const cheltuialaChirias = chirie;

    // Cine plătește mai puțin, investește diferența. Regula funcționează
    // în ambele sensuri — și când chiria e mai mare decât rata.
    const diferenta = cheltuialaCumparator - cheltuialaChirias;
    if (diferenta > 0) {
      portofoliuChirias = portofoliuChirias * (1 + lunarPiata) + diferenta;
      portofoliuCumparator = portofoliuCumparator * (1 + lunarPiata);
    } else {
      portofoliuCumparator = portofoliuCumparator * (1 + lunarPiata) - diferenta;
      portofoliuChirias = portofoliuChirias * (1 + lunarPiata);
    }

    // Creșterile se aplică lunar, ca evoluția să fie continuă.
    homeValue *= 1 + lunarImobil;
    chirie *= 1 + lunarChirie;

    if (m % 12 === 0) {
      years.push(m / 12);
      homeValues.push(homeValue);
      mortgageBalances.push(mortgageBalance);
      buyerPortfolios.push(portofoliuCumparator);
      renterPortfolios.push(portofoliuChirias);
      buyerNetWorth.push(homeValue - mortgageBalance + portofoliuCumparator - costAchizitieRamas);
      renterNetWorth.push(portofoliuChirias);
    }
  }

  return {
    years, homeValues, mortgageBalances, buyerPortfolios,
    renterPortfolios, buyerNetWorth, renterNetWorth,
    rataLunara, principalCredit, costAchizitie,
  };
}

function recalc() {
  /* --- Citirea și validarea câmpurilor ----------------------------- */
  const pret = readNumber("pret", { min: 0, max: 100000000 });
  const avans = readNumber("avans", { min: 0, max: pret });
  const dobandaCredit = readNumber("dobanda-credit", { min: 0, max: 50 });
  const perioadaCredit = readNumber("perioada-credit", { min: 1, max: 35, fallback: 25, integer: true });
  const cresterePretAnual = readNumber("crestere-imobil", { min: -10, max: 20 });
  const intretinerePct = readNumber("intretinere", { min: 0, max: 10 });
  const costAchizitiePct = readNumber("cost-achizitie", { min: 0, max: 15 });
  const chirieInitiala = readNumber("chirie", { min: 0, max: 1000000 });
  const cresterChirieAnual = readNumber("crestere-chirie", { min: -10, max: 20 });
  const randamentAnual = readNumber("randament-bursa", { min: -10, max: 20 });
  const orizontAni = readNumber("orizont", { min: 1, max: 40, fallback: 25, integer: true });

  const sim = simulate({
    pret, avans, dobandaCredit,
    loanMonths: perioadaCredit * 12,
    cresterePretAnual, intretinerePct, costAchizitiePct,
    chirieInitiala, cresterChirieAnual, randamentAnual,
    horizonMonths: orizontAni * 12,
  });

  const buyerFinal = sim.buyerNetWorth[sim.buyerNetWorth.length - 1];
  const renterFinal = sim.renterNetWorth[sim.renterNetWorth.length - 1];
  const diferenta = buyerFinal - renterFinal;

  /* --- Avertisment la avans insuficient ----------------------------- */
  // Nu blocăm calculul: scenariul rămâne valid ca exercițiu, dar simularea
  // ar porni de la o ipoteză pe care nicio bancă nu ar accepta-o.
  const avertisment = document.getElementById("avans-avertisment");
  const procentAvans = pret > 0 ? avans / pret : 0;
  if (pret > 0 && procentAvans < 0.15) {
    avertisment.textContent =
      `Avansul reprezintă ${formatPercent(procentAvans)} din preț. Băncile din România cer de obicei ` +
      `minimum 15%, adică ${formatRON(pret * 0.15)}. Simularea continuă, dar creditul ar fi greu de obținut ` +
      `în aceste condiții.`;
    avertisment.classList.remove("hidden");
  } else {
    avertisment.classList.add("hidden");
  }

  /* --- Indicatori --------------------------------------------------- */
  document.getElementById("stat-rata-lunara").textContent = formatRON(sim.rataLunara);
  document.getElementById("stat-credit").textContent = formatRON(sim.principalCredit);
  document.getElementById("stat-avere-cumparare").textContent = formatRON(buyerFinal);
  document.getElementById("stat-avere-chirie").textContent = formatRON(renterFinal);

  const difEl = document.getElementById("stat-diferenta");
  difEl.textContent = formatRON(Math.abs(diferenta));
  difEl.classList.remove("good", "critical");

  const castigator = document.getElementById("stat-castigator");
  castigator.textContent = Math.abs(diferenta) < 1 ? "Egalitate" : diferenta > 0 ? "Cumpărare" : "Chirie + bursă";

  const colorCumparare = seriesColor(0);
  const colorChirie = seriesColor(2);
  document.getElementById("tile-cumparare").style.setProperty("--accent-id", colorCumparare);
  document.getElementById("tile-chirie").style.setProperty("--accent-id", colorChirie);

  /* --- Anul în care se schimbă avantajul ---------------------------- */
  let breakEvenYear = null;
  for (let i = 1; i < sim.years.length; i++) {
    const prev = sim.buyerNetWorth[i - 1] - sim.renterNetWorth[i - 1];
    const now = sim.buyerNetWorth[i] - sim.renterNetWorth[i];
    if (prev < 0 && now >= 0) { breakEvenYear = sim.years[i]; break; }
  }

  const insight = document.getElementById("insight");
  const parts = [];
  if (Math.abs(diferenta) < 1) {
    parts.push(`Pe ${orizontAni} de ani, cele două variante ajung la o avere netă practic identică.`);
  } else if (diferenta > 0) {
    parts.push(`Pe ${orizontAni} de ani, cumpărarea ar genera o avere netă mai mare cu ${formatRON(diferenta)}.`);
  } else {
    parts.push(`Pe ${orizontAni} de ani, „chirie + investiții la bursă” ar genera o avere netă mai mare cu ${formatRON(-diferenta)}.`);
  }
  // Menționăm pragul doar dacă a existat efectiv o perioadă în care
  // chiria era în avantaj; altfel mesajul ar fi derutant.
  if (breakEvenYear !== null && breakEvenYear > 1) {
    parts.push(`Cumpărarea depășește varianta cu chirie abia din anul ${breakEvenYear} — sub acest orizont, chiria iese mai bine.`);
  }
  parts.push(
    sim.rataLunara + (pret * intretinerePct) / 100 / 12 > chirieInitiala
      ? `În prima lună, proprietarul plătește mai mult decât chiriașul, deci chiriașul are ce investi.`
      : `În prima lună, chiria e mai mare decât rata plus întreținerea, deci proprietarul are ce investi.`
  );
  insight.textContent = parts.join(" ");

  /* --- Grafic ------------------------------------------------------- */
  renderLineChart(document.getElementById("chart"), tooltip, {
    xValues: sim.years,
    xFormat: (v) => `an ${v}`,
    yFormat: (v) => formatRON(v),
    yAxisFormat: (v) => formatRONShort(v),
    series: [
      { name: "Cumpărare", color: colorCumparare, values: sim.buyerNetWorth },
      { name: "Chirie + bursă", color: colorChirie, values: sim.renterNetWorth },
    ],
  });

  const legend = document.getElementById("legend");
  legend.textContent = "";
  [
    { name: "Cumpărare", color: colorCumparare, value: buyerFinal },
    { name: "Chirie + bursă", color: colorChirie, value: renterFinal },
  ].forEach((s) => {
    const item = document.createElement("span");
    item.className = "item";
    const sw = document.createElement("span");
    sw.className = "swatch line";
    sw.style.background = s.color;
    item.appendChild(sw);
    item.appendChild(document.createTextNode(s.name + " "));
    const amount = document.createElement("span");
    amount.className = "amount";
    amount.textContent = formatRON(s.value);
    item.appendChild(amount);
    legend.appendChild(item);
  });

  /* --- Tabel -------------------------------------------------------- */
  const body = document.getElementById("table-body");
  body.textContent = "";
  sim.years.forEach((year, i) => {
    const tr = document.createElement("tr");
    [
      String(year),
      formatRON(sim.homeValues[i]),
      formatRON(sim.mortgageBalances[i]),
      formatRON(sim.buyerPortfolios[i]),
      formatRON(sim.buyerNetWorth[i]),
      formatRON(sim.renterNetWorth[i]),
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
setupCsvExport("#table-view table", "chirie-vs-cumparare.csv");
persistInputs("comparator", recalc);
recalc();
onChartNeedsRedraw(recalc);
