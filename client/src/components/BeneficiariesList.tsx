import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { BeneficiaryForm } from './BeneficiaryForm'

export interface Beneficiary {
  id: string
  name: string
  cnp: string
  account: string
  observations: string
}

export function BeneficiariesList() {
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([])
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const API_BASE = 'http://localhost:3765'
  const [q, setQ] = useState('')
  const [limit, setLimit] = useState(50)
  const [offset, setOffset] = useState(0)
  const [total, setTotal] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  const loadBeneficiaries = async (params?: { q?: string; limit?: number; offset?: number }) => {
    setLoading(true)
    try {
      const qp = new URLSearchParams()
      const qq = params?.q ?? q
      const ll = params?.limit ?? limit
      const oo = params?.offset ?? offset
      qp.set('limit', String(ll))
      qp.set('offset', String(oo))
      if (qq) qp.set('q', qq)
      const res = await fetch(`${API_BASE}/beneficiaries?${qp.toString()}`)
      const data = await res.json()
      if (Array.isArray(data)) {
        setBeneficiaries(data)
        setTotal(data.length)
      } else {
        setBeneficiaries(data.items || [])
        setTotal(typeof data.total === 'number' ? data.total : null)
      }
    } catch (e) {
      console.error('Eroare la încărcare beneficiari', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBeneficiaries()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAdd = async (data: Omit<Beneficiary, 'id'>) => {
    try {
      const res = await fetch(`${API_BASE}/beneficiaries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const body = await res.json()
      if (!res.ok) {
        alert(body.error || 'Eroare la adăugare beneficiar')
        return
      }
      await loadBeneficiaries({ offset: 0 })
      setOpen(false)
    } catch (e) {
      console.error('Eroare la adăugare beneficiar', e)
    }
  }

  const handleEdit = async (id: string, data: Omit<Beneficiary, 'id'>) => {
    try {
      const res = await fetch(`${API_BASE}/beneficiaries/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const body = await res.json()
      if (!res.ok) {
        alert(body.error || 'Eroare la editare beneficiar')
        return
      }
      await loadBeneficiaries()
      setEditingId(null)
      setOpen(false)
    } catch (e) {
      console.error('Eroare la editare beneficiar', e)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(`${API_BASE}/beneficiaries/${id}`, { method: 'DELETE' })
      await loadBeneficiaries()
    } catch (e) {
      console.error('Eroare la ștergere beneficiar', e)
    }
  }

  const editingBeneficiary = beneficiaries.find((b) => b.id === editingId)

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Beneficiari</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => setEditingId(null)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Adaugă Beneficiar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Editează Beneficiar' : 'Adaugă Beneficiar'}
              </DialogTitle>
              <DialogDescription>
                {editingId
                  ? 'Actualizează informațiile beneficiarului'
                  : 'Completează detaliile noului beneficiar'}
              </DialogDescription>
            </DialogHeader>
            <BeneficiaryForm
              initialData={editingBeneficiary}
              onSubmit={(data) => {
                if (editingId) {
                  handleEdit(editingId, data)
                } else {
                  handleAdd(data)
                }
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Caută nume/CNP/IBAN"
          className="flex h-9 w-full max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <Button onClick={() => { setOffset(0); loadBeneficiaries({ q, offset: 0 }) }}>Caută</Button>
        <select
          value={limit}
          onChange={(e) => { setLimit(Number(e.target.value)); setOffset(0); loadBeneficiaries({ limit: Number(e.target.value), offset: 0 }) }}
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
              <TableHead>Nume</TableHead>
              <TableHead>CNP</TableHead>
              <TableHead>Cont Bancar</TableHead>
              <TableHead>Observații</TableHead>
              <TableHead className="w-24">Acțiuni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-6">Se încarcă...</TableCell>
              </TableRow>
            ) : beneficiaries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Nu sunt beneficiari adăugați. Apasă "Adaugă Beneficiar" pentru a începe.
                </TableCell>
              </TableRow>
            ) : (
              beneficiaries.map((beneficiary) => (
                <TableRow key={beneficiary.id}>
                  <TableCell className="font-medium">{beneficiary.name}</TableCell>
                  <TableCell>{beneficiary.cnp}</TableCell>
                  <TableCell>{beneficiary.account}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                    {beneficiary.observations || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingId(beneficiary.id)
                          setOpen(true)
                        }}
                        className="p-1 hover:bg-muted rounded-md transition-colors"
                        title="Editează"
                      >
                        <Edit2 className="h-4 w-4 text-blue-600" />
                      </button>
                      <button
                        onClick={() => handleDelete(beneficiary.id)}
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
          {typeof total === 'number' ? `Afișate ${Math.min(total - offset, beneficiaries.length)} din ${total}` : `Afișate ${beneficiaries.length}`}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={offset === 0 || loading}
            onClick={() => {
              const nextOffset = Math.max(0, offset - limit)
              setOffset(nextOffset)
              loadBeneficiaries({ offset: nextOffset })
            }}
          >
            Înapoi
          </Button>
          <Button
            variant="outline"
            disabled={loading || (typeof total === 'number' ? offset + limit >= total : beneficiaries.length < limit)}
            onClick={() => {
              const nextOffset = offset + limit
              setOffset(nextOffset)
              loadBeneficiaries({ offset: nextOffset })
            }}
          >
            Înainte
          </Button>
        </div>
      </div>
    </div>
  )
}
