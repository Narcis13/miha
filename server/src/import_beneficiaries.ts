import Database from 'bun:sqlite'
import { join } from 'node:path'

const dbPath = join(import.meta.dir, '..', 'beneficiaries.sqlite')
const db = new Database(dbPath)
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

const main = async () => {
  const filePath = process.argv[2]
  if (!filePath) {
    console.error('Usage: bun run src/import_beneficiaries.ts <pensionari.csv>')
    process.exit(1)
  }

  const text = await Bun.file(filePath).text().catch(() => '')
  if (!text) {
    console.error('Cannot read CSV file:', filePath)
    process.exit(1)
  }

  const lines = text.split(/\r?\n/).filter((l) => l.length > 0)
  const headerLine = lines.shift() as string
  const delimiter = headerLine.includes(';') ? ';' : ','
  const headers = parseCSVLine(headerLine, delimiter).map((h) => h.toLowerCase())

  const idxName = headers.findIndex((h) => ['name', 'nume'].includes(h))
  const idxCnp = headers.findIndex((h) => ['cnp'].includes(h))
  const idxAccount = headers.findIndex((h) => ['account', 'iban', 'cont'].includes(h))
  const idxObs = headers.findIndex((h) => ['observations', 'observatii', 'observații'].includes(h))

  if (idxName < 0 || idxCnp < 0 || idxAccount < 0) {
    console.error('CSV must contain columns: name/nume, cnp, account/iban/cont')
    process.exit(1)
  }

  let inserted = 0
  let updated = 0
  let skipped = 0
  let invalid = 0

  db.run('BEGIN')
  for (const line of lines) {
    const cols = parseCSVLine(line, delimiter)
    const name = cols[idxName]?.trim() || ''
    const cnp = cols[idxCnp]?.replace(/\D/g, '') || ''
    const account = (cols[idxAccount] || '').replace(/\s+/g, '').toUpperCase()
    const observations = idxObs >= 0 ? cols[idxObs] || '' : ''

    if (!name || !cnp || !account) {
      skipped++
      continue
    }
    if (!isValidCNP(cnp) || !isValidIBAN(account)) {
      invalid++
      continue
    }

    const existing = db.query('SELECT id FROM beneficiaries WHERE cnp = ?').get(cnp) as { id?: string } | undefined
    if (existing && existing.id) {
      db.query('UPDATE beneficiaries SET name = ?, account = ?, observations = ? WHERE id = ?').run(name, account, observations, existing.id)
      updated++
    } else {
      const id = crypto.randomUUID()
      const created_at = Date.now()
      db.query('INSERT INTO beneficiaries (id, name, cnp, account, observations, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(id, name, cnp, account, observations, created_at)
      inserted++
    }
  }
  db.run('COMMIT')

  console.log(JSON.stringify({ inserted, updated, skipped, invalid }))
}

main()