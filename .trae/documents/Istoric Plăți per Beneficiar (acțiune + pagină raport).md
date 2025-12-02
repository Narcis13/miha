## Ce adăugăm
- O acțiune nouă „Istoric plăți” pe fiecare beneficiar în tabul `Beneficiari` (icon sugestiv + buton).
- Un modal cu alegerea perioadei (implicit: de la 01.01.[an curent] până la azi) și buton „Generează”.
- O pagină nouă care se deschide într-un tab separat și afișează situația plăților efectuate pentru beneficiarul selectat în perioada aleasă.

## Unde în cod
- `client/src/components/BeneficiariesList.tsx` — acțiunile pe item (zona listă butoane) la `TableRow` → `TableCell` Acțiuni, vezi  `client/src/components/BeneficiariesList.tsx:211–230`.
- `client/src/components/ui/dialog.tsx` și `client/src/components/ui/input.tsx` — reutilizăm dialogul și `Input` de tip `date`.
- `client/src/routes/` — adăugăm o rută nouă: `history.$beneficiaryId.tsx` (similară cu `client/src/routes/print.$packageId.tsx:35–38`).

## Detalii UI (Beneficiari)
- Adăugăm un buton cu icon `History` (din `lucide-react`), tooltip „Istoric plăți”.
- La click, deschidem `Dialog` ce conține:
  - Două câmpuri `Input type="date"`: `De la` și `Până la`.
  - Valori implicite:
    - `De la` = 01.01.[an curent] (format `YYYY-MM-DD`).
    - `Până la` = data curentă (format `YYYY-MM-DD`).
  - Buton „Generează” care: `window.open('/history/' + beneficiary.id + '?from=' + Date.parse(fromStr) + '&to=' + Date.parse(toStr), '_blank')`.

## Rută nouă „Istoric plăți”
- `client/src/routes/history.$beneficiaryId.tsx` cu `createFileRoute('/history/$beneficiaryId')`.
- Citește `beneficiaryId` din URL și `from`, `to` din query (`window.location.search` sau API-ul TanStack Router).
- Încărcare date:
  - Pas 1: `GET /payment-packages?from=<epoch>&to=<epoch>&limit=5000` — listăm pachetele din interval.
  - Pas 2: pentru fiecare pachet: `GET /payments?packageId=<id>&beneficiaryId=<beneficiaryId>&limit=5000` — plățile beneficiarului în pachet.
  - Agregăm toate plățile într-o listă unică; pentru fiecare element păstrăm: `data_plata` (din pachet), `nr_dosar`, `suma`, plus `beneficiary_name/cnp/account`.
- Prezentare:
  - Header cu nume beneficiar + CNP/IBAN (din primul element dacă există) și perioada selectată.
  - Tabel cu coloane: `Data plății`, `Nr. dosar`, `Suma (lei)`; ordonat crescător după `data_plata`.
  - Total sume la final.
  - Buton „Printează” și CSS minim pentru A4 (după modelul `print.$packageId.tsx:163–172`).
- Edge cases:
  - Dacă nu există plăți în interval, afișăm un mesaj „Nu există plăți pentru perioada selectată”.

## API și date
- Nu modificăm backend-ul; reutilizăm endpoint-urile existente:
  - `GET /payment-packages` cu `from`/`to` (vezi `server/src/index.ts:221–258`).
  - `GET /payments` cu `packageId` și `beneficiaryId` (vezi `server/src/index.ts:324–360`).
- Conversii de dată: folosim `Date.parse('YYYY-MM-DD')` pentru a trimite epoch ms, conform precedentului din `PaymentPackages.tsx:45–47`.

## Validare & UX
- Consistență stil: butoane/tooltipuri/clase ca în celelalte acțiuni (`p-1 hover:bg-muted rounded-md`).
- Performanță: `Promise.all` pe pachete; în practică numărul de pachete din interval e mic.
- Fără dependențe noi; păstrăm aceeași bibliotecă de iconuri (`lucide-react`) și UI (`@/components/ui`).

## Livrabile
- Un nou buton „Istoric plăți” în lista de beneficiari.
- Un `Dialog` pentru alegerea perioadei cu „Generează”.
- O rută nouă `/history/$beneficiaryId` care redă raportul într-un tab separat, cu tabel și total.