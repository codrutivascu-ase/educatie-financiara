/**
 * Stratul de date comun tuturor modulelor.
 *
 * Fiecare modul își salvează deja propriile câmpuri în localStorage.
 * Aici le citim pe toate și le expunem ca un singur „profil financiar”,
 * ca paginile să se poată referi una la alta: bugetul pre-populează
 * contribuția din investiții, salariul pre-populează pensia, etc.
 *
 * Nimic nu pleacă din browser — este exact aceeași sursă de date,
 * doar citită dintr-un singur loc.
 */

/** Cheile scrise de module. Le ținem grupate ca să nu se împrăștie. */
const STORE_KEYS = {
  buget: "ef-buget",
  inputs: (page) => `ef-inputs-${page}`,
  progres: "ef-progres",
};

/** Citește o cheie JSON, cu revenire la un obiect gol dacă ceva nu merge. */
function readJSON(key, fallback = {}) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : fallback;
  } catch (e) {
    return fallback; // storage blocat sau date corupte
  }
}

/** Scrie o cheie JSON. Eșecul este ignorat: aplicația funcționează oricum. */
function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    return false;
  }
}

/** Transformă în număr un câmp salvat ca text; null dacă lipsește. */
function num(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = parseFloat(value);
  return isFinite(n) ? n : null;
}

/* ------------------------------------------------------------------ */
/* Profilul agregat                                                    */
/* ------------------------------------------------------------------ */

/**
 * Adună într-un singur obiect tot ce a introdus utilizatorul în aplicație.
 *
 * Fiecare secțiune poate lipsi (modulul nu a fost încă folosit), de aceea
 * câmpurile nefolosite rămân `null` în loc de 0 — diferența contează:
 * „nu știu” nu este același lucru cu „zero”.
 *
 * @returns {{buget:object|null, investitii:object|null, datorii:object|null,
 *            obiective:object|null, comparator:object|null}}
 */
function getProfile() {
  return {
    buget: readBuget(),
    investitii: readInvestitii(),
    datorii: readDatorii(),
    obiective: readObiective(),
    comparator: readComparator(),
  };
}

/**
 * Bugetul lunii curente.
 *
 * Citește direct structura salvată de modulul de buget, fără să depindă
 * de buget-model.js — acesta se încarcă doar pe pagina de buget, iar
 * profilul trebuie să fie disponibil peste tot. Sunt acceptate ambele
 * versiuni ale formatului, pentru că un utilizator vechi are date v1
 * până când deschide din nou pagina de buget.
 */
function readBuget() {
  const data = readJSON(STORE_KEYS.buget, null);
  if (!data) return null;

  const luna = data.version === 2 ? extrageLunaCurenta(data) : converteVersiuneVeche(data);
  if (!luna) return null;

  const { venit, nevoi, dorinte, economiiAlocate, categorii } = luna;

  // Fără nicio valoare introdusă, profilul nu spune nimic.
  if (venit <= 0 && nevoi + dorinte + economiiAlocate <= 0) return null;

  // Cheltuielile curente sunt nevoi + dorințe. Economiile nu intră:
  // ele nu trebuie înlocuite dacă rămâi fără venit, deci nu fac parte
  // din baza de calcul a fondului de urgență.
  const totalCheltuieli = nevoi + dorinte;
  const sold = venit - totalCheltuieli;

  return {
    venit,
    categorii,
    totalCheltuieli,
    nevoi,
    dorinte,
    economiiAlocate,
    // Ce rămâne după cheltuielile curente — banii disponibili pentru
    // economii și investiții, indiferent dacă au fost alocați explicit.
    sold,
    rataEconomisire: venit > 0 ? sold / venit : 0,
  };
}

/** Totalurile lunii active dintr-o stare în versiunea 2. */
function extrageLunaCurenta(data) {
  const luni = data.luni && typeof data.luni === "object" ? data.luni : null;
  if (!luni) return null;

  // Luna marcată ca activă, altfel cea mai recentă.
  const cheie = luni[data.lunaCurenta] ? data.lunaCurenta : Object.keys(luni).sort().pop();
  const luna = cheie ? luni[cheie] : null;
  if (!luna) return null;

  const venituri = Array.isArray(luna.venituri) ? luna.venituri : [];
  const cheltuieli = Array.isArray(luna.cheltuieli) ? luna.cheltuieli : [];

  const venit = venituri.reduce((s, v) => s + Math.max(0, num(v.suma) || 0), 0);

  const totaluri = { nevoi: 0, dorinte: 0, economii: 0 };
  const categorii = cheltuieli.map((c) => {
    // O cheltuială rară se raportează la echivalentul ei lunar.
    const frecventa = num(c.frecventaLuni) || 1;
    const lunar = Math.max(0, num(c.planificat) || 0) / (frecventa > 0 ? frecventa : 1);
    const grupa = ["nevoi", "dorinte", "economii"].includes(c.grupa) ? c.grupa : "nevoi";
    totaluri[grupa] += lunar;
    return { nume: typeof c.nume === "string" ? c.nume : "", grupa, lunar };
  });

  return {
    venit,
    nevoi: totaluri.nevoi,
    dorinte: totaluri.dorinte,
    economiiAlocate: totaluri.economii,
    categorii,
  };
}

/** Aceleași totaluri, dintr-o stare în formatul vechi (un venit, o listă plată). */
function converteVersiuneVeche(data) {
  if (!Array.isArray(data.expenses)) return null;

  let nevoi = 0;
  let dorinte = 0;
  const categorii = data.expenses.map((e) => {
    const lunar = Math.max(0, num(e.amount) || 0);
    const grupa = e.type === "dorinte" ? "dorinte" : "nevoi";
    if (grupa === "dorinte") dorinte += lunar;
    else nevoi += lunar;
    return { nume: typeof e.name === "string" ? e.name : "", grupa, lunar };
  });

  // Formatul vechi nu avea o grupă de economii: erau, implicit, restul.
  return { venit: num(data.venit) || 0, nevoi, dorinte, economiiAlocate: 0, categorii };
}

function readInvestitii() {
  const d = readJSON(STORE_KEYS.inputs("investitii"), null);
  if (!d) return null;
  return {
    sumaInitiala: num(d["suma-initiala"]) || 0,
    contributieLunara: num(d["contributie-lunara"]) || 0,
    orizont: num(d["orizont"]) || 10,
    inflatie: num(d["inflatie"]) ?? 4,
    randamentIndex: num(d["rate-index"]) ?? 7,
  };
}

/**
 * Modulul de datorii. Creditul pentru locuință este în euro (cursul
 * folosit la conversie este salvat alături), iar datoriile de consum
 * din tabelul de strategii rămân în lei.
 */
function readDatorii() {
  const d = readJSON(STORE_KEYS.inputs("datorii-eur"), null);
  if (!d) return null;

  // Cele trei datorii din tabelul de strategii, dacă au sold.
  const extra = [1, 2, 3]
    .map((i) => ({
      sold: num(d[`d${i}-sold`]) || 0,
      rata: num(d[`d${i}-rata`]) || 0,
      minim: num(d[`d${i}-min`]) || 0,
    }))
    .filter((x) => x.sold > 0);

  return {
    sumaCreditEur: num(d["suma-credit"]) || 0,
    cursEur: num(d["curs"]) || CURS_EUR_IMPLICIT,
    dobanda: num(d["dobanda"]) || 0,
    perioada: num(d["perioada"]) || 0,
    venitNet: num(d["venit-net"]) || 0,
    alteRate: num(d["alte-rate"]) || 0,
    datoriiExistente: extra,
    totalSoldDatorii: extra.reduce((s, x) => s + x.sold, 0),
    // Dobânda maximă dintre datoriile active — indicator de urgență.
    dobandaMaxima: extra.reduce((m, x) => Math.max(m, x.rata), 0),
  };
}

function readObiective() {
  const d = readJSON(STORE_KEYS.inputs("obiective"), null);
  if (!d) return null;
  return {
    tinta: num(d["tinta"]) || 0,
    termen: num(d["termen"]) || 0,
    dejaEconomisit: num(d["deja-economisit"]) || 0,
    dobandaCont: num(d["dobanda-cont"]) || 0,
  };
}

function readComparator() {
  const d = readJSON(STORE_KEYS.inputs("comparator"), null);
  if (!d) return null;
  return {
    pret: num(d["pret"]) || 0,
    avans: num(d["avans"]) || 0,
    chirie: num(d["chirie"]) || 0,
    orizont: num(d["orizont"]) || 0,
  };
}

/* ------------------------------------------------------------------ */
/* Sugestii între module                                               */
/* ------------------------------------------------------------------ */

/**
 * Afișează o notă care propune preluarea unei valori din alt modul.
 *
 * Apare doar dacă utilizatorul chiar are datele respective salvate și dacă
 * valoarea propusă diferă de cea din câmp — altfel ar fi zgomot inutil.
 *
 * @param {object} opts
 * @param {string} opts.mount id-ul containerului în care se inserează nota
 * @param {string} opts.targetInput id-ul câmpului care primește valoarea
 * @param {number|null} opts.value valoarea propusă
 * @param {string} opts.text explicația arătată utilizatorului
 * @param {() => void} opts.onApply apelat după preluare, ca să recalculeze
 */
function offerPrefill({ mount, targetInput, value, text, onApply }) {
  const host = document.getElementById(mount);
  const input = document.getElementById(targetInput);
  if (!host || !input || value === null || !isFinite(value) || value <= 0) return;

  // Dacă în câmp e deja aproximativ aceeași sumă, nu mai propunem nimic.
  const current = parseFloat(input.value);
  if (isFinite(current) && Math.abs(current - value) < 1) return;

  host.textContent = "";
  const note = document.createElement("div");
  note.className = "prefill-note";

  const label = document.createElement("span");
  label.textContent = text;
  note.appendChild(label);

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "prefill-apply";
  btn.textContent = `Preia ${formatRON(value)}`;
  btn.addEventListener("click", () => {
    input.value = String(Math.round(value));
    // Modulele ascultă „input”, deci evenimentul declanșează și salvarea.
    input.dispatchEvent(new Event("input", { bubbles: true }));
    note.remove();
    if (typeof onApply === "function") onApply();
  });
  note.appendChild(btn);

  const dismiss = document.createElement("button");
  dismiss.type = "button";
  dismiss.className = "prefill-dismiss";
  dismiss.textContent = "Nu, mulțumesc";
  dismiss.setAttribute("aria-label", "Ascunde sugestia");
  dismiss.addEventListener("click", () => note.remove());
  note.appendChild(dismiss);

  host.appendChild(note);
}

/* ------------------------------------------------------------------ */
/* Progresul la lecții                                                 */
/* ------------------------------------------------------------------ */

/**
 * Progresul este o hartă id-lecție → { scor, total, data }.
 * Îl ținem separat de datele financiare ca să poată fi resetat singur.
 */
function getProgress() {
  return readJSON(STORE_KEYS.progres, {});
}

/**
 * Reține rezultatul unui quiz. Un scor mai slab nu suprascrie unul mai bun:
 * scopul este să arate ce a fost înțeles, nu să pedepsească reluarea lecției.
 */
function saveLessonResult(lessonId, score, total) {
  const all = getProgress();
  const prev = all[lessonId];
  if (prev && prev.score >= score) {
    prev.attempts = (prev.attempts || 1) + 1;
  } else {
    all[lessonId] = {
      score,
      total,
      date: new Date().toISOString().slice(0, 10),
      attempts: (prev && prev.attempts ? prev.attempts : 0) + 1,
    };
  }
  writeJSON(STORE_KEYS.progres, all);
}

function resetProgress() {
  try {
    localStorage.removeItem(STORE_KEYS.progres);
  } catch (e) {
    /* ignorăm */
  }
}

/**
 * Șterge tot ce a salvat aplicația în acest browser.
 * @returns {number} câte chei au fost eliminate
 */
function clearAllData() {
  let removed = 0;
  try {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith("ef-"));
    keys.forEach((k) => {
      localStorage.removeItem(k);
      removed += 1;
    });
  } catch (e) {
    /* ignorăm */
  }
  return removed;
}