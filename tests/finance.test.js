/**
 * Teste pentru funcțiile din js/finance.js.
 *
 * Sunt funcții pure — primesc numere, întorc numere — deci se pot testa
 * fără DOM și fără date salvate. Testele acoperă atât cazul obișnuit, cât
 * și marginile unde formulele se rup: dobândă zero, sumă zero, rată care
 * nu acoperă dobânda, buget insuficient.
 */

describe("monthlyPayment — rata unui credit cu anuitate", () => {
  it("calculează corect o rată standard", () => {
    // 300.000 lei, 6,5% pe an, 25 de ani → aproximativ 2.025,62 lei pe lună.
    expect(monthlyPayment(300000, 6.5, 300)).toBeCloseTo(2025.62, 0.01);
  });

  it("la dobândă zero împarte suma la numărul de luni", () => {
    expect(monthlyPayment(120000, 0, 240)).toBeCloseTo(500, 0.001);
  });

  it("întoarce zero pentru sumă sau durată nevalidă", () => {
    expect(monthlyPayment(0, 5, 120)).toBe(0);
    expect(monthlyPayment(100000, 5, 0)).toBe(0);
    expect(monthlyPayment(-5000, 5, 120)).toBe(0);
  });

  it("o perioadă mai lungă înseamnă rată mai mică", () => {
    expect(monthlyPayment(200000, 6, 360)).toBeLessThan(monthlyPayment(200000, 6, 180));
  });
});

describe("buildAmortizationSchedule — graficul de rambursare", () => {
  it("stinge creditul exact în numărul de luni contractat", () => {
    const r = buildAmortizationSchedule(100000, 6, 120, 0);
    expect(r.monthsUsed).toBe(120);
    // Ultimul sold trebuie să fie practic zero.
    expect(r.schedule[r.schedule.length - 1].balance).toBeCloseTo(0, 0.5);
  });

  it("suma principalului plătit egalează suma împrumutată", () => {
    const r = buildAmortizationSchedule(150000, 7, 180, 0);
    const totalPrincipal = r.schedule.reduce((s, row) => s + row.principal, 0);
    expect(totalPrincipal).toBeCloseTo(150000, 1);
  });

  it("dobânda scade și principalul crește de la o rată la alta", () => {
    const r = buildAmortizationSchedule(200000, 6.5, 300, 0);
    const prima = r.schedule[0];
    const ultima = r.schedule[r.schedule.length - 1];
    // La început rata e aproape numai dobândă; la final, aproape numai principal.
    expect(prima.interest).toBeGreaterThan(prima.principal);
    expect(ultima.principal).toBeGreaterThan(ultima.interest);
  });

  it("plata anticipată scurtează durata și reduce dobânda", () => {
    const fara = buildAmortizationSchedule(300000, 6.5, 300, 0);
    const cu = buildAmortizationSchedule(300000, 6.5, 300, 500);
    expect(cu.monthsUsed).toBeLessThan(fara.monthsUsed);
    expect(cu.totalInterest).toBeLessThan(fara.totalInterest);
  });

  it("totalul plătit este suma împrumutată plus dobânda", () => {
    const r = buildAmortizationSchedule(80000, 8, 60, 0);
    expect(r.totalPaid).toBeCloseTo(80000 + r.totalInterest, 0.01);
  });

  it("la dobândă zero nu se plătește nicio dobândă", () => {
    const r = buildAmortizationSchedule(60000, 0, 120, 0);
    expect(r.totalInterest).toBeCloseTo(0, 0.01);
    expect(r.totalPaid).toBeCloseTo(60000, 0.5);
  });

  it("se termină și la dobânzi extreme, fără buclă infinită", () => {
    // Limita superioară din funcție previne blocarea dacă rata nu acoperă
    // dobânda. Verificăm că se oprește, indiferent de parametri.
    [
      [100000, 30, 6],
      [1000000, 50, 600],
      [500, 99, 360],
    ].forEach(([suma, dobanda, luni]) => {
      const r = buildAmortizationSchedule(suma, dobanda, luni, 0);
      expect(r.monthsUsed).toBeLessThan(luni + 1201);
    });
  });
});

describe("simulateDebtPayoff — avalanșă vs. bulgăre", () => {
  const datorii = [
    { name: "Card", balance: 8000, rate: 24, minPayment: 250 },
    { name: "Nevoi personale", balance: 20000, rate: 12, minPayment: 500 },
    { name: "Magazin", balance: 3000, rate: 0, minPayment: 300 },
  ];

  it("refuză un buget sub suma plăților minime", () => {
    const r = simulateDebtPayoff(datorii, 500, "avalanche");
    expect(r.feasible).toBeFalse();
    expect(r.months).toBe(Infinity);
  });

  it("achită toate datoriile cu un buget suficient", () => {
    const r = simulateDebtPayoff(datorii, 1500, "avalanche");
    expect(r.feasible).toBeTrue();
    expect(r.payoffOrder).toHaveLength(3);
    expect(r.months).toBeLessThan(1200);
  });

  it("avalanșa costă cel mult cât bulgărele", () => {
    const av = simulateDebtPayoff(datorii, 1500, "avalanche");
    const sn = simulateDebtPayoff(datorii, 1500, "snowball");
    // Avalanșa este optimul matematic, deci nu poate fi mai scumpă.
    expect(av.totalInterest).toBeLessThan(sn.totalInterest + 0.01);
  });

  it("avalanșa atacă întâi datoria cu dobânda cea mai mare", () => {
    const r = simulateDebtPayoff(datorii, 2000, "avalanche");
    // Cardul are 24% — cea mai scumpă dintre cele trei.
    expect(r.payoffOrder[0].name).toBe("Card");
  });

  it("bulgărele atacă întâi soldul cel mai mic", () => {
    const r = simulateDebtPayoff(datorii, 2000, "snowball");
    expect(r.payoffOrder[0].name).toBe("Magazin");
  });

  it("un buget mai mare scurtează durata", () => {
    const mic = simulateDebtPayoff(datorii, 1200, "avalanche");
    const mare = simulateDebtPayoff(datorii, 3000, "avalanche");
    expect(mare.months).toBeLessThan(mic.months);
  });
});

describe("salariuNet — brut către net", () => {
  const opts = { minWage: 4325, dependents: 0 };

  it("reține CAS 25% și CASS 10% din brut", () => {
    const r = salariuNet(10000, opts);
    expect(r.cas).toBeCloseTo(2500, 0.01);
    expect(r.cass).toBeCloseTo(1000, 0.01);
  });

  it("aplică impozitul de 10% pe baza impozabilă, nu pe brut", () => {
    const r = salariuNet(10000, opts);
    // Peste pragul deducerii: baza = 10000 − 2500 − 1000 = 6500.
    expect(r.bazaImpozabila).toBeCloseTo(6500, 0.01);
    expect(r.impozit).toBeCloseTo(650, 0.01);
    expect(r.net).toBeCloseTo(5850, 0.01);
  });

  it("adaugă CAM de 2,25% la costul angajatorului", () => {
    const r = salariuNet(10000, opts);
    expect(r.cam).toBeCloseTo(225, 0.01);
    expect(r.costTotalAngajator).toBeCloseTo(10225, 0.01);
  });

  it("acordă deducere personală integrală la salariul minim", () => {
    const r = salariuNet(4325, opts);
    // 20% din salariul minim pentru cineva fără persoane în întreținere.
    expect(r.deducere).toBeCloseTo(865, 0.01);
  });

  it("nu mai acordă deducere peste salariul minim plus 2.000", () => {
    expect(salariuNet(6326, opts).deducere).toBe(0);
    expect(salariuNet(20000, opts).deducere).toBe(0);
  });

  it("mărește deducerea cu numărul de persoane în întreținere", () => {
    const fara = salariuNet(4325, { minWage: 4325, dependents: 0 });
    const cuDoi = salariuNet(4325, { minWage: 4325, dependents: 2 });
    expect(cuDoi.deducere).toBeGreaterThan(fara.deducere);
    expect(cuDoi.net).toBeGreaterThan(fara.net);
  });

  it("întoarce zerouri pentru un brut nevalid", () => {
    const r = salariuNet(0, opts);
    expect(r.net).toBe(0);
    expect(r.costTotalAngajator).toBe(0);
  });

  it("netul rămâne sub brut, iar brutul sub costul angajatorului", () => {
    const r = salariuNet(15000, opts);
    expect(r.net).toBeLessThan(r.gross);
    expect(r.gross).toBeLessThan(r.costTotalAngajator);
  });

  it("Pilonul III reduce baza impozabilă", () => {
    const fara = salariuNet(10000, opts);
    const cu = salariuNet(10000, { ...opts, pillar3Amount: 200 });
    expect(cu.bazaImpozabila).toBeLessThan(fara.bazaImpozabila);
    expect(cu.impozit).toBeLessThan(fara.impozit);
  });
});

describe("salariuNet — facilitatea de 200 lei și regula normei parțiale sub minim", () => {
  // Valorile de mai jos reproduc exact exemplele verificate manual la
  // salariul minim de 4.325 lei: 200 lei neimpozabili la brut exact egal
  // cu minimul, și CAS/CASS suplimentar plătit de angajator sub pragul de
  // minim − 200.
  const opts = { minWage: 4325, dependents: 0 };

  it("la brut exact egal cu minimul, aplică 200 lei neimpozabili", () => {
    const r = salariuNet(4325, opts);
    expect(r.bonusNeimpozabil).toBe(200);
    expect(r.cas).toBeCloseTo(4125 * 0.25, 0.01);
    expect(r.cass).toBeCloseTo(4125 * 0.1, 0.01);
    expect(r.net).toBeCloseTo(2699.625, 0.01);
  });

  it("între minim − 200 și minim, calculul e normal, fără facilități", () => {
    const r = salariuNet(4200, opts);
    expect(r.bonusNeimpozabil).toBe(0);
    expect(r.casSuplimentarAngajator).toBe(0);
    expect(r.cas).toBeCloseTo(1050, 0.01);
    expect(r.cass).toBeCloseTo(420, 0.01);
    expect(r.impozit).toBeCloseTo(186.5, 0.01);
    expect(r.net).toBeCloseTo(2543.5, 0.01);
  });

  it("sub minim − 200, angajatorul plătește separat CAS/CASS suplimentar", () => {
    const r = salariuNet(4000, opts);
    expect(r.cas).toBeCloseTo(1000, 0.01);
    expect(r.cass).toBeCloseTo(400, 0.01);
    expect(r.impozit).toBeCloseTo(173.5, 0.01);
    expect(r.casSuplimentarAngajator).toBeCloseTo(31.25, 0.01);
    expect(r.cassSuplimentarAngajator).toBeCloseTo(12.5, 0.01);
    expect(r.cam).toBeCloseTo(90, 0.01);
  });

  it("regula normei parțiale nu schimbă ce primește angajatul, doar costul angajatorului", () => {
    const r = salariuNet(4000, opts);
    expect(r.net).toBeCloseTo(4000 - r.cas - r.cass - r.impozit, 0.01);
    expect(r.costTotalAngajator).toBeCloseTo(
      4000 + r.cam + r.casSuplimentarAngajator + r.cassSuplimentarAngajator,
      0.01
    );
  });
});

describe("deducerePersonala — trepte de 50 de lei peste salariul minim", () => {
  it("este integrală până la salariul minim", () => {
    expect(deducerePersonala(4325, 4325, 0)).toBeCloseTo(865, 0.01);
    expect(deducerePersonala(4000, 4325, 0)).toBeCloseTo(865, 0.01);
  });

  it("scade cu 1/40 din procentul de bază la fiecare treaptă de 50 de lei", () => {
    // Exemplul din audit: 4.326–4.375 → 19,5% din 4.325.
    expect(deducerePersonala(4326, 4325, 0)).toBeCloseTo(4325 * 0.195, 0.01);
    expect(deducerePersonala(4375, 4325, 0)).toBeCloseTo(4325 * 0.195, 0.01);
    expect(deducerePersonala(4376, 4325, 0)).toBeCloseTo(4325 * 0.19, 0.01);
  });

  it("ajunge la zero exact la salariul minim plus 2.000", () => {
    expect(deducerePersonala(6325, 4325, 0)).toBeCloseTo(0, 0.01);
    expect(deducerePersonala(6326, 4325, 0)).toBe(0);
  });
});

describe("brutDinNet — netul către brut", () => {
  it("găsește brutul care produce netul cerut", () => {
    const opts = { minWage: 4325, dependents: 0 };
    const brut = brutDinNet(5850, opts);
    expect(salariuNet(brut, opts).net).toBeCloseTo(5850, 1);
  });

  it("este inversa lui salariuNet pentru mai multe valori", () => {
    const opts = { minWage: 4325, dependents: 1 };
    [3000, 5000, 8000, 12000].forEach((netDorit) => {
      const brut = brutDinNet(netDorit, opts);
      expect(salariuNet(brut, opts).net).toBeCloseTo(netDorit, 1);
    });
  });

  it("întoarce zero pentru un net nevalid", () => {
    expect(brutDinNet(0)).toBe(0);
    expect(brutDinNet(-100)).toBe(0);
  });
});

describe("projectPension — pilonii II și III", () => {
  const base = {
    grossSalary: 8000,
    currentAge: 30,
    retirementAge: 65,
    wageGrowthPct: 5,
    pillar2ReturnPct: 7,
    pillar3Monthly: 200,
    pillar3ReturnPct: 7,
  };

  it("produce un punct de date pentru fiecare an până la pensionare", () => {
    const r = projectPension(base);
    expect(r.years).toHaveLength(36); // 35 de ani + anul zero
    expect(r.pillar2).toHaveLength(36);
  });

  it("acumulează mai mult decât s-a contribuit", () => {
    const r = projectPension(base);
    expect(r.final2).toBeGreaterThan(r.contributed2);
    expect(r.final3).toBeGreaterThan(r.contributed3);
  });

  it("totalul este suma celor doi piloni", () => {
    const r = projectPension(base);
    expect(r.total).toBeCloseTo(r.final2 + r.final3, 0.01);
  });

  it("pornește de la soldul existent, dacă există", () => {
    const fara = projectPension(base);
    const cu = projectPension({ ...base, existingPillar2: 50000 });
    expect(cu.final2).toBeGreaterThan(fara.final2);
  });

  it("nu acumulează nimic dacă vârsta de pensionare a trecut", () => {
    const r = projectPension({ ...base, currentAge: 65, retirementAge: 65 });
    expect(r.final2).toBe(0);
    expect(r.contributed2).toBe(0);
  });

  it("un randament mai mare produce un sold final mai mare", () => {
    const mic = projectPension({ ...base, pillar2ReturnPct: 3 });
    const mare = projectPension({ ...base, pillar2ReturnPct: 9 });
    expect(mare.final2).toBeGreaterThan(mic.final2);
  });
});

describe("estimatePillar1 — pensia publică prin rata de înlocuire", () => {
  const base = {
    grossSalary: 8000,
    currentAge: 30,
    retirementAge: 65,
    wageGrowthPct: 5,
    replacementRatePct: 55,
  };

  it("crește salariul brut cu rata anuală, până la pensionare", () => {
    const r = estimatePillar1(base);
    expect(r.yearsToRetire).toBe(35);
    expect(r.grossAtRetirement).toBeCloseTo(8000 * Math.pow(1.05, 35), 1);
  });

  it("aplică rata de înlocuire netului, nu brutului", () => {
    const r = estimatePillar1(base);
    expect(r.monthlyPension).toBeCloseTo(r.netAtRetirement * 0.55, 0.01);
    expect(r.netAtRetirement).toBeLessThan(r.grossAtRetirement);
  });

  it("o rată de înlocuire mai mare înseamnă o pensie mai mare", () => {
    const mica = estimatePillar1({ ...base, replacementRatePct: 40 });
    const mare = estimatePillar1({ ...base, replacementRatePct: 70 });
    expect(mare.monthlyPension).toBeGreaterThan(mica.monthlyPension);
  });

  it("fără ani rămași, folosește salariul de azi", () => {
    const r = estimatePillar1({ ...base, currentAge: 65 });
    expect(r.yearsToRetire).toBe(0);
    expect(r.grossAtRetirement).toBeCloseTo(8000, 0.01);
  });

  it("reperul public dă o rată de înlocuire între 40% și 70%", () => {
    // Dacă valorile de referință ajung în afara acestui interval, cel mai
    // probabil au fost actualizate greșit — nicio țară din UE nu iese din el.
    expect(RATA_INLOCUIRE_PILON1).toBeGreaterThan(40);
    expect(RATA_INLOCUIRE_PILON1).toBeLessThan(70);
  });
});

describe("adjustForInflation și purchasingPower", () => {
  it("crește o sumă cu inflația compusă", () => {
    // 1.000 lei la 5% pe an, timp de 10 ani → 1.000 × 1,05^10.
    expect(adjustForInflation(1000, 10, 5)).toBeCloseTo(1628.89, 0.01);
  });

  it("nu schimbă suma la inflație zero", () => {
    expect(adjustForInflation(1000, 20, 0)).toBeCloseTo(1000, 0.001);
  });

  it("erodează puterea de cumpărare într-un cont fără dobândă", () => {
    const r = purchasingPower(10000, 10, 5, 0);
    expect(r.nominal[10]).toBeCloseTo(10000, 0.01);
    expect(r.real[10]).toBeLessThan(10000);
    expect(r.lostPct).toBeBetween(0.35, 0.42);
  });

  it("păstrează puterea de cumpărare când dobânda egalează inflația", () => {
    const r = purchasingPower(10000, 15, 5, 5);
    expect(r.real[15]).toBeCloseTo(10000, 0.5);
    expect(r.lostPct).toBeCloseTo(0, 0.001);
  });

  it("produce un punct pentru fiecare an, inclusiv anul zero", () => {
    const r = purchasingPower(5000, 7, 4, 2);
    expect(r.nominal).toHaveLength(8);
    expect(r.real).toHaveLength(8);
    expect(r.nominal[0]).toBeCloseTo(5000, 0.001);
  });
});

describe("simulateMonteCarlo — randament variabil", () => {
  const base = {
    initial: 0,
    monthly: 500,
    years: 20,
    meanReturnPct: 7,
    volatilityPct: 16,
    runs: 300,
  };

  it("întoarce un punct pentru fiecare an, inclusiv anul zero", () => {
    const r = simulateMonteCarlo(base);
    expect(r.p50).toHaveLength(21);
    expect(r.finals).toHaveLength(300);
  });

  it("respectă ordinea percentilelor în fiecare an", () => {
    const r = simulateMonteCarlo(base);
    r.p50.forEach((median, i) => {
      expect(r.p10[i]).toBeLessThan(median + 0.01);
      expect(median).toBeLessThan(r.p90[i] + 0.01);
    });
  });

  it("produce același rezultat pentru aceeași sămânță", () => {
    const a = simulateMonteCarlo({ ...base, seed: 42 });
    const b = simulateMonteCarlo({ ...base, seed: 42 });
    // Reproductibilitatea este esențială: altfel graficul s-ar schimba
    // la fiecare redesenare, iar cifrele ar părea arbitrare.
    expect(a.p50[20]).toBeCloseTo(b.p50[20], 0.0001);
  });

  it("produce rezultate diferite pentru semințe diferite", () => {
    const a = simulateMonteCarlo({ ...base, seed: 1 });
    const b = simulateMonteCarlo({ ...base, seed: 999 });
    expect(Math.abs(a.p50[20] - b.p50[20])).toBeGreaterThan(0);
  });

  it("fără volatilitate se comportă ca o proiecție deterministă", () => {
    const r = simulateMonteCarlo({ ...base, volatilityPct: 0, runs: 20 });
    // Toate simulările trebuie să coincidă.
    expect(r.p10[20]).toBeCloseTo(r.p90[20], 0.01);
    expect(r.probLoss).toBe(0);
  });

  it("volatilitatea mai mare lărgește plaja de rezultate", () => {
    const calm = simulateMonteCarlo({ ...base, volatilityPct: 5, seed: 7 });
    const agitat = simulateMonteCarlo({ ...base, volatilityPct: 30, seed: 7 });
    const plajaCalm = calm.p90[20] - calm.p10[20];
    const plajaAgitat = agitat.p90[20] - agitat.p10[20];
    expect(plajaAgitat).toBeGreaterThan(plajaCalm);
  });

  it("probabilitatea de pierdere scade cu orizontul", () => {
    const scurt = simulateMonteCarlo({ ...base, years: 3, seed: 11 });
    const lung = simulateMonteCarlo({ ...base, years: 30, seed: 11 });
    expect(lung.probLoss).toBeLessThan(scurt.probLoss + 0.001);
  });

  it("soldul nu devine niciodată negativ", () => {
    const r = simulateMonteCarlo({ ...base, meanReturnPct: -5, volatilityPct: 40, seed: 3 });
    expect(r.worst).toBeGreaterThan(-0.01);
  });
});

describe("seededRandom — generatorul cu sămânță", () => {
  it("produce valori în intervalul [0, 1)", () => {
    const rand = seededRandom(123);
    for (let i = 0; i < 500; i++) {
      const v = rand();
      expect(v >= 0 && v < 1).toBeTrue();
    }
  });

  it("aceeași sămânță produce aceeași secvență", () => {
    const a = seededRandom(77);
    const b = seededRandom(77);
    for (let i = 0; i < 20; i++) {
      expect(a()).toBe(b());
    }
  });

  it("are o medie apropiată de 0,5 pe multe extrageri", () => {
    const rand = seededRandom(2024);
    let sum = 0;
    const n = 10000;
    for (let i = 0; i < n; i++) sum += rand();
    expect(sum / n).toBeCloseTo(0.5, 0.02);
  });
});

describe("venitPFA — impozitarea unei persoane fizice autorizate", () => {
  const sm = 4325;

  it("nu datorează CAS sub pragul de 12 salarii minime", () => {
    // Venit net de 40.000 lei, sub 12 × 4.325 = 51.900.
    const r = venitPFA({ venituri: 40000, cheltuieli: 0, salariuMinim: sm });
    expect(r.cas).toBe(0);
    expect(r.bazaCas).toBe(0);
  });

  it("calculează CAS pe plafon, nu pe venitul real", () => {
    // Peste 12 salarii minime, dar sub 24: baza rămâne 12 × salariul minim.
    const r = venitPFA({ venituri: 60000, cheltuieli: 0, salariuMinim: sm });
    expect(r.bazaCas).toBeCloseTo(12 * sm, 0.01);
    expect(r.cas).toBeCloseTo(12 * sm * 0.25, 0.01);

    // Peste 24 de salarii minime, baza urcă o singură dată și se oprește.
    const mare = venitPFA({ venituri: 500000, cheltuieli: 0, salariuMinim: sm });
    expect(mare.bazaCas).toBeCloseTo(24 * sm, 0.01);
  });

  it("aplică baza minimă de CASS unui venit mic", () => {
    const r = venitPFA({ venituri: 10000, cheltuieli: 0, salariuMinim: sm });
    expect(r.bazaCass).toBeCloseTo(6 * sm, 0.01);
  });

  it("renunță la baza minimă de CASS dacă persoana are și salariu", () => {
    const r = venitPFA({ venituri: 10000, cheltuieli: 0, salariuMinim: sm, areSalariu: true });
    expect(r.bazaCass).toBeCloseTo(10000, 0.01);
    expect(r.cass).toBeCloseTo(1000, 0.01);
  });

  it("plafonează CASS la limita superioară", () => {
    const r = venitPFA({ venituri: 2000000, cheltuieli: 0, salariuMinim: sm });
    expect(r.bazaCass).toBeCloseTo(72 * sm, 0.01);
  });

  it("aplică impozitul după contribuții, nu pe venitul net brut", () => {
    const r = venitPFA({ venituri: 100000, cheltuieli: 20000, salariuMinim: sm });
    expect(r.venitNet).toBeCloseTo(80000, 0.01);
    expect(r.bazaImpozabila).toBeCloseTo(80000 - r.cas - r.cass, 0.01);
    expect(r.impozit).toBeCloseTo(r.bazaImpozabila * 0.1, 0.01);
  });

  it("închide bilanțul: încasările se regăsesc integral în componente", () => {
    const r = venitPFA({ venituri: 150000, cheltuieli: 12000, salariuMinim: sm });
    expect(r.cheltuieli + r.cas + r.cass + r.impozit + r.netAnual).toBeCloseTo(r.venituri, 0.5);
  });

  it("trecerea peste pragul de CAS scade netul, deși venitul a crescut", () => {
    const sub = venitPFA({ venituri: 12 * sm - 100, salariuMinim: sm });
    const peste = venitPFA({ venituri: 12 * sm + 100, salariuMinim: sm });
    expect(peste.netAnual).toBeLessThan(sub.netAnual);
  });
});

describe("venitSRLMicro — SRL cu impozit pe veniturile microîntreprinderii", () => {
  const sm = 4325;

  it("aplică impozitul micro pe venituri, nu pe profit", () => {
    const r = venitSRLMicro({ venituri: 200000, cheltuieli: 150000, salariuMinim: sm });
    expect(r.impozitMicro).toBeCloseTo(2000, 0.01);
  });

  it("impozitează dividendele după impozitul firmei", () => {
    const r = venitSRLMicro({ venituri: 100000, cheltuieli: 0, salariuMinim: sm });
    expect(r.profitDistribuibil).toBeCloseTo(99000, 0.01);
    expect(r.impozitDividende).toBeCloseTo(99000 * 0.16, 0.01);
  });

  it("calculează CASS pe treaptă, nu pe dividendul real", () => {
    // Dividend peste 6 salarii minime, dar sub 12: baza rămâne treapta de 6.
    const r = venitSRLMicro({ venituri: 30000, cheltuieli: 0, salariuMinim: sm });
    expect(r.bazaCass).toBeCloseTo(6 * sm, 0.01);
  });

  it("nu datorează CASS sub prima treaptă", () => {
    const r = venitSRLMicro({ venituri: 20000, cheltuieli: 0, salariuMinim: sm });
    expect(r.cass).toBe(0);
  });

  it("închide bilanțul: veniturile se regăsesc integral în componente", () => {
    // Fără cost de angajat, netAnual este doar dividendul — nu apare
    // niciun salariu propriu adunat înapoi.
    const r = venitSRLMicro({ venituri: 300000, cheltuieli: 60000, salariuMinim: sm });
    const suma = r.cheltuieli + r.impozitMicro + r.impozitDividende + r.cass + r.netAnual;
    expect(suma).toBeCloseTo(r.venituri, 0.5);
  });

  it("nu produce dividende negative când cheltuielile depășesc veniturile", () => {
    const r = venitSRLMicro({ venituri: 30000, cheltuieli: 80000, salariuMinim: sm });
    expect(r.profitDistribuibil).toBe(0);
    expect(r.netAnual).toBe(0);
  });

  it("adaugă salariul propriu la net doar dacă firma are un cost de angajat", () => {
    const fara = venitSRLMicro({ venituri: 100000, cheltuieli: 0, salariuMinim: sm });
    const cu = venitSRLMicro({ venituri: 100000, cheltuieli: 0, costAngajat: 53065, salariuMinim: sm });
    expect(fara.salariuPropriuNet).toBe(0);
    expect(cu.salariuPropriuNet).toBeGreaterThan(0);
    // Costul de angajat reduce dividendul distribuibil, dar salariul propriu
    // net se întoarce la asociat — de aceea diferența de net e mai mică
    // decât costul brut al angajatului.
    expect(cu.netAnual).toBeLessThan(fara.netAnual);
    expect(fara.netAnual - cu.netAnual).toBeLessThan(53065);
  });

  it("chiar și fără dividende, salariul propriu tot ajunge la asociat", () => {
    const r = venitSRLMicro({ venituri: 30000, cheltuieli: 80000, costAngajat: 53065, salariuMinim: sm });
    expect(r.netDividende).toBe(0);
    expect(r.netAnual).toBeCloseTo(r.salariuPropriuNet, 0.01);
  });
});

describe("venitSRLProfit — SRL fără angajat, impozit pe profit", () => {
  const sm = 4325;

  it("aplică impozitul de 16% pe profit, nu pe venituri", () => {
    // Exemplul din audit: 120.000 venituri, 0 cheltuieli.
    const r = venitSRLProfit({ venituri: 120000, cheltuieli: 0, salariuMinim: sm });
    expect(r.profitBrut).toBeCloseTo(120000, 0.01);
    expect(r.impozitProfit).toBeCloseTo(19200, 0.01);
    expect(r.profitDistribuibil).toBeCloseTo(100800, 0.01);
  });

  it("impozitează dividendele și CASS la fel ca varianta cu angajat", () => {
    const r = venitSRLProfit({ venituri: 120000, cheltuieli: 0, salariuMinim: sm });
    expect(r.impozitDividende).toBeCloseTo(100800 * 0.16, 0.01);
    expect(r.bazaCass).toBeCloseTo(24 * sm, 0.01);
    expect(r.cass).toBeCloseTo(24 * sm * 0.1, 0.01);
  });

  it("nu adaugă niciun salariu propriu — nu are angajat", () => {
    const r = venitSRLProfit({ venituri: 120000, cheltuieli: 0, salariuMinim: sm });
    expect(r.salariuPropriuNet).toBe(undefined);
  });

  it("închide bilanțul: veniturile se regăsesc integral în componente", () => {
    const r = venitSRLProfit({ venituri: 300000, cheltuieli: 60000, salariuMinim: sm });
    const suma = r.cheltuieli + r.impozitProfit + r.impozitDividende + r.cass + r.netAnual;
    expect(suma).toBeCloseTo(r.venituri, 0.5);
  });
});

describe("venitCIM — contract de muncă, pornind de la costul angajatorului", () => {
  it("recuperează brutul din costul total", () => {
    const r = venitCIM({ costAnual: 122700, salariuMinim: 4325 });
    // Costul lunar de 10.225 lei corespunde unui brut de 10.000.
    expect(r.brutLunar).toBeCloseTo(10000, 1);
  });

  it("închide bilanțul: costul se regăsește integral în componente", () => {
    const r = venitCIM({ costAnual: 150000, salariuMinim: 4325 });
    expect(r.contributii + r.impozite + r.netAnual).toBeCloseTo(r.costAnual, 0.5);
  });

  it("persoanele în întreținere cresc netul, prin deducere", () => {
    const fara = venitCIM({ costAnual: 55000, salariuMinim: 4325, dependents: 0 });
    const cu = venitCIM({ costAnual: 55000, salariuMinim: 4325, dependents: 2 });
    expect(cu.netAnual).toBeGreaterThan(fara.netAnual);
  });
});

describe("compareFormeVenit — cele patru forme pe aceeași bază", () => {
  it("pornește toate formele de la aceeași sumă", () => {
    const r = compareFormeVenit({ sumaAnuala: 120000 });
    expect(r.cim.costAnual).toBe(120000);
    expect(r.pfa.venituri).toBe(120000);
    expect(r.srlAngajat.venituri).toBe(120000);
    expect(r.srlFaraAngajat.venituri).toBe(120000);
  });

  it("desemnează drept câștigătoare forma cu netul cel mai mare", () => {
    const r = compareFormeVenit({ sumaAnuala: 250000, cheltuieliPfa: 5000, cheltuieliSrl: 60000 });
    const nete = {
      cim: r.cim.netAnual,
      pfa: r.pfa.netAnual,
      srlAngajat: r.srlAngajat.netAnual,
      srlFaraAngajat: r.srlFaraAngajat.netAnual,
    };
    const maxim = Math.max(...Object.values(nete));
    expect(nete[r.castigator]).toBe(maxim);
  });

  it("costul salariatului obligatoriu, minus salariul propriu recuperat, reduce netul SRL-ului cu angajat", () => {
    const fara = compareFormeVenit({ sumaAnuala: 120000, cheltuieliSrl: 6000, costAngajatSrl: 0 });
    const cu = compareFormeVenit({ sumaAnuala: 120000, cheltuieliSrl: 6000, costAngajatSrl: 51900 });
    expect(cu.srlAngajat.netAnual).toBeLessThan(fara.srlAngajat.netAnual);
  });

  it("SRL fără angajat nu depinde de cost-angajat", () => {
    const r = compareFormeVenit({ sumaAnuala: 120000, cheltuieliSrl: 6000, costAngajatSrl: 51900 });
    expect(r.srlFaraAngajat.cheltuieli).toBeCloseTo(6000, 0.01);
  });

  it("întoarce zerouri pentru o sumă nulă, fără să arunce", () => {
    const r = compareFormeVenit({ sumaAnuala: 0 });
    expect(r.cim.netAnual).toBe(0);
    expect(r.pfa.netAnual).toBe(0);
    expect(r.srlAngajat.netAnual).toBe(0);
    expect(r.srlFaraAngajat.netAnual).toBe(0);
  });
});

describe("capSalary — plafonul de creștere salarială", () => {
  it("oprește salariul la plafon", () => {
    expect(capSalary(50000, 8000, 30000)).toBe(30000);
  });

  it("lasă neatins un salariu sub plafon", () => {
    expect(capSalary(12000, 8000, 30000)).toBe(12000);
  });

  it("nu taie un salariu de pornire deja peste plafon", () => {
    // Cine câștigă 40.000 azi nu trebuie să vadă o proiecție care îi scade venitul.
    expect(capSalary(60000, 40000, 30000)).toBe(40000);
  });

  it("fără plafon, salariul rămâne cum a venit", () => {
    expect(capSalary(999999, 8000)).toBe(999999);
    expect(capSalary(999999, 8000, 0)).toBe(999999);
  });
});

describe("projectPension — plafonul aplicat proiecției", () => {
  const base = {
    grossSalary: 8000, currentAge: 30, retirementAge: 65,
    wageGrowthPct: 5, pillar2ReturnPct: 7,
    pillar3Monthly: 0, pillar3ReturnPct: 7,
  };

  it("plafonul reduce contribuțiile acumulate", () => {
    const fara = projectPension(base);
    const cu = projectPension({ ...base, salaryCap: 30000 });
    expect(cu.contributed2).toBeLessThan(fara.contributed2);
    expect(cu.final2).toBeLessThan(fara.final2);
  });

  it("un plafon peste orice salariu proiectat nu schimbă nimic", () => {
    const fara = projectPension(base);
    const cu = projectPension({ ...base, salaryCap: 10000000 });
    expect(cu.final2).toBeCloseTo(fara.final2, 0.01);
  });

  it("plafonul limitează și salariul de la pensionare în Pilonul I", () => {
    const p1 = estimatePillar1({
      grossSalary: 8000, currentAge: 30, retirementAge: 65,
      wageGrowthPct: 5, replacementRatePct: 55, salaryCap: 30000,
    });
    expect(p1.grossAtRetirement).toBe(30000);
  });
});
