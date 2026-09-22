/**
 * Conținutul lecțiilor, separat de mecanica de afișare.
 *
 * Fiecare lecție are un text scurt (2-4 minute de citit) și 3-4 întrebări.
 * Întrebările nu verifică memorarea unor valori, ci înțelegerea mecanismului:
 * la fiecare variantă greșită există o explicație care spune *de ce* este
 * greșită, pentru că acolo se produce învățarea, nu la bifa verde.
 *
 * `correct` este indexul răspunsului corect din `options`.
 */
const LECTII = [
  {
    id: "l1-buget",
    titlu: "De ce cheltuielile mici sunt cele care te surprind",
    durata: 3,
    grup: "Bazele",
    rezumat: "Estimările din memorie greșesc sistematic într-o singură direcție.",
    continut: [
      { tip: "p", text: "Dacă întrebi pe cineva cât cheltuiește pe lună, răspunsul este aproape întotdeauna mai mic decât realitatea. Nu din rea-credință: creierul reține cheltuielile mari și rare (chiria, o vacanță) și le uită pe cele mici și dese." },
      { tip: "p", text: "Problema este că exact cele mici și dese se adună. O cafea de 15 lei în fiecare zi lucrătoare înseamnă 300 lei pe lună și 3.600 lei pe an, mai mult decât majoritatea oamenilor ar accepta ca „buget pentru cafea” dacă ar fi întrebați direct." },
      { tip: "h", text: "Efectul abonamentelor" },
      { tip: "p", text: "Abonamentele sunt cazul extrem: le plătești fără nicio decizie conștientă. Un cost de 40 lei pe lună nu declanșează nicio alarmă, dar cinci astfel de abonamente sunt 2.400 lei pe an. Testul util: dacă ar trebui să reînnoiești manual fiecare abonament în fiecare lună, pe care le-ai reînnoi?" },
      { tip: "insight", text: "Un buget scris nu îți spune să nu cheltuiești. Îți arată compromisul: fiecare leu are o singură destinație." },
    ],
    intrebari: [
      {
        text: "De ce oamenii își subestimează sistematic cheltuielile lunare?",
        options: [
          "Pentru că băncile ascund tranzacțiile mici",
          "Pentru că memoria reține cheltuielile mari și rare, dar le uită pe cele mici și repetate",
          "Pentru că inflația schimbă prețurile de la o lună la alta",
          "Pentru că majoritatea oamenilor nu își verifică niciodată contul",
        ],
        correct: 1,
        explicatii: [
          "Tranzacțiile apar toate în extras: problema nu este disponibilitatea datelor, ci felul în care le reținem.",
          "Exact. Cheltuielile mici par nesemnificative individual, iar creierul nu le însumează automat.",
          "Inflația schimbă prețurile, dar nu explică de ce greșim estimarea în aceeași direcție.",
          "Mulți își verifică contul; verificarea soldului nu produce însă o sumă pe categorii.",
        ],
      },
      {
        text: "O cheltuială de 15 lei în fiecare zi lucrătoare înseamnă, pe an, aproximativ:",
        options: ["450 lei", "1.800 lei", "3.600 lei", "5.400 lei"],
        correct: 2,
        explicatii: [
          "Aceasta ar fi valoarea pe o singură lună, nu pe un an.",
          "Ar corespunde unei cheltuieli la două zile, nu zilnice.",
          "Corect: aproximativ 20 de zile lucrătoare pe lună × 15 lei × 12 luni.",
          "Ar corespunde unei cheltuieli zilnice inclusiv în weekend, la o sumă mai mare.",
        ],
      },
      {
        text: "Care este avantajul principal al împărțirii cheltuielilor în „nevoi” și „dorințe”?",
        options: [
          "Reduce automat suma cheltuită",
          "Arată unde există flexibilitate atunci când trebuie să reduci ceva",
          "Este cerută de bănci la acordarea creditelor",
          "Elimină nevoia de a urmări cheltuielile mici",
        ],
        correct: 1,
        explicatii: [
          "Clasificarea nu schimbă singură nicio sumă, doar informația despre ea.",
          "Corect. Când apare nevoia de a tăia, știi dinainte de unde se poate fără să afectezi lucrurile esențiale.",
          "Băncile se uită la venit și la rate existente, nu la această clasificare.",
          "Dimpotrivă: cheltuielile mici sunt cel mai des „dorințe” și tocmai ele trebuie urmărite.",
        ],
      },
    ],
  },

  {
    id: "l2-dobanda-compusa",
    titlu: "Dobânda compusă: de ce timpul bate suma",
    durata: 4,
    grup: "Bazele",
    rezumat: "Anii contează mai mult decât cât pui deoparte în fiecare lună.",
    continut: [
      { tip: "p", text: "Dobânda simplă se aplică doar sumei depuse. Dobânda compusă se aplică și dobânzii acumulate anterior: câștigul de anul trecut începe, la rândul lui, să producă câștig." },
      { tip: "p", text: "Efectul este aproape invizibil la început. În primii ani, aproape tot ce vezi în cont sunt banii tăi. Abia după 15-20 de ani proporția se inversează și cea mai mare parte din sold vine din randament, nu din depuneri." },
      { tip: "h", text: "Comparația care contează" },
      { tip: "p", text: "Cine începe la 25 de ani cu 300 lei pe lună depune, până la 65 de ani, 144.000 lei. Cine începe la 40 de ani cu 600 lei pe lună depune 180.000 lei, mai mult. Dar la un randament de 7% pe an, primul ajunge la aproximativ 720.000 lei, iar al doilea la aproximativ 500.000. Cu 36.000 lei mai puțin depuși, primul termină cu peste 200.000 lei în plus." },
      { tip: "insight", text: "Cei 15 ani în plus valorează mai mult decât dublarea contribuției lunare. Aceasta este singura variabilă din finanțe care nu costă nimic, dar care nu poate fi recuperată." },
      { tip: "p", text: "Atenție însă: randamentul constant din exemple nu există în realitate. Bursa poate scădea cu 30-50% într-un an de criză. Media pe termen lung ascunde o traiectorie mult mai zbuciumată decât arată graficul." },
    ],
    intrebari: [
      {
        text: "Ce înseamnă că dobânda este „compusă”?",
        options: [
          "Că este formată din mai multe tipuri de comisioane",
          "Că se aplică atât sumei depuse, cât și randamentului acumulat anterior",
          "Că se calculează lunar în loc de anual",
          "Că variază de la an la an în funcție de piață",
        ],
        correct: 1,
        explicatii: [
          "Comisioanele sunt un cost separat, care de fapt reduce randamentul.",
          "Corect. Această reinvestire automată produce curba accelerată.",
          "Frecvența capitalizării contează, dar nu este definiția.",
          "Variabilitatea este o proprietate a pieței, nu a compunerii.",
        ],
      },
      {
        text: "De ce cineva care începe la 25 de ani cu 300 lei/lună poate depăși pe cineva care începe la 40 cu 600 lei/lună?",
        options: [
          "Pentru că depune în total mai mulți bani",
          "Pentru că randamentele sunt mai mari pentru tineri",
          "Pentru că banii depuși devreme au mai mult timp să producă randament peste randament",
          "Pentru că inflația scade valoarea depunerilor târzii",
        ],
        correct: 2,
        explicatii: [
          "Depune de fapt mai puțin: 144.000 față de 180.000 lei.",
          "Randamentul pieței nu depinde de vârsta investitorului.",
          "Corect. Fiecare leu depus la 25 de ani se compune timp de 40 de ani, nu 25.",
          "Inflația afectează ambele scenarii, deci nu explică diferența.",
        ],
      },
      {
        text: "În primii ani ai unui plan de investiții, cea mai mare parte a soldului provine din:",
        options: [
          "Randamentul acumulat",
          "Banii depuși de tine",
          "Dobânda compusă asupra dobânzii",
          "Reducerile de comisioane",
        ],
        correct: 1,
        explicatii: [
          "Randamentul devine dominant abia după mulți ani.",
          "Corect. De aceea graficul pare aproape liniar la început, și de aceea mulți renunță prea devreme.",
          "Acest efect are nevoie de timp ca să conteze.",
          "Comisioanele reduc soldul, nu îl construiesc.",
        ],
      },
      {
        text: "Care este principala limită a unei simulări cu randament constant?",
        options: [
          "Supraestimează întotdeauna rezultatul final",
          "Ascunde faptul că traiectoria reală are ani puternic negativi",
          "Nu poate fi calculată pe mai mult de 10 ani",
          "Ignoră contribuțiile lunare",
        ],
        correct: 1,
        explicatii: [
          "Nu neapărat: poate și subestima, în funcție de rata aleasă.",
          "Corect. Curba netedă îți dă o senzație falsă de siguranță în privința drumului, nu doar a destinației.",
          "Orizontul de calcul nu este o limitare tehnică.",
          "Contribuțiile pot fi incluse fără probleme într-o astfel de simulare.",
        ],
      },
    ],
  },

  {
    id: "l3-inflatie",
    titlu: "Inflația: costul banilor care stau",
    durata: 3,
    grup: "Bazele",
    rezumat: "Un cont fără dobândă nu păstrează valoarea, ci o pierde tăcut.",
    continut: [
      { tip: "p", text: "Inflația nu îți ia bani din cont. Suma rămâne identică: se schimbă doar cât poți cumpăra cu ea. De aceea pierderea este greu de observat: nu apare nicio tranzacție." },
      { tip: "p", text: "La o inflație de 5% pe an, 10.000 lei ținuți zece ani într-un cont fără dobândă mai valorează, în putere de cumpărare, aproximativ 6.100 lei. Ai pierdut aproape 40% fără să vezi vreodată un minus în extras." },
      { tip: "h", text: "Randamentul real" },
      { tip: "p", text: "Ce contează nu este randamentul nominal, ci cel real: randamentul minus inflația. Un depozit cu 6% dobândă într-un an cu 8% inflație are un randament real negativ: pierzi putere de cumpărare, chiar dacă soldul crește." },
      { tip: "insight", text: "„Banii sunt în siguranță în cont” este adevărat doar nominal. În putere de cumpărare, un cont fără dobândă este o pierdere garantată, doar lentă." },
      { tip: "p", text: "Asta nu înseamnă că nu trebuie să ai bani lichizi. Fondul de urgență își merită costul: plătești acea erodare ca preț pentru disponibilitate imediată. Problema apare când sume mult peste fondul de urgență rămân acolo din inerție." },
    ],
    intrebari: [
      {
        text: "De ce pierderea cauzată de inflație este greu de observat?",
        options: [
          "Pentru că băncile o ascund în comisioane",
          "Pentru că suma din cont rămâne aceeași, se schimbă doar ce poți cumpăra cu ea",
          "Pentru că se aplică doar sumelor mari",
          "Pentru că apare o singură dată pe an",
        ],
        correct: 1,
        explicatii: [
          "Nu este ascunsă de nimeni; pur și simplu nu generează o tranzacție vizibilă.",
          "Corect. Nu există niciun minus în extras care să atragă atenția.",
          "Afectează proporțional orice sumă.",
          "Este un proces continuu, nu un eveniment.",
        ],
      },
      {
        text: "Un depozit cu 6% dobândă anuală, într-un an cu inflație de 8%, produce:",
        options: [
          "Un câștig real de 6%",
          "Un câștig real de 2%",
          "O pierdere reală de aproximativ 2%",
          "Nici câștig, nici pierdere",
        ],
        correct: 2,
        explicatii: [
          "6% este randamentul nominal, înainte de inflație.",
          "Semnul este inversat: inflația depășește dobânda.",
          "Corect. Soldul crește, dar puterea de cumpărare scade.",
          "Ar fi adevărat doar dacă dobânda ar egala exact inflația.",
        ],
      },
      {
        text: "De ce merită totuși să ții fondul de urgență într-un cont lichid, deși pierde în fața inflației?",
        options: [
          "Pentru că băncile garantează un randament real pozitiv",
          "Pentru că erodarea este prețul plătit pentru disponibilitate imediată",
          "Pentru că inflația nu se aplică sumelor sub 20.000 lei",
          "Pentru că fondul de urgență se folosește rar",
        ],
        correct: 1,
        explicatii: [
          "Nicio bancă nu garantează un randament peste inflație.",
          "Corect. Plătești un cost mic și cunoscut ca să eviți vânzarea investițiilor în cel mai prost moment.",
          "Inflația nu are praguri de acest fel.",
          "Tocmai pentru că nu știi când se folosește trebuie să fie disponibil imediat.",
        ],
      },
    ],
  },

  {
    id: "l4-fond-urgenta",
    titlu: "Fondul de urgență: de ce vine înaintea investițiilor",
    durata: 3,
    grup: "Siguranță",
    rezumat: "Fără rezervă, o cheltuială neprevăzută te obligă să vinzi în cel mai prost moment.",
    continut: [
      { tip: "p", text: "Un fond de urgență este o sumă ținută lichid, care acoperă 3-6 luni de cheltuieli. Nu este o investiție și nu trebuie să producă randament: rolul lui este să existe atunci când ai nevoie de el." },
      { tip: "h", text: "De ce înaintea investițiilor" },
      { tip: "p", text: "Fără rezervă, orice cheltuială neprevăzută te pune în fața a două opțiuni proaste: împrumut scump sau vânzarea investițiilor. Iar problema cu a doua este momentul: crizele economice produc simultan concedieri și scăderi ale bursei. Exact atunci ai nevoie de bani și exact atunci investițiile valorează cel mai puțin." },
      { tip: "insight", text: "Fondul de urgență nu te face bogat. Te împiedică să iei decizii proaste la presiune, ceea ce, pe termen lung, valorează mai mult." },
      { tip: "h", text: "Cât de mare" },
      { tip: "p", text: "Trei luni este minimul rezonabil pentru cineva cu venit stabil și un al doilea venit în gospodărie. Șase luni devin necesare dacă ești singurul venit, dacă ai venituri variabile sau dacă lucrezi într-un domeniu unde recalificarea durează." },
      { tip: "p", text: "Se calculează la nivelul cheltuielilor, nu al venitului. Dacă ai nevoie de 4.000 lei pe lună ca să trăiești, fondul de urgență este 12.000-24.000 lei, indiferent cât câștigi." },
    ],
    intrebari: [
      {
        text: "Fondul de urgență se calculează raportat la:",
        options: ["Venitul lunar", "Cheltuielile lunare", "Valoarea investițiilor", "Suma datoriilor"],
        correct: 1,
        explicatii: [
          "Venitul poate fi mult mai mare decât ce ai nevoie efectiv ca să trăiești.",
          "Corect. Contează cât te costă o lună de viață, nu cât câștigi într-una.",
          "Investițiile sunt exact ce vrei să nu atingi.",
          "Datoriile influențează cheltuielile lunare, dar nu sunt baza de calcul.",
        ],
      },
      {
        text: "Care este riscul principal al investirii fără fond de urgență?",
        options: [
          "Randamentul investițiilor scade",
          "Comisioanele devin mai mari",
          "Ești obligat să vinzi exact când piața este jos și tu ai nevoie de bani",
          "Nu poți deschide un cont de investiții",
        ],
        correct: 2,
        explicatii: [
          "Randamentul pieței nu depinde de situația ta personală.",
          "Comisioanele sunt fixe, indiferent de rezerva ta.",
          "Corect. Crizele produc simultan pierderea veniturilor și scăderea piețelor.",
          "Nu există o astfel de condiție legală.",
        ],
      },
      {
        text: "Pentru cine sunt mai potrivite 6 luni decât 3 luni de rezervă?",
        options: [
          "Pentru cine are venit stabil și un al doilea venit în gospodărie",
          "Pentru cine are venituri variabile sau este singurul venit din gospodărie",
          "Pentru cine investește deja lunar",
          "Pentru cine are un credit ipotecar cu dobândă fixă",
        ],
        correct: 1,
        explicatii: [
          "Această situație este exact cea în care 3 luni pot fi suficiente.",
          "Corect. Cu cât venitul este mai puțin previzibil, cu atât rezerva trebuie să fie mai mare.",
          "Faptul că investești nu schimbă durata necesară a rezervei.",
          "Dobânda fixă reduce incertitudinea, nu o crește.",
        ],
      },
    ],
  },

  {
    id: "l5-datorii",
    titlu: "Datorii: care se plătesc primele",
    durata: 4,
    grup: "Siguranță",
    rezumat: "Achitarea unei datorii cu 24% dobândă este un randament garantat de 24%.",
    continut: [
      { tip: "p", text: "O datorie cu dobândă mare este opusul unei investiții: în loc să produci randament, îl plătești. Iar acest randament negativ este garantat, spre deosebire de cel pozitiv al bursei, care este doar probabil." },
      { tip: "insight", text: "Achitarea unui credit rapid cu 24% dobândă îți aduce, cu certitudine, echivalentul unui randament de 24% pe an. Nicio investiție legală nu oferă asta fără risc." },
      { tip: "h", text: "Avalanșă sau bulgăre de zăpadă" },
      { tip: "p", text: "Când ai mai multe datorii, plătești minimul la toate și trimiți restul bugetului către una singură. Metoda avalanșă alege datoria cu dobânda cea mai mare: este matematic optimă, costă cel mai puțin. Metoda bulgărelui alege soldul cel mai mic: costă puțin mai mult, dar elimină rapid o datorie întreagă." },
      { tip: "p", text: "Diferența de cost între cele două este de obicei mică. Diferența de rată de abandon nu este: studiile de comportament arată că oamenii duc planul la capăt mai des când văd victorii rapide. Cea mai bună strategie este cea pe care chiar o urmezi." },
      { tip: "h", text: "De ce plata anticipată timpurie contează mai mult" },
      { tip: "p", text: "La un credit cu rate egale, dobânda se calculează de fiecare dată la soldul rămas. La început soldul e mare, deci aproape toată rata este dobândă. Un leu care reduce principalul acum elimină toată dobânda pe care acel leu ar fi generat-o în toți anii următori. Același leu plătit în ultimul an nu economisește aproape nimic." },
    ],
    intrebari: [
      {
        text: "De ce achitarea unei datorii cu dobândă mare este comparabilă cu o investiție foarte bună?",
        options: [
          "Pentru că îți îmbunătățește scorul la Biroul de Credit",
          "Pentru că elimină un cost garantat, echivalent cu un randament fără risc",
          "Pentru că băncile oferă reduceri la plata anticipată",
          "Pentru că datoriile nu sunt impozitate",
        ],
        correct: 1,
        explicatii: [
          "Este un efect secundar real, dar nu explică echivalența cu un randament.",
          "Corect. 24% dobândă evitată este un câștig cert de 24%, spre deosebire de randamentul incert al pieței.",
          "Unele bănci percep chiar comisioane de rambursare anticipată.",
          "Impozitarea nu are legătură cu acest raționament.",
        ],
      },
      {
        text: "Metoda „avalanșă” presupune să trimiți surplusul către:",
        options: [
          "Datoria cu soldul cel mai mic",
          "Datoria cu dobânda cea mai mare",
          "Datoria cea mai veche",
          "Toate datoriile în mod egal",
        ],
        correct: 1,
        explicatii: [
          "Aceasta este metoda bulgărelui de zăpadă.",
          "Corect. Atacând dobânda cea mai mare, costul total plătit este minim.",
          "Vechimea nu influențează costul.",
          "Împărțirea egală întârzie eliminarea oricărei datorii.",
        ],
      },
      {
        text: "De ce este metoda „bulgăre de zăpadă” uneori preferabilă, deși costă mai mult?",
        options: [
          "Pentru că băncile o recomandă",
          "Pentru că reduce dobânda totală plătită",
          "Pentru că victoriile rapide cresc șansa ca planul să fie dus la capăt",
          "Pentru că este mai simplu de calculat",
        ],
        correct: 2,
        explicatii: [
          "Băncile nu au o preferință în acest sens.",
          "Dimpotrivă: avalanșa reduce dobânda totală.",
          "Corect. Costul suplimentar este de obicei mic, iar rata de abandon contează mai mult decât optimul teoretic.",
          "Ambele metode presupun același tip de calcul.",
        ],
      },
      {
        text: "De ce o plată anticipată făcută devreme economisește mai mult decât aceeași sumă plătită târziu?",
        options: [
          "Pentru că dobânda scade în timp prin lege",
          "Pentru că elimină dobânda pe care suma respectivă ar fi generat-o în toți anii rămași",
          "Pentru că băncile aplică penalizări mai mari la final",
          "Pentru că rata lunară se recalculează automat",
        ],
        correct: 1,
        explicatii: [
          "Rata dobânzii nu scade automat cu trecerea timpului.",
          "Corect. Cu cât mai mulți ani rămân, cu atât mai multă dobândă este eliminată.",
          "Penalizările, unde există, sunt de obicei mai mari la început.",
          "Recalcularea ratei este o consecință, nu cauza economiei.",
        ],
      },
    ],
  },

  {
    id: "l6-risc",
    titlu: "Risc și diversificare",
    durata: 4,
    grup: "Investiții",
    rezumat: "Randamentul mai mare nu este un cadou, ci plata pentru un risc asumat.",
    continut: [
      { tip: "p", text: "Orice instrument care promite un randament mai mare îl promite pentru că cere asumarea unui risc mai mare. Nu există randament ridicat fără risc, iar când cineva îl promite, riscul este de obicei chiar pierderea totală a sumei." },
      { tip: "h", text: "Ce înseamnă diversificarea" },
      { tip: "p", text: "O acțiune individuală poate ajunge la zero: firma dă faliment și banii dispar. Un fond care urmărește un indice cu 500 de companii nu poate ajunge la zero decât dacă toate cele 500 dau faliment simultan, ceea ce ar însemna probleme mult mai mari decât portofoliul tău." },
      { tip: "p", text: "Diversificarea nu elimină riscul de piață: într-o criză scade tot. Elimină însă riscul specific, cel legat de o singură firmă, un singur sector sau o singură țară. Este singura reducere de risc care nu costă randament așteptat." },
      { tip: "insight", text: "Diversificarea este descrisă uneori ca „singurul prânz gratuit din finanțe”: reduce riscul fără să reducă randamentul așteptat." },
      { tip: "h", text: "Riscul care contează cu adevărat" },
      { tip: "p", text: "Volatilitatea, adică cât de mult oscilează prețul, nu este riscul real pentru cineva care investește pe 20 de ani. Riscul real este să vinzi în scădere. O scădere de 40% devine pierdere definitivă doar dacă vinzi; altfel este o perioadă neplăcută dintr-un grafic lung." },
      { tip: "p", text: "De aceea orizontul de timp și fondul de urgență sunt instrumente de gestionare a riscului mai importante decât alegerea instrumentului: amândouă reduc probabilitatea de a fi forțat să vinzi la momentul nepotrivit." },
    ],
    intrebari: [
      {
        text: "Ce reduce diversificarea?",
        options: [
          "Riscul de piață, adică scăderea generală a bursei",
          "Riscul specific, cel legat de o singură firmă sau sector",
          "Inflația",
          "Comisioanele de administrare",
        ],
        correct: 1,
        explicatii: [
          "Într-o criză generală scade tot, indiferent cât de diversificat ești.",
          "Corect. Falimentul unei firme dintr-un indice de 500 are un efect neglijabil.",
          "Inflația afectează toate activele; diversificarea nu o anulează.",
          "Comisioanele depind de instrumentul ales, nu de numărul de poziții.",
        ],
      },
      {
        text: "Pentru cineva care investește pe 20 de ani, riscul real este:",
        options: [
          "Ca prețul să oscileze",
          "Să fie nevoit să vândă în timpul unei scăderi",
          "Ca dobânda compusă să nu funcționeze",
          "Ca randamentul mediu să fie sub inflație în fiecare an",
        ],
        correct: 1,
        explicatii: [
          "Oscilația este normală și, pe termen lung, fără consecințe dacă nu vinzi.",
          "Corect. O scădere devine pierdere definitivă doar în momentul vânzării.",
          "Compunerea funcționează mecanic, atâta timp cât randamentul este pozitiv.",
          "Este posibil, dar puțin probabil pe orizonturi lungi și diversificate.",
        ],
      },
      {
        text: "Un randament promis mult peste media pieței indică, de regulă:",
        options: [
          "O oportunitate rară care trebuie prinsă repede",
          "Un risc pe măsură, inclusiv riscul de pierdere totală",
          "Un avantaj fiscal",
          "Un cost de administrare mai mic",
        ],
        correct: 1,
        explicatii: [
          "Presiunea de a decide repede este, în sine, un semnal de alarmă.",
          "Corect. Randamentul suplimentar este întotdeauna plata pentru un risc suplimentar.",
          "Avantajele fiscale sunt reglementate și publice, nu ascunse în randament.",
          "Costurile nu explică diferențe mari de randament promis.",
        ],
      },
    ],
  },

  {
    id: "l7-costuri",
    titlu: "Comisioanele: costul care nu se vede",
    durata: 3,
    grup: "Investiții",
    rezumat: "Un procent în plus pe an poate consuma un sfert din câștigul pe 30 de ani.",
    continut: [
      { tip: "p", text: "Un comision anual de administrare de 2% pare mic. Nu este. Se aplică întregii sume în fiecare an, inclusiv randamentului acumulat, exact ca dobânda compusă, dar în defavoarea ta." },
      { tip: "p", text: "La 500 lei pe lună, 30 de ani și un randament brut de 7%, diferența dintre un comision de 0,2% și unul de 2% este de ordinul a 150.000 lei. Nu ai văzut niciodată acea sumă ca tranzacție: a fost reținută în fiecare an, câte puțin." },
      { tip: "h", text: "Ce comisioane există" },
      { tip: "p", text: "Comisionul de administrare (anual, procent din sumă) este cel mai important pe termen lung. Comisionul de tranzacționare se plătește la fiecare cumpărare și penalizează operațiunile dese. Comisionul de subscriere sau de retragere, unde există, se aplică o singură dată, dar poate fi semnificativ." },
      { tip: "insight", text: "Randamentul viitor nu poate fi controlat. Comisionul poate, și este singura variabilă din investiții care este cunoscută dinainte cu certitudine." },
    ],
    intrebari: [
      {
        text: "De ce un comision anual de 2% are un efect atât de mare pe termen lung?",
        options: [
          "Pentru că se aplică o singură dată, dar la o sumă mare",
          "Pentru că se aplică în fiecare an întregii sume, inclusiv randamentului acumulat",
          "Pentru că este dedus din contribuțiile lunare",
          "Pentru că se cumulează cu impozitul pe câștig",
        ],
        correct: 1,
        explicatii: [
          "Este un cost anual recurent, nu unul unic.",
          "Corect. Funcționează exact ca dobânda compusă, dar împotriva ta.",
          "Se aplică soldului total, nu doar contribuțiilor.",
          "Impozitul este separat și nu explică efectul comisionului.",
        ],
      },
      {
        text: "Care comision contează cel mai mult pentru cineva care investește lunar timp de 30 de ani?",
        options: [
          "Cel de tranzacționare",
          "Cel de administrare anual",
          "Cel de retragere",
          "Cel de conversie valutară",
        ],
        correct: 1,
        explicatii: [
          "Contează dacă tranzacționezi des, dar nu se compune anual.",
          "Corect. Fiind procentual și recurent, efectul lui se compune pe toată durata.",
          "Se plătește o singură dată, la final.",
          "Este relevant, dar de obicei mult mai mic ca efect cumulat.",
        ],
      },
      {
        text: "De ce comisionul este considerat singura variabilă cu adevărat controlabilă?",
        options: [
          "Pentru că poate fi negociat cu orice broker",
          "Pentru că este cunoscut dinainte, spre deosebire de randamentul viitor",
          "Pentru că este deductibil fiscal",
          "Pentru că scade automat cu suma investită",
        ],
        correct: 1,
        explicatii: [
          "Rareori este negociabil pentru investitorii individuali.",
          "Corect. Randamentul este o estimare; comisionul este o valoare din contract.",
          "Nu este deductibil pentru investitorul individual.",
          "Unele fonduri au praguri, dar nu este o regulă.",
        ],
      },
    ],
  },

  {
    id: "l8-salariu",
    titlu: "Ce se întâmplă între brut și net",
    durata: 3,
    grup: "Practic",
    rezumat: "Din costul total al angajatorului, aproximativ 40% nu ajunge la tine.",
    continut: [
      { tip: "p", text: "Salariul brut nu este nici costul total al angajatorului, nici suma primită de salariat. Angajatorul plătește brutul plus contribuția asiguratorie pentru muncă (2,25%), iar din brut sunt reținute contribuțiile salariatului și impozitul." },
      { tip: "h", text: "Cele trei rețineri" },
      { tip: "p", text: "CAS (contribuția la pensie) este 25% din brut și merge în sistemul public, din care o parte (4,75%) se virează către Pilonul II, contul tău personal de pensie. CASS (sănătate) este 10% din brut. Impozitul pe venit este 10%, dar se aplică pe ce rămâne după CAS și CASS, nu pe brut." },
      { tip: "p", text: "Ordinea contează: impozitul de 10% aplicat după reținerea a 35% înseamnă efectiv 6,5% din brut, nu 10%." },
      { tip: "insight", text: "Când negociezi salariul, valoarea care contează pentru angajator este costul total, iar cea care contează pentru tine este netul. Între ele este o diferență de aproximativ 40%." },
      { tip: "p", text: "Deducerea personală reduce baza impozabilă pentru salariile mici și dispare complet peste salariul minim plus 2.000 lei. Este singurul element din formulă care depinde de situația ta personală: numărul de persoane în întreținere." },
    ],
    intrebari: [
      {
        text: "Impozitul pe venit de 10% se aplică:",
        options: [
          "Salariului brut",
          "Salariului brut, după scăderea CAS, CASS și a deducerii personale",
          "Salariului net",
          "Costului total al angajatorului",
        ],
        correct: 1,
        explicatii: [
          "Ar rezulta un impozit sensibil mai mare decât cel real.",
          "Corect. De aceea impozitul efectiv raportat la brut este aproximativ 6,5%.",
          "Netul este rezultatul, nu baza de calcul.",
          "Costul angajatorului include o contribuție care nu te privește ca bază impozabilă.",
        ],
      },
      {
        text: "Ce parte din CAS ajunge în contul tău personal de pensie (Pilon II)?",
        options: ["Toată", "Aproximativ 4,75% din brut", "Nimic", "10% din brut"],
        correct: 1,
        explicatii: [
          "Cea mai mare parte merge către sistemul public, Pilonul I.",
          "Corect. Restul finanțează pensiile aflate în plată acum.",
          "Pilonul II este obligatoriu pentru cei intrați în câmpul muncii după 2007.",
          "10% este cota pentru sănătate, nu pentru Pilonul II.",
        ],
      },
      {
        text: "Deducerea personală:",
        options: [
          "Se aplică tuturor salariilor, indiferent de nivel",
          "Scade odată cu creșterea salariului și dispare peste un anumit prag",
          "Se aplică doar celor cu copii",
          "Reduce direct contribuția la pensie",
        ],
        correct: 1,
        explicatii: [
          "Peste salariul minim plus 2.000 lei nu se mai acordă deloc.",
          "Corect. Este un mecanism de sprijin pentru veniturile mici.",
          "Numărul de persoane în întreținere o mărește, dar nu este o condiție.",
          "Reduce baza impozabilă, nu contribuțiile.",
        ],
      },
    ],
  },

  {
    id: "l9-locuinta",
    titlu: "Chirie sau cumpărare: întrebarea pusă corect",
    durata: 4,
    grup: "Practic",
    rezumat: "„Chiria înseamnă bani aruncați” ignoră costurile nerecuperabile ale cumpărării.",
    continut: [
      { tip: "p", text: "Comparația corectă nu este între chirie și rată. Este între averea netă a două persoane cu același capital de start și aceeași disponibilitate lunară, după un număr de ani." },
      { tip: "h", text: "Costurile nerecuperabile ale cumpărării" },
      { tip: "p", text: "Chiria este integral un cost nerecuperabil. Dar și cumpărarea are astfel de costuri: dobânda plătită băncii (care în primii ani este cea mai mare parte din rată), întreținerea și reparațiile (aproximativ 1% din valoare pe an), impozitul pe proprietate, asigurarea și costurile de tranzacție la cumpărare și la vânzare." },
      { tip: "p", text: "Pe un credit de 25 de ani cu 6,5% dobândă, dobânda totală depășește de multe ori jumătate din prețul locuinței. Aceia sunt bani care nu se recuperează la revânzare, exact ca chiria." },
      { tip: "insight", text: "Partea din rată care construiește avere este doar principalul. Dobânda este chiria plătită băncii pentru bani, în loc de chiria plătită proprietarului pentru spațiu." },
      { tip: "h", text: "Ce nu apare în calcul" },
      { tip: "p", text: "Varianta cu chirie funcționează matematic doar dacă diferența este chiar investită lună de lună. Rata la bancă este o economisire forțată; contul de investiții nu este. În practică, mulți chiriași cheltuiesc diferența, iar atunci comparația se schimbă complet." },
      { tip: "p", text: "Există și lucruri care nu intră în niciun tabel: flexibilitatea de a te muta pentru un job mai bun, siguranța că nu ești dat afară, faptul că rata nu crește la dobândă fixă. Acestea sunt reale, chiar dacă nu au o valoare." },
    ],
    intrebari: [
      {
        text: "Ce parte din rata unui credit ipotecar construiește efectiv avere?",
        options: ["Toată rata", "Doar principalul", "Doar dobânda", "Rata minus întreținerea"],
        correct: 1,
        explicatii: [
          "Dobânda este un cost, nu o acumulare.",
          "Corect. Doar partea care reduce datoria îți crește averea netă.",
          "Dobânda este exact partea care nu se recuperează.",
          "Întreținerea este un cost separat de rată.",
        ],
      },
      {
        text: "Pentru ca varianta „chirie + investiții” să funcționeze, este esențial ca:",
        options: [
          "Chiria să fie mai mică decât rata",
          "Diferența dintre cheltuieli să fie efectiv investită lună de lună",
          "Bursa să crească în fiecare an",
          "Prețurile locuințelor să scadă",
        ],
        correct: 1,
        explicatii: [
          "Poate fi și mai mare în unele perioade; contează ce se întâmplă cu diferența.",
          "Corect. Fără această disciplină, comparația devine pur teoretică.",
          "Randamentul mediu contează, nu creșterea în fiecare an.",
          "Comparația funcționează și în piețe imobiliare în creștere.",
        ],
      },
      {
        text: "Care dintre următoarele este un cost nerecuperabil al cumpărării?",
        options: [
          "Principalul plătit lunar",
          "Avansul depus la achiziție",
          "Dobânda plătită băncii",
          "Creșterea valorii imobilului",
        ],
        correct: 2,
        explicatii: [
          "Principalul se regăsește în valoarea proprietății.",
          "Avansul devine capital propriu în locuință.",
          "Corect. Este plata pentru folosirea banilor și nu se recuperează la revânzare.",
          "Aceasta este un câștig, nu un cost.",
        ],
      },
    ],
  },

  {
    id: "l10-comportament",
    titlu: "De ce planurile bune eșuează",
    durata: 3,
    grup: "Practic",
    rezumat: "Cel mai mare risc pentru un plan financiar este cel care îl execută.",
    continut: [
      { tip: "p", text: "Aproape toate greșelile costisitoare din finanțele personale nu sunt greșeli de calcul. Sunt decizii luate sub presiune emoțională: vânzarea în panică la o scădere, cumpărarea în euforie la un vârf, abandonarea unui plan după trei luni." },
      { tip: "h", text: "Automatizarea bate motivația" },
      { tip: "p", text: "Un transfer automat executat în ziua salariului economisește mai mult decât orice intenție. Motivul este simplu: elimină decizia. Ceea ce rămâne vizibil în contul curent tinde să fie cheltuit, indiferent de intenția inițială." },
      { tip: "insight", text: "Ordinea contează: economisește întâi, cheltuiește ce rămâne. Varianta inversă, cheltuiește și economisește ce rămâne, produce aproape întotdeauna zero." },
      { tip: "h", text: "Sincronizarea pieței" },
      { tip: "p", text: "Încercarea de a cumpăra la minim și de a vinde la maxim eșuează pentru majoritatea investitorilor, inclusiv profesioniști. Investirea unei sume constante la intervale regulate cumpără automat mai multe unități când prețurile sunt mici și mai puține când sunt mari, fără să necesite nicio predicție." },
      { tip: "p", text: "Un plan mediocru dus la capăt bate un plan optim abandonat după un an. Aceasta este singura afirmație din finanțe care este adevărată aproape fără excepții." },
    ],
    intrebari: [
      {
        text: "De ce funcționează mai bine un transfer automat decât intenția de a economisi?",
        options: [
          "Pentru că băncile oferă dobânzi mai mari la transferurile automate",
          "Pentru că elimină decizia lunară și banii nu mai rămân vizibili în contul curent",
          "Pentru că este obligatoriu prin contract",
          "Pentru că reduce comisioanele",
        ],
        correct: 1,
        explicatii: [
          "Dobânda nu depinde de modul în care ajung banii în cont.",
          "Corect. Fiecare decizie repetată este o ocazie de a nu o lua.",
          "Poate fi anulat oricând: puterea lui vine din inerție, nu din constrângere.",
          "Comisioanele nu au legătură cu automatizarea.",
        ],
      },
      {
        text: "Investirea unei sume constante la intervale regulate are avantajul că:",
        options: [
          "Garantează un randament pozitiv",
          "Cumpără automat mai multe unități când prețurile sunt mici, fără a necesita predicții",
          "Elimină complet riscul de piață",
          "Reduce impozitul pe câștig",
        ],
        correct: 1,
        explicatii: [
          "Niciun randament nu este garantat.",
          "Corect. Este singurul mecanism care exploatează scăderile fără să le prezici.",
          "Riscul de piață rămâne: se reduce doar riscul de moment prost ales.",
          "Impozitarea nu depinde de ritmul investiției.",
        ],
      },
      {
        text: "Care este cel mai frecvent motiv pentru care planurile financiare eșuează?",
        options: [
          "Erori de calcul în estimarea randamentului",
          "Alegerea instrumentului greșit",
          "Deciziile luate sub presiune emoțională și abandonul planului",
          "Schimbările legislative",
        ],
        correct: 2,
        explicatii: [
          "Erorile de calcul au un efect mult mai mic decât se crede.",
          "Instrumentele diversificate uzuale au performanțe apropiate.",
          "Corect. Vânzarea în panică și abandonul costă mai mult decât orice alegere tehnică.",
          "Sunt un factor real, dar rareori decisiv pentru un plan individual.",
        ],
      },
    ],
  },
];
