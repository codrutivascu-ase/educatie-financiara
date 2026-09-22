/**
 * Calculator de salariu brut ↔ net.
 *
 * Formulele stau în finance.js; aici este doar interfața. Pagina
 * funcționează în două direcții pentru că ambele întrebări apar în
 * practică: „ce net îmi iese din brutul ăsta” la angajare și „ce brut
 * trebuie să cer” la negociere.
 */

const MODES = { BRUT: "brut", NET: "net" };
let mode = MODES.BRUT;

/** Parametrii care depind de câmpurile din pagină, nu de o direcție anume. */
function citesteOptiuni() {
  return {
    minWage: readNumber("salariu-minim", { min: 0, max: 20000, fallback: SALARIU_MINIM_CURENT }),
    dependents: parseInt(document.getElementById("persoane").value, 10) || 0,
    pillar3Amount: readNumber("pilon3", { min: 0, max: 20000 }),
  };
}

/* ------------------------------------------------------------------ */
/* Bara de distribuție a costului angajatorului                        */
/* ------------------------------------------------------------------ */

/**
 * Bara arată cum se împarte costul total al angajatorului, nu brutul.
 * Este singura bază care face vizibil și ce plătește firma peste brut.
 */
function renderCostBar(r) {
  const bar = document.getElementById("cost-bar");
  const legend = document.getElementById("cost-legend");
  bar.textContent = "";
  legend.textContent = "";

  const total = r.costTotalAngajator;
  if (total <= 0) return;

  const parti = [
    { nume: "Net (la tine)", suma: r.net, culoare: seriesColor(2) },
    { nume: "CAS, pensie", suma: r.cas, culoare: seriesColor(0) },
    { nume: "CASS, sănătate", suma: r.cass, culoare: seriesColor(3) },
    { nume: "Impozit pe venit", suma: r.impozit, culoare: seriesColor(1) },
    { nume: "CAM, angajator", suma: r.cam, culoare: seriesColor(6) },
  ];
  // Pilonul III apare doar dacă utilizatorul chiar contribuie.
  if (r.pilon3 > 0) {
    parti.push({ nume: "Pilon III", suma: r.pilon3, culoare: seriesColor(4) });
  }
  // Regula salariilor sub minimul pe economie: angajatorul mai plătește
  // separat diferența de CAS și CASS până la prag — apare doar sub acel prag.
  if (r.casSuplimentarAngajator > 0) {
    parti.push({ nume: "CAS suplimentar (angajator)", suma: r.casSuplimentarAngajator, culoare: seriesColor(5) });
    parti.push({ nume: "CASS suplimentar (angajator)", suma: r.cassSuplimentarAngajator, culoare: seriesColor(7) });
  }

  parti.forEach((p) => {
    const cota = p.suma / total;
    if (cota <= 0) return;

    const seg = document.createElement("div");
    seg.className = "segment";
    seg.style.width = `${(cota * 100).toFixed(2)}%`;
    seg.style.background = p.culoare;
    seg.setAttribute("role", "img");
    seg.setAttribute("aria-label", `${p.nume}: ${formatRON(p.suma)}, ${formatPercent(cota)}`);
    if (cota >= 0.08) {
      seg.textContent = formatPercent(cota);
      seg.classList.add("labelled");
    }
    bar.appendChild(seg);

    const item = document.createElement("span");
    item.className = "item";
    const sw = document.createElement("span");
    sw.className = "swatch";
    sw.style.background = p.culoare;
    item.appendChild(sw);
    item.appendChild(document.createTextNode(p.nume + " "));
    const amount = document.createElement("span");
    amount.className = "amount";
    amount.textContent = formatRON(p.suma);
    item.appendChild(amount);
    legend.appendChild(item);
  });
}

/** Lista pas cu pas a calculului, în ordinea în care se aplică reținerile. */
function renderBreakdown(r, opts) {
  const mount = document.getElementById("breakdown");
  mount.textContent = "";

  const pasi = [
    {
      eticheta: "Cost total angajator",
      suma: r.costTotalAngajator,
      nota: r.casSuplimentarAngajator > 0 ? "brut + CAM + CAS/CASS suplimentar" : "brut + CAM",
      tip: "total",
    },
    { eticheta: "− CAM (2,25%)", suma: -r.cam, nota: "plătit de angajator peste brut" },
  ];

  if (r.casSuplimentarAngajator > 0) {
    pasi.push({
      eticheta: "− CAS suplimentar angajator",
      suma: -r.casSuplimentarAngajator,
      nota: `brutul e sub ${formatRON(opts.minWage - 200)}, angajatorul completează diferența până acolo`,
    });
    pasi.push({ eticheta: "− CASS suplimentar angajator", suma: -r.cassSuplimentarAngajator, nota: "" });
  }

  pasi.push({ eticheta: "Salariu brut", suma: r.gross, nota: "valoarea din contract", tip: "subtotal" });
  pasi.push({ eticheta: "− CAS, pensie (25%)", suma: -r.cas, nota: `din care ${formatRON(r.pilon2)} la Pilonul II` });
  pasi.push({ eticheta: "− CASS, sănătate (10%)", suma: -r.cass, nota: "" });
  pasi.push({
    eticheta: "Bază impozabilă",
    suma: r.bazaImpozabila,
    nota: r.deducere > 0
      ? `după deducerea personală de ${formatRON(r.deducere)}`
      : "fără deducere personală (brut peste prag)",
    tip: "subtotal",
  });
  pasi.push({ eticheta: "− Impozit pe venit (10%)", suma: -r.impozit, nota: "" });

  if (r.pilon3 > 0) {
    pasi.push({ eticheta: "− Contribuție Pilon III", suma: -r.pilon3, nota: "reținută din net" });
  }
  if (r.bonusNeimpozabil > 0) {
    pasi.push({
      eticheta: "+ 200 lei neimpozabili",
      suma: r.bonusNeimpozabil,
      nota: "facilitate la salariul minim pe economie, fără CAS, CASS sau impozit",
    });
  }
  pasi.push({ eticheta: "Salariu net", suma: r.net, nota: "ce îți intră în cont", tip: "total" });

  pasi.forEach((pas) => {
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
}

/** Același conținut ca detalierea, dar în formă tabelară pentru export. */
function renderTable(r, opts) {
  const body = document.getElementById("table-body");
  body.textContent = "";

  const randuri = [
    ["Salariu brut", "—", "—", r.gross],
    ["CAM (angajator)", "Brut", "2,25%", r.cam],
  ];

  if (r.casSuplimentarAngajator > 0) {
    randuri.push(["CAS suplimentar (angajator)", `Diferență până la ${formatRON(opts.minWage - 200)}`, "25%", r.casSuplimentarAngajator]);
    randuri.push(["CASS suplimentar (angajator)", `Diferență până la ${formatRON(opts.minWage - 200)}`, "10%", r.cassSuplimentarAngajator]);
  }

  randuri.push(
    ["Cost total angajator", "Brut + CAM + suplimentar", "—", r.costTotalAngajator],
    ["CAS, pensie", "Brut", "25%", r.cas],
    ["  din care Pilon II", "Brut", "4,75%", r.pilon2],
    ["CASS, sănătate", "Brut", "10%", r.cass],
    ["Deducere personală", `Salariu minim ${formatRON(opts.minWage)}`, "—", r.deducere]
  );

  if (r.bonusNeimpozabil > 0) {
    randuri.push(["200 lei neimpozabili", "Facilitate la salariul minim", "—", r.bonusNeimpozabil]);
  }

  randuri.push(
    ["Bază impozabilă", "Brut − CAS − CASS − deduceri", "—", r.bazaImpozabila],
    ["Impozit pe venit", "Bază impozabilă", "10%", r.impozit],
    ["Salariu net", "—", "—", r.net]
  );

  randuri.forEach((cells) => {
    const tr = document.createElement("tr");
    cells.forEach((cell, i) => {
      const td = document.createElement("td");
      td.textContent = i === 3 ? formatRON(cell) : String(cell);
      tr.appendChild(td);
    });
    body.appendChild(tr);
  });
}

/* ------------------------------------------------------------------ */
/* Recalculare                                                         */
/* ------------------------------------------------------------------ */

function recalc() {
  const opts = citesteOptiuni();

  // În modul „net → brut” găsim brutul prin căutare binară, apoi
  // recalculăm normal din el, ca toate valorile să fie consistente.
  let brut;
  if (mode === MODES.NET) {
    const netDorit = readNumber("net-dorit", { min: 0, max: 200000 });
    brut = brutDinNet(netDorit, opts);
    document.getElementById("brut").value = String(Math.round(brut));
  } else {
    brut = readNumber("brut", { min: 0, max: 200000 });
  }

  const r = salariuNet(brut, opts);
  r.pilon2 = brut * COTA_PILON2;
  r.pilon3 = Math.min(opts.pillar3Amount, brut); // nu poate depăși brutul

  const retinut = r.costTotalAngajator - r.net;

  document.getElementById("stat-cost").textContent = formatRON(r.costTotalAngajator);
  document.getElementById("stat-brut").textContent = formatRON(r.gross);
  document.getElementById("stat-net").textContent = formatRON(r.net);
  document.getElementById("stat-retinut").textContent = formatRON(retinut);
  document.getElementById("stat-retinut-pct").textContent =
    r.costTotalAngajator > 0 ? `${formatPercent(r.taxRate)} din costul total` : "";

  document.getElementById("stat-anual").textContent = formatRON(r.net * 12);
  document.getElementById("stat-pilon2").textContent = `${formatRON(r.pilon2)} / lună`;
  document.getElementById("stat-impozit-efectiv").textContent =
    brut > 0 ? formatPercent(r.impozit / brut) : "—";

  renderCostBar(r);
  renderBreakdown(r, opts);
  renderTable(r, opts);

  /* --- Concluzie ---------------------------------------------------- */
  const insight = document.getElementById("insight");
  if (brut <= 0) {
    insight.textContent = "Este necesară introducerea salariului pentru realizarea calculului.";
  } else {
    const peste = r.deducere > 0
      ? `Primești o deducere personală de ${formatRON(r.deducere)}, care îți reduce impozitul cu aproximativ ${formatRON(r.deducere * 0.1)}.`
      : `La acest nivel de salariu nu se mai acordă deducere personală, ea dispare peste ${formatRON(opts.minWage + 2000)} brut.`;
    let regim = "";
    if (r.bonusNeimpozabil > 0) {
      regim =
        ` La exact salariul minim se aplică o facilitate specială: primii ${formatRON(r.bonusNeimpozabil)} ` +
        `din brut sunt scutiți de CAS, CASS și impozit, deci nu se regăsesc printre reținerile de mai sus.`;
    } else if (r.casSuplimentarAngajator > 0) {
      regim =
        ` Brutul este sub salariul minim pe economie, deci se aplică regula normei parțiale: tu plătești ` +
        `contribuții și impozit pe brutul real, dar angajatorul mai achită separat ${formatRON(r.casSuplimentarAngajator + r.cassSuplimentarAngajator)} ` +
        `CAS și CASS suplimentar către stat, ca să nu poată evita contribuțiile printr-un brut artificial de mic.`;
    }
    insight.textContent =
      `Din ${formatRON(r.costTotalAngajator)} cât plătește angajatorul, la tine ajung ${formatRON(r.net)}, ` +
      `adică ${formatPercent(r.net / r.costTotalAngajator)}. Restul de ${formatRON(retinut)} sunt contribuții și impozit. ` +
      peste + regim;
  }
}

/* ------------------------------------------------------------------ */
/* Comutarea între cele două direcții                                  */
/* ------------------------------------------------------------------ */

function setMode(next) {
  mode = next;
  const isBrut = mode === MODES.BRUT;

  document.getElementById("btn-mode-brut").classList.toggle("primary", isBrut);
  document.getElementById("btn-mode-net").classList.toggle("primary", !isBrut);
  document.getElementById("btn-mode-brut").setAttribute("aria-pressed", String(isBrut));
  document.getElementById("btn-mode-net").setAttribute("aria-pressed", String(!isBrut));

  // În modul invers, brutul devine rezultat, deci câmpul lui se ascunde.
  document.getElementById("field-brut").classList.toggle("hidden", !isBrut);
  document.getElementById("field-net").classList.toggle("hidden", isBrut);

  recalc();
}

document.getElementById("btn-mode-brut").addEventListener("click", () => setMode(MODES.BRUT));
document.getElementById("btn-mode-net").addEventListener("click", () => setMode(MODES.NET));
document.getElementById("persoane").addEventListener("change", recalc);
// Fără asta, rezultatul rămâne pe valorile de la încărcare cât timp se tastează.
document.querySelectorAll("main input").forEach((el) => el.addEventListener("input", recalc));

/* ------------------------------------------------------------------ */
/* Legătura cu bugetul lunar                                           */
/* ------------------------------------------------------------------ */

/**
 * Trimite netul calculat în bugetul lunar.
 *
 * Scrie în prima sursă de venit a lunii active, păstrând tot restul —
 * cheltuielile, celelalte surse și istoricul lunilor. Dacă bugetul nu a
 * fost încă folosit sau are formatul vechi, îl lăsăm neatins: pagina de
 * buget își face singură migrarea la deschidere, iar o scriere de aici
 * peste o structură pe care nu o cunoaștem ar putea-o strica.
 */
document.getElementById("btn-la-buget").addEventListener("click", () => {
  const opts = citesteOptiuni();
  const brut = readNumber("brut", { min: 0, max: 200000 });
  const net = Math.round(salariuNet(brut, opts).net);
  if (net <= 0) return;

  try {
    const raw = localStorage.getItem("ef-buget");
    const data = raw ? JSON.parse(raw) : null;

    if (data && data.version === 2 && data.luni) {
      const cheie = data.luni[data.lunaCurenta]
        ? data.lunaCurenta
        : Object.keys(data.luni).sort().pop();
      const luna = cheie ? data.luni[cheie] : null;

      if (luna && Array.isArray(luna.venituri) && luna.venituri.length > 0) {
        luna.venituri[0].suma = net;
      } else if (luna) {
        luna.venituri = [{ id: 1, nume: "Salariu net", suma: net, tip: "fix" }];
      }
      localStorage.setItem("ef-buget", JSON.stringify(data));
    } else if (!data) {
      // Buget nefolosit încă: îl inițializăm cu netul, în formatul curent.
      const acum = new Date();
      const cheie = `${acum.getFullYear()}-${String(acum.getMonth() + 1).padStart(2, "0")}`;
      localStorage.setItem(
        "ef-buget",
        JSON.stringify({
          version: 2,
          lunaCurenta: cheie,
          luni: {
            [cheie]: {
              venituri: [{ id: 1, nume: "Salariu net", suma: net, tip: "fix" }],
              cheltuieli: [],
            },
          },
        })
      );
    }
  } catch (e) {
    /* dacă storage-ul nu merge, pagina de buget pornește oricum */
  }

  window.location.href = "buget.html";
});

/* Pornire */
setupViewToggle();
setupCsvExport("#table-view table", "salariu-brut-net.csv");
// Restaurează brutul, numărul de persoane în întreținere și salariul minim.
persistInputs("salariu", recalc);
setMode(MODES.BRUT);
