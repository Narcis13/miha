## Obiectiv
- Adaug o acțiune "Print" (icon de imprimantă) pentru fiecare pachet de plăți, care deschide într-un tab nou un raport pregătit pentru tipărire în format A4, cu structură identică cu exemplul atașat.

## Modificări UI existente
- În `client/src/components/PaymentPackages.tsx:210-233` adaug un buton cu `Printer` din `lucide-react` lângă celelalte acțiuni. La click: deschide ruta `/print/<id>` într-un tab nou (`window.open`).
- Nu modific serverul; folosesc API-urile existente: `GET /settings`, `GET /payment-packages/:id`, `GET /payments?packageId=...` (server/src/index.ts:188, 256, 321).

## Rută dedicată pentru tipărire
- Creez `client/src/routes/print.$packageId.tsx` (TanStack Router file-based) care:
  - Citește `packageId` din URL.
  - Încărcă setările instituției, detaliile pachetului și toate plățile din acel pachet (fără limită practică, ex. 5000).
  - Randează o pagină HTML minimalistă cu stil specific pentru print.
  - Oferă un buton "Printează" (opțional auto-`window.print()` la montare).

## Layout A4 (replică a exemplului)
- Header:
  - Stânga: "ROMÂNIA", pe două rânduri: "MINISTERUL APĂRĂRII NAȚIONALE" și unitatea (din setări, ex. UM 02497 PITEȘTI).
  - Dreapta: etichete fixe: "Neclasificat" și "Exemplar unic".
  - Subheader: "STAT DE PLATĂ" + subtitlu: "pentru decontarea medicamentelor pensionarilor militari cf. M 110/2009".
  - Câmpuri "Nr. ...... din ......" vizual, redactabile în UI de print (fără a salva).
- Tabel coloane cu lățimi fixe, ca în imagine:
  - `Nr. Dosar` • `Nume și prenume` • `CNP` • `IBAN` • `Suma` • `Semnatura/OP`.
  - Rânduri cu înălțime stabilă, font lizibil (12pt). Borduri subtile.
- Footer:
  - Stânga: data în format lung (ex. "miercuri, 29 octombrie 2025").
  - Dreapta: "Pagina X din Y".
- CSS:
  - `@page { size: A4; margin: 12mm }` + `@media print` pentru ascunderea controalelor.
  - `page-break-inside: avoid` pe rânduri; antet și footer repetate pe fiecare pagină.

## Paginare și numerotare
- Împart rândurile în pagini de câte N elemente (ex. 32–36, ajustat după margini) pentru a garanta plasarea footerului și a numerotării.
- Calculez `totalPages` și randez secțiuni individuale pentru fiecare pagină cu numerotarea "Pagina i din total".

## Maparea datelor
- `Nr. Dosar`: `payments.nr_dosar`.
- `Nume și prenume`: `payments.beneficiary_name`.
- `CNP`: `payments.beneficiary_cnp`.
- `IBAN`: `payments.beneficiary_account`.
- `Suma`: `payments.suma` convertită în lei cu 2 zecimale (`suma/100`).
- `Semnatura/OP`: rămâne gol (box) ca în exemplu.
- Headere folosesc `settings` (denumire, CUI, cont, bancă, adresă) unde e relevant.

## Experiență de utilizare
- În lista de pachete: noul buton "Print" vizibil în coloana "Acțiuni"; la click, deschide tab-ul de raport.
- În raport: buton "Printează" + posibilitate de export PDF din dialogul browserului.

## Testare
- Verific că tabelul se împarte corect pe mai multe pagini cu 100+ rânduri.
- Verific antet, footer, numerotare și formatul A4 la tipărire PDF în Chrome.
- Verific caractere românești și diacritice.

## Presupuneri
- Unitatea (ex. "UM 02497 PITEȘTI") se preia din `settings.address` sau completez un câmp dedicat ulterior dacă doriți.
- Nu este necesar un PDF generat server-side; folosim layout HTML + print din browser. Dacă se dorește PDF pe server, pot adăuga ulterior un endpoint cu Puppeteer.

Confirmați planul pentru a trece la implementare?