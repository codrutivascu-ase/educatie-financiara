/**
 * Pagina principală, personalizată în funcție de ce a făcut utilizatorul.
 *
 * Un vizitator nou vede un îndemn de început; unul care are deja date
 * vede unde a rămas. Diferența contează: „Începe cu prima lecție” este
 * inutil pentru cineva care a parcurs deja șapte.
 */

/** Numărul de lecții rezolvate și lecția următoare, dacă există. */
function stareLectii() {
  const progres = getProgress();
  const rezolvate = LECTII.filter((l) => progres[l.id]);
  const urmatoarea = LECTII.find((l) => !progres[l.id]) || null;
  return { rezolvate: rezolvate.length, total: LECTII.length, urmatoarea };
}

/** Câte module au date salvate — folosit ca măsură a „cât a completat”. */
function moduleCompletate(profil) {
  return Object.values(profil).filter((v) => v !== null).length;
}

function personalizeaza() {
  const profil = getProfile();
  const lectii = stareLectii();
  const module = moduleCompletate(profil);

  const title = document.getElementById("hero-title");
  const text = document.getElementById("hero-text");
  const cta = document.getElementById("hero-cta");

  /* --- Îndemnul principal -------------------------------------------
   * Blocul de întâmpinare este opțional: pagina principală poate fi
   * publicată și fără el. Personalizăm doar dacă există în DOM, altfel
   * un vizitator care are deja progres salvat ar primi o eroare și ar
   * pierde și etichetele de stare de mai jos.
   */
  if (!title || !text || !cta) {
    // fără bloc de întâmpinare, trecem direct la etichetele de stare
  } else if (lectii.rezolvate === 0 && module === 0) {
    // Utilizator nou: lăsăm textul implicit din HTML.
  } else if (lectii.urmatoarea && lectii.rezolvate > 0) {
    title.textContent = "Continuă de unde ai rămas";
    text.textContent =
      `Ai parcurs ${lectii.rezolvate} din ${lectii.total} lecții. ` +
      `Urmează „${lectii.urmatoarea.titlu}” — ${lectii.urmatoarea.durata} minute.`;
    cta.textContent = "Continuă lecțiile";
    cta.href = `lectii.html#${lectii.urmatoarea.id}`;
  } else if (!lectii.urmatoarea) {
    title.textContent = "Ai parcurs toate lecțiile";
    text.textContent =
      "Partea de teorie e acoperită. De aici, valoarea vine din a-ți ține valorile la zi: " +
      "bugetul lunii curente este cel de la care pornesc toate celelalte module.";
    cta.textContent = "Actualizează bugetul";
    cta.href = "buget.html";
  } else if (module > 0) {
    title.textContent = "Ai deja câteva valori introduse";
    text.textContent =
      `Ai completat ${module} ${module === 1 ? "modul" : "module"}. ` +
      `Lecțiile explică mecanismele din spatele valorilor — de ce dobânda compusă are nevoie de ani, ` +
      `de ce datoriile scumpe se plătesc înaintea oricărei investiții.`;
    cta.textContent = "Începe cu prima lecție";
    cta.href = "lectii.html";
  }

  /* --- Bara de progres la lecții ------------------------------------ */
  const wrap = document.getElementById("hero-progress");
  if (wrap && lectii.rezolvate > 0) {
    wrap.classList.remove("hidden");
    wrap.textContent = "";

    const label = document.createElement("div");
    label.className = "hero-progress-label";
    label.textContent = `Progres la lecții: ${lectii.rezolvate} din ${lectii.total}`;
    wrap.appendChild(label);

    const track = document.createElement("div");
    track.className = "meter-track";
    const fill = document.createElement("div");
    fill.className = "meter-fill";
    const pct = (lectii.rezolvate / lectii.total) * 100;
    fill.style.width = `${pct.toFixed(0)}%`;
    if (pct >= 100) fill.classList.add("good");
    track.appendChild(fill);
    wrap.appendChild(track);
  }

  /* --- Etichetele de stare de pe cartonașe -------------------------- */
  const statusLectii = document.getElementById("status-lectii");
  if (statusLectii && lectii.rezolvate > 0) {
    statusLectii.textContent = `${lectii.rezolvate} din ${lectii.total} lecții parcurse`;
  }

  const statusBuget = document.getElementById("status-buget");
  if (statusBuget && profil.buget) {
    statusBuget.textContent =
      profil.buget.sold >= 0
        ? `Completat · îți rămân ${formatRON(profil.buget.sold)} pe lună`
        : `Completat · cheltuieli peste venit cu ${formatRON(Math.abs(profil.buget.sold))}`;
  }
}

/* ------------------------------------------------------------------ */
/* Datele salvate local                                                */
/* ------------------------------------------------------------------ */

/** Câte chei a scris aplicația în localStorage. */
function cheiSalvate() {
  try {
    return Object.keys(localStorage).filter((k) => k.startsWith("ef-")).length;
  } catch (e) {
    return 0; // storage blocat — nu avem ce raporta și nici ce șterge
  }
}

/**
 * Secțiunea de la finalul paginii: singura din aplicație de unde se pot
 * șterge toate datele salvate local.
 */
function gestioneazaDatele() {
  const rezumat = document.getElementById("storage-summary");
  const btn = document.getElementById("btn-clear");
  if (!rezumat || !btn) return;

  const chei = cheiSalvate();
  if (chei === 0) {
    rezumat.textContent =
      "Aplicația nu a salvat încă nimic în acest browser.";
    btn.disabled = true;
  } else {
    rezumat.textContent =
      `Aplicația are ${chei} ${chei === 1 ? "set de valori salvat" : "seturi de valori salvate"} ` +
      `în acest browser — bugetul, parametrii modulelor pe care le-ai folosit și progresul la lecții.`;
  }

  btn.addEventListener("click", () => {
    if (!window.confirm("Ștergi tot ce a salvat aplicația în acest browser? Operațiunea nu poate fi anulată.")) return;
    const sterse = clearAllData();
    rezumat.textContent = `Șterse: ${sterse} ${sterse === 1 ? "set de valori" : "seturi de valori"}. Aplicația a revenit la starea inițială.`;
    btn.disabled = true;
  });
}

personalizeaza();
gestioneazaDatele();
