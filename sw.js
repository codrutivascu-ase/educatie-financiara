/**
 * Service worker: face aplicația utilizabilă fără conexiune.
 *
 * Strategia este „stale-while-revalidate”: servim imediat versiunea din
 * cache (deci pagina se deschide instantaneu și offline) și, în paralel,
 * aducem versiunea nouă pentru data viitoare.
 *
 * Aplicația nu are backend și nu trimite date nicăieri, deci nu există
 * nimic sensibil de pus în cache — tot ce introduce utilizatorul rămâne
 * în localStorage, care nu trece prin service worker.
 */

const CACHE_NAME = "educatie-financiara-v4";

/** Tot ce trebuie disponibil offline de la prima vizită. */
const PRECACHE = [
  "./",
  "index.html",
  "lectii.html",
  "glosar.html",
  "buget.html",
  "salariu.html",
  "obiective.html",
  "investitii.html",
  "inflatie.html",
  "oportunitate.html",
  "pensii.html",
  "datorii.html",
  "comparator.html",
  "forme-venit.html",
  "css/style.css",
  "js/common.js",
  "js/store.js",
  "js/index.js",
  "js/finance.js",
  "js/linechart.js",
  "js/buget-model.js",
  "js/buget.js",
  "js/investitii.js",
  "js/comparator.js",
  "js/datorii.js",
  "js/obiective.js",
  "js/lectii.js",
  "js/lectii-data.js",
  "js/glosar.js",
  "js/glosar-data.js",
  "js/inflatie.js",
  "js/oportunitate.js",
  "js/salariu.js",
  "js/forme-venit.js",
  "js/pensii.js",
  "manifest.json",
  "icon.svg",
  "icon-maskable.svg",
  "img/fabbv.jpg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      // addAll eșuează în bloc dacă un singur fișier lipsește, așa că
      // adăugăm fiecare resursă separat și ignorăm eșecurile izolate.
      .then((cache) =>
        Promise.all(
          PRECACHE.map((url) =>
            cache.add(url).catch(() => {
              /* resursă indisponibilă la instalare — se va prinde la prima cerere */
            })
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Ne ocupăm doar de GET-urile din propriul domeniu.
  if (request.method !== "GET") return;
  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          // Doar răspunsurile complete și valide merită păstrate.
          if (response && response.status === 200 && response.type === "basic") {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => {
          // Offline: dacă e o navigare, dăm pagina principală din cache.
          if (request.mode === "navigate") return caches.match("index.html");
          return undefined;
        });

      return cached || network;
    })
  );
});
