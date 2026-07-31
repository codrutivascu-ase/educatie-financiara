/**
 * Interfața bugetului lunar.
 *
 * Toată logica de calcul stă în buget-model.js, ca funcții pure; aici
 * este doar legătura cu DOM-ul. Rândurile se construiesc din elemente,
 * nu din șiruri HTML: denumirile categoriilor sunt text introdus de
 * utilizator și nu trebuie interpretat ca markup.
 */

const STORAGE_KEY = "ef-buget";
const tooltip = document.getElementById("tooltip");

/** Starea completă, cu toate lunile. */
let stare = incarcaStare();

/** Ce se afișează în secțiunea de rezultat: planul sau ce s-a realizat. */
let campActiv = "planificat";

/** Luna afișată acum. */
function lunaActiva() {
  return stare.luni[stare.lunaCurenta];
}

/* ------------------------------------------------------------------ */
/* Persistență                                                         */
/* ------------------------------------------------------------------ */

function incarcaStare() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return migreazaStare(raw ? JSON.parse(raw) : null);
  } catch (e) {
    return stareNoua(); // date corupte sau storage blocat
  }
}

function salveaza() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stare));
  } catch (e) {
    /* storage plin sau blocat — aplicația funcționează, doar nu ține minte */
  }
}

/** Salvează și redesenează tot ce depinde de date. */
function actualizeaza() {
  salveaza();
  randeazaRezultat();
}

/* ------------------------------------------------------------------ */
/* Bara de lună                                                        */
/* ------------------------------------------------------------------ */

function randeazaBaraLuna() {
  const select = document.getElementById("select-luna");
  select.textContent = "";

  // Cele mai recente sus: e luna la care te uiți cel mai des.
  const chei = Object.keys(stare.luni).sort().reverse();
  chei.forEach((cheie) => {
    const opt = document.createElement("option");
    opt.value = cheie;
    opt.textContent = numeLuna(cheie);
    if (cheie === stare.lunaCurenta) opt.selected = true;
    select.appendChild(opt);
  });

  const pozitie = chei.indexOf(stare.lunaCurenta);
  const meta = document.getElementById("month-meta");
  meta.textContent =
    chei.length === 1
      ? "singura lună înregistrată"
      : `luna ${chei.length - pozitie} din ${chei.length}`;

  // Navigarea merge doar către luni care există deja.
  const sortate = [...chei].reverse();
  const idx = sortate.indexOf(stare.lunaCurenta);
  document.getElementById("btn-luna-prec").disabled = idx <= 0;
  document.getElementById("btn-luna-urm").disabled = idx >= sortate.length - 1;
  document.getElementById("btn-sterge-luna").disabled = chei.length <= 1;
}

function schimbaLuna(cheie) {
  if (!stare.luni[cheie]) return;
  stare.lunaCurenta = cheie;
  salveaza();
  randeazaTot();
}

document.getElementById("select-luna").addEventListener("change", (e) => {
  schimbaLuna(e.target.value);
});

document.getElementById("btn-luna-prec").addEventListener("click", () => {
  const sortate = Object.keys(stare.luni).sort();
  const idx = sortate.indexOf(stare.lunaCurenta);
  if (idx > 0) schimbaLuna(sortate[idx - 1]);
});

document.getElementById("btn-luna-urm").addEventListener("click", () => {
  const sortate = Object.keys(stare.luni).sort();
  const idx = sortate.indexOf(stare.lunaCurenta);
  if (idx >= 0 && idx < sortate.length - 1) schimbaLuna(sortate[idx + 1]);
});

/**
 * Creează luna următoare celei mai recente, copiind structura curentă.
 *
 * Categoriile și sumele planificate se păstrează — de la o lună la alta
 * se schimbă rareori. Coloana „real” pornește goală, pentru că este
 * exact ce urmează să se întâmple.
 */
document.getElementById("btn-luna-noua").addEventListener("click", () => {
  const ultima = Object.keys(stare.luni).sort().pop();
  let cheie = lunaUrmatoare(ultima);
  // Dacă luna următoare există deja, mergem mai departe până la una liberă.
  let pas = 0;
  while (stare.luni[cheie] && pas < 120) {
    cheie = lunaUrmatoare(cheie);
    pas += 1;
  }

  const sursa = stare.luni[ultima];
  stare.luni[cheie] = {
    venituri: sursa.venituri.map((v) => ({ ...v })),
    cheltuieli: sursa.cheltuieli.map((c) => ({ ...c, real: 0 })),
  };
  stare.lunaCurenta = cheie;
  salveaza();
  randeazaTot();
});

document.getElementById("btn-sterge-luna").addEventListener("click", () => {
  const chei = Object.keys(stare.luni);
  if (chei.length <= 1) return;
  const nume = numeLuna(stare.lunaCurenta);
  if (!window.confirm(`Ștergi definitiv luna ${nume}? Acțiunea nu poate fi anulată.`)) return;

  delete stare.luni[stare.lunaCurenta];
  stare.lunaCurenta = Object.keys(stare.luni).sort().pop();
  salveaza();
  randeazaTot();
});

/* ------------------------------------------------------------------ */
/* Șabloane                                                            */
/* ------------------------------------------------------------------ */

/** Bugetul este gol dacă nu s-a introdus nicio sumă nicăieri. */
function bugetulEsteGol() {
  const luna = lunaActiva();
  return (
    totalVenit(luna) === 0 &&
    luna.cheltuieli.every((c) => c.planificat === 0 && c.real === 0)
  );
}

function randeazaSabloane() {
  const gol = bugetulEsteGol();
  document.getElementById("sabloane-card").classList.toggle("hidden", !gol);
  if (!gol) return;

  const mount = document.getElementById("sabloane");
  mount.textContent = "";

  Object.keys(SABLOANE).forEach((cheie) => {
    const s = SABLOANE[cheie];
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "template-card";

    const titlu = document.createElement("strong");
    titlu.textContent = s.eticheta;
    btn.appendChild(titlu);

    const desc = document.createElement("span");
    desc.textContent = s.descriere;
    btn.appendChild(desc);

    const meta = document.createElement("span");
    meta.className = "template-meta";
    const venit = s.venituri.reduce((t, v) => t + v.suma, 0);
    meta.textContent = `${formatRON(venit)} venit · ${s.cheltuieli.length} categorii`;
    btn.appendChild(meta);

    btn.addEventListener("click", () => {
      stare.luni[stare.lunaCurenta] = lunaDinSablon(cheie);
      salveaza();
      randeazaTot();
    });

    mount.appendChild(btn);
  });
}

/* ------------------------------------------------------------------ */
/* Rândurile de venit                                                  */
/* ------------------------------------------------------------------ */

function randeazaVenituri() {
  const luna = lunaActiva();
  const mount = document.getElementById("income-rows");
  mount.textContent = "";

  luna.venituri.forEach((venit) => {
    const row = document.createElement("div");
    row.className = "income-row";

    const nume = document.createElement("input");
    nume.type = "text";
    nume.className = "inc-name";
    nume.value = venit.nume;
    nume.placeholder = "Denumire sursă";
    nume.setAttribute("aria-label", "Denumirea sursei de venit");
    nume.addEventListener("input", (e) => {
      venit.nume = e.target.value;
      salveaza();
    });
    row.appendChild(nume);

    const tip = document.createElement("select");
    tip.className = "inc-type";
    tip.setAttribute("aria-label", `Tipul venitului ${venit.nume || ""}`.trim());
    [
      ["fix", "Fix"],
      ["variabil", "Variabil"],
    ].forEach(([valoare, eticheta]) => {
      const opt = document.createElement("option");
      opt.value = valoare;
      opt.textContent = eticheta;
      if (venit.tip === valoare) opt.selected = true;
      tip.appendChild(opt);
    });
    tip.addEventListener("change", (e) => {
      venit.tip = e.target.value;
      actualizeaza();
    });
    row.appendChild(tip);

    const suma = document.createElement("input");
    suma.type = "number";
    suma.className = "inc-amount";
    suma.min = "0";
    suma.step = "50";
    suma.inputMode = "decimal";
    suma.value = String(venit.suma);
    suma.setAttribute("aria-label", `Suma lunară pentru ${venit.nume || "sursă"} (lei)`);
    suma.addEventListener("input", (e) => {
      venit.suma = Math.max(0, parseFloat(e.target.value) || 0);
      actualizeaza();
    });
    row.appendChild(suma);

    const sterge = document.createElement("button");
    sterge.type = "button";
    sterge.className = "remove";
    sterge.textContent = "✕";
    sterge.setAttribute("aria-label", `Șterge sursa ${venit.nume || ""}`.trim());
    // Ultima sursă nu se poate șterge: un buget fără venit nu are sens.
    sterge.disabled = luna.venituri.length <= 1;
    sterge.addEventListener("click", () => {
      luna.venituri = luna.venituri.filter((v) => v.id !== venit.id);
      randeazaVenituri();
      actualizeaza();
    });
    row.appendChild(sterge);

    mount.appendChild(row);
  });

  randeazaNotaVenitVariabil();
}

/**
 * Avertizează dacă o parte mare din venit este nesigură.
 *
 * Un buget construit pe venit variabil arată bine pe hârtie și se rupe
 * în prima lună slabă. Pragul de 30% este ales ca să nu deranjeze pe
 * cineva cu un venit suplimentar mic, dar să atragă atenția când
 * variabilul devine coloana de rezistență.
 */
function randeazaNotaVenitVariabil() {
  const luna = lunaActiva();
  const nota = document.getElementById("venit-variabil-note");
  const total = totalVenit(luna);
  const variabil = luna.venituri
    .filter((v) => v.tip === "variabil")
    .reduce((s, v) => s + v.suma, 0);

  if (total <= 0 || variabil <= 0) {
    nota.classList.add("hidden");
    return;
  }

  const cota = variabil / total;
  if (cota < 0.3) {
    nota.classList.add("hidden");
    return;
  }

  nota.classList.remove("hidden");
  nota.textContent =
    `${formatPercent(cota)} din venitul tău este variabil (${formatRON(variabil)} din ${formatRON(total)}). ` +
    `Un buget care depinde de venit nesigur se rupe în prima lună slabă. ` +
    `Două soluții obișnuite: construiește planul doar pe venitul fix și tratează restul ca bonus, ` +
    `sau mărește fondul de urgență la 6 luni în loc de 3.`;
}

document.getElementById("btn-adauga-venit").addEventListener("click", () => {
  const luna = lunaActiva();
  const idNou = Math.max(0, ...luna.venituri.map((v) => v.id)) + 1;
  luna.venituri.push({ id: idNou, nume: "", suma: 0, tip: "fix" });
  randeazaVenituri();
  actualizeaza();
  const campuri = document.querySelectorAll("#income-rows .inc-name");
  if (campuri.length) campuri[campuri.length - 1].focus();
});

/* ------------------------------------------------------------------ */
/* Rândurile de cheltuieli                                             */
/* ------------------------------------------------------------------ */

function randeazaCheltuieli() {
  const luna = lunaActiva();
  const mount = document.getElementById("expense-rows");
  mount.textContent = "";

  luna.cheltuieli.forEach((chelt) => {
    const row = document.createElement("div");
    row.className = "expense-row";

    // Pastila de culoare: doar categoriile cu slot apar separat în grafic.
    const swatch = document.createElement("span");
    swatch.className = "swatch";
    if (chelt.slot !== null) {
      swatch.style.background = seriesColor(chelt.slot);
    } else {
      swatch.classList.add("swatch-altele");
      swatch.title = "Apare grupat în „Altele” pe grafic; în tabel apare separat";
    }
    row.appendChild(swatch);

    const nume = document.createElement("input");
    nume.type = "text";
    nume.className = "exp-name";
    nume.value = chelt.nume;
    nume.placeholder = "Denumire categorie";
    nume.setAttribute("aria-label", "Denumire categorie");
    nume.addEventListener("input", (e) => {
      chelt.nume = e.target.value;
      actualizeaza();
    });
    row.appendChild(nume);

    const grupa = document.createElement("select");
    grupa.className = "exp-group";
    grupa.setAttribute("aria-label", `Grupa pentru ${chelt.nume || "categorie"}`);
    Object.keys(GRUPE).forEach((cheie) => {
      const opt = document.createElement("option");
      opt.value = cheie;
      opt.textContent = GRUPE[cheie].eticheta;
      if (chelt.grupa === cheie) opt.selected = true;
      grupa.appendChild(opt);
    });
    grupa.addEventListener("change", (e) => {
      chelt.grupa = e.target.value;
      actualizeaza();
    });
    row.appendChild(grupa);

    const frecventa = document.createElement("select");
    frecventa.className = "exp-freq";
    frecventa.setAttribute("aria-label", `Frecvența pentru ${chelt.nume || "categorie"}`);
    FRECVENTE_CHELTUIALA.forEach((f) => {
      const opt = document.createElement("option");
      opt.value = String(f.luni);
      opt.textContent = f.eticheta;
      if (chelt.frecventaLuni === f.luni) opt.selected = true;
      frecventa.appendChild(opt);
    });
    frecventa.addEventListener("change", (e) => {
      chelt.frecventaLuni = parseInt(e.target.value, 10) || 1;
      randeazaCheltuieli();
      actualizeaza();
    });
    row.appendChild(frecventa);

    /* Planificat — cu echivalentul lunar dedesubt, dacă diferă. */
    const planWrap = document.createElement("div");
    planWrap.className = "exp-plan-wrap";

    const plan = document.createElement("input");
    plan.type = "number";
    plan.className = "exp-plan";
    plan.min = "0";
    plan.step = "10";
    plan.inputMode = "decimal";
    plan.value = String(chelt.planificat);
    plan.setAttribute(
      "aria-label",
      `Sumă planificată pentru ${chelt.nume || "categorie"} (lei)`
    );
    plan.addEventListener("input", (e) => {
      chelt.planificat = Math.max(0, parseFloat(e.target.value) || 0);
      randeazaEchivalent(planWrap, chelt);
      actualizeaza();
    });
    planWrap.appendChild(plan);
    randeazaEchivalent(planWrap, chelt);
    row.appendChild(planWrap);

    const real = document.createElement("input");
    real.type = "number";
    real.className = "exp-real";
    real.min = "0";
    real.step = "10";
    real.inputMode = "decimal";
    real.value = String(chelt.real);
    real.setAttribute("aria-label", `Sumă cheltuită efectiv pentru ${chelt.nume || "categorie"} (lei)`);
    real.addEventListener("input", (e) => {
      chelt.real = Math.max(0, parseFloat(e.target.value) || 0);
      actualizeaza();
    });
    row.appendChild(real);

    const sterge = document.createElement("button");
    sterge.type = "button";
    sterge.className = "remove";
    sterge.textContent = "✕";
    sterge.setAttribute("aria-label", `Șterge categoria ${chelt.nume || ""}`.trim());
    sterge.addEventListener("click", () => {
      luna.cheltuieli = luna.cheltuieli.filter((c) => c.id !== chelt.id);
      // Slotul eliberat poate fi preluat de o categorie care nu avea culoare.
      const faraSlot = luna.cheltuieli.find((c) => c.slot === null);
      if (faraSlot) faraSlot.slot = slotLiber(luna.cheltuieli);
      randeazaCheltuieli();
      actualizeaza();
    });
    row.appendChild(sterge);

    mount.appendChild(row);
  });

  randeazaNotaFrecventa();
}

/** Sub câmpul „plan”, echivalentul lunar al unei cheltuieli rare. */
function randeazaEchivalent(wrap, chelt) {
  const existent = wrap.querySelector(".exp-equiv");
  if (existent) existent.remove();
  if (chelt.frecventaLuni === 1 || chelt.planificat <= 0) return;

  const nota = document.createElement("span");
  nota.className = "exp-equiv";
  nota.textContent = `= ${formatRON(lunarEchivalent(chelt))}/lună`;
  wrap.appendChild(nota);
}

/** Explică, cu valorile utilizatorului, cât rezervă lunar pentru cheltuieli rare. */
function randeazaNotaFrecventa() {
  const luna = lunaActiva();
  const nota = document.getElementById("frecventa-note");
  const rare = luna.cheltuieli.filter((c) => c.frecventaLuni > 1 && c.planificat > 0);

  if (rare.length === 0) {
    nota.textContent =
      "Toate categoriile sunt lunare. Dacă ai asigurări, taxe sau vacanțe care se plătesc " +
      "o dată pe an, adaugă-le cu frecvența potrivită — suma se împarte automat la lună.";
    return;
  }

  const rezerva = rare.reduce((s, c) => s + lunarEchivalent(c), 0);
  const totalAnual = rare.reduce((s, c) => s + c.planificat, 0);
  nota.textContent =
    `Ai ${rare.length} ${rare.length === 1 ? "cheltuială rară" : "cheltuieli rare"}, ` +
    `în valoare totală de ${formatRON(totalAnual)} pe ciclu. Împărțite la lună, înseamnă ` +
    `${formatRON(rezerva)} pe care ar trebui să-i pui deoparte în fiecare lună, ` +
    `ca să nu te surprindă în luna în care ajung la scadență.`;
}

document.getElementById("btn-adauga-cheltuiala").addEventListener("click", () => {
  const luna = lunaActiva();
  const idNou = Math.max(0, ...luna.cheltuieli.map((c) => c.id)) + 1;
  luna.cheltuieli.push({
    id: idNou,
    nume: "",
    grupa: "nevoi",
    planificat: 0,
    real: 0,
    frecventaLuni: 1,
    slot: slotLiber(luna.cheltuieli),
  });
  randeazaCheltuieli();
  actualizeaza();
  const campuri = document.querySelectorAll("#expense-rows .exp-name");
  if (campuri.length) campuri[campuri.length - 1].focus();
});

document.getElementById("btn-copiaza-plan").addEventListener("click", () => {
  const luna = lunaActiva();
  luna.cheltuieli.forEach((c) => {
    c.real = lunarEchivalent(c);
  });
  randeazaCheltuieli();
  actualizeaza();
});

/* ------------------------------------------------------------------ */
/* Comutatorul plan / realizat                                         */
/* ------------------------------------------------------------------ */

function setCamp(camp) {
  campActiv = camp;
  const estePlan = camp === "planificat";
  const btnPlan = document.getElementById("btn-camp-plan");
  const btnReal = document.getElementById("btn-camp-real");
  btnPlan.classList.toggle("primary", estePlan);
  btnReal.classList.toggle("primary", !estePlan);
  btnPlan.setAttribute("aria-pressed", String(estePlan));
  btnReal.setAttribute("aria-pressed", String(!estePlan));
  randeazaRezultat();
}

document.getElementById("btn-camp-plan").addEventListener("click", () => setCamp("planificat"));
document.getElementById("btn-camp-real").addEventListener("click", () => setCamp("real"));

/* ------------------------------------------------------------------ */
/* Distribuția cheltuielilor                                           */
/* ------------------------------------------------------------------ */

/** Sub acest procent, eticheta nu încape în segment și rămâne în tooltip. */
const PRAG_ETICHETA = 0.08;

/** Tooltip pentru un segment, construit doar din text. */
function arataTooltipCategorie(evt, nume, suma, cota) {
  tooltip.textContent = "";

  const cap = document.createElement("div");
  cap.className = "tt-head";
  cap.textContent = nume;
  tooltip.appendChild(cap);

  const rand = document.createElement("div");
  rand.className = "tt-row";
  const tare = document.createElement("strong");
  tare.textContent = formatRON(suma);
  rand.appendChild(tare);
  rand.appendChild(document.createTextNode(` · ${formatPercent(cota)}`));
  tooltip.appendChild(rand);

  positionTooltip(tooltip, evt.clientX, evt.clientY);
  tooltip.classList.add("visible");
}

function ascundeTooltip() {
  tooltip.classList.remove("visible");
}

/**
 * Segmentele graficului, cu categoriile fără slot adunate în „Altele”.
 *
 * Paleta are opt culori distincte inclusiv pentru daltonism; a noua nu se
 * generează și nu se reia. Culoarea urmează categoria, nu poziția ei în
 * clasament, deci nu se schimbă când o sumă crește sau scade.
 */
function segmenteGrafic(luna, camp) {
  const valoare = (c) => (camp === "real" ? c.real || 0 : lunarEchivalent(c));

  const cuSlot = luna.cheltuieli
    .filter((c) => c.slot !== null && valoare(c) > 0)
    .map((c) => ({
      nume: c.nume.trim() || "Fără nume",
      suma: valoare(c),
      culoare: seriesColor(c.slot),
      esteAltele: false,
    }));

  const faraSlot = luna.cheltuieli.filter((c) => c.slot === null && valoare(c) > 0);
  const sumaAltele = faraSlot.reduce((s, c) => s + valoare(c), 0);

  // Ordonăm descrescător: cea mai mare cheltuială atrage atenția prima.
  cuSlot.sort((a, b) => b.suma - a.suma);

  if (sumaAltele > 0) {
    cuSlot.push({
      nume: "Altele",
      suma: sumaAltele,
      // Gri neutru, nu o a noua culoare din paletă: „Altele” este un rest,
      // nu o categorie, iar convenția vizuală pentru rest este neutrul.
      culoare: getCssVar("--baseline"),
      esteAltele: true,
      numarCategorii: faraSlot.length,
    });
  }

  return cuSlot;
}

function randeazaDistributie(luna, camp) {
  const bara = document.getElementById("stacked-bar");
  const legenda = document.getElementById("legend");
  const corpTabel = document.getElementById("table-body");
  const notaAltele = document.getElementById("altele-note");
  bara.textContent = "";
  legenda.textContent = "";
  corpTabel.textContent = "";
  notaAltele.textContent = "";

  const segmente = segmenteGrafic(luna, camp);
  const total = segmente.reduce((s, x) => s + x.suma, 0);

  if (total <= 0) {
    const gol = document.createElement("span");
    gol.className = "item";
    gol.textContent =
      camp === "real"
        ? "Nu ai notat încă nicio cheltuială reală în luna asta."
        : "Adaugă sume planificate ca să vezi distribuția.";
    legenda.appendChild(gol);

    const rand = document.createElement("tr");
    const cel = document.createElement("td");
    cel.colSpan = 6;
    cel.textContent = "Nicio cheltuială introdusă încă.";
    rand.appendChild(cel);
    corpTabel.appendChild(rand);
    return;
  }

  segmente.forEach((seg) => {
    const cota = seg.suma / total;

    const el = document.createElement("div");
    el.className = "segment";
    el.style.width = `${(cota * 100).toFixed(2)}%`;
    el.style.background = seg.culoare;
    el.setAttribute("tabindex", "0");
    el.setAttribute("role", "img");
    el.setAttribute("aria-label", `${seg.nume}: ${formatRON(seg.suma)}, ${formatPercent(cota)}`);
    // Eticheta apare doar dacă încape; altfel rămâne în tooltip și în tabel.
    // Pe „Altele” o sărim: textul alb nu are contrast suficient pe griul
    // neutru, iar valoarea este oricum în legendă și în tabel.
    if (cota >= PRAG_ETICHETA && !seg.esteAltele) {
      el.textContent = formatPercent(cota);
      el.classList.add("labelled");
    }
    el.addEventListener("mousemove", (e) => arataTooltipCategorie(e, seg.nume, seg.suma, cota));
    el.addEventListener("mouseleave", ascundeTooltip);
    el.addEventListener("focus", () => {
      const r = el.getBoundingClientRect();
      arataTooltipCategorie(
        { clientX: r.left + r.width / 2, clientY: r.top },
        seg.nume,
        seg.suma,
        cota
      );
    });
    el.addEventListener("blur", ascundeTooltip);
    bara.appendChild(el);

    const item = document.createElement("span");
    item.className = "item";
    const sw = document.createElement("span");
    sw.className = "swatch";
    sw.style.background = seg.culoare;
    item.appendChild(sw);
    item.appendChild(document.createTextNode(seg.nume + " "));
    const suma = document.createElement("span");
    suma.className = "amount";
    suma.textContent = formatRON(seg.suma);
    item.appendChild(suma);
    legenda.appendChild(item);

    if (seg.esteAltele) {
      notaAltele.textContent =
        `„Altele” cuprinde ${seg.numarCategorii} ${seg.numarCategorii === 1 ? "categorie" : "categorii"} ` +
        `— paleta are ${SLOTURI_CULOARE} culori care rămân distincte inclusiv pentru daltonism, ` +
        `iar dincolo de ele segmentele nu s-ar mai putea deosebi. În tabel apar toate, separat.`;
    }
  });

  /* --- Tabelul: toate categoriile, inclusiv cele grupate în „Altele” --- */
  const randuri = luna.cheltuieli
    .map((c) => ({
      nume: c.nume.trim() || "Fără nume",
      grupa: GRUPE[c.grupa].eticheta,
      frecventa: (FRECVENTE_CHELTUIALA.find((f) => f.luni === c.frecventaLuni) || {}).eticheta || "Lunar",
      plan: lunarEchivalent(c),
      real: c.real || 0,
    }))
    .filter((r) => r.plan > 0 || r.real > 0)
    .sort((a, b) => (camp === "real" ? b.real - a.real : b.plan - a.plan));

  randuri.forEach((r) => {
    const tr = document.createElement("tr");
    const valoare = camp === "real" ? r.real : r.plan;
    [
      r.nume,
      r.grupa,
      r.frecventa,
      formatRON(r.plan),
      formatRON(r.real),
      formatPercent(total > 0 ? valoare / total : 0),
    ].forEach((text) => {
      const td = document.createElement("td");
      td.textContent = text;
      tr.appendChild(td);
    });
    corpTabel.appendChild(tr);
  });
}

/* ------------------------------------------------------------------ */
/* Regula 50/30/20                                                     */
/* ------------------------------------------------------------------ */

function randeazaRegula(luna, camp) {
  const wrap = document.getElementById("rule-bars");
  wrap.textContent = "";

  const ind = indicatori(luna, camp);
  if (ind.venit <= 0) {
    const gol = document.createElement("p");
    gol.className = "field-hint";
    gol.textContent = "Introdu venitul ca să vezi cum te încadrezi.";
    wrap.appendChild(gol);
    return;
  }

  // Nealocatul se adaugă la economii: sunt bani care, de fapt, nu s-au cheltuit.
  const economiiEfective = ind.grupe.economii + Math.max(0, ind.nealocat);

  [
    { eticheta: "Nevoi", valoare: ind.grupe.nevoi, tinta: GRUPE.nevoi.tinta, culoare: seriesColor(0) },
    { eticheta: "Dorințe", valoare: ind.grupe.dorinte, tinta: GRUPE.dorinte.tinta, culoare: seriesColor(1) },
    { eticheta: "Economii", valoare: economiiEfective, tinta: GRUPE.economii.tinta, culoare: seriesColor(2) },
  ].forEach((parte) => {
    const efectiv = parte.valoare / ind.venit;

    const rand = document.createElement("div");
    rand.className = "rule-row";

    const cap = document.createElement("div");
    cap.className = "rule-head";
    const stanga = document.createElement("span");
    stanga.textContent = `${parte.eticheta} — ${formatRON(parte.valoare)}`;
    const dreapta = document.createElement("span");
    dreapta.className = "rule-target";
    dreapta.textContent = `${formatPercent(efectiv)} (țintă ${formatPercent(parte.tinta)})`;
    cap.appendChild(stanga);
    cap.appendChild(dreapta);
    rand.appendChild(cap);

    const pista = document.createElement("div");
    pista.className = "rule-track";
    const umplere = document.createElement("div");
    umplere.className = "rule-fill";
    umplere.style.width = `${Math.min(100, efectiv * 100).toFixed(1)}%`;
    umplere.style.background = parte.culoare;
    pista.appendChild(umplere);

    const reper = document.createElement("div");
    reper.className = "rule-marker";
    reper.style.left = `${parte.tinta * 100}%`;
    reper.title = `Țintă: ${formatPercent(parte.tinta)}`;
    pista.appendChild(reper);

    rand.appendChild(pista);
    wrap.appendChild(rand);
  });
}

/* ------------------------------------------------------------------ */
/* Plan față de realitate                                              */
/* ------------------------------------------------------------------ */

function randeazaAbateri(luna) {
  const mount = document.getElementById("abateri-lista");
  const hint = document.getElementById("abateri-hint");
  mount.textContent = "";

  if (!areDateReale(luna)) {
    hint.textContent =
      "Completează coloana „Real” din tabelul de cheltuieli pe măsură ce trece luna. " +
      "Diferența dintre plan și realitate este singura parte din buget care schimbă ceva — " +
      "restul sunt intenții.";
    return;
  }

  hint.textContent =
    "Categoriile ordonate după cât de mult s-au abătut de la plan. Abaterile mari, " +
    "în orice direcție, arată unde planul nu corespunde vieții reale.";

  const lista = abateri(luna).slice(0, 8);

  lista.forEach((a) => {
    const rand = document.createElement("div");
    rand.className = "variance-row";

    const nume = document.createElement("span");
    nume.className = "variance-name";
    nume.textContent = a.nume.trim() || "Fără nume";
    rand.appendChild(nume);

    const valori = document.createElement("span");
    valori.className = "variance-numbers";
    valori.textContent = `${formatRON(a.real)} din ${formatRON(a.planificat)}`;
    rand.appendChild(valori);

    // Starea se transmite prin simbol + text, nu doar prin culoare.
    const stare = document.createElement("span");
    const depasire = a.diferenta > 0.5;
    const subPlan = a.diferenta < -0.5;
    stare.className =
      "variance-badge " + (depasire ? "critical" : subPlan ? "good" : "neutral");
    stare.textContent = depasire
      ? `▲ +${formatRON(a.diferenta)}`
      : subPlan
        ? `▼ −${formatRON(Math.abs(a.diferenta))}`
        : "● la fix";
    rand.appendChild(stare);

    mount.appendChild(rand);
  });

  /* --- Concluzia pe ansamblu ---------------------------------------- */
  const planTotal = totalPlanificat(luna);
  const realTotal = totalReal(luna);
  const diferenta = realTotal - planTotal;

  const concluzie = document.createElement("p");
  concluzie.className = "insight";
  const depasiri = lista.filter((a) => a.diferenta > 0.5);

  if (Math.abs(diferenta) < planTotal * 0.05) {
    concluzie.textContent =
      `Ai cheltuit ${formatRON(realTotal)} față de ${formatRON(planTotal)} planificat — ` +
      `o diferență sub 5%. Un buget care se potrivește atât de bine cu realitatea este util: ` +
      `îl poți folosi ca bază pentru lunile următoare fără ajustări mari.`;
  } else if (diferenta > 0) {
    const principala = depasiri[0];
    concluzie.textContent =
      `Ai depășit planul cu ${formatRON(diferenta)}. ` +
      (principala
        ? `Cea mai mare depășire este la „${principala.nume.trim() || "Fără nume"}”, cu ${formatRON(principala.diferenta)}. `
        : "") +
      `Întrebarea utilă nu este „cum mă abțin luna viitoare”, ci dacă suma planificată era realistă. ` +
      `De multe ori planul e cel care trebuie corectat, nu comportamentul.`;
  } else {
    concluzie.textContent =
      `Ai cheltuit cu ${formatRON(Math.abs(diferenta))} mai puțin decât planificat. ` +
      `Dacă diferența a rămas în cont fără destinație, mută-o explicit la economii — ` +
      `banii nealocați tind să dispară în luna următoare.`;
  }
  mount.appendChild(concluzie);
}

/* ------------------------------------------------------------------ */
/* Repere pe categorii                                                 */
/* ------------------------------------------------------------------ */

function randeazaRepere(luna) {
  const mount = document.getElementById("repere-lista");
  mount.textContent = "";

  const venit = totalVenit(luna);
  if (venit <= 0) {
    const gol = document.createElement("p");
    gol.className = "field-hint";
    gol.textContent = "Introdu venitul ca să compari categoriile cu reperele.";
    mount.appendChild(gol);
    return;
  }

  const depasiri = depasiriRepere(luna);

  if (depasiri.length === 0) {
    const bine = document.createElement("p");
    bine.className = "insight";
    bine.textContent =
      "Toate categoriile pe care le pot recunoaște se încadrează în reperele obișnuite. " +
      "Reperele acoperă locuința, utilitățile, alimentele, transportul, ieșirile și abonamentele — " +
      "categoriile cu alte denumiri nu sunt verificate.";
    mount.appendChild(bine);
    return;
  }

  depasiri.forEach((d) => {
    const rand = document.createElement("div");
    rand.className = "benchmark-row";

    const cap = document.createElement("div");
    cap.className = "benchmark-head";
    const nume = document.createElement("span");
    nume.className = "benchmark-name";
    nume.textContent = d.nume.trim() || d.eticheta;
    cap.appendChild(nume);
    const valori = document.createElement("span");
    valori.className = "benchmark-value";
    valori.textContent = `${formatPercent(d.cota)} din venit · reper ${formatPercent(d.maxim)}`;
    cap.appendChild(valori);
    rand.appendChild(cap);

    const pista = document.createElement("div");
    pista.className = "rule-track";
    const umplere = document.createElement("div");
    umplere.className = "rule-fill";
    // Scara merge până la dublul reperului, ca depășirile să fie vizibile.
    umplere.style.width = `${Math.min(100, (d.cota / (d.maxim * 2)) * 100).toFixed(1)}%`;
    umplere.style.background = getCssVar("--warn-text");
    pista.appendChild(umplere);
    const reper = document.createElement("div");
    reper.className = "rule-marker";
    reper.style.left = "50%";
    reper.title = `Reper: ${formatPercent(d.maxim)}`;
    pista.appendChild(reper);
    rand.appendChild(pista);

    const explicatie = document.createElement("p");
    explicatie.className = "benchmark-note";
    explicatie.textContent =
      `Depășești reperul cu ${formatRON(d.exces)} pe lună. ` +
      `Nu este o greșeală în sine, dar înseamnă că altă categorie trebuie să fie sub reperul ei — ` +
      `cel mai des, economiile.`;
    rand.appendChild(explicatie);

    mount.appendChild(rand);
  });
}

/* ------------------------------------------------------------------ */
/* Evoluția pe luni                                                    */
/* ------------------------------------------------------------------ */

function randeazaEvolutie() {
  const date = evolutie(stare);
  const card = document.getElementById("evolutie-card");
  const hint = document.getElementById("evolutie-hint");
  const statsEl = document.getElementById("evolutie-stats");
  statsEl.textContent = "";

  // Cu o singură lună nu există evoluție de arătat.
  if (date.length < 2) {
    card.classList.remove("hidden");
    hint.textContent =
      "Ai o singură lună înregistrată. Apasă „+ Lună nouă” la începutul lunii viitoare — " +
      "categoriile se copiază automat, iar aici apare tendința. Trei-patru luni sunt suficiente " +
      "ca să se vadă dacă rata de economisire crește sau scade.";
    document.getElementById("evo-chart-view").classList.add("hidden");
    document.getElementById("evo-table-view").classList.add("hidden");
    // Comutatorul nu are între ce să aleagă cât timp nu există serie.
    document.getElementById("btn-evo-chart").disabled = true;
    document.getElementById("btn-evo-table").disabled = true;
    return;
  }

  document.getElementById("btn-evo-chart").disabled = false;
  document.getElementById("btn-evo-table").disabled = false;

  hint.textContent =
    "Cum s-au mișcat venitul, cheltuielile și economiile de la o lună la alta. " +
    "Tendința contează mai mult decât orice lună luată separat.";

  /* --- Indicatori de tendință --------------------------------------- */
  const prima = date[0];
  const ultima = date[date.length - 1];
  const rataMedie = date.reduce((s, d) => s + d.rataEconomisire, 0) / date.length;
  const totalEconomisit = date.reduce((s, d) => s + d.economii, 0);
  const schimbareRata = ultima.rataEconomisire - prima.rataEconomisire;

  [
    { eticheta: "Luni înregistrate", valoare: String(date.length), nota: `din ${prima.eticheta}` },
    {
      eticheta: "Rată medie de economisire",
      valoare: formatPercent(rataMedie),
      nota: rataMedie >= 0.2 ? "peste ținta de 20%" : "sub ținta de 20%",
      stare: rataMedie >= 0.2 ? "good" : rataMedie < 0.05 ? "critical" : "",
    },
    {
      eticheta: "Total economisit",
      valoare: formatRON(totalEconomisit),
      nota: "cumulat pe toate lunile",
    },
    {
      eticheta: "Tendința ratei",
      valoare:
        (schimbareRata > 0.005 ? "▲ " : schimbareRata < -0.005 ? "▼ " : "● ") +
        formatPercent(Math.abs(schimbareRata)),
      nota: schimbareRata > 0.005 ? "în creștere" : schimbareRata < -0.005 ? "în scădere" : "stabilă",
      stare: schimbareRata > 0.005 ? "good" : schimbareRata < -0.005 ? "critical" : "",
    },
  ].forEach((s) => {
    const tile = document.createElement("div");
    tile.className = "stat-tile";
    const label = document.createElement("div");
    label.className = "label";
    label.textContent = s.eticheta;
    tile.appendChild(label);
    const val = document.createElement("div");
    val.className = "value" + (s.stare ? ` ${s.stare}` : "");
    val.textContent = s.valoare;
    tile.appendChild(val);
    const nota = document.createElement("div");
    nota.className = "label";
    nota.style.marginTop = "4px";
    nota.textContent = s.nota;
    tile.appendChild(nota);
    statsEl.appendChild(tile);
  });

  /* --- Graficul ------------------------------------------------------ */
  // Toate cele trei serii sunt în lei, deci împart aceeași axă. Rata de
  // economisire, fiind procent, ar cere o a doua scară — și un grafic cu
  // două axe sugerează corelații care nu există. Ea apare în tabel și în
  // cartonașele de mai sus.
  document.getElementById("evo-chart-view").classList.remove("hidden");
  const serii = [
    { name: "Venit", color: seriesColor(0), values: date.map((d) => d.venit) },
    { name: "Cheltuieli", color: seriesColor(1), values: date.map((d) => d.cheltuieli) },
    { name: "Economii", color: seriesColor(2), values: date.map((d) => d.economii) },
  ];

  renderLineChart(document.getElementById("evo-chart"), tooltip, {
    xValues: date.map((d) => d.eticheta),
    // Etichetăm scurt pe axă: "iulie 2026" devine "iul. 2026". Lunile deja
    // scurte („mai”) rămân neatinse — „mai.” ar fi o abreviere fără rost.
    xFormat: (v) => String(v).replace(/^(\w{3})\w{2,}\s/, "$1. "),
    yFormat: (v) => formatRON(v),
    yAxisFormat: (v) => formatRONShort(v),
    series: serii,
  });

  const legenda = document.getElementById("evo-legend");
  legenda.textContent = "";
  serii.forEach((s) => {
    const item = document.createElement("span");
    item.className = "item";
    const sw = document.createElement("span");
    sw.className = "swatch line";
    sw.style.background = s.color;
    item.appendChild(sw);
    item.appendChild(document.createTextNode(s.name + " "));
    const suma = document.createElement("span");
    suma.className = "amount";
    suma.textContent = formatRON(s.values[s.values.length - 1]);
    item.appendChild(suma);
    legenda.appendChild(item);
  });

  /* --- Tabelul ------------------------------------------------------- */
  const corp = document.getElementById("evo-table-body");
  corp.textContent = "";
  date.forEach((d) => {
    const tr = document.createElement("tr");
    [
      d.eticheta,
      formatRON(d.venit),
      formatRON(d.cheltuieli),
      formatRON(d.economii),
      formatPercent(d.rataEconomisire),
      d.dinDateReale ? "valori reale" : "plan",
    ].forEach((text) => {
      const td = document.createElement("td");
      td.textContent = text;
      tr.appendChild(td);
    });
    corp.appendChild(tr);
  });
}

/* Comutatorul grafic/tabel pentru evoluție — separat de cel principal. */
(function initComutatorEvolutie() {
  const btnGrafic = document.getElementById("btn-evo-chart");
  const btnTabel = document.getElementById("btn-evo-table");
  const vederea = document.getElementById("evo-chart-view");
  const tabelul = document.getElementById("evo-table-view");

  function arata(grafic) {
    vederea.classList.toggle("hidden", !grafic);
    tabelul.classList.toggle("hidden", grafic);
    btnGrafic.classList.toggle("primary", grafic);
    btnTabel.classList.toggle("primary", !grafic);
    btnGrafic.setAttribute("aria-pressed", String(grafic));
    btnTabel.setAttribute("aria-pressed", String(!grafic));
    // Graficul are nevoie de lățime reală ca să se deseneze corect.
    if (grafic) randeazaEvolutie();
  }

  btnGrafic.addEventListener("click", () => arata(true));
  btnTabel.addEventListener("click", () => arata(false));
})();

/* ------------------------------------------------------------------ */
/* Rezultatul principal                                                */
/* ------------------------------------------------------------------ */

function randeazaRezultat() {
  const luna = lunaActiva();
  const ind = indicatori(luna, campActiv);

  document.getElementById("stat-venit").textContent = formatRON(ind.venit);
  document.getElementById("stat-cheltuieli").textContent = formatRON(ind.cheltuieliCurente);
  document.getElementById("stat-economii").textContent = formatRON(ind.grupe.economii);

  const nealocatEl = document.getElementById("stat-nealocat");
  nealocatEl.textContent = formatRON(ind.nealocat);
  nealocatEl.classList.toggle("critical", ind.nealocat < 0);
  nealocatEl.classList.toggle("good", Math.abs(ind.nealocat) < 1 && ind.venit > 0);

  const rataEl = document.getElementById("stat-rata");
  rataEl.textContent = ind.venit > 0 ? formatPercent(ind.rataEconomisire) : "—";
  rataEl.classList.toggle("good", ind.venit > 0 && ind.rataEconomisire >= 0.2);
  rataEl.classList.toggle("critical", ind.venit > 0 && ind.rataEconomisire < 0);

  // Cât ar dura să strângi trei luni de cheltuieli curente.
  const fondEl = document.getElementById("stat-fond");
  const pusDeoparte = ind.grupe.economii + Math.max(0, ind.nealocat);
  if (ind.cheltuieliPentruFond > 0 && pusDeoparte > 0) {
    fondEl.textContent = formatMonths(Math.ceil((ind.cheltuieliPentruFond * 3) / pusDeoparte));
  } else {
    fondEl.textContent = "—";
  }

  randeazaConcluzie(ind, luna);
  randeazaDistributie(luna, campActiv);
  randeazaRegula(luna, campActiv);
  randeazaAbateri(luna);
  randeazaRepere(luna);
  randeazaEvolutie();
  randeazaNotaVenitVariabil();
  randeazaSabloane();
}

/**
 * Concluzia în cuvinte. Ordinea condițiilor este ordinea gravității:
 * un buget în deficit are prioritate față de orice altă observație.
 */
function randeazaConcluzie(ind, luna) {
  const el = document.getElementById("insight");

  if (ind.venit <= 0) {
    el.textContent = "Introdu venitul lunar ca să vezi o evaluare.";
    return;
  }

  if (ind.nealocat < -1) {
    el.textContent =
      `Ai alocat ${formatRON(ind.alocat)} dintr-un venit de ${formatRON(ind.venit)} — ` +
      `cu ${formatRON(Math.abs(ind.nealocat))} mai mult decât ai. ` +
      `Într-o lună obișnuită asta înseamnă că te împrumuți sau consumi din economii. ` +
      `Caută mai întâi în categoriile marcate ca „dorință”: acolo compromisul doare cel mai puțin.`;
    return;
  }

  if (ind.nealocat > ind.venit * 0.1) {
    el.textContent =
      `${formatRON(ind.nealocat)} din venit nu au nicio destinație (${formatPercent(ind.nealocat / ind.venit)}). ` +
      `Banii fără destinație tind să fie cheltuiți fără decizie. ` +
      `Adaugă-i explicit la o categorie de economii — chiar dacă rămân în același cont, ` +
      `faptul că sunt „promiși” schimbă felul în care îi tratezi.`;
    return;
  }

  const economiiEfective = ind.grupe.economii + Math.max(0, ind.nealocat);
  const rata = economiiEfective / ind.venit;

  if (rata < 0.1) {
    el.textContent =
      `Economisești ${formatPercent(rata)} din venit. La acest ritm, un fond de urgență de trei luni ` +
      `(${formatRON(ind.cheltuieliPentruFond * 3)}) ar dura mult să se adune. ` +
      `Cea mai mare parte din câștig vine de obicei din cele două-trei cheltuieli mari, ` +
      `nu din multe economii mici.`;
  } else if (rata < 0.2) {
    el.textContent =
      `Economisești ${formatPercent(rata)} din venit — te apropii de ținta uzuală de 20%. ` +
      `Un fond de urgență de trei luni înseamnă ${formatRON(ind.cheltuieliPentruFond * 3)} ` +
      `la nivelul actual al cheltuielilor.`;
  } else {
    el.textContent =
      `Economisești ${formatPercent(rata)} din venit, peste ținta uzuală de 20%. ` +
      `Următoarea întrebare utilă este unde stau acești bani: după fondul de urgență, ` +
      `sumele ținute într-un cont fără dobândă pierd în fața inflației.`;
  }
}

/* ------------------------------------------------------------------ */
/* Export, import, resetare                                            */
/* ------------------------------------------------------------------ */

document.getElementById("btn-export-json").addEventListener("click", () => {
  const continut = JSON.stringify(stare, null, 2);
  const blob = new Blob([continut], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `buget-${cheieLuna()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
});

document.getElementById("btn-import-json").addEventListener("click", () => {
  document.getElementById("file-import").click();
});

document.getElementById("file-import").addEventListener("change", (e) => {
  const fisier = e.target.files && e.target.files[0];
  if (!fisier) return;

  const status = document.getElementById("import-status");
  const reader = new FileReader();

  reader.onload = () => {
    try {
      const importat = migreazaStare(JSON.parse(reader.result));
      const nrLuni = Object.keys(importat.luni).length;

      const ok = window.confirm(
        `Fișierul conține ${nrLuni} ${nrLuni === 1 ? "lună" : "luni"}.\n\n` +
        `Importul înlocuiește complet bugetul actual din acest browser. Continui?`
      );
      if (!ok) return;

      stare = importat;
      salveaza();
      randeazaTot();
      status.classList.remove("hidden");
      status.classList.remove("import-error");
      status.textContent = `Import reușit: ${nrLuni} ${nrLuni === 1 ? "lună încărcată" : "luni încărcate"}.`;
    } catch (err) {
      status.classList.remove("hidden");
      status.classList.add("import-error");
      status.textContent =
        "Fișierul nu a putut fi citit. Trebuie să fie un fișier .json exportat din această pagină.";
    }
  };

  reader.onerror = () => {
    status.classList.remove("hidden");
    status.classList.add("import-error");
    status.textContent = "Fișierul nu a putut fi deschis.";
  };

  reader.readAsText(fisier);
  // Golim câmpul, ca reimportarea aceluiași fișier să declanșeze din nou evenimentul.
  e.target.value = "";
});

document.getElementById("btn-reset").addEventListener("click", () => {
  const nrLuni = Object.keys(stare.luni).length;
  const ok = window.confirm(
    `Ștergi tot bugetul, cu ${nrLuni} ${nrLuni === 1 ? "lună" : "luni"} înregistrate?\n\n` +
    `Acțiunea nu poate fi anulată. Dacă vrei o copie, exportă întâi fișierul.`
  );
  if (!ok) return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    /* ignorăm */
  }
  stare = stareNoua();
  randeazaTot();
});

/* ------------------------------------------------------------------ */
/* Pornire                                                             */
/* ------------------------------------------------------------------ */

/** Redesenează absolut tot: se apelează la schimbarea lunii sau a stării. */
function randeazaTot() {
  randeazaBaraLuna();
  randeazaVenituri();
  randeazaCheltuieli();
  randeazaRezultat();
}

setupViewToggle(() => randeazaDistributie(lunaActiva(), campActiv));
setupCsvExport("#table-view table", "buget-lunar.csv");
randeazaTot();
onChartNeedsRedraw(randeazaRezultat);
