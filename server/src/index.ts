import { Hono } from 'hono'
import { cors } from 'hono/cors'
import Database from 'bun:sqlite'

const app = new Hono()

app.use(cors())

const db = new Database('beneficiaries.sqlite')
db.run('PRAGMA foreign_keys = ON')
db.run(`
  CREATE TABLE IF NOT EXISTS beneficiaries (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    cnp TEXT NOT NULL,
    account TEXT NOT NULL,
    observations TEXT,
    created_at INTEGER NOT NULL
  )
`)

db.run(`
  CREATE TABLE IF NOT EXISTS institution_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    name TEXT NOT NULL DEFAULT '',
    cui TEXT NOT NULL DEFAULT '',
    account TEXT NOT NULL DEFAULT '',
    bankName TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    contact TEXT NOT NULL DEFAULT ''
  )
`)

// Migrate: add new columns if missing
const settingsCols = db.query('PRAGMA table_info(institution_settings)').all() as any[]
const hasCol = (n: string) => settingsCols.some((c: any) => c.name === n)
if (!hasCol('programCode')) db.run('ALTER TABLE institution_settings ADD COLUMN programCode TEXT NOT NULL DEFAULT ""')
if (!hasCol('commitmentCode')) db.run('ALTER TABLE institution_settings ADD COLUMN commitmentCode TEXT NOT NULL DEFAULT ""')
if (!hasCol('commitmentIndicator')) db.run('ALTER TABLE institution_settings ADD COLUMN commitmentIndicator TEXT NOT NULL DEFAULT ""')

// Pachete plăți
db.run(`
  CREATE TABLE IF NOT EXISTS pachete_plati (
    id TEXT PRIMARY KEY,
    data_plata INTEGER NOT NULL,
    observatii TEXT DEFAULT '',
    created_at INTEGER NOT NULL
  )
`)

// Plăți asociate pachetelor
db.run(`
  CREATE TABLE IF NOT EXISTS plati (
    id TEXT PRIMARY KEY,
    idPachetPlati TEXT NOT NULL,
    idBeneficiar TEXT NOT NULL,
    suma INTEGER NOT NULL,
    nr_dosar TEXT DEFAULT '',
    FOREIGN KEY (idPachetPlati) REFERENCES pachete_plati(id) ON DELETE CASCADE,
    FOREIGN KEY (idBeneficiar) REFERENCES beneficiaries(id) ON DELETE CASCADE
  )
`)

// Indexuri pentru performanță
db.run('CREATE INDEX IF NOT EXISTS idx_plati_pachet ON plati(idPachetPlati)')
db.run('CREATE INDEX IF NOT EXISTS idx_plati_beneficiar ON plati(idBeneficiar)')

const isValidCNP = (cnp: string) => {
  if (!/^\d{13}$/.test(cnp)) return false
  const weights = [2,7,9,1,4,6,3,5,8,2,7,9]
  const sum = weights.reduce((acc, w, i) => acc + w * Number(cnp[i]), 0)
  const r = sum % 11
  const control = r === 10 ? 1 : r
  return control === Number(cnp[12])
}

const isValidIBAN = (iban: string) => {
  if (typeof iban !== 'string') return false
  const s = iban.replace(/\s+/g, '')
  if (!/^RO[A-Z0-9]{22}$/.test(s)) return false
  const rearranged = s.slice(4) + s.slice(0, 4)
  const expanded = rearranged
    .toUpperCase()
    .replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55))
  let remainder = 0
  for (let i = 0; i < expanded.length; i += 7) {
    const part = remainder + expanded.substring(i, i + 7)
    remainder = Number(part) % 97
  }
  return remainder === 1
}

app.get('/', (c) => c.text('OK'))

app.get('/beneficiaries', (c) => {
  const url = new URL(c.req.url)
  const q = url.searchParams.get('q')?.trim() || ''
  const limitParam = url.searchParams.get('limit')
  const offsetParam = url.searchParams.get('offset')
  const limit = Math.max(1, Math.min(Number(limitParam) || 50, 200))
  const offset = Math.max(0, Number(offsetParam) || 0)

  const where = q ? 'WHERE name LIKE ? OR cnp LIKE ? OR account LIKE ?' : ''
  const like = `%${q.replace(/%/g, '')}%`

  const items = db
    .query(
      `SELECT id, name, cnp, account, COALESCE(observations, "") AS observations, created_at
       FROM beneficiaries ${where}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(...(q ? [like, like, like] : []), limit, offset)

  const total = db
    .query(`SELECT COUNT(*) as c FROM beneficiaries ${where}`)
    .get(...(q ? [like, like, like] : [])) as { c: number }

  if (!limitParam && !offsetParam && !q) {
    return c.json(items)
  }

  return c.json({ items, total: total.c, limit, offset })
})

app.post('/beneficiaries', async (c) => {
  const body = await c.req.json().catch(() => null)
  if (!body || !body.name || !body.cnp || !body.account) {
    return c.json({ error: 'Missing required fields' }, 400)
  }
  if (!isValidCNP(body.cnp)) {
    return c.json({ error: 'CNP invalid' }, 400)
  }
  if (!isValidIBAN(body.account)) {
    return c.json({ error: 'IBAN invalid' }, 400)
  }
  const id = crypto.randomUUID()
  const created_at = Date.now()
  db.query(
    'INSERT INTO beneficiaries (id, name, cnp, account, observations, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, body.name, body.cnp, body.account, body.observations || '', created_at)
  const row = db
    .query(
      'SELECT id, name, cnp, account, COALESCE(observations, "") AS observations, created_at FROM beneficiaries WHERE id = ?'
    )
    .get(id)
  return c.json(row, 201)
})

app.put('/beneficiaries/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => null)
  if (!id || !body || !body.name || !body.cnp || !body.account) {
    return c.json({ error: 'Missing required fields' }, 400)
  }
  if (!isValidCNP(body.cnp)) {
    return c.json({ error: 'CNP invalid' }, 400)
  }
  if (!isValidIBAN(body.account)) {
    return c.json({ error: 'IBAN invalid' }, 400)
  }
  const res = db
    .query(
      'UPDATE beneficiaries SET name = ?, cnp = ?, account = ?, observations = ? WHERE id = ?'
    )
    .run(body.name, body.cnp, body.account, body.observations || '', id)
  if (!res || (typeof res.changes === 'number' && res.changes === 0)) {
    return c.json({ error: 'Not found' }, 404)
  }
  const row = db
    .query(
      'SELECT id, name, cnp, account, COALESCE(observations, "") AS observations, created_at FROM beneficiaries WHERE id = ?'
    )
    .get(id)
  return c.json(row)
})

app.delete('/beneficiaries/:id', (c) => {
  const id = c.req.param('id')
  const res = db.query('DELETE FROM beneficiaries WHERE id = ?').run(id)
  if (!res || (typeof res.changes === 'number' && res.changes === 0)) {
    return c.json({ error: 'Not found' }, 404)
  }
  return c.json({ ok: true })
})

app.get('/settings', (c) => {
  const row = db.query('SELECT * FROM institution_settings WHERE id = 1').get() as any
  if (!row) {
    db.query(
      'INSERT INTO institution_settings (id, name, cui, account, bankName, address, contact, programCode, commitmentCode, commitmentIndicator) VALUES (1, "", "", "", "", "", "", "", "", "")'
    ).run()
    return c.json({ name: '', cui: '', account: '', bankName: '', address: '', contact: '', programCode: '', commitmentCode: '', commitmentIndicator: '' })
  }
  return c.json({ name: row.name, cui: row.cui, account: row.account, bankName: row.bankName, address: row.address, contact: row.contact, programCode: row.programCode || '', commitmentCode: row.commitmentCode || '', commitmentIndicator: row.commitmentIndicator || '' })
})

app.put('/settings', async (c) => {
  const body = await c.req.json().catch(() => null)
  if (!body || !body.name || !body.cui || !body.account) {
    return c.json({ error: 'Missing required fields' }, 400)
  }
  if (!/^[0-9]{6,}$/.test(String(body.cui))) {
    return c.json({ error: 'CUI invalid' }, 400)
  }
  if (!isValidIBAN(body.account)) {
    return c.json({ error: 'IBAN invalid' }, 400)
  }
  db.query(
    'INSERT INTO institution_settings (id, name, cui, account, bankName, address, contact, programCode, commitmentCode, commitmentIndicator) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, cui=excluded.cui, account=excluded.account, bankName=excluded.bankName, address=excluded.address, contact=excluded.contact, programCode=excluded.programCode, commitmentCode=excluded.commitmentCode, commitmentIndicator=excluded.commitmentIndicator'
  ).run(body.name, String(body.cui), body.account, body.bankName || '', body.address || '', body.contact || '', body.programCode || '', body.commitmentCode || '', body.commitmentIndicator || '')
  const row = db.query('SELECT * FROM institution_settings WHERE id = 1').get() as any
  return c.json({ name: row.name, cui: row.cui, account: row.account, bankName: row.bankName, address: row.address, contact: row.contact, programCode: row.programCode || '', commitmentCode: row.commitmentCode || '', commitmentIndicator: row.commitmentIndicator || '' })
})

// ---- Payment Packages CRUD ----
app.get('/payment-packages', (c) => {
  const url = new URL(c.req.url)
  const limitParam = url.searchParams.get('limit')
  const offsetParam = url.searchParams.get('offset')
  const fromParam = url.searchParams.get('from')
  const toParam = url.searchParams.get('to')
  const q = url.searchParams.get('q')?.trim() || ''
  const limit = Math.max(1, Math.min(Number(limitParam) || 50, 200))
  const offset = Math.max(0, Number(offsetParam) || 0)

  const whereParts: string[] = []
  const args: any[] = []
  if (fromParam) { whereParts.push('data_plata >= ?'); args.push(Number(fromParam)) }
  if (toParam) { whereParts.push('data_plata <= ?'); args.push(Number(toParam)) }
  if (q) { whereParts.push('observatii LIKE ?'); args.push(`%${q.replace(/%/g, '')}%`) }
  const where = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : ''

  const items = db
    .query(
      `SELECT p.id, p.data_plata, COALESCE(p.observatii, '') AS observatii, p.created_at,
              (SELECT COUNT(*) FROM plati pl WHERE pl.idPachetPlati = p.id) AS count_plati,
              (SELECT COALESCE(SUM(pl.suma), 0) FROM plati pl WHERE pl.idPachetPlati = p.id) AS total_suma
       FROM pachete_plati p ${where}
       ORDER BY p.data_plata DESC, p.created_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(...args, limit, offset)

  const total = db
    .query(`SELECT COUNT(*) as c FROM pachete_plati ${where}`)
    .get(...args) as { c: number }

  if (!limitParam && !offsetParam && !fromParam && !toParam && !q) {
    return c.json(items)
  }
  return c.json({ items, total: total.c, limit, offset })
})

app.get('/payment-packages/:id', (c) => {
  const id = c.req.param('id')
  const row = db
    .query(
      `SELECT p.id, p.data_plata, COALESCE(p.observatii, '') AS observatii, p.created_at,
              (SELECT COUNT(*) FROM plati pl WHERE pl.idPachetPlati = p.id) AS count_plati,
              (SELECT COALESCE(SUM(pl.suma), 0) FROM plati pl WHERE pl.idPachetPlati = p.id) AS total_suma
       FROM pachete_plati p WHERE p.id = ?`
    )
    .get(id)
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(row)
})

app.post('/payment-packages', async (c) => {
  const body = await c.req.json().catch(() => null)
  if (!body || typeof body.data_plata === 'undefined') {
    return c.json({ error: 'Missing required fields' }, 400)
  }
  const data_plata = typeof body.data_plata === 'string' ? Date.parse(body.data_plata) : Number(body.data_plata)
  if (!Number.isFinite(data_plata) || data_plata <= 0) {
    return c.json({ error: 'data_plata invalid' }, 400)
  }
  const id = crypto.randomUUID()
  const created_at = Date.now()
  db.query('INSERT INTO pachete_plati (id, data_plata, observatii, created_at) VALUES (?, ?, ?, ?)')
    .run(id, data_plata, body.observatii || '', created_at)
  const row = db
    .query('SELECT id, data_plata, COALESCE(observatii, "") AS observatii, created_at FROM pachete_plati WHERE id = ?')
    .get(id)
  return c.json(row, 201)
})

app.put('/payment-packages/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => null)
  if (!id || !body || typeof body.data_plata === 'undefined') {
    return c.json({ error: 'Missing required fields' }, 400)
  }
  const data_plata = typeof body.data_plata === 'string' ? Date.parse(body.data_plata) : Number(body.data_plata)
  if (!Number.isFinite(data_plata) || data_plata <= 0) {
    return c.json({ error: 'data_plata invalid' }, 400)
  }
  const res = db
    .query('UPDATE pachete_plati SET data_plata = ?, observatii = ? WHERE id = ?')
    .run(data_plata, body.observatii || '', id)
  if (!res || (typeof res.changes === 'number' && res.changes === 0)) {
    return c.json({ error: 'Not found' }, 404)
  }
  const row = db
    .query('SELECT id, data_plata, COALESCE(observatii, "") AS observatii, created_at FROM pachete_plati WHERE id = ?')
    .get(id)
  return c.json(row)
})

app.delete('/payment-packages/:id', (c) => {
  const id = c.req.param('id')
  const res = db.query('DELETE FROM pachete_plati WHERE id = ?').run(id)
  if (!res || (typeof res.changes === 'number' && res.changes === 0)) {
    return c.json({ error: 'Not found' }, 404)
  }
  return c.json({ ok: true })
})

// ---- Payments CRUD ----
app.get('/payments', (c) => {
  const url = new URL(c.req.url)
  const packageId = url.searchParams.get('packageId')
  const beneficiaryId = url.searchParams.get('beneficiaryId')
  const limitParam = url.searchParams.get('limit')
  const offsetParam = url.searchParams.get('offset')
  const limit = Math.max(1, Math.min(Number(limitParam) || 50, 200))
  const offset = Math.max(0, Number(offsetParam) || 0)
  if (!packageId) return c.json({ error: 'packageId required' }, 400)

  const whereParts = ['idPachetPlati = ?']
  const args: any[] = [packageId]
  if (beneficiaryId) { whereParts.push('idBeneficiar = ?'); args.push(beneficiaryId) }
  const where = `WHERE ${whereParts.join(' AND ')}`

  const items = db
    .query(
      `SELECT pl.id, pl.idPachetPlati, pl.idBeneficiar, pl.suma, COALESCE(pl.nr_dosar, '') AS nr_dosar,
              b.name AS beneficiary_name, b.cnp AS beneficiary_cnp, b.account AS beneficiary_account
       FROM plati pl
       JOIN beneficiaries b ON b.id = pl.idBeneficiar
       ${where}
       ORDER BY b.name ASC
       LIMIT ? OFFSET ?`
    )
    .all(...args, limit, offset)

  const total = db
    .query(`SELECT COUNT(*) as c FROM plati ${where}`)
    .get(...args) as { c: number }

  if (!limitParam && !offsetParam && !beneficiaryId) {
    return c.json(items)
  }
  return c.json({ items, total: total.c, limit, offset })
})

app.post('/payments', async (c) => {
  const body = await c.req.json().catch(() => null)
  if (!body || !body.idPachetPlati || !body.idBeneficiar || typeof body.suma === 'undefined') {
    return c.json({ error: 'Missing required fields' }, 400)
  }
  const pkg = db.query('SELECT id FROM pachete_plati WHERE id = ?').get(body.idPachetPlati) as { id?: string } | undefined
  if (!pkg || !pkg.id) return c.json({ error: 'Invalid idPachetPlati' }, 400)
  const ben = db.query('SELECT id FROM beneficiaries WHERE id = ?').get(body.idBeneficiar) as { id?: string } | undefined
  if (!ben || !ben.id) return c.json({ error: 'Invalid idBeneficiar' }, 400)
  const suma = Number(body.suma)
  if (!Number.isFinite(suma) || suma <= 0) return c.json({ error: 'suma invalidă' }, 400)

  const id = crypto.randomUUID()
  db.query('INSERT INTO plati (id, idPachetPlati, idBeneficiar, suma, nr_dosar) VALUES (?, ?, ?, ?, ?)')
    .run(id, body.idPachetPlati, body.idBeneficiar, Math.round(suma), body.nr_dosar || '')

  const row = db
    .query(
      `SELECT pl.id, pl.idPachetPlati, pl.idBeneficiar, pl.suma, COALESCE(pl.nr_dosar, '') AS nr_dosar,
              b.name AS beneficiary_name
       FROM plati pl JOIN beneficiaries b ON b.id = pl.idBeneficiar WHERE pl.id = ?`
    )
    .get(id)
  return c.json(row, 201)
})

app.put('/payments/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => null)
  if (!id || !body || !body.idPachetPlati || !body.idBeneficiar || typeof body.suma === 'undefined') {
    return c.json({ error: 'Missing required fields' }, 400)
  }
  const pkg = db.query('SELECT id FROM pachete_plati WHERE id = ?').get(body.idPachetPlati) as { id?: string } | undefined
  if (!pkg || !pkg.id) return c.json({ error: 'Invalid idPachetPlati' }, 400)
  const ben = db.query('SELECT id FROM beneficiaries WHERE id = ?').get(body.idBeneficiar) as { id?: string } | undefined
  if (!ben || !ben.id) return c.json({ error: 'Invalid idBeneficiar' }, 400)
  const suma = Number(body.suma)
  if (!Number.isFinite(suma) || suma <= 0) return c.json({ error: 'suma invalidă' }, 400)

  const res = db
    .query('UPDATE plati SET idPachetPlati = ?, idBeneficiar = ?, suma = ?, nr_dosar = ? WHERE id = ?')
    .run(body.idPachetPlati, body.idBeneficiar, Math.round(suma), body.nr_dosar || '', id)
  if (!res || (typeof res.changes === 'number' && res.changes === 0)) {
    return c.json({ error: 'Not found' }, 404)
  }
  const row = db
    .query(
      `SELECT pl.id, pl.idPachetPlati, pl.idBeneficiar, pl.suma, COALESCE(pl.nr_dosar, '') AS nr_dosar,
              b.name AS beneficiary_name
       FROM plati pl JOIN beneficiaries b ON b.id = pl.idBeneficiar WHERE pl.id = ?`
    )
    .get(id)
  return c.json(row)
})

app.delete('/payments/:id', (c) => {
  const id = c.req.param('id')
  const res = db.query('DELETE FROM plati WHERE id = ?').run(id)
  if (!res || (typeof res.changes === 'number' && res.changes === 0)) {
    return c.json({ error: 'Not found' }, 404)
  }
  return c.json({ ok: true })
})

export default { fetch: app.fetch, port: 3765 }
