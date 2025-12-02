## Analiza CSV
- Structură comună: `NR;Nume;CNP;IBAN;Nr dosar;Suma` (delimiter `;`).
- `pachet1.csv`: 78 rânduri de date; `pachet2.csv`: 93 rânduri de date.
- `Suma`: valori zecimale cu virgulă (ex. `114,15`), se vor converti în bani (`lei*100`).
- `Nr dosar`: text liber (ex. `730-732`, `718,769`), se stochează ca `TEXT` fără transformări.
- Beneficiari apar în ambele fișiere (duplicați pe `CNP`); îi deduplicăm pe `CNP` și îi reutilizăm.

## Comportament Script
- Creează câte un „pachet de plăți” (`pachete_plati`) pentru fiecare fișier CSV furnizat.
- Pentru fiecare rând:
  - Normalizează: `name` trim, `cnp` doar cifre, `iban` fără spații și uppercase, `nr_dosar` ca text.
  - Validează `CNP` și `IBAN` (algoritm existent).
  - Beneficiar:
    - Caută după `cnp`; dacă nu există, inserează în `beneficiaries` (cu `observations` gol).
    - Dacă există, actualizează `name` și `account` dacă diferă.
  - Plată:
    - Inserează în `plati` cu `idPachetPlati`, `idBeneficiar`, `suma` în bani (`ex. 114,15 → 11415`), `nr_dosar`.
- Rulează într-o tranzacție per fișier (asigură consistența pachetului).
- Raportează la final per fișier: `{packageId, paymentsInserted, beneficiariesInserted, beneficiariesUpdated, skipped, invalid}`.

## Detalii Implementare
- Fișier nou: `server/src/import_payments_package.ts`.
- DB: `bun:sqlite` cu cale `new URL('../beneficiaries.sqlite', import.meta.url).pathname`.
- Creează tabele dacă lipsesc: `beneficiaries`, `pachete_plati`, `plati` (după schema deja folosită în server).
- Reutilizează funcțiile `isValidCNP` și `isValidIBAN` și parserul CSV (din `import_beneficiaries.ts`).
- Conversia sumei:
  - Înlocuiește `.` și spații din sume, apoi `,` → separator zecimal;
  - Parsează în lei și convertește în bani: `bani = Math.round(lei * 100)`; validează `> 0`.

## Interfață CLI
- Usage:
  - `bun run server/src/import_payments_package.ts <pachet1.csv> [<pachet2.csv> ...] [--data-plata=YYYY-MM-DD] [--observatii="text"]`
- Parametri:
  - `--data-plata`: opțional, pentru toate fișierele; dacă lipsește, folosește data curentă.
  - `--observatii`: opțional; dacă lipsește, se folosește numele fișierului.
- Output: JSON pe linie per fișier importat.

## Integrare și Convenții
- Adăugăm script în `server/package.json`: `"import:payments": "bun run src/import_payments_package.ts"`.
- Stil și librării: TypeScript, fără dependențe noi; se respectă logica și validările deja prezente.
- Sume stocate ca `INTEGER` în bani; agregările existente (`total_suma`) vor funcționa implicit.

## Edge Cases
- Rânduri incomplete: marcate `skipped` (lipsă `Nume`/`CNP`/`IBAN`/`Suma`).
- `CNP`/`IBAN` invalid: marcate `invalid`; nu se inserează beneficiar/plată.
- `Nr dosar` cu range/virgulă: păstrat ca `TEXT` exact cum e.
- Duplicate rânduri în același fișier: se inserează ca plăți distincte în pachetul respectiv.

## Pași de Implementare
1. Creez `server/src/import_payments_package.ts` cu inițializare DB, scheme, validări și parser CSV.
2. Parsez argumentele CLI și validez inputul (fișiere existente).
3. Pentru fiecare fișier: creez `pachet_plati` și rulez importul într-o tranzacție.
4. Emit rapoarte JSON per fișier și coduri de ieșire corecte.
5. Adaug scriptul `import:payments` în `server/package.json`.

Confirmă te rog planul; după confirmare implementez și testez cu fișierele tale.