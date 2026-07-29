/**
 * Glosarul: căutare, filtrare pe categorii și legături între termeni.
 *
 * Termenul deschis se ține în hash, ca linkurile de forma
 * glosar.html#etf din restul aplicației să funcționeze direct.
 */

let categorieActiva = "toate";

/** Elimină diacriticele, ca „inflatie” să găsească „inflație”. */
function normalizeaza(text) {
  return text
    .toLowerCase()
    // NFD desparte litera de accent; apoi ștergem intervalul de accente.
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    // ș și ț cu virgulă nu se descompun în toate fonturile — le tratăm explicit.
    .replace(/[șş]/g, "s")
    .replace(/[țţ]/g, "t");
}

/** Categoriile, în ordinea primei apariții în date. */
function categorii() {
  const list = [];
  GLOSAR.forEach((t) => {
    if (!list.includes(t.categorie)) list.push(t.categorie);
  });
  return list;
}

function renderFiltre() {
  const mount = document.getElementById("filtre");
  mount.textContent = "";

  ["toate", ...categorii()].forEach((cat) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = cat === categorieActiva ? "chip active" : "chip";
    chip.textContent = cat === "toate" ? "Toate" : cat;
    chip.setAttribute("aria-pressed", String(cat === categorieActiva));
    chip.addEventListener("click", () => {
      categorieActiva = cat;
      renderFiltre();
      render();
    });
    mount.appendChild(chip);
  });
}

/** Termenii care trec de filtrul de categorie și de textul căutat. */
function filtreaza() {
  const q = normalizeaza(document.getElementById("cauta").value.trim());

  return GLOSAR.filter((t) => {
    if (categorieActiva !== "toate" && t.categorie !== categorieActiva) return false;
    if (!q) return true;
    // Căutăm în denumire, sinonime și în ambele definiții.
    const haystack = normalizeaza(
      [t.termen, ...(t.termeni || []), t.scurt, t.lung].join(" ")
    );
    return haystack.includes(q);
  });
}

function render() {
  const rezultate = filtreaza();
  const mount = document.getElementById("glosar-mount");
  mount.textContent = "";

  const info = document.getElementById("rezultate-info");
  info.textContent =
    rezultate.length === GLOSAR.length
      ? `${GLOSAR.length} termeni`
      : `${rezultate.length} din ${GLOSAR.length} termeni`;

  if (rezultate.length === 0) {
    const card = document.createElement("div");
    card.className = "card";
    const p = document.createElement("p");
    p.className = "field-hint";
    p.textContent = "Niciun termen nu corespunde căutării. Încearcă un cuvânt mai scurt sau alege „Toate”.";
    card.appendChild(p);
    mount.appendChild(card);
    return;
  }

  // Grupăm rezultatele pe categorii, păstrând ordinea din date.
  const grupuri = [];
  rezultate.forEach((t) => {
    let g = grupuri.find((x) => x.nume === t.categorie);
    if (!g) {
      g = { nume: t.categorie, termeni: [] };
      grupuri.push(g);
    }
    g.termeni.push(t);
  });

  grupuri.forEach((grup) => {
    const card = document.createElement("div");
    card.className = "card";

    const h2 = document.createElement("h2");
    h2.textContent = grup.nume;
    card.appendChild(h2);

    grup.termeni.forEach((t) => {
      const entry = document.createElement("details");
      entry.className = "glosar-entry";
      entry.id = t.id;
      // Deschis automat dacă s-a intrat pe pagină cu #id-ul lui.
      if (window.location.hash.replace(/^#/, "") === t.id) entry.open = true;

      const summary = document.createElement("summary");
      const termen = document.createElement("strong");
      termen.textContent = t.termen;
      summary.appendChild(termen);
      const scurt = document.createElement("span");
      scurt.className = "glosar-scurt";
      scurt.textContent = t.scurt;
      summary.appendChild(scurt);
      entry.appendChild(summary);

      const lung = document.createElement("p");
      lung.className = "glosar-lung";
      lung.textContent = t.lung;
      entry.appendChild(lung);

      if (t.vezi && t.vezi.length) {
        const vezi = document.createElement("p");
        vezi.className = "glosar-vezi";
        vezi.appendChild(document.createTextNode("Vezi și: "));
        t.vezi.forEach((id, i) => {
          const tinta = GLOSAR.find((x) => x.id === id);
          if (!tinta) return;
          if (i > 0) vezi.appendChild(document.createTextNode(", "));
          const a = document.createElement("a");
          a.href = `#${tinta.id}`;
          a.textContent = tinta.termen;
          a.addEventListener("click", () => {
            // Filtrul de categorie ar putea ascunde ținta — îl resetăm.
            categorieActiva = "toate";
            document.getElementById("cauta").value = "";
            renderFiltre();
            render();
          });
          vezi.appendChild(a);
        });
        entry.appendChild(vezi);
      }

      card.appendChild(entry);
    });

    mount.appendChild(card);
  });
}

/** Deschide termenul din hash și îl aduce în vizor. */
function deschideDinHash() {
  const id = window.location.hash.replace(/^#/, "");
  if (!id) return;
  const el = document.getElementById(id);
  if (el && el.tagName === "DETAILS") {
    el.open = true;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

document.getElementById("cauta").addEventListener("input", render);
window.addEventListener("hashchange", () => {
  render();
  deschideDinHash();
});

renderFiltre();
render();
deschideDinHash();
