import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { API_BASE } from '@/lib/api-config'

interface PaymentRow {
  id: string
  idPachetPlati: string
  idBeneficiar: string
  beneficiary_name: string
  beneficiary_cnp?: string
  beneficiary_account?: string
  suma: number
  nr_dosar: string
}

interface PaymentsListProps {
  packageId: string
}

export function PaymentsList({ packageId }: PaymentsListProps) {
  const [items, setItems] = useState<PaymentRow[]>([])
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [limit] = useState(50)
  const [offset, setOffset] = useState(0)
  const [total, setTotal] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  const [beneficiaries, setBeneficiaries] = useState<{ id: string; name: string; cnp: string; account: string }[]>([])
  const [benQuery, setBenQuery] = useState('')
  const [nextOpNumber, setNextOpNumber] = useState('')

  const loadPayments = async (params?: { limit?: number; offset?: number }) => {
    setLoading(true)
    try {
      const qp = new URLSearchParams()
      qp.set('packageId', packageId)
      qp.set('limit', String(params?.limit ?? limit))
      qp.set('offset', String(params?.offset ?? offset))
      const res = await fetch(`${API_BASE}/payments?${qp.toString()}`)
      const data = await res.json()
      if (Array.isArray(data)) {
        setItems(data)
        setTotal(data.length)
      } else {
        setItems(data.items || [])
        setTotal(typeof data.total === 'number' ? data.total : null)
      }
    } catch (e) {
      console.error('Eroare la încărcare plăți', e)
    } finally {
      setLoading(false)
    }
  }

  const loadBeneficiaries = async () => {
    try {
      const qp = new URLSearchParams()
      qp.set('limit', '50')
      qp.set('offset', '0')
      if (benQuery) qp.set('q', benQuery)
      const res = await fetch(`${API_BASE}/beneficiaries?${qp.toString()}`)
      const data = await res.json()
      const list = Array.isArray(data) ? data : data.items || []
      setBeneficiaries(list.map((b: any) => ({ id: b.id, name: b.name, cnp: b.cnp, account: b.account })))
    } catch (e) {
      console.error('Eroare la încărcare beneficiari', e)
    }
  }

  useEffect(() => {
    loadPayments({ offset: 0 })
    loadBeneficiaries()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packageId])

  const fetchAllPayments = async (): Promise<PaymentRow[]> => {
    const all: PaymentRow[] = []
    let offsetLocal = 0
    const pageLimit = 200
    let totalLocal: number | null = null
    while (true) {
      const qp = new URLSearchParams()
      qp.set('packageId', packageId)
      qp.set('limit', String(pageLimit))
      qp.set('offset', String(offsetLocal))
      const res = await fetch(`${API_BASE}/payments?${qp.toString()}`)
      const data = await res.json()
      const batch: PaymentRow[] = Array.isArray(data) ? data : data.items || []
      all.push(...batch)
      totalLocal = Array.isArray(data) ? (totalLocal ?? all.length) : (typeof data.total === 'number' ? data.total : null)
      if (totalLocal != null) {
        if (all.length >= totalLocal) break
      } else {
        if (batch.length < pageLimit) break
      }
      offsetLocal += pageLimit
    }
    return all
  }

  const editingPayment = items.find((p) => p.id === editingId)

  const handleSubmit = async (data: { idBeneficiar: string; suma: number; nr_dosar?: string }) => {
    try {
      const url = editingId ? `${API_BASE}/payments/${editingId}` : `${API_BASE}/payments`
      const method = editingId ? 'PUT' : 'POST'
      const body = JSON.stringify({ idPachetPlati: packageId, ...data })
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body })
      const b = await res.json()
      if (!res.ok) {
        alert(b.error || 'Eroare la salvare plată')
        return
      }
      await loadPayments({ offset: editingId ? offset : 0 })
      setEditingId(null)
      setOpen(false)
    } catch (e) {
      console.error('Eroare la salvare plată', e)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(`${API_BASE}/payments/${id}`, { method: 'DELETE' })
      await loadPayments()
    } catch (e) {
      console.error('Eroare la ștergere plată', e)
    }
  }

  const fmtDate = (epochMs: number) => {
    const d = new Date(epochMs)
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
  }

  const generateFile = async () => {
    try {
      const settingsRes = await fetch(`${API_BASE}/settings`)
      const settings = await settingsRes.json()
      const pkgRes = await fetch(`${API_BASE}/payment-packages/${packageId}`)
      const pkg = await pkgRes.json()
      if (!settingsRes.ok || !pkgRes.ok) {
        alert('Eroare la încărcarea setărilor sau pachetului')
        return
      }
      const allItems = await fetchAllPayments()
      const startNr = Number(nextOpNumber) || 1
      const lines = allItems.map((p, i) => {
        const ben = beneficiaries.find((b) => b.id === p.idBeneficiar)
        const lineNo = String(i + 1)
        const nr_op = String(startNr + i)
        const sumaNum = p.suma / 100
        const suma = p.suma % 100 === 0 ? String(sumaNum) : sumaNum.toFixed(2)
        const instName = String(settings.name || '')
        const instCui = String(settings.cui || '')
        const instAddr = String(settings.address || '')
        const instIban = String(settings.account || '')
        const benName = String(ben?.name || p.beneficiary_name || '')
        const benCnp = String(ben?.cnp || p.beneficiary_cnp || '')
        const benIban = String(ben?.account || p.beneficiary_account || '')
        const explicatii = 'cv medicamente cf OG83/2015'
        const dataPlata = fmtDate(pkg.data_plata)
        const codProgram = String(settings.programCode || '0000000000')
        const indAngajament = String(settings.commitmentIndicator || '')
        const codAngajament = String(settings.commitmentCode || '')
        return [
          lineNo,
          nr_op,
          suma,
          instName,
          instCui,
          instAddr,
          instIban,
          '',
          benName,
          benCnp,
          benIban,
          '',
          '',
          explicatii,
          dataPlata,
          '',
          codAngajament,
          indAngajament,
          codProgram,
          'OP',
        ].join(',')
      })
      const csv = `${lines.join('\n')}`
      const blob = new Blob([csv], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'ordine.txt'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 0)
    } catch (e) {
      console.error('Eroare la generarea fișierului de plăți', e)
    }
  }

  const generateXml = async () => {
    try {
      const settingsRes = await fetch(`${API_BASE}/settings`)
      const settings = await settingsRes.json()
      const pkgRes = await fetch(`${API_BASE}/payment-packages/${packageId}`)
      const pkg = await pkgRes.json()
      if (!settingsRes.ok || !pkgRes.ok) {
        alert('Eroare la încărcarea setărilor sau pachetului')
        return
      }
      const allItems = await fetchAllPayments()
      const startNr = Number(nextOpNumber) || 1
      const toXmlAmount = (cents: number) => {
        const v = cents / 100
        const s = v.toFixed(2)
        return s.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')
      }
      const randuri = allItems.map((p, i) => {
        const ben = beneficiaries.find((b) => b.id === p.idBeneficiar)
        const nr_op = String(startNr + i)
        const suma = toXmlAmount(p.suma)
        const benName = String(ben?.name || p.beneficiary_name || '')
        const benCnp = String(ben?.cnp || p.beneficiary_cnp || '')
        const benIban = String(ben?.account || p.beneficiary_account || '')
        const codProgram = String(settings.programCode || '')
        const indAngajament = String(settings.commitmentIndicator || '')
        const codAngajament = String(settings.commitmentCode || '')
        return `<rand_op nr_op="${nr_op}" iban_platitor="${settings.account || ''}" den_trezorerie="TREZORERIA STATULUI" cod_program="${codProgram}" cod_angajament="${codAngajament}" ind_angajament="${indAngajament}" cui_beneficiar="${benCnp}" den_beneficiar="${benName}" iban_beneficiar="${benIban}" den_banca_trez="CEC BANK SA" suma_op="${suma}" explicatii="cv medicamente cf OG83 din 2015" />`
      })
      const totalCents = allItems.reduce((acc, p) => acc + p.suma, 0)
      const totalOpm = toXmlAmount(totalCents)
      const nrInregistrari = allItems.length
      const d = new Date(pkg.data_plata)
      const luna_r = String(d.getMonth() + 1).padStart(2, '0')
      const an = String(d.getFullYear())
      const data_document = fmtDate(pkg.data_plata)
      const nr_document = String(startNr).padStart(10, '0')
      const suma_control = String(totalCents)
      const headerAttrs = `versiune_pdf="A2.0.19" d_rec="0" suma_control="${suma_control}" total_opm="${totalOpm}" nr_inregistrari="${nrInregistrari}" luna_r="${luna_r}" an="${an}" data_document="${data_document}" nr_document="${nr_document}" nume_ip="${settings.name || ''}" adresa_ip="${settings.address || ''}" cui_ip="${settings.cui || ''}" tip_ent="1"`
      const xml = `<?xml version="1.0"?>\n<f1129 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="mfp:anaf:dgti:f1129:declaratie:v1" xmlns="mfp:anaf:dgti:f1129:declaratie:v1" ${headerAttrs}>\n${randuri.join('\n')}\n\n</f1129>`
      const blob = new Blob([xml], { type: 'application/xml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `plati ${fmtDate(pkg.data_plata)}.xml`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 0)
    } catch (e) {
      console.error('Eroare la generarea fișierului XML de plăți', e)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-semibold">Plăți în pachet</h3>
          <div className="flex items-center gap-2">
            <Label htmlFor="nextOpNumber">Urmatorul nr. OP</Label>
            <Input id="nextOpNumber" value={nextOpNumber} onChange={(e) => setNextOpNumber(e.target.value)} placeholder="ex: 1" className="w-24" />
            <Button type="button" variant="outline" onClick={generateFile}>Genereaza fisier plati</Button>
            <Button type="button" variant="outline" onClick={generateXml}>Genereaza fisier plati (XML)</Button>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger>
            <Button onClick={() => setEditingId(null)} className="gap-2">
              <Plus className="h-4 w-4" />
              Adaugă Plată
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editează Plată' : 'Adaugă Plată'}</DialogTitle>
              <DialogDescription>
                {editingId ? 'Actualizează detaliile plății' : 'Completează detaliile noii plăți'}
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const form = e.currentTarget as HTMLFormElement
                const fd = new FormData(form)
                const idBeneficiar = String(fd.get('idBeneficiar'))
                const sumaStr = String(fd.get('suma'))
                const nr_dosar = String(fd.get('nr_dosar') || '')
                const sumaLei = Number(sumaStr)
                const suma = Math.round(sumaLei * 100)
                if (!idBeneficiar || !Number.isFinite(sumaLei) || sumaLei <= 0) {
                  alert('Beneficiar și suma sunt obligatorii, suma trebuie să fie pozitivă (maxim 2 zecimale)')
                  return
                }
                handleSubmit({ idBeneficiar, suma, nr_dosar })
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="idBeneficiar">Beneficiar *</Label>
                <div className="flex gap-2">
                  <select name="idBeneficiar" defaultValue={editingPayment?.idBeneficiar || ''} className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm" required>
                    <option value="" disabled>Alege un beneficiar</option>
                    {beneficiaries.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                  <Input value={benQuery} onChange={(e) => setBenQuery(e.target.value)} placeholder="Caută" />
                  <Button type="button" variant="outline" onClick={() => loadBeneficiaries()}>Caută</Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="suma">Suma (lei) *</Label>
                <Input name="suma" type="number" step="0.01" min="0.01" defaultValue={editingPayment ? (editingPayment.suma / 100).toFixed(2) : ''} placeholder="ex: 3500.25" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nr_dosar">Nr. dosar</Label>
                <Input name="nr_dosar" defaultValue={editingPayment?.nr_dosar || ''} placeholder="ex: DOS-123" />
              </div>

              <Button type="submit" className="w-full">
                {editingId ? 'Salvează Modificări' : 'Adaugă Plată'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Beneficiar</TableHead>
              <TableHead>Suma (lei)</TableHead>
              <TableHead>Nr. dosar</TableHead>
              <TableHead className="w-24">Acțiuni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="py-6">Se încarcă...</TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  Nu sunt plăți în acest pachet. Apasă "Adaugă Plată" pentru a începe.
                </TableCell>
              </TableRow>
            ) : (
              items.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.beneficiary_name}</TableCell>
                  <TableCell>{(p.suma / 100).toFixed(2)}</TableCell>
                  <TableCell>{p.nr_dosar || '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setEditingId(p.id); setOpen(true) }}
                        className="p-1 hover:bg-muted rounded-md transition-colors"
                        title="Editează"
                      >
                        <Edit2 className="h-4 w-4 text-blue-600" />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="p-1 hover:bg-muted rounded-md transition-colors"
                        title="Șterge"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {typeof total === 'number' ? `Afișate ${Math.min(total - offset, items.length)} din ${total}` : `Afișate ${items.length}`}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={offset === 0 || loading}
            onClick={() => {
              const nextOffset = Math.max(0, offset - limit)
              setOffset(nextOffset)
              loadPayments({ offset: nextOffset })
            }}
          >
            Înapoi
          </Button>
          <Button
            variant="outline"
            disabled={loading || (typeof total === 'number' ? offset + limit >= total : items.length < limit)}
            onClick={() => {
              const nextOffset = offset + limit
              setOffset(nextOffset)
              loadPayments({ offset: nextOffset })
            }}
          >
            Înainte
          </Button>
        </div>
      </div>
    </div>
  )
}
