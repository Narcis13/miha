import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, RefreshCw } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { PaymentPackageForm, PaymentPackageInput } from './PaymentPackageForm'
import { PaymentsList } from './PaymentsList'

export interface PaymentPackageRow {
  id: string
  data_plata: number
  observatii: string
  created_at: number
  count_plati?: number
  total_suma?: number
}

export function PaymentPackages() {
  const API_BASE = 'http://localhost:3765'
  const [items, setItems] = useState<PaymentPackageRow[]>([])
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [limit, setLimit] = useState(25)
  const [offset, setOffset] = useState(0)
  const [total, setTotal] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')
  const [from, setFrom] = useState<string>('')
  const [to, setTo] = useState<string>('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const loadPackages = async (params?: { q?: string; from?: string; to?: string; limit?: number; offset?: number }) => {
    setLoading(true)
    try {
      const qp = new URLSearchParams()
      const qq = params?.q ?? q
      const ff = params?.from ?? from
      const tt = params?.to ?? to
      const ll = params?.limit ?? limit
      const oo = params?.offset ?? offset
      qp.set('limit', String(ll))
      qp.set('offset', String(oo))
      if (qq) qp.set('q', qq)
      if (ff) qp.set('from', String(Date.parse(ff)))
      if (tt) qp.set('to', String(Date.parse(tt)))
      const res = await fetch(`${API_BASE}/payment-packages?${qp.toString()}`)
      const data = await res.json()
      if (Array.isArray(data)) {
        setItems(data)
        setTotal(data.length)
      } else {
        setItems(data.items || [])
        setTotal(typeof data.total === 'number' ? data.total : null)
      }
    } catch (e) {
      console.error('Eroare la încărcare pachete', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPackages({ offset: 0 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAdd = async (data: PaymentPackageInput) => {
    try {
      const res = await fetch(`${API_BASE}/payment-packages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const body = await res.json()
      if (!res.ok) {
        alert(body.error || 'Eroare la adăugare pachet')
        return
      }
      await loadPackages({ offset: 0 })
      setOpen(false)
    } catch (e) {
      console.error('Eroare la adăugare pachet', e)
    }
  }

  const handleEdit = async (id: string, data: PaymentPackageInput) => {
    try {
      const res = await fetch(`${API_BASE}/payment-packages/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const body = await res.json()
      if (!res.ok) {
        alert(body.error || 'Eroare la editare pachet')
        return
      }
      await loadPackages()
      setEditingId(null)
      setOpen(false)
    } catch (e) {
      console.error('Eroare la editare pachet', e)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(`${API_BASE}/payment-packages/${id}`, { method: 'DELETE' })
      if (selectedId === id) setSelectedId(null)
      await loadPackages()
    } catch (e) {
      console.error('Eroare la ștergere pachet', e)
    }
  }

  const editingPackage = items.find((p) => p.id === editingId)

  const handleRefresh = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/payment-packages/${id}`)
      const body = await res.json()
      if (!res.ok) {
        alert(body.error || 'Eroare la recalcularea totalurilor')
        return
      }
      setItems((prev) => prev.map((p) => p.id === id ? { ...p, count_plati: body.count_plati, total_suma: body.total_suma } : p))
    } catch (e) {
      console.error('Eroare la refresh pachet', e)
    }
  }

  const fmtDate = (epochMs: number) => {
    const d = new Date(epochMs)
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Pachet plăți</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingId(null)} className="gap-2">
              <Plus className="h-4 w-4" />
              Adaugă Pachet
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editează Pachet' : 'Adaugă Pachet'}</DialogTitle>
              <DialogDescription>
                {editingId ? 'Actualizează detaliile pachetului' : 'Completează detaliile noului pachet'}
              </DialogDescription>
            </DialogHeader>
            <PaymentPackageForm
              initialData={editingPackage && { data_plata: editingPackage.data_plata, observatii: editingPackage.observatii }}
              onSubmit={(data) => { editingId ? handleEdit(editingId!, data) : handleAdd(data) }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Caută în observații" />
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <Button onClick={() => { setOffset(0); loadPackages({ q, from, to, offset: 0 }) }}>Caută</Button>
        <select
          value={limit}
          onChange={(e) => { setLimit(Number(e.target.value)); setOffset(0); loadPackages({ limit: Number(e.target.value), offset: 0 }) }}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data plății</TableHead>
              <TableHead>Observații</TableHead>
              <TableHead>Nr. plăți</TableHead>
              <TableHead>Total (lei)</TableHead>
              <TableHead className="w-32">Acțiuni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-6">Se încarcă...</TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Nu sunt pachete create. Apasă "Adaugă Pachet" pentru a începe.
                </TableCell>
              </TableRow>
            ) : (
              items.map((pkg) => (
                <TableRow key={pkg.id} className={selectedId === pkg.id ? 'bg-muted/50' : ''}>
                  <TableCell className="font-medium cursor-pointer" onClick={() => setSelectedId(pkg.id)}>{fmtDate(pkg.data_plata)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{pkg.observatii || '-'}</TableCell>
                  <TableCell>{pkg.count_plati ?? '-'}</TableCell>
                  <TableCell>{typeof pkg.total_suma === 'number' ? (pkg.total_suma / 100).toFixed(2) : '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRefresh(pkg.id)}
                        className="p-1 hover:bg-muted rounded-md transition-colors"
                        title="Refresh"
                      >
                        <RefreshCw className="h-4 w-4 text-emerald-600" />
                      </button>
                      <button
                        onClick={() => { setEditingId(pkg.id); setOpen(true) }}
                        className="p-1 hover:bg-muted rounded-md transition-colors"
                        title="Editează"
                      >
                        <Edit2 className="h-4 w-4 text-blue-600" />
                      </button>
                      <button
                        onClick={() => handleDelete(pkg.id)}
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
              loadPackages({ offset: nextOffset })
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
              loadPackages({ offset: nextOffset })
            }}
          >
            Înainte
          </Button>
        </div>
      </div>

      {selectedId && (
        <div className="mt-8">
          <h3 className="text-xl font-semibold">Plăți pentru pachetul selectat</h3>
          <PaymentsList packageId={selectedId} />
        </div>
      )}
    </div>
  )
}
