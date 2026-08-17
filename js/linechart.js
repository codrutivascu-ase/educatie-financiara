/**
 * Grafic de linie desenat direct în SVG, fără biblioteci externe.
 *
 * Suportă:
 *  - una sau mai multe serii, cu legendă și etichete la capăt;
 *  - valori negative (axa zero se mută automat în interiorul graficului);
 *  - linie de referință (ex. ținta de economisire);
 *  - crosshair + tooltip la mouse și la navigarea cu tastatura.
 */

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Alege un pas "rotund" pentru axa Y (1, 2, 5, 10, 20, 50, ...),
 * ca să nu apară valori de tipul 3.478 pe gradații.
 */
function niceStep(range, targetSteps = 5) {
  if (range <= 0) return 1;
  const rough = range / targetSteps;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const norm = rough / mag;
  let step;
  if (norm < 1.5) step = 1;
  else if (norm < 3) step = 2;
  else if (norm < 7) step = 5;
  else step = 10;
  return step * mag;
}

/**
 * Desenează graficul în `root`.
 *
 * @param {HTMLElement} root containerul graficului
 * @param {HTMLElement} tooltipEl elementul de tooltip (unul per pagină)
 * @param {object} opts
 * @param {Array<number|string>} opts.xValues valorile de pe axa X
 * @param {(v:any)=>string} [opts.xFormat] formatare etichete X
 * @param {(v:number)=>string} opts.yFormat formatare etichete Y
 * @param {(v:number)=>string} [opts.yAxisFormat] formatare compactă pe axă
 * @param {Array<{name:string,color:string,values:number[],dashed?:boolean}>} opts.series
 *        `dashed` marchează seriile de referință (ex. banii depuși), ca să
 *        se distingă de traiectoriile propriu-zise chiar și alb-negru
 * @param {number} [opts.targetValue] valoare pentru linia de referință
 * @param {string} [opts.targetLabel] eticheta liniei de referință
 * @param {boolean} [opts.areaFill] umple sub linie (doar pentru o serie)
 * @param {number} [opts.height]
 */
function renderLineChart(root, tooltipEl, opts) {
  // Dacă graficul e ascuns (ex. suntem pe tabul "Tabel"), clientWidth e 0.
  // Reținem ultima lățime bună ca desenul să nu sară la 800px la redesenare.
  const measured = root.clientWidth;
  if (measured > 0) root.dataset.lastWidth = String(measured);
  const width = measured > 0 ? measured : parseFloat(root.dataset.lastWidth) || 800;

  const height = opts.height || 320;

  /* Marginile din jurul zonei desenate.
   *
   * Pe desktop, cei 90 de pixeli din dreapta țin etichetele de la capătul
   * fiecărei linii, iar cei 74 din stânga țin valorile axei. Pe un telefon
   * de 360px aceleași margini ar lăsa graficului propriu-zis sub 40% din
   * lățime — adică exact partea care contează ar fi cea mai îngustă.
   *
   * Sub 480px strângem marginile și renunțăm la etichetele din dreapta:
   * aceleași valori apar oricum în legenda de sub grafic. */
  const ingust = width < 480;
  const padLeft = ingust ? 44 : 74;
  const padRight = ingust ? 12 : 90;
  const padTop = 18, padBottom = 34;
  const plotW = Math.max(10, width - padLeft - padRight);
  const plotH = Math.max(10, height - padTop - padBottom);

  const xValues = opts.xValues;
  const yFormat = opts.yFormat;
  const yAxisFormat = opts.yAxisFormat || opts.yFormat;

  /* --- Domeniul axei Y, inclusiv valori negative ------------------- */
  const allY = opts.series.flatMap((s) => s.values).filter((v) => isFinite(v));
  if (opts.targetValue != null) allY.push(opts.targetValue);
  const dataMax = allY.length ? Math.max(...allY) : 0;
  const dataMin = allY.length ? Math.min(...allY) : 0;

  // Axa pornește de la 0, cu excepția cazului în care există valori negative.
  const rawMax = Math.max(0, dataMax);
  const rawMin = Math.min(0, dataMin);
  const step = niceStep(rawMax - rawMin || Math.abs(rawMax) || 1);
  const niceMax = Math.ceil(rawMax / step) * step || step;
  const niceMin = Math.floor(rawMin / step) * step;
  const span = niceMax - niceMin || step;

  const xAt = (i) =>
    padLeft + (xValues.length === 1 ? plotW / 2 : (i / (xValues.length - 1)) * plotW);
  const yAt = (v) => padTop + plotH - ((v - niceMin) / span) * plotH;

  /* --- Culori, citite din CSS ca să urmeze tema curentă ------------- */
  const mutedColor = getCssVar("--text-muted");
  const gridlineColor = getCssVar("--gridline");
  const baselineColor = getCssVar("--baseline");
  const surfaceColor = getCssVar("--surface-card");
  const primaryColor = getCssVar("--text-primary");

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", String(height));
  svg.setAttribute("role", "img");
  svg.setAttribute(
    "aria-label",
    `Grafic: ${opts.series.map((s) => s.name).join(", ")}. Valorile exacte sunt disponibile în tabel.`
  );
  svg.style.display = "block";
  svg.style.overflow = "visible";
  svg.style.touchAction = "pan-y";

  function addText(x, y, text, { anchor = "start", size = 11, fill = mutedColor, weight = null } = {}) {
    const el = document.createElementNS(SVG_NS, "text");
    el.setAttribute("x", String(x));
    el.setAttribute("y", String(y));
    el.setAttribute("text-anchor", anchor);
    el.setAttribute("font-size", String(size));
    el.setAttribute("fill", fill);
    if (weight) el.setAttribute("font-weight", weight);
    el.textContent = text;
    svg.appendChild(el);
    return el;
  }

  function addLine(x1, y1, x2, y2, stroke, strokeWidth = 1) {
    const el = document.createElementNS(SVG_NS, "line");
    el.setAttribute("x1", String(x1));
    el.setAttribute("y1", String(y1));
    el.setAttribute("x2", String(x2));
    el.setAttribute("y2", String(y2));
    el.setAttribute("stroke", stroke);
    el.setAttribute("stroke-width", String(strokeWidth));
    svg.appendChild(el);
    return el;
  }

  /* --- Gradații orizontale ----------------------------------------- */
  for (let v = niceMin; v <= niceMax + step / 2; v += step) {
    const value = Math.abs(v) < step / 1000 ? 0 : v; // evită "-0"
    const y = yAt(value);
    // Linia lui zero e mai vizibilă decât restul gradațiilor.
    const isZero = value === 0 && niceMin < 0;
    addLine(padLeft, y, padLeft + plotW, y, isZero ? baselineColor : gridlineColor, isZero ? 1.5 : 1);
    addText(padLeft - 10, y + 4, yAxisFormat(value), { anchor: "end" });
  }

  /* --- Etichete pe axa X, rărite ca să nu se suprapună -------------- */
  // Numărul de etichete care încap depinde de lățimea disponibilă, nu doar
  // de un plafon fix — pe ecrane înguste, altfel etichetele se suprapun.
  const xLabelStrings = xValues.map((xv) => (opts.xFormat ? opts.xFormat(xv) : String(xv)));
  const maxLabelChars = Math.max(1, ...xLabelStrings.map((s) => s.length));
  const estLabelWidth = maxLabelChars * 6.5 + 12;
  const maxLabelsByWidth = Math.max(2, Math.floor(plotW / estLabelWidth));
  const targetLabels = Math.min(8, maxLabelsByWidth);
  const labelEvery = Math.max(1, Math.ceil(xValues.length / targetLabels));
  const lastIdx = xValues.length - 1;
  const lastRegularIdx = Math.floor(lastIdx / labelEvery) * labelEvery;
  // Dacă ultima etichetă "regulată" e prea aproape de capăt, o sărim.
  const skipLastRegular =
    lastIdx !== lastRegularIdx && lastIdx - lastRegularIdx < labelEvery / 2;

  xValues.forEach((xv, i) => {
    const isLast = i === lastIdx;
    if (!isLast && i % labelEvery !== 0) return;
    if (!isLast && skipLastRegular && i === lastRegularIdx) return;
    addText(xAt(i), height - 10, opts.xFormat ? opts.xFormat(xv) : String(xv), {
      anchor: "middle",
    });
  });

  /* --- Linie de referință (țintă) ----------------------------------- */
  if (opts.targetValue != null) {
    const y = yAt(opts.targetValue);
    const line = addLine(padLeft, y, padLeft + plotW, y, mutedColor, 1.5);
    line.setAttribute("stroke-dasharray", "5 4");
    if (opts.targetLabel) {
      addText(padLeft + plotW, y - 7, opts.targetLabel, { anchor: "end" });
    }
  }

  /* --- Seriile ------------------------------------------------------ */
  const endpoints = [];
  opts.series.forEach((s) => {
    const points = s.values.map((v, i) => [xAt(i), yAt(isFinite(v) ? v : 0)]);
    if (points.length === 0) return;

    // Umplerea de sub linie pleacă de la zero, nu de la marginea de jos,
    // ca să arate corect și când valorile sunt negative.
    if (opts.series.length === 1 && opts.areaFill) {
      const zeroY = yAt(Math.max(niceMin, Math.min(0, niceMax)));
      const d =
        `M${points[0][0]},${zeroY} ` +
        points.map((p) => `L${p[0]},${p[1]}`).join(" ") +
        ` L${points[points.length - 1][0]},${zeroY} Z`;
      const area = document.createElementNS(SVG_NS, "path");
      area.setAttribute("d", d);
      area.setAttribute("fill", s.color);
      area.setAttribute("opacity", "0.10");
      area.setAttribute("stroke", "none");
      svg.appendChild(area);
    }

    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", "M" + points.map((p) => p.join(",")).join(" L"));
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", s.color);
    path.setAttribute("stroke-width", s.dashed ? "1.75" : "2");
    path.setAttribute("stroke-linejoin", "round");
    path.setAttribute("stroke-linecap", "round");
    if (s.dashed) path.setAttribute("stroke-dasharray", "6 5");
    svg.appendChild(path);

    const last = points[points.length - 1];
    endpoints.push({
      name: s.name,
      color: s.color,
      x: last[0],
      y: last[1],
      value: s.values[s.values.length - 1],
    });

    // Inel în culoarea fundalului, ca punctele să rămână lizibile
    // acolo unde două linii se suprapun.
    const ring = document.createElementNS(SVG_NS, "circle");
    ring.setAttribute("cx", String(last[0]));
    ring.setAttribute("cy", String(last[1]));
    ring.setAttribute("r", "7");
    ring.setAttribute("fill", surfaceColor);
    svg.appendChild(ring);

    const dot = document.createElementNS(SVG_NS, "circle");
    dot.setAttribute("cx", String(last[0]));
    dot.setAttribute("cy", String(last[1]));
    dot.setAttribute("r", "5");
    dot.setAttribute("fill", s.color);
    svg.appendChild(dot);
  });

  /* --- Etichete la capăt, doar dacă nu se suprapun ------------------ */
  const sortedByY = [...endpoints].sort((a, b) => a.y - b.y);
  // Pe ecran îngust nu există margine în dreapta pentru ele.
  let labelsFit = !ingust;
  for (let i = 1; labelsFit && i < sortedByY.length; i++) {
    if (sortedByY[i].y - sortedByY[i - 1].y < 16) {
      labelsFit = false;
      break;
    }
  }
  if (labelsFit) {
    endpoints.forEach((ep) => {
      addText(ep.x + 10, ep.y + 4, yAxisFormat(ep.value), {
        size: 12,
        fill: primaryColor,
        weight: "600",
      });
    });
  }

  /* --- Interacțiune: crosshair + tooltip ---------------------------- */
  const crosshair = addLine(padLeft, padTop, padLeft, padTop + plotH, mutedColor, 1);
  crosshair.setAttribute("opacity", "0");

  // Puncte evidențiate pe fiecare serie, la poziția indicată de crosshair.
  const hoverDots = opts.series.map((s) => {
    const dot = document.createElementNS(SVG_NS, "circle");
    dot.setAttribute("r", "5");
    dot.setAttribute("fill", s.color);
    dot.setAttribute("stroke", surfaceColor);
    dot.setAttribute("stroke-width", "2");
    dot.setAttribute("opacity", "0");
    svg.appendChild(dot);
    return dot;
  });

  const overlay = document.createElementNS(SVG_NS, "rect");
  overlay.setAttribute("x", String(padLeft));
  overlay.setAttribute("y", String(padTop));
  overlay.setAttribute("width", String(plotW));
  overlay.setAttribute("height", String(plotH));
  overlay.setAttribute("fill", "transparent");
  overlay.setAttribute("tabindex", "0");
  overlay.setAttribute("role", "application");
  overlay.setAttribute("aria-label", "Explorează graficul cu săgețile stânga/dreapta");
  overlay.style.outline = "none";
  svg.appendChild(overlay);

  let activeIndex = -1;

  /** Traduce o poziție a mouse-ului în cel mai apropiat index de pe axa X. */
  function indexAt(clientX) {
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0) return 0;
    const localX = ((clientX - rect.left) / rect.width) * width;
    const ratio = (localX - padLeft) / plotW;
    const idx = Math.round(ratio * (xValues.length - 1));
    return Math.min(xValues.length - 1, Math.max(0, idx));
  }

  /** Afișează crosshair-ul, punctele și tooltipul pentru indexul dat. */
  function showAt(idx, clientX, clientY) {
    activeIndex = idx;
    const x = xAt(idx);
    crosshair.setAttribute("x1", String(x));
    crosshair.setAttribute("x2", String(x));
    crosshair.setAttribute("opacity", "1");

    hoverDots.forEach((dot, si) => {
      const v = opts.series[si].values[idx];
      if (!isFinite(v)) {
        dot.setAttribute("opacity", "0");
        return;
      }
      dot.setAttribute("cx", String(x));
      dot.setAttribute("cy", String(yAt(v)));
      dot.setAttribute("opacity", "1");
    });

    // Construim tooltipul cu textContent — numele seriilor pot conține
    // text introdus de utilizator, deci nu folosim innerHTML.
    tooltipEl.textContent = "";
    const head = document.createElement("div");
    head.className = "tt-head";
    head.textContent = opts.xFormat ? opts.xFormat(xValues[idx]) : String(xValues[idx]);
    tooltipEl.appendChild(head);

    opts.series.forEach((s) => {
      const row = document.createElement("div");
      row.className = "tt-row";
      const key = document.createElement("span");
      key.className = "tt-key";
      key.style.background = s.color;
      row.appendChild(key);
      const val = document.createElement("strong");
      val.textContent = yFormat(s.values[idx]);
      row.appendChild(val);
      row.appendChild(document.createTextNode(" " + s.name));
      tooltipEl.appendChild(row);
    });

    positionTooltip(tooltipEl, clientX, clientY);
    tooltipEl.classList.add("visible");
  }

  function hide() {
    activeIndex = -1;
    crosshair.setAttribute("opacity", "0");
    hoverDots.forEach((d) => d.setAttribute("opacity", "0"));
    tooltipEl.classList.remove("visible");
  }

  overlay.addEventListener("mousemove", (evt) => {
    showAt(indexAt(evt.clientX), evt.clientX, evt.clientY);
  });
  overlay.addEventListener("mouseleave", hide);

  // Suport pentru ecrane tactile.
  overlay.addEventListener(
    "touchmove",
    (evt) => {
      const t = evt.touches[0];
      if (!t) return;
      showAt(indexAt(t.clientX), t.clientX, t.clientY);
    },
    { passive: true }
  );
  overlay.addEventListener("touchend", hide);

  // Navigare cu tastatura: aceleași informații ca la hover.
  overlay.addEventListener("focus", () => {
    const idx = activeIndex >= 0 ? activeIndex : xValues.length - 1;
    const rect = svg.getBoundingClientRect();
    showAt(idx, rect.left + (xAt(idx) / width) * rect.width, rect.top + 40);
  });
  overlay.addEventListener("blur", hide);
  overlay.addEventListener("keydown", (evt) => {
    let idx = activeIndex >= 0 ? activeIndex : xValues.length - 1;
    if (evt.key === "ArrowRight") idx = Math.min(xValues.length - 1, idx + 1);
    else if (evt.key === "ArrowLeft") idx = Math.max(0, idx - 1);
    else if (evt.key === "Home") idx = 0;
    else if (evt.key === "End") idx = xValues.length - 1;
    else if (evt.key === "Escape") return hide();
    else return;
    evt.preventDefault();
    const rect = svg.getBoundingClientRect();
    showAt(idx, rect.left + (xAt(idx) / width) * rect.width, rect.top + 40);
  });

  root.textContent = "";
  root.appendChild(svg);
}

/**
 * Poziționează tooltipul lângă cursor, fără să iasă din ecran.
 */
function positionTooltip(el, clientX, clientY) {
  el.style.left = "0px";
  el.style.top = "0px";
  el.classList.add("measuring");
  const rect = el.getBoundingClientRect();
  el.classList.remove("measuring");

  const margin = 8;
  let left = clientX;
  const halfWidth = rect.width / 2;
  if (left - halfWidth < margin) left = margin + halfWidth;
  if (left + halfWidth > window.innerWidth - margin) left = window.innerWidth - margin - halfWidth;

  let top = clientY - 12;
  // Dacă nu încape deasupra cursorului, îl mutăm dedesubt.
  if (top - rect.height < margin) top = clientY + rect.height + 20;

  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
}
