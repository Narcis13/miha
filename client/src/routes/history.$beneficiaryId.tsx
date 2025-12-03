import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { API_BASE } from '@/lib/api-config'

interface PaymentPackageRow {
  id: string
  data_plata: number
}

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

export const Route = createFileRoute('/history/$beneficiaryId')({
  component: HistoryPage,
})

function fmtShortDate(epochMs: number) {
  const d = new Date(epochMs)
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
}

function HistoryPage() {
  const { beneficiaryId } = Route.useParams()
  const [rows, setRows] = useState<Array<{ data_plata: number; payment: PaymentRow }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const sp = new URLSearchParams(window.location.search)
        const from = Number(sp.get('from') || '')
        const to = Number(sp.get('to') || '')
        const qp = new URLSearchParams()
        qp.set('limit', '5000')
        qp.set('offset', '0')
        if (Number.isFinite(from) && from > 0) qp.set('from', String(from))
        if (Number.isFinite(to) && to > 0) qp.set('to', String(to))
        const pkgRes = await fetch(`${API_BASE}/payment-packages?${qp.toString()}`)
        const pkgBody = await pkgRes.json()
        const pkgs: PaymentPackageRow[] = Array.isArray(pkgBody) ? pkgBody : pkgBody.items || []
        const paymentsByPkg = await Promise.all(
          pkgs.map(async (p) => {
            const ps = new URLSearchParams()
            ps.set('packageId', p.id)
            ps.set('beneficiaryId', beneficiaryId)
            ps.set('limit', '5000')
            ps.set('offset', '0')
            const res = await fetch(`${API_BASE}/payments?${ps.toString()}`)
            const body = await res.json()
            const items: PaymentRow[] = Array.isArray(body) ? body : body.items || []
            return items.map((it) => ({ data_plata: p.data_plata, payment: it }))
          })
        )
        const flat = paymentsByPkg.flat()
        flat.sort((a, b) => a.data_plata - b.data_plata)
        setRows(flat)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [beneficiaryId])

  const totalSum = useMemo(() => rows.reduce((acc, r) => acc + (Number(r.payment.suma) || 0), 0), [rows])
  const benName = rows[0]?.payment.beneficiary_name || ''
  const benCnp = rows[0]?.payment.beneficiary_cnp || ''
  const benIban = rows[0]?.payment.beneficiary_account || ''

  return (
    <div className="min-h-screen bg-white text-black">
      {loading ? (
        <div className="p-6">Se încarcă raportul...</div>
      ) : rows.length === 0 ? (
        <div className="p-6">
          <div className="no-print mb-4">
            <button
              onClick={() => window.print()}
              className="h-9 px-3 rounded-md border border-gray-300 hover:bg-gray-100"
            >
              Printează
            </button>
          </div>
          Nu există plăți pentru perioada selectată.
        </div>
      ) : (
        <div>
          <div className="no-print p-4 flex gap-2 border-b sticky top-0 bg-white z-10">
            <button
              onClick={() => window.print()}
              className="h-9 px-3 rounded-md border border-gray-300 hover:bg-gray-100"
            >
              Printează
            </button>
            <div className="text-sm text-gray-600">Beneficiar: {benName} {benCnp ? `• CNP ${benCnp}` : ''} {benIban ? `• IBAN ${benIban}` : ''}</div>
          </div>

          <section className="a4-doc mx-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="border px-2 py-1 w-28 text-left">Data plății</th>
                  <th className="border px-2 py-1 w-32 text-left">Nr. dosar</th>
                  <th className="border px-2 py-1 w-24 text-right">Suma</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.payment.id} className="break-inside-avoid">
                    <td className="border px-2 py-1">{fmtShortDate(r.data_plata)}</td>
                    <td className="border px-2 py-1">{r.payment.nr_dosar || ''}</td>
                    <td className="border px-2 py-1 text-right">{(r.payment.suma / 100).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4">
              <div className="text-right font-semibold">TOTAL GENERAL: {(totalSum / 100).toFixed(2)}</div>
            </div>

            <style>{`
              @page { size: A4; margin: 12mm; }
              @media print {
                .no-print { display: none; }
                body { background: white; }
                thead { display: table-header-group; }
              }
              .a4-doc { width: 210mm; }
              .break-inside-avoid { break-inside: avoid; }
            `}</style>
          </section>
        </div>
      )}
    </div>
  )
}

