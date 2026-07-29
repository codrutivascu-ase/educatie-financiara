/**
 * Teste pentru modelul bugetului (js/buget-model.js).
 *
 * Partea cea mai riscantă a modulului nu este afișarea, ci agregarea:
 * un total calculat greșit produce un sfat greșit, iar utilizatorul nu
 * are cum să-și dea seama. Testele acoperă migrarea din formatul vechi,
 * echivalentul lunar al cheltuielilor rare și cele trei grupe.
 */

/** Construiește o lună de test, cu valori implicite rezonabile. */
function lunaTest(venituri, cheltuieli) {
  return {
    venituri: venituri.map((v, i) => ({
      id: i + 1,
      nume: v.nume || `Sursa ${i + 1}`,
      suma: v.suma,
      tip: v.tip || "fix",
    })),
    cheltuieli: cheltuieli.map((c, i) => ({
      id: i + 1,
      nume: c.nume || `Categoria ${i + 1}`,
      grupa: c.grupa || "nevoi",
      planificat: c.planificat || 0,
      real: c.real || 0,
      frecventaLuni: c.frecventaLuni || 1,
      slot: c.slot === undefined ? i : c.slot,
    })),
  };
}

describe("cheieLuna, numeLuna și navigarea între luni", () => {
  it("formatează cheia cu luna pe două cifre", () => {
    expect(cheieLuna(new Date(2026, 0, 15))).toBe("2026-01");
    expect(cheieLuna(new Date(2026, 11, 1))).toBe("2026-12");
  });

  it("traduce cheia în nume de lună", () => {
    expect(numeLuna("2026-07")).toBe("iulie 2026");
    expect(numeLuna("2025-01")).toBe("ianuarie 2025");
  });

  it("întoarce cheia neschimbată dacă nu o poate interpreta", () => {
    expect(numeLuna("aiurea")).toBe("aiurea");
  });

  it("trece corect peste granița dintre ani", () => {
    expect(lunaUrmatoare("2026-12")).toBe("2027-01");
    expect(lunaAnterioara("2026-01")).toBe("2025-12");
  });

  it("navighează în ambele sensuri fără să piardă luna", () => {
    expect(lunaAnterioara(lunaUrmatoare("2026-05"))).toBe("2026-05");
  });

  it("produce chei sortabile cronologic", () => {
    const chei = ["2026-10", "2026-02", "2025-12"].sort();
    expect(chei[0]).toBe("2025-12");
    expect(chei[2]).toBe("2026-10");
  });
});

describe("lunarEchivalent — cheltuielile rare împărțite la lună", () => {
  it("lasă neschimbată o cheltuială lunară", () => {
    expect(lunarEchivalent({ planificat: 500, frecventaLuni: 1 })).toBeCloseTo(500, 0.001);
  });

  it("împarte o cheltuială anuală la douăsprezece", () => {
    // O asigurare de 1.200 lei pe an costă 100 lei în fiecare lună.
    expect(lunarEchivalent({ planificat: 1200, frecventaLuni: 12 })).toBeCloseTo(100, 0.001);
  });

  it("împarte corect și pentru trimestru și semestru", () => {
    expect(lunarEchivalent({ planificat: 300, frecventaLuni: 3 })).toBeCloseTo(100, 0.001);
    expect(lunarEchivalent({ planificat: 600, frecventaLuni: 6 })).toBeCloseTo(100, 0.001);
  });

  it("tratează frecvența lipsă ca lunară", () => {
    expect(lunarEchivalent({ planificat: 250 })).toBeCloseTo(250, 0.001);
  });

  it("întoarce zero pentru o sumă neintrodusă", () => {
    expect(lunarEchivalent({ planificat: 0, frecventaLuni: 12 })).toBe(0);
  });
});

describe("totalVenit și totalPlanificat", () => {
  it("adună toate sursele de venit", () => {
    const luna = lunaTest([{ suma: 5000 }, { suma: 1500 }, { suma: 300 }], []);
    expect(totalVenit(luna)).toBeCloseTo(6800, 0.001);
  });

  it("întoarce zero fără nicio sursă", () => {
    expect(totalVenit(lunaTest([], []))).toBe(0);
  });

  it("însumează planificatul în echivalent lunar", () => {
    const luna = lunaTest(
      [{ suma: 5000 }],
      [
        { planificat: 1000, frecventaLuni: 1 },
        { planificat: 1200, frecventaLuni: 12 }, // = 100/lună
        { planificat: 600, frecventaLuni: 6 },   // = 100/lună
      ]
    );
    expect(totalPlanificat(luna)).toBeCloseTo(1200, 0.001);
  });

  it("însumează realul ca atare, fără împărțire la frecvență", () => {
    const luna = lunaTest(
      [{ suma: 5000 }],
      [
        { planificat: 1200, frecventaLuni: 12, real: 1200 },
        { planificat: 500, frecventaLuni: 1, real: 480 },
      ]
    );
    // Realul este ce a plecat efectiv din cont în luna aceasta.
    expect(totalReal(luna)).toBeCloseTo(1680, 0.001);
  });
});

describe("peGrupa — repartiția pe nevoi, dorințe și economii", () => {
  const luna = lunaTest(
    [{ suma: 6000 }],
    [
      { grupa: "nevoi", planificat: 2000 },
      { grupa: "nevoi", planificat: 1200, frecventaLuni: 12 }, // = 100/lună
      { grupa: "dorinte", planificat: 800 },
      { grupa: "economii", planificat: 1000 },
    ]
  );

  it("adună fiecare grupă separat, în echivalent lunar", () => {
    const g = peGrupa(luna, "planificat");
    expect(g.nevoi).toBeCloseTo(2100, 0.001);
    expect(g.dorinte).toBeCloseTo(800, 0.001);
    expect(g.economii).toBeCloseTo(1000, 0.001);
  });

  it("întoarce zero pe grupele fără cheltuieli", () => {
    const goala = lunaTest([{ suma: 3000 }], [{ grupa: "nevoi", planificat: 500 }]);
    const g = peGrupa(goala, "planificat");
    expect(g.dorinte).toBe(0);
    expect(g.economii).toBe(0);
  });
});

describe("indicatori — cifrele principale ale unei luni", () => {
  it("calculează alocatul, nealocatul și rata de economisire", () => {
    const luna = lunaTest(
      [{ suma: 5000 }],
      [
        { grupa: "nevoi", planificat: 2500 },
        { grupa: "dorinte", planificat: 1000 },
        { grupa: "economii", planificat: 1000 },
      ]
    );
    const ind = indicatori(luna, "planificat");
    expect(ind.venit).toBeCloseTo(5000, 0.001);
    expect(ind.cheltuieliCurente).toBeCloseTo(3500, 0.001);
    expect(ind.economii).toBeCloseTo(1000, 0.001);
    expect(ind.alocat).toBeCloseTo(4500, 0.001);
    expect(ind.nealocat).toBeCloseTo(500, 0.001);
  });

  it("include nealocatul în rata de economisire", () => {
    // 1.000 alocați explicit + 500 rămași fără destinație = 30% din 5.000.
    const luna = lunaTest(
      [{ suma: 5000 }],
      [
        { grupa: "nevoi", planificat: 2500 },
        { grupa: "dorinte", planificat: 1000 },
        { grupa: "economii", planificat: 1000 },
      ]
    );
    expect(indicatori(luna, "planificat").rataEconomisire).toBeCloseTo(0.3, 0.0001);
  });

  it("semnalează depășirea venitului printr-un nealocat negativ", () => {
    const luna = lunaTest(
      [{ suma: 3000 }],
      [
        { grupa: "nevoi", planificat: 2500 },
        { grupa: "dorinte", planificat: 1000 },
      ]
    );
    const ind = indicatori(luna, "planificat");
    expect(ind.nealocat).toBeCloseTo(-500, 0.001);
    // Un buget în deficit nu are rată de economisire pozitivă.
    expect(ind.rataEconomisire).toBe(0);
  });

  it("exclude economiile din baza fondului de urgență", () => {
    const luna = lunaTest(
      [{ suma: 5000 }],
      [
        { grupa: "nevoi", planificat: 2000 },
        { grupa: "dorinte", planificat: 500 },
        { grupa: "economii", planificat: 1500 },
      ]
    );
    // Dacă rămâi fără venit, nu trebuie să înlocuiești și economiile.
    expect(indicatori(luna, "planificat").cheltuieliPentruFond).toBeCloseTo(2500, 0.001);
  });

  it("nu împarte la zero fără venit", () => {
    const luna = lunaTest([], [{ grupa: "nevoi", planificat: 500 }]);
    expect(indicatori(luna, "planificat").rataEconomisire).toBe(0);
  });

  it("calculează pe cifrele reale când i se cere", () => {
    const luna = lunaTest(
      [{ suma: 5000 }],
      [
        { grupa: "nevoi", planificat: 2000, real: 2300 },
        { grupa: "dorinte", planificat: 800, real: 600 },
      ]
    );
    expect(indicatori(luna, "real").cheltuieliCurente).toBeCloseTo(2900, 0.001);
    expect(indicatori(luna, "planificat").cheltuieliCurente).toBeCloseTo(2800, 0.001);
  });
});

describe("migreazaStare — compatibilitate cu formatul vechi", () => {
  it("convertește o stare din versiunea 1", () => {
    const vechi = {
      venit: "5000",
      expenses: [
        { name: "Chirie", type: "nevoi", amount: 2000 },
        { name: "Ieșiri", type: "dorinte", amount: 500 },
      ],
    };
    const nou = migreazaStare(vechi);
    expect(nou.version).toBe(2);

    const luna = nou.luni[nou.lunaCurenta];
    expect(totalVenit(luna)).toBeCloseTo(5000, 0.001);
    expect(luna.cheltuieli).toHaveLength(2);
    // Sumele vechi erau, de fapt, un plan.
    expect(luna.cheltuieli[0].planificat).toBeCloseTo(2000, 0.001);
    expect(luna.cheltuieli[0].real).toBe(0);
    expect(luna.cheltuieli[1].grupa).toBe("dorinte");
  });

  it("păstrează o stare deja în versiunea 2", () => {
    const stare = {
      version: 2,
      lunaCurenta: "2026-03",
      luni: { "2026-03": lunaTest([{ suma: 4000 }], [{ grupa: "nevoi", planificat: 1000 }]) },
    };
    const rezultat = migreazaStare(stare);
    expect(rezultat.lunaCurenta).toBe("2026-03");
    expect(totalVenit(rezultat.luni["2026-03"])).toBeCloseTo(4000, 0.001);
  });

  it("produce o stare validă din date lipsă sau corupte", () => {
    [null, undefined, 42, "text", {}, { luni: null }, { version: 2, luni: {} }].forEach((intrare) => {
      const rezultat = migreazaStare(intrare);
      expect(rezultat.version).toBe(2);
      expect(Object.keys(rezultat.luni).length).toBeGreaterThan(0);
      expect(rezultat.luni[rezultat.lunaCurenta] !== undefined).toBeTrue();
    });
  });

  it("respinge cheile de lună care nu au forma AAAA-LL", () => {
    const rezultat = migreazaStare({
      version: 2,
      lunaCurenta: "gunoi",
      luni: { gunoi: lunaTest([{ suma: 1000 }], []), "2026-04": lunaTest([{ suma: 2000 }], []) },
    });
    expect(Object.keys(rezultat.luni)).toHaveLength(1);
    expect(rezultat.lunaCurenta).toBe("2026-04");
  });

  it("curăță sumele negative și tipurile nevalide", () => {
    const rezultat = migreazaStare({
      version: 2,
      lunaCurenta: "2026-05",
      luni: {
        "2026-05": {
          venituri: [{ nume: "X", suma: -500, tip: "inventat" }],
          cheltuieli: [
            { nume: "Y", grupa: "inexistenta", planificat: -100, real: "abc", frecventaLuni: 7 },
          ],
        },
      },
    });
    const luna = rezultat.luni["2026-05"];
    expect(luna.venituri[0].suma).toBe(0);
    expect(luna.venituri[0].tip).toBe("fix");
    expect(luna.cheltuieli[0].grupa).toBe("nevoi");
    expect(luna.cheltuieli[0].planificat).toBe(0);
    expect(luna.cheltuieli[0].real).toBe(0);
    // Frecvența 7 nu există în listă, deci devine lunară.
    expect(luna.cheltuieli[0].frecventaLuni).toBe(1);
  });

  it("alege cea mai recentă lună dacă cea marcată nu există", () => {
    const rezultat = migreazaStare({
      version: 2,
      lunaCurenta: "2030-01",
      luni: {
        "2026-01": lunaTest([{ suma: 1000 }], []),
        "2026-08": lunaTest([{ suma: 2000 }], []),
      },
    });
    expect(rezultat.lunaCurenta).toBe("2026-08");
  });

  it("este idempotentă — a doua migrare nu schimbă nimic", () => {
    const primaData = migreazaStare({
      venit: "3000",
      expenses: [{ name: "A", type: "nevoi", amount: 500 }],
    });
    const aDouaOara = migreazaStare(primaData);
    expect(JSON.stringify(aDouaOara)).toBe(JSON.stringify(primaData));
  });
});

describe("slotLiber — repartizarea culorilor", () => {
  it("dă primul slot liber", () => {
    expect(slotLiber([])).toBe(0);
    expect(slotLiber([{ slot: 0 }, { slot: 1 }])).toBe(2);
  });

  it("reutilizează un slot eliberat prin ștergere", () => {
    // Categoria cu slotul 1 a fost ștearsă; slotul se întoarce în circulație.
    expect(slotLiber([{ slot: 0 }, { slot: 2 }])).toBe(1);
  });

  it("întoarce null când toate sloturile sunt ocupate", () => {
    const toate = Array.from({ length: SLOTURI_CULOARE }, (_, i) => ({ slot: i }));
    expect(slotLiber(toate)).toBe(null);
  });

  it("ignoră categoriile fără slot", () => {
    expect(slotLiber([{ slot: 0 }, { slot: null }, { slot: null }])).toBe(1);
  });

  it("nu depășește numărul de culori din paletă", () => {
    // A noua culoare nu se generează și nu se reia: ar deveni
    // indistinctă de una existentă pentru cititorii cu daltonism.
    expect(SLOTURI_CULOARE).toBeLessThan(9);
  });
});

describe("abateri — plan față de realitate", () => {
  const luna = lunaTest(
    [{ suma: 5000 }],
    [
      { nume: "Alimente", grupa: "nevoi", planificat: 1000, real: 1350 },
      { nume: "Transport", grupa: "nevoi", planificat: 500, real: 420 },
      { nume: "Chirie", grupa: "nevoi", planificat: 2000, real: 2000 },
      { nume: "Neatinsă", grupa: "dorinte", planificat: 0, real: 0 },
    ]
  );

  it("ordonează după mărimea abaterii, indiferent de semn", () => {
    const rezultat = abateri(luna);
    expect(rezultat[0].nume).toBe("Alimente");
    expect(rezultat[0].diferenta).toBeCloseTo(350, 0.001);
  });

  it("marchează economiile printr-o diferență negativă", () => {
    const transport = abateri(luna).find((a) => a.nume === "Transport");
    expect(transport.diferenta).toBeCloseTo(-80, 0.001);
  });

  it("exclude categoriile fără nicio activitate", () => {
    expect(abateri(luna).some((a) => a.nume === "Neatinsă")).toBeFalse();
  });

  it("compară realul cu echivalentul lunar, nu cu suma pe ciclu", () => {
    const cuAnuala = lunaTest(
      [{ suma: 5000 }],
      [{ nume: "Asigurare", grupa: "nevoi", planificat: 1200, frecventaLuni: 12, real: 0 }]
    );
    const a = abateri(cuAnuala)[0];
    expect(a.planificat).toBeCloseTo(100, 0.001);
    // În lunile fără plată, ai „economisit” rezerva de 100 de lei.
    expect(a.diferenta).toBeCloseTo(-100, 0.001);
  });

  it("nu calculează procent când planul este zero", () => {
    const neplanificat = lunaTest(
      [{ suma: 5000 }],
      [{ nume: "Surpriză", grupa: "nevoi", planificat: 0, real: 300 }]
    );
    expect(abateri(neplanificat)[0].procent).toBe(null);
  });
});

describe("areDateReale", () => {
  it("este fals când nu s-a notat nimic", () => {
    expect(areDateReale(lunaTest([{ suma: 5000 }], [{ planificat: 1000 }]))).toBeFalse();
  });

  it("este adevărat de la prima sumă introdusă", () => {
    expect(areDateReale(lunaTest([{ suma: 5000 }], [{ planificat: 1000, real: 50 }]))).toBeTrue();
  });
});

describe("evolutie — seria pe luni", () => {
  const stare = {
    version: 2,
    lunaCurenta: "2026-03",
    luni: {
      "2026-03": lunaTest([{ suma: 5000 }], [{ grupa: "nevoi", planificat: 3000 }]),
      "2026-01": lunaTest([{ suma: 4000 }], [{ grupa: "nevoi", planificat: 2500 }]),
      "2026-02": lunaTest([{ suma: 4500 }], [{ grupa: "nevoi", planificat: 2800, real: 3000 }]),
    },
  };

  it("întoarce lunile în ordine cronologică", () => {
    const e = evolutie(stare);
    expect(e).toHaveLength(3);
    expect(e[0].cheie).toBe("2026-01");
    expect(e[2].cheie).toBe("2026-03");
  });

  it("folosește cifrele reale acolo unde există", () => {
    const e = evolutie(stare);
    expect(e[1].dinDateReale).toBeTrue();
    expect(e[1].cheltuieli).toBeCloseTo(3000, 0.001);
    // Lunile fără cifre reale cad pe plan, ca seria să nu aibă goluri.
    expect(e[0].dinDateReale).toBeFalse();
    expect(e[0].cheltuieli).toBeCloseTo(2500, 0.001);
  });

  it("tratează venitul nealocat drept economii", () => {
    const e = evolutie(stare);
    // 4.000 venit − 2.500 cheltuieli, fără categorie de economii.
    expect(e[0].economii).toBeCloseTo(1500, 0.001);
  });

  it("întoarce o listă goală pentru o stare fără luni", () => {
    expect(evolutie({ version: 2, lunaCurenta: "", luni: {} })).toHaveLength(0);
  });
});

describe("reperPentru și depasiriRepere", () => {
  it("recunoaște categoria indiferent de diacritice", () => {
    expect(reperPentru("Locuință").eticheta).toBe("Locuință");
    expect(reperPentru("locuinta").eticheta).toBe("Locuință");
    expect(reperPentru("Chirie lunară").eticheta).toBe("Locuință");
  });

  it("nu inventează un reper pentru denumiri necunoscute", () => {
    expect(reperPentru("Cadouri")).toBe(null);
    expect(reperPentru("")).toBe(null);
  });

  it("semnalează doar categoriile care depășesc reperul", () => {
    const luna = lunaTest(
      [{ suma: 5000 }],
      [
        { nume: "Chirie", grupa: "nevoi", planificat: 2500 },   // 50%, reper 35%
        { nume: "Alimente", grupa: "nevoi", planificat: 500 },  // 10%, reper 15%
      ]
    );
    const d = depasiriRepere(luna);
    expect(d).toHaveLength(1);
    expect(d[0].nume).toBe("Chirie");
    expect(d[0].cota).toBeCloseTo(0.5, 0.0001);
    expect(d[0].exces).toBeCloseTo(750, 0.001);
  });

  it("compară reperul cu echivalentul lunar", () => {
    const luna = lunaTest(
      [{ suma: 5000 }],
      // 12.000 lei pe an de chirie = 1.000/lună = 20%, sub reperul de 35%.
      [{ nume: "Chirie", grupa: "nevoi", planificat: 12000, frecventaLuni: 12 }]
    );
    expect(depasiriRepere(luna)).toHaveLength(0);
  });

  it("întoarce o listă goală fără venit", () => {
    const luna = lunaTest([], [{ nume: "Chirie", planificat: 2000 }]);
    expect(depasiriRepere(luna)).toHaveLength(0);
  });

  it("ordonează descrescător după excesul în lei", () => {
    const luna = lunaTest(
      [{ suma: 5000 }],
      [
        { nume: "Abonamente", grupa: "dorinte", planificat: 400 }, // 8%, reper 5% → exces 150
        { nume: "Chirie", grupa: "nevoi", planificat: 2500 },      // 50%, reper 35% → exces 750
      ]
    );
    const d = depasiriRepere(luna);
    expect(d[0].nume).toBe("Chirie");
    expect(d[1].nume).toBe("Abonamente");
  });
});

describe("șabloane și luni noi", () => {
  it("produce o lună validă din fiecare șablon", () => {
    Object.keys(SABLOANE).forEach((cheie) => {
      const luna = lunaDinSablon(cheie);
      expect(totalVenit(luna)).toBeGreaterThan(0);
      expect(luna.cheltuieli.length).toBeGreaterThan(0);
    });
  });

  it("nu depășește numărul de sloturi de culoare disponibile", () => {
    Object.keys(SABLOANE).forEach((cheie) => {
      const cuSlot = lunaDinSablon(cheie).cheltuieli.filter((c) => c.slot !== null);
      expect(cuSlot.length).toBeLessThan(SLOTURI_CULOARE + 1);
    });
  });

  it("nu atribuie același slot de două ori", () => {
    Object.keys(SABLOANE).forEach((cheie) => {
      const sloturi = lunaDinSablon(cheie).cheltuieli
        .map((c) => c.slot)
        .filter((s) => s !== null);
      expect(new Set(sloturi).size).toBe(sloturi.length);
    });
  });

  it("cade pe luna goală pentru un șablon inexistent", () => {
    const luna = lunaDinSablon("nu-exista");
    expect(totalVenit(luna)).toBe(0);
  });

  it("pornește o lună nouă fără sume, dar cu categorii", () => {
    const luna = lunaNoua();
    expect(totalVenit(luna)).toBe(0);
    expect(totalPlanificat(luna)).toBe(0);
    expect(luna.cheltuieli.length).toBeGreaterThan(0);
  });

  it("include o categorie de economii în structura implicită", () => {
    // Economiile trebuie să fie o linie de buget, nu ce rămâne la final.
    expect(lunaNoua().cheltuieli.some((c) => c.grupa === "economii")).toBeTrue();
  });
});
