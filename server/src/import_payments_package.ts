import Database from 'bun:sqlite'

const db = new Database(new URL('../beneficiaries.sqlite', import.meta.url).pathname)
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
  CREATE TABLE IF NOT EXISTS pachete_plati (
    id TEXT PRIMARY KEY,
    data_plata INTEGER NOT NULL,
    observatii TEXT DEFAULT '',
    created_at INTEGER NOT NULL
  )
`)
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
  const expanded = rearranged.toUpperCase().replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55))
  let remainder = 0
  for (let i = 0; i < expanded.length; i += 7) {
    const part = remainder + expanded.substring(i, i + 7)
    remainder = Number(part) % 97
  }
  return remainder === 1
}

const parseCSVLine = (line: string, delimiter: string) => {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (ch === delimiter && !inQuotes) {
      result.push(current)
      current = ''
      continue
    }
    current += ch
  }
  result.push(current)
  return result.map((v) => v.trim())
}

const parseMoneyToBani = (val: string) => {
  const s = (val || '').replace(/\s+/g, '').replace(/\./g, '').replace(/,/g, '.')
  const n = Number(s)
  if (!Number.isFinite(n) || n <= 0) return NaN
  return Math.round(n * 100)
}

const parseArgs = () => {
  const args = process.argv.slice(2)
  const files: string[] = []
  let dataPlataStr = ''
  let observatiiArg = ''
  for (const a of args) {
    if (a.startsWith('--data-plata=')) dataPlataStr = a.split('=')[1] || ''
    else if (a.startsWith('--observatii=')) observatiiArg = a.split('=')[1] || ''
    else files.push(a)
  }
  return { files, dataPlataStr, observatiiArg }
}

const main = async () => {
  const { files, dataPlataStr, observatiiArg } = parseArgs()
  if (!files.length) {
    console.error('Usage: bun run src/import_payments_package.ts <pachet.csv> [<pachet2.csv> ...] [--data-plata=YYYY-MM-DD] [--observatii="text"]')
    process.exit(1)
  }
  let dataPlata = Date.now()
  if (dataPlataStr) {
    const d = Date.parse(dataPlataStr)
    if (!Number.isFinite(d) || d <= 0) {
      console.error('Invalid --data-plata, expected YYYY-MM-DD')
      process.exit(1)
    }
    dataPlata = d
  }

  for (const filePath of files) {
    const text = await Bun.file(filePath).text().catch(() => '')
    if (!text) {
      console.error(JSON.stringify({ file: filePath, error: 'Cannot read file' }))
      continue
    }
    const lines = text.split(/\r?\n/).filter((l) => l.length > 0)
    if (!lines.length) {
      console.error(JSON.stringify({ file: filePath, error: 'Empty CSV' }))
      continue
    }
    const headerLine = lines.shift() as string
    const delimiter = headerLine.includes(';') ? ';' : ','
    const headers = parseCSVLine(headerLine, delimiter).map((h) => h.toLowerCase())
    const idxName = headers.findIndex((h) => ['name', 'nume'].includes(h))
    const idxCnp = headers.findIndex((h) => ['cnp'].includes(h))
    const idxAccount = headers.findIndex((h) => ['account', 'iban', 'cont'].includes(h))
    const idxNrDosar = headers.findIndex((h) => ['nr dosar', 'nr_dosar', 'dosar'].includes(h))
    const idxSuma = headers.findIndex((h) => ['suma', 'sumă', 'amount'].includes(h))
    if (idxName < 0 || idxCnp < 0 || idxAccount < 0 || idxSuma < 0) {
      console.error(JSON.stringify({ file: filePath, error: 'Missing required columns' }))
      continue
    }

    const packageId = crypto.randomUUID()
    const created_at = Date.now()
    const obs = observatiiArg || (filePath.split('/').pop() || '')

    let paymentsInserted = 0
    let beneficiariesInserted = 0
    let beneficiariesUpdated = 0
    let skipped = 0
    let invalid = 0

    db.run('BEGIN')
    db.query('INSERT INTO pachete_plati (id, data_plata, observatii, created_at) VALUES (?, ?, ?, ?)')
      .run(packageId, dataPlata, obs, created_at)

    for (const line of lines) {
      const cols = parseCSVLine(line, delimiter)
      const name = cols[idxName]?.trim() || ''
      const cnpRaw = cols[idxCnp] || ''
      const cnp = cnpRaw.replace(/\D/g, '')
      const account = (cols[idxAccount] || '').replace(/\s+/g, '').toUpperCase()
      const nr_dosar = idxNrDosar >= 0 ? (cols[idxNrDosar] || '').trim() : ''
      const sumaRaw = cols[idxSuma] || ''
      if (!name || !cnp || !account || !sumaRaw) {
        skipped++
        continue
      }
      if (!isValidCNP(cnp) || !isValidIBAN(account)) {
        invalid++
        continue
      }
      const bani = parseMoneyToBani(sumaRaw)
      if (!Number.isFinite(bani) || bani <= 0) {
        skipped++
        continue
      }

      const existing = db.query('SELECT id, name, account FROM beneficiaries WHERE cnp = ?').get(cnp) as { id?: string, name?: string, account?: string } | undefined
      let beneficiaryId = ''
      if (existing && existing.id) {
        beneficiaryId = existing.id
        if (existing.name !== name || existing.account !== account) {
          db.query('UPDATE beneficiaries SET name = ?, account = ? WHERE id = ?').run(name, account, beneficiaryId)
          beneficiariesUpdated++
        }
      } else {
        beneficiaryId = crypto.randomUUID()
        const benCreated = Date.now()
        db.query('INSERT INTO beneficiaries (id, name, cnp, account, observations, created_at) VALUES (?, ?, ?, ?, ?, ?)')
          .run(beneficiaryId, name, cnp, account, '', benCreated)
        beneficiariesInserted++
      }

      const paymentId = crypto.randomUUID()
      db.query('INSERT INTO plati (id, idPachetPlati, idBeneficiar, suma, nr_dosar) VALUES (?, ?, ?, ?, ?)')
        .run(paymentId, packageId, beneficiaryId, Math.round(bani), nr_dosar)
      paymentsInserted++
    }

    db.run('COMMIT')
    console.log(JSON.stringify({ file: filePath, packageId, paymentsInserted, beneficiariesInserted, beneficiariesUpdated, skipped, invalid }))
  }
}

main()

