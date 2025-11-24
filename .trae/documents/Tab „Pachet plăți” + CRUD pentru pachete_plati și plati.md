## Rezumat
- Adaug un al treilea tab "Pachet plăți" în aplicația web (alături de Beneficiari și Setări) și implementez CRUD complet pentru două entități noi: `pachete_plati` și `plati`.
- Serverul folosește Hono pe Bun și SQLite (bun:sqlite), cu CRUD existent pentru Beneficiari și Setări, pe care îl voi urma ca stil (`server/src/index.ts`:1–9, 58–179).
- Clientul este React + TanStack Router și componente UI custom (Tabs, Dialog, Table etc.). Tab-urile actuale sunt în `client/src/components/PaymentApp.tsx`:6–38.

## Schema Bază de Date (SQLite)
- Tabele noi, create la pornirea serverului (analog cu `beneficiaries`/`institution_settings`):
  - `pachete_plati`:
    - `id TEXT PRIMARY KEY`
    - `data_plata INTEGER NOT NULL` (ms epoch)
    - `observatii TEXT` (implicit '')
    - `created_at INTEGER NOT NULL`
  - `plati`:
    - `id TEXT PRIMARY KEY`
    - `idPachetPlati TEXT NOT NULL` (FK → `pachete_plati.id` ON DELETE CASCADE)
    - `idBeneficiar TEXT NOT NULL` (FK → `beneficiaries.id` ON DELETE CASCADE)
    - `suma INTEGER NOT NULL` (valoare în bani, de ex. lei×100)
    - `nr_dosar TEXT` (implicit '')
  - Activez `PRAGMA foreign_keys = ON` pentru a respecta CASCADE.
  - Indexuri:
    - `CREATE INDEX IF NOT EXISTS idx_plati_pachet ON plati(idPachetPlati)`
    - `CREATE INDEX IF NOT EXISTS idx_plati_beneficiar ON plati(idBeneficiar)`

## API Server (Hono)
- Denumiri endpointuri (mențin stilul englezesc existent: `/beneficiaries`, `/settings`):
  - `GET /payment-packages` — listare cu `limit`, `offset`, filtre opționale `from`/`to` (interval pentru `data_plata`) și `q` (în `observatii`). Răspuns: `{ items: PaymentPackage[], total: number }`.
  - `GET /payment-packages/:id` — detalii pachet + agregat scurt (număr plăți, sumă totală).
  - `POST /payment-packages` — creare: body `{ data_plata: number|ISO date, observatii?: string }`. Returnează row creat.
  - `PUT /payment-packages/:id` — actualizare: body similar; returnează row actualizat.
  - `DELETE /payment-packages/:id` — șterge pachetul și, via CASCADE, toate plățile aferente.
  - `GET /payments` — listare cu `packageId` obligatoriu; filtre opționale `beneficiaryId`, `limit`, `offset`. Răspuns: `{ items: Payment[], total: number }`.
  - `POST /payments` — creare: body `{ idPachetPlati, idBeneficiar, suma, nr_dosar? }`. Validez existența FK (pachet + beneficiar).
  - `PUT /payments/:id` — actualizare: body ca mai sus.
  - `DELETE /payments/:id` — ștergere.
- Validări (pattern existent `server/src/index.ts`:91–113, 115–141):
  - `data_plata` validă (date ISO → epoch sau număr pozitiv).
  - `suma` pozitivă (integer > 0).
  - `idPachetPlati`/`idBeneficiar` trebuie să existe; altfel 400.
- Răspunsuri consecvente, erori `{ error: string }`, coduri HTTP similare celor existente.

## UI Client (React)
- Extind tab-uri (`client/src/components/PaymentApp.tsx`:19–38):
  - Grid devine `grid-cols-3`.
  - Adaug `TabsTrigger value="packages"` cu label "Pachet plăți" și un icon (ex. `CreditCard`).
  - Adaug `TabsContent value="packages"` care randează noua componentă.
- Componente noi (stil identic cu Beneficiari — `Dialog`, `Table`, `Form`):
  - `PaymentPackages.tsx` — listare pachete; butoane Adaugă/Editează/Șterge; paginare; căutare după dată și observații.
  - `PaymentPackageForm.tsx` — formular (data_plata: `input type="date"` → epoch, observatii: `Textarea`).
  - `PaymentsList.tsx` — în contextul unui pachet selectat: listă plăți, plus formular:
    - câmpuri: Beneficiar (Select din `/beneficiaries` cu căutare), `suma` (Input numeric), `nr_dosar` (Input text).
    - acțiuni CRUD pe `/payments`.
- Reutilizez pattern-urile din `BeneficiariesList.tsx` (`client/src/components/BeneficiariesList.tsx`:72–118, 122–170, 180–237) pentru state, fetch, dialoguri și tabel.
- API Base: păstrez `API_BASE = 'http://localhost:3000'` pentru consistență; opțional ulterior extragem într-un util comun.

## Flux UX propus
- Tab "Pachet plăți":
  - Se vede o listă de pachete cu `data_plata`, nr. plăți, suma totală, `observatii`.
  - Click pe pachet deschide zona de plăți (în aceeași pagină sau într-un dialog mare), unde putem adăuga/edita/șterge plăți.
  - Ștergerea pachetului șterge și plățile aferente (CASCADE).

## Testare și Verificare
- Server: testez manual rutele noi cu `curl`/Postman (creare, listare, update, delete, cascade), plus verificarea FK/validărilor.
- Client: verific tab-ul nou, fluxurile CRUD, paginarea și căutarea.
- Verific integrări cu beneficiari (Select, validări IBAN/CNP deja existente la creare beneficiar, nu la plată).

## Referințe din codul actual
- Tab-uri existente: `client/src/components/PaymentApp.tsx`:19–38.
- UI patterns: `client/src/components/BeneficiariesList.tsx`:30–170, 180–269; `client/src/components/BeneficiaryForm.tsx`:13–93.
- Server Hono + SQLite: `server/src/index.ts`:1–24, 58–179.

## Pași de implementare
1. Adaug `PRAGMA foreign_keys = ON` și creez tabele + indexuri în `server/src/index.ts`.
2. Implementez rutele CRUD pentru `/payment-packages` și `/payments` (validări, paginare, căutări).
3. Adaug tab-ul nou în `PaymentApp.tsx` și componentele `PaymentPackages.tsx`, `PaymentPackageForm.tsx`, `PaymentsList.tsx`.
4. Integrez selecția de beneficiari și afișarea sumelor/totalurilor.
5. Testez end-to-end și ajustez UX erori.

Confirmați, te rog, dacă denumirile endpoint-urilor englezești (`/payment-packages`, `/payments`) sunt OK sau preferați variante românești (`/pachete-plati`, `/plati`). După confirmare, trec la implementare.