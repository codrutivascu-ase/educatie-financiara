/**
 * Funcții comune tuturor paginilor: navigație, formatare, temă,
 * salvare locală a datelor și componente mici de UI.
 *
 * Se încarcă primul, înaintea oricărui script de modul.
 */

/**
 * Meniul site-ului. Intrările cu `items` devin submeniuri.
 *
 * Gruparea urmează întrebarea utilizatorului, nu tipul instrumentului:
 * „ce vreau să fac” (învăț, planific, investesc, mă împrumut), pentru că
 * o listă plată de unsprezece pagini nu mai poate fi parcursă din ochi.
 */
const MODULES = [
  { href: "index.html", label: "Acasă" },
  {
    label: "Planifică",
    items: [
      { href: "buget.html", label: "Buget lunar" },
      { href: "salariu.html", label: "Salariu brut → net" },
      { href: "obiective.html", label: "Obiective de economisire" },
    ],
  },
  {
    label: "Investește",
    items: [
      { href: "investitii.html", label: "Dobândă compusă" },
      { href: "inflatie.html", label: "Inflație" },
      { href: "oportunitate.html", label: "Cost de oportunitate" },
      { href: "pensii.html", label: "Pensii" },
    ],
  },
  {
    label: "Împrumută",
    items: [
      { href: "datorii.html", label: "Calculator de datorii" },
      { href: "comparator.html", label: "Chirie vs. cumpărare" },
    ],
  },
  {
    label: "Învață",
    items: [
      { href: "lectii.html", label: "Lecții și quiz" },
      { href: "glosar.html", label: "Glosar" },
    ],
  },
];

/** Toate paginile, fără structura de meniu — utilă pentru căutare și index. */
const ALL_PAGES = MODULES.flatMap((m) => (m.items ? m.items : [m]));

/* ------------------------------------------------------------------ */
/* Temă (luminos / întunecat)                                          */
/* ------------------------------------------------------------------ */

const THEME_KEY = "ef-theme";

/**
 * Aplică tema pe elementul <html>. Fără preferință salvată, pagina
 * urmează automat setarea sistemului de operare (via CSS).
 * @param {"light"|"dark"|null} theme
 */
function applyTheme(theme) {
  if (theme === "light" || theme === "dark") {
    document.documentElement.setAttribute("data-theme", theme);
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  const btn = document.getElementById("theme-toggle");
  if (btn) {
    const isDark = currentThemeIsDark();
    btn.textContent = isDark ? "☀" : "☾";
    btn.setAttribute("aria-label", isDark ? "Comută pe tema luminoasă" : "Comută pe tema întunecată");
    btn.setAttribute("title", btn.getAttribute("aria-label"));
  }
}

/** @returns {boolean} dacă pagina se afișează acum în tema întunecată. */
function currentThemeIsDark() {
  const explicit = document.documentElement.getAttribute("data-theme");
  if (explicit) return explicit === "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * Evenimentul pe care graficele îl ascultă ca să se redeseneze cu
 * culorile noii teme (culorile sunt citite din CSS la desenare).
 */
function notifyThemeChange() {
  window.dispatchEvent(new CustomEvent("ef-theme-change"));
}

function toggleTheme() {
  const next = currentThemeIsDark() ? "light" : "dark";
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch (e) {
    /* modul privat / cookies blocate — tema rămâne doar pe sesiunea curentă */
  }
  applyTheme(next);
  notifyThemeChange();
}

// Aplicăm tema salvată cât mai devreme, ca să nu apară un "flash" alb.
(function initTheme() {
  let saved = null;
  try {
    saved = localStorage.getItem(THEME_KEY);
  } catch (e) {
    /* ignorăm */
  }
  applyTheme(saved);
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", () => {
      // Doar dacă utilizatorul nu a ales manual o temă.
      if (!document.documentElement.getAttribute("data-theme")) {
        applyTheme(null);
        notifyThemeChange();
      }
    });
})();

/* ------------------------------------------------------------------ */
/* Navigație                                                           */
/* ------------------------------------------------------------------ */

/**
 * Construiește meniul de sus și butonul de temă.
 * @param {string} activeHref fișierul paginii curente, ex. "buget.html"
 */
function renderNav(activeHref) {
  const mount = document.getElementById("site-nav");
  if (!mount) return;

  mount.textContent = "";

  const brand = document.createElement("a");
  brand.className = "brand";
  brand.href = "index.html";
  brand.textContent = "Educație Financiară";
  mount.appendChild(brand);

  // Buton de meniu pentru ecrane înguste.
  const burger = document.createElement("button");
  burger.className = "nav-burger";
  burger.type = "button";
  burger.textContent = "☰";
  burger.setAttribute("aria-label", "Deschide meniul");
  burger.setAttribute("aria-expanded", "false");
  mount.appendChild(burger);

  const links = document.createElement("div");
  links.className = "nav-links";
  links.id = "nav-links";

  /** Un link simplu de meniu, marcat dacă este pagina curentă. */
  function makeLink(item, className = "nav-link") {
    const a = document.createElement("a");
    a.className = item.href === activeHref ? `${className} active` : className;
    a.href = item.href;
    a.textContent = item.label;
    if (item.href === activeHref) a.setAttribute("aria-current", "page");
    return a;
  }

  // Reținem submeniurile deschise ca să le putem închide pe celelalte.
  const groups = [];

  MODULES.forEach((m) => {
    if (!m.items) {
      links.appendChild(makeLink(m));
      return;
    }

    const group = document.createElement("div");
    group.className = "nav-group";

    const isActiveGroup = m.items.some((it) => it.href === activeHref);
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = isActiveGroup ? "nav-link nav-trigger active" : "nav-link nav-trigger";
    trigger.textContent = m.label;
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-haspopup", "true");
    group.appendChild(trigger);

    const panel = document.createElement("div");
    panel.className = "nav-panel";
    m.items.forEach((it) => panel.appendChild(makeLink(it, "nav-sublink")));
    group.appendChild(panel);

    function setOpen(open) {
      group.classList.toggle("open", open);
      trigger.setAttribute("aria-expanded", String(open));
    }
    groups.push({ setOpen, group });

    trigger.addEventListener("click", (evt) => {
      evt.stopPropagation();
      const willOpen = !group.classList.contains("open");
      groups.forEach((g) => g.setOpen(false));
      setOpen(willOpen);
    });

    // Escape închide submeniul și readuce focalizarea pe declanșator.
    group.addEventListener("keydown", (evt) => {
      if (evt.key === "Escape") {
        setOpen(false);
        trigger.focus();
      }
    });

    // Pe desktop, ieșirea cu Tab din grup îl închide.
    group.addEventListener("focusout", () => {
      window.setTimeout(() => {
        if (!group.contains(document.activeElement)) setOpen(false);
      }, 0);
    });

    links.appendChild(group);
  });

  // Un clic oriunde în afara meniurilor le închide pe toate.
  document.addEventListener("click", () => groups.forEach((g) => g.setOpen(false)));

  mount.appendChild(links);

  burger.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Închide meniul" : "Deschide meniul");
  });

  const themeBtn = document.createElement("button");
  themeBtn.id = "theme-toggle";
  themeBtn.className = "theme-toggle";
  themeBtn.type = "button";
  themeBtn.addEventListener("click", toggleTheme);
  mount.appendChild(themeBtn);

  applyTheme(document.documentElement.getAttribute("data-theme"));
}

/* ------------------------------------------------------------------ */
/* Formatare numere                                                    */
/* ------------------------------------------------------------------ */

const _lei0 = new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 0 });
const _lei2 = new Intl.NumberFormat("ro-RO", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const _pct = new Intl.NumberFormat("ro-RO", {
  style: "percent",
  maximumFractionDigits: 1,
});

/** Formatează o sumă în lei, rotunjită la unitate: 1234 → "1.234 lei". */
function formatRON(value) {
  if (!isFinite(value)) return "—";
  return `${_lei0.format(Math.round(value))} lei`;
}

/** Sumă cu 2 zecimale — pentru export și tabele detaliate. */
function formatRON2(value) {
  if (!isFinite(value)) return "—";
  return `${_lei2.format(value)} lei`;
}

/** Versiune compactă pentru axele graficelor: 1250000 → "1,3 mil." */
function formatRONShort(value) {
  if (!isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 1e6) return `${_pctFree(value / 1e6)} mil.`;
  if (abs >= 1e4) return `${_lei0.format(Math.round(value / 1000))} mii`;
  return _lei0.format(Math.round(value));
}

function _pctFree(v) {
  return new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 1 }).format(v);
}

/* --- Euro ------------------------------------------------------------
 * Prețurile locuințelor și creditele ipotecare se discută în România în
 * euro, chiar dacă rata se plătește în lei. Modulele care lucrează cu
 * locuințe formatează în euro, restul rămân în lei.
 */

/** Curs de referință folosit ca valoare implicită acolo unde e nevoie de conversie. */
const CURS_EUR_IMPLICIT = 5.08;

/** Formatează o sumă în euro, rotunjită la unitate: 1234 → "1.234 €". */
function formatEUR(value) {
  if (!isFinite(value)) return "—";
  return `${_lei0.format(Math.round(value))} €`;
}

/** Versiune compactă pentru axele graficelor: 250000 → "250 mii €". */
function formatEURShort(value) {
  if (!isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 1e6) return `${_pctFree(value / 1e6)} mil. €`;
  if (abs >= 1e4) return `${_lei0.format(Math.round(value / 1000))} mii €`;
  return `${_lei0.format(Math.round(value))} €`;
}

/** 0.384 → "38,4 %" */
function formatPercent(value) {
  if (!isFinite(value)) return "—";
  return _pct.format(value);
}

/** 27 → "2 ani și 3 luni" — mai ușor de citit decât "27 luni". */
function formatMonths(totalMonths) {
  const m = Math.max(0, Math.round(totalMonths));
  const years = Math.floor(m / 12);
  const months = m % 12;
  const parts = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? "an" : "ani"}`);
  if (months > 0) parts.push(`${months} ${months === 1 ? "lună" : "luni"}`);
  if (parts.length === 0) return "0 luni";
  return parts.join(" și ");
}

/* ------------------------------------------------------------------ */
/* Comutator Grafic / Tabel                                            */
/* ------------------------------------------------------------------ */

/**
 * Leagă cele două butoane de cele două containere. Înlocuiește codul
 * care era copiat identic în fiecare modul.
 * @param {() => void} [onShowChart] apelat când graficul redevine vizibil
 *        (graficele au nevoie de lățime reală ca să se deseneze corect).
 */
function setupViewToggle(onShowChart) {
  const btnChart = document.getElementById("btn-view-chart");
  const btnTable = document.getElementById("btn-view-table");
  const chartView = document.getElementById("chart-view");
  const tableView = document.getElementById("table-view");
  if (!btnChart || !btnTable || !chartView || !tableView) return;

  function show(which) {
    const chart = which === "chart";
    chartView.classList.toggle("hidden", !chart);
    tableView.classList.toggle("hidden", chart);
    btnChart.classList.toggle("primary", chart);
    btnTable.classList.toggle("primary", !chart);
    btnChart.setAttribute("aria-pressed", String(chart));
    btnTable.setAttribute("aria-pressed", String(!chart));
    if (chart && typeof onShowChart === "function") onShowChart();
  }

  btnChart.addEventListener("click", () => show("chart"));
  btnTable.addEventListener("click", () => show("table"));
  show("chart");
}

/* ------------------------------------------------------------------ */
/* Salvarea datelor introduse (doar în browserul utilizatorului)        */
/* ------------------------------------------------------------------ */

/**
 * Memorează valorile din câmpurile paginii în localStorage și le
 * restaurează la următoarea vizită. Nimic nu părăsește browserul.
 * @param {string} pageKey cheie unică pentru pagină
 * @param {() => void} onRestore apelat după restaurare, ca să recalculeze
 */
function persistInputs(pageKey, onRestore) {
  const storageKey = `ef-inputs-${pageKey}`;
  // Includem și <select>: unele module au liste de opțiuni (frecvență,
  // persoane în întreținere) care trebuie reținute la fel ca numerele.
  const fields = Array.from(document.querySelectorAll("main input[id], main select[id]"));

  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
    let restored = false;
    fields.forEach((el) => {
      if (Object.prototype.hasOwnProperty.call(saved, el.id)) {
        el.value = saved[el.id];
        restored = true;
      }
    });
    if (restored && typeof onRestore === "function") onRestore();
  } catch (e) {
    /* date corupte sau storage indisponibil — pornim de la valorile implicite */
  }

  function save() {
    try {
      const data = {};
      fields.forEach((el) => (data[el.id] = el.value));
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (e) {
      /* storage plin sau blocat — ignorăm, aplicația funcționează oricum */
    }
  }

  // „input” acoperă tastarea; „change” prinde selectarea dintr-un <select>.
  fields.forEach((el) => {
    el.addEventListener("input", save);
    el.addEventListener("change", save);
  });

  const resetBtn = document.getElementById("btn-reset");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      try {
        localStorage.removeItem(storageKey);
      } catch (e) {
        /* ignorăm */
      }
      window.location.reload();
    });
  }
}

/* ------------------------------------------------------------------ */
/* Export CSV                                                          */
/* ------------------------------------------------------------------ */

/**
 * Descarcă un tabel HTML ca fișier CSV, deschis direct de Excel.
 * @param {string} tableSelector
 * @param {string} filename
 */
function downloadTableAsCSV(tableSelector, filename) {
  const table = document.querySelector(tableSelector);
  if (!table) return;

  const rows = Array.from(table.querySelectorAll("tr"));
  const csv = rows
    .map((tr) =>
      Array.from(tr.querySelectorAll("th, td"))
        .map((cell) => {
          // Ghilimelele din text se dublează, conform formatului CSV.
          const text = cell.textContent.trim().replace(/"/g, '""');
          return `"${text}"`;
        })
        .join(",")
    )
    .join("\r\n");

  // BOM-ul UTF-8 face ca Excel să afișeze corect diacriticele.
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Leagă butonul de export, dacă pagina are unul. */
function setupCsvExport(tableSelector, filename) {
  const btn = document.getElementById("btn-export-csv");
  if (!btn) return;
  btn.addEventListener("click", () => downloadTableAsCSV(tableSelector, filename));
}

/* ------------------------------------------------------------------ */
/* Utilitare mici                                                      */
/* ------------------------------------------------------------------ */

/** Citește o variabilă CSS (ex. o culoare din paletă). */
function getCssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** Culoarea seriei cu indexul dat (0-7), din paleta definită în CSS. */
function seriesColor(index) {
  return getCssVar(`--series-${(index % 8) + 1}`);
}

/** Citește un input numeric, cu limitare în interval și corectarea câmpului. */
function readNumber(id, { min = -Infinity, max = Infinity, fallback = 0, integer = false } = {}) {
  const el = document.getElementById(id);
  if (!el) return fallback;
  let value = integer ? parseInt(el.value, 10) : parseFloat(el.value);
  if (!isFinite(value)) value = fallback;
  const clamped = Math.min(max, Math.max(min, value));
  // Scriem înapoi doar dacă a fost nevoie de corecție, ca să nu deranjăm tastarea.
  if (clamped !== value) el.value = String(clamped);
  return clamped;
}

/* ------------------------------------------------------------------ */
/* Funcționare offline                                                 */
/* ------------------------------------------------------------------ */

/**
 * Înregistrează service worker-ul, dacă mediul îl permite.
 *
 * Nu funcționează pe file:// — acolo aplicația merge oricum, doar fără
 * cache offline. Eșecul este intenționat tăcut: nicio funcționalitate
 * vizibilă nu depinde de el.
 */
(function initServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (location.protocol !== "http:" && location.protocol !== "https:") return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {
      /* fără cache offline — restul aplicației este neafectat */
    });
  });
})();

/** Amână un apel până când utilizatorul se oprește din redimensionat. */
function debounce(fn, delay = 150) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Redesenează graficele la schimbarea temei sau a dimensiunii ferestrei.
 * @param {() => void} render
 */
function onChartNeedsRedraw(render) {
  window.addEventListener("resize", debounce(render, 150));
  window.addEventListener("ef-theme-change", render);
}
