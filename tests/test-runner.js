/**
 * Un rulator de teste minimal, fără dependențe.
 *
 * Aplicația nu are pas de build și nu folosește npm; un framework de
 * testare ar introduce exact ce lipsește intenționat din proiect.
 * Sunt suficiente câteva zeci de linii ca să obținem ce contează:
 * un raport clar despre ce a trecut și ce nu.
 */

const suites = [];
let currentSuite = null;

function describe(name, fn) {
  currentSuite = { name, tests: [] };
  suites.push(currentSuite);
  fn();
  currentSuite = null;
}

function it(name, fn) {
  currentSuite.tests.push({ name, fn });
}

/* ------------------------------------------------------------------ */
/* Aserțiuni                                                           */
/* ------------------------------------------------------------------ */

function fail(message) {
  throw new Error(message);
}

const expect = (actual) => ({
  /** Egalitate strictă — pentru numere întregi, șiruri, valori logice. */
  toBe(expected) {
    if (actual !== expected) fail(`așteptat ${JSON.stringify(expected)}, primit ${JSON.stringify(actual)}`);
  },

  /**
   * Egalitate numerică cu toleranță. Aproape toate calculele financiare
   * produc zecimale periodice, deci comparația exactă ar fi inutilizabilă.
   */
  toBeCloseTo(expected, tolerance = 0.01) {
    if (!isFinite(actual)) fail(`așteptat un număr aproape de ${expected}, primit ${actual}`);
    const diff = Math.abs(actual - expected);
    if (diff > tolerance) {
      fail(`așteptat ~${expected} (±${tolerance}), primit ${actual} (diferență ${diff.toFixed(6)})`);
    }
  },

  toBeGreaterThan(expected) {
    if (!(actual > expected)) fail(`așteptat > ${expected}, primit ${actual}`);
  },

  toBeLessThan(expected) {
    if (!(actual < expected)) fail(`așteptat < ${expected}, primit ${actual}`);
  },

  toBeBetween(min, max) {
    if (!(actual >= min && actual <= max)) fail(`așteptat între ${min} și ${max}, primit ${actual}`);
  },

  toHaveLength(expected) {
    const len = actual ? actual.length : undefined;
    if (len !== expected) fail(`așteptată lungimea ${expected}, primită ${len}`);
  },

  toBeTrue() {
    if (actual !== true) fail(`așteptat true, primit ${JSON.stringify(actual)}`);
  },

  toBeFalse() {
    if (actual !== false) fail(`așteptat false, primit ${JSON.stringify(actual)}`);
  },
});

/* ------------------------------------------------------------------ */
/* Rulare și raportare                                                 */
/* ------------------------------------------------------------------ */

function runTests(mount) {
  let passed = 0;
  let failed = 0;
  mount.textContent = "";

  suites.forEach((suite) => {
    const section = document.createElement("div");
    section.className = "suite";

    const heading = document.createElement("h2");
    heading.textContent = suite.name;
    section.appendChild(heading);

    suite.tests.forEach((test) => {
      const row = document.createElement("div");
      row.className = "test";

      let error = null;
      try {
        test.fn();
        passed += 1;
      } catch (e) {
        error = e;
        failed += 1;
      }

      const icon = document.createElement("span");
      icon.className = error ? "icon fail" : "icon pass";
      icon.textContent = error ? "✕" : "✓";
      row.appendChild(icon);

      const label = document.createElement("span");
      label.className = "name";
      label.textContent = test.name;
      row.appendChild(label);

      if (error) {
        row.classList.add("failed");
        const reason = document.createElement("div");
        reason.className = "reason";
        reason.textContent = error.message;
        row.appendChild(reason);
      }

      section.appendChild(row);
    });

    mount.appendChild(section);
  });

  const summary = document.getElementById("summary");
  summary.textContent = failed === 0
    ? `Toate cele ${passed} teste au trecut.`
    : `${failed} ${failed === 1 ? "test a eșuat" : "teste au eșuat"}, ${passed} au trecut.`;
  summary.className = failed === 0 ? "summary pass" : "summary fail";
}
