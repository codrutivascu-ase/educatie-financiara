/**
 * Modulul de lecții: listă, citire, quiz și progres.
 *
 * Conținutul stă în lectii-data.js; aici este doar mecanica. Lecția
 * curentă se ține în hash-ul adresei (#l2-dobanda-compusa), ca linkul
 * către o lecție să poată fi salvat sau trimis, iar butonul „înapoi”
 * al browserului să funcționeze firesc.
 */

const viewList = document.getElementById("view-list");
const viewLesson = document.getElementById("view-lesson");

/** Starea quizului curent: la ce întrebare suntem și ce s-a răspuns. */
let currentLesson = null;
let answers = [];

/* ------------------------------------------------------------------ */
/* Lista de lecții                                                     */
/* ------------------------------------------------------------------ */

/** Grupează lecțiile după câmpul `grup`, păstrând ordinea de apariție. */
function groupLessons() {
  const groups = [];
  LECTII.forEach((l) => {
    let g = groups.find((x) => x.name === l.grup);
    if (!g) {
      g = { name: l.grup, lessons: [] };
      groups.push(g);
    }
    g.lessons.push(l);
  });
  return groups;
}

function renderList() {
  const progress = getProgress();
  const mount = document.getElementById("lesson-groups");
  mount.textContent = "";

  groupLessons().forEach((group) => {
    const card = document.createElement("div");
    card.className = "card";

    const h2 = document.createElement("h2");
    h2.textContent = group.name;
    card.appendChild(h2);

    const grid = document.createElement("div");
    grid.className = "lesson-grid";

    group.lessons.forEach((lesson) => {
      const done = progress[lesson.id];
      const item = document.createElement("a");
      item.className = done ? "lesson-card done" : "lesson-card";
      item.href = `#${lesson.id}`;

      const top = document.createElement("div");
      top.className = "lesson-card-top";

      const badge = document.createElement("span");
      badge.className = "lesson-badge";
      // Bifa este singurul indiciu vizual al parcurgerii; scorul apare separat.
      badge.textContent = done ? "✓" : String(LECTII.indexOf(lesson) + 1);
      top.appendChild(badge);

      const time = document.createElement("span");
      time.className = "lesson-time";
      time.textContent = `${lesson.durata} min`;
      top.appendChild(time);
      item.appendChild(top);

      const title = document.createElement("h3");
      title.textContent = lesson.titlu;
      item.appendChild(title);

      const summary = document.createElement("p");
      summary.textContent = lesson.rezumat;
      item.appendChild(summary);

      const status = document.createElement("span");
      status.className = "status";
      status.textContent = done
        ? `Rezolvat: ${done.score}/${done.total} corecte`
        : `${lesson.intrebari.length} întrebări`;
      item.appendChild(status);

      grid.appendChild(item);
    });

    card.appendChild(grid);
    mount.appendChild(card);
  });

  renderProgressSummary(progress);
}

/** Cartonașele de sus: câte lecții, câte răspunsuri corecte, cât timp rămâne. */
function renderProgressSummary(progress) {
  const done = LECTII.filter((l) => progress[l.id]);
  const totalIntrebari = LECTII.reduce((s, l) => s + l.intrebari.length, 0);
  const corecte = done.reduce((s, l) => s + progress[l.id].score, 0);
  const raspunse = done.reduce((s, l) => s + progress[l.id].total, 0);
  const minuteRamase = LECTII.filter((l) => !progress[l.id]).reduce((s, l) => s + l.durata, 0);

  document.getElementById("stat-parcurse").textContent = `${done.length} / ${LECTII.length}`;
  document.getElementById("stat-corecte").textContent =
    raspunse > 0 ? `${corecte} / ${raspunse}` : "—";
  document.getElementById("stat-timp").textContent =
    minuteRamase > 0 ? `${minuteRamase} min rămase` : "totul parcurs";

  const pct = LECTII.length > 0 ? done.length / LECTII.length : 0;
  document.getElementById("progres-fill").style.width = `${(pct * 100).toFixed(0)}%`;
  document.getElementById("progres-fill").classList.toggle("good", pct >= 1);
  document.getElementById("progres-pct").textContent = formatPercent(pct);
  document.getElementById("progres-label").textContent =
    done.length === 0
      ? "Nicio lecție începută"
      : done.length === LECTII.length
        ? `Toate cele ${LECTII.length} lecții parcurse — ${corecte} din ${totalIntrebari} răspunsuri corecte`
        : `${done.length} din ${LECTII.length} lecții parcurse`;

  // Butonul duce la prima lecție nerezolvată, sau la prima dacă e totul gata.
  const next = LECTII.find((l) => !progress[l.id]) || LECTII[0];
  const btn = document.getElementById("btn-continua");
  btn.textContent = done.length === 0
    ? "Începe prima lecție"
    : done.length === LECTII.length
      ? "Reia de la început"
      : `Continuă: ${next.titlu}`;
  btn.onclick = () => {
    window.location.hash = next.id;
  };
}

/* ------------------------------------------------------------------ */
/* Afișarea unei lecții                                                */
/* ------------------------------------------------------------------ */

/** Transformă blocurile de conținut în elemente DOM. */
function renderLessonContent(lesson) {
  const mount = document.getElementById("lesson-content");
  mount.textContent = "";

  lesson.continut.forEach((block) => {
    if (block.tip === "h") {
      const h = document.createElement("h3");
      h.textContent = block.text;
      mount.appendChild(h);
    } else if (block.tip === "insight") {
      const p = document.createElement("p");
      p.className = "insight lesson-insight";
      p.textContent = block.text;
      mount.appendChild(p);
    } else {
      const p = document.createElement("p");
      p.textContent = block.text;
      mount.appendChild(p);
    }
  });
}

/**
 * Randează o întrebare cu variantele ei.
 *
 * După răspuns, toate variantele rămân vizibile și fiecare își arată
 * explicația proprie: scopul nu este să afle dacă a nimerit, ci de ce
 * celelalte variante nu sunt corecte.
 */
function renderQuestion(index) {
  const mount = document.getElementById("quiz-mount");
  mount.textContent = "";

  const q = currentLesson.intrebari[index];
  const answered = answers[index] !== undefined;

  document.getElementById("quiz-progress").textContent =
    `Întrebarea ${index + 1} din ${currentLesson.intrebari.length}`;

  const fieldset = document.createElement("fieldset");
  fieldset.className = "quiz-question";

  const legend = document.createElement("legend");
  legend.textContent = q.text;
  fieldset.appendChild(legend);

  q.options.forEach((optionText, optIdx) => {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "quiz-option";
    option.disabled = answered;

    const marker = document.createElement("span");
    marker.className = "quiz-marker";
    marker.textContent = String.fromCharCode(65 + optIdx); // A, B, C, D
    option.appendChild(marker);

    const label = document.createElement("span");
    label.className = "quiz-label";
    label.textContent = optionText;
    option.appendChild(label);

    if (answered) {
      const isCorrect = optIdx === q.correct;
      const wasChosen = answers[index] === optIdx;
      if (isCorrect) option.classList.add("correct");
      if (wasChosen && !isCorrect) option.classList.add("wrong");
      if (wasChosen) marker.textContent = isCorrect ? "✓" : "✕";

      // Explicația apare pentru varianta corectă și pentru cea aleasă.
      if (isCorrect || wasChosen) {
        const why = document.createElement("span");
        why.className = "quiz-why";
        why.textContent = q.explicatii[optIdx];
        option.appendChild(why);
      }
    } else {
      option.addEventListener("click", () => {
        answers[index] = optIdx;
        renderQuestion(index);
      });
    }

    fieldset.appendChild(option);
  });

  mount.appendChild(fieldset);

  if (answered) {
    const row = document.createElement("div");
    row.className = "button-row";
    const next = document.createElement("button");
    next.type = "button";
    next.className = "primary";
    const isLast = index === currentLesson.intrebari.length - 1;
    next.textContent = isLast ? "Vezi rezultatul" : "Întrebarea următoare →";
    next.addEventListener("click", () => {
      if (isLast) showResult();
      else renderQuestion(index + 1);
    });
    row.appendChild(next);
    mount.appendChild(row);
    next.focus();
  }
}

/** Scorul final al lecției, salvat și comentat. */
function showResult() {
  const total = currentLesson.intrebari.length;
  const score = currentLesson.intrebari.reduce(
    (s, q, i) => s + (answers[i] === q.correct ? 1 : 0),
    0
  );

  saveLessonResult(currentLesson.id, score, total);

  document.getElementById("quiz-card").classList.add("hidden");
  const resultCard = document.getElementById("quiz-result");
  resultCard.classList.remove("hidden");

  const scoreEl = document.getElementById("result-score");
  scoreEl.textContent = `${score} / ${total}`;
  scoreEl.classList.toggle("good", score === total);
  scoreEl.classList.toggle("critical", score <= total / 2);

  document.getElementById("result-text").textContent =
    score === total
      ? "Toate corecte. Mecanismul este clar — poți trece mai departe."
      : score >= total / 2
        ? "Majoritatea corecte. Merită să recitești paragrafele legate de întrebările ratate: explicațiile de la fiecare variantă spun exact unde s-a rupt raționamentul."
        : "Mai mult de jumătate greșite. Nu este o problemă — reia lecția, de data asta citind și explicațiile variantelor greșite, nu doar pe cea corectă.";

  const idx = LECTII.indexOf(currentLesson);
  const nextLesson = LECTII[idx + 1];
  const btnNext = document.getElementById("btn-urmatoarea");
  if (nextLesson) {
    btnNext.textContent = `Lecția următoare: ${nextLesson.titlu} →`;
    btnNext.onclick = () => {
      window.location.hash = nextLesson.id;
    };
    btnNext.classList.remove("hidden");
  } else {
    btnNext.classList.add("hidden");
  }

  resultCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

/** Pregătește pagina pentru o lecție și pornește quizul de la început. */
function openLesson(lesson) {
  currentLesson = lesson;
  answers = [];

  document.getElementById("lesson-title").textContent = lesson.titlu;
  document.getElementById("lesson-meta").textContent =
    `${lesson.grup} · ${lesson.durata} minute de citit · ${lesson.intrebari.length} întrebări`;

  renderLessonContent(lesson);
  document.getElementById("quiz-card").classList.remove("hidden");
  document.getElementById("quiz-result").classList.add("hidden");
  renderQuestion(0);

  viewList.classList.add("hidden");
  viewLesson.classList.remove("hidden");
  window.scrollTo({ top: 0 });
  document.title = `${lesson.titlu} — Educație Financiară`;
}

function showList() {
  currentLesson = null;
  viewLesson.classList.add("hidden");
  viewList.classList.remove("hidden");
  document.title = "Lecții și quiz — Educație Financiară";
  renderList();
}

/* ------------------------------------------------------------------ */
/* Rutare prin hash                                                    */
/* ------------------------------------------------------------------ */

function route() {
  const id = window.location.hash.replace(/^#/, "");
  const lesson = LECTII.find((l) => l.id === id);
  if (lesson) openLesson(lesson);
  else showList();
}

document.getElementById("btn-inapoi").addEventListener("click", () => {
  window.location.hash = "";
});

document.getElementById("btn-reia").addEventListener("click", () => {
  if (currentLesson) openLesson(currentLesson);
});

document.getElementById("btn-reset-progres").addEventListener("click", () => {
  const ok = window.confirm("Ștergi progresul la toate lecțiile? Datele financiare rămân neatinse.");
  if (!ok) return;
  resetProgress();
  renderList();
});

window.addEventListener("hashchange", route);
route();
