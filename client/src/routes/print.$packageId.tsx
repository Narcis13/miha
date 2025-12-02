import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'

interface SettingsRow {
  name: string
  cui: string
  account: string
  bankName: string
  address: string
  contact: string
  responsibleName?: string
  cfppVisaHolder?: string
}

interface PaymentPackageRow {
  id: string
  data_plata: number
  observatii: string
  created_at: number
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

const API_BASE = 'http://localhost:3765'

export const Route = createFileRoute('/print/$packageId')({
  component: PrintPage,
})

function fmtShortDate(epochMs: number) {
  const d = new Date(epochMs)
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
}

function fmtLongDate(d: Date) {
  return d.toLocaleDateString('ro-RO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

function PrintPage() {
  const { packageId } = Route.useParams()
  const [settings, setSettings] = useState<SettingsRow | null>(null)
  const [pkg, setPkg] = useState<PaymentPackageRow | null>(null)
  const [items, setItems] = useState<PaymentRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [sRes, pRes, payRes] = await Promise.all([
          fetch(`${API_BASE}/settings`),
          fetch(`${API_BASE}/payment-packages/${packageId}`),
          fetch(`${API_BASE}/payments?packageId=${packageId}&limit=5000&offset=0`),
        ])
        const s = await sRes.json()
        const p = await pRes.json()
        const pays = await payRes.json()
        if (!sRes.ok || !pRes.ok || !payRes.ok) {
          alert('Eroare la încărcarea raportului')
          return
        }
        setSettings(s)
        setPkg(p)
        setItems(Array.isArray(pays) ? pays : pays.items || [])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [packageId])

  const today = useMemo(() => new Date(), [])
  const totalSum = useMemo(() => items.reduce((acc, p) => acc + (Number(p.suma) || 0), 0), [items])

  return (
    <div className="min-h-screen bg-white text-black">{
      loading ? (
        <div className="p-6">Se încarcă raportul...</div>
      ) : !pkg ? (
        <div className="p-6">Pachetul nu a fost găsit.</div>
      ) : (
        <div>
          <div className="no-print p-4 flex gap-2 border-b sticky top-0 bg-white z-10">
            <button
              onClick={() => window.print()}
              className="h-9 px-3 rounded-md border border-gray-300 hover:bg-gray-100"
            >
              Printează
            </button>
            <div className="text-sm text-gray-600">Data plății: {fmtShortDate(pkg.data_plata)} • Beneficiari: {items.length}</div>
          </div>

          <section className="a4-doc mx-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th colSpan={6} className="text-left align-top">
                    <div className="flex justify-between">
                      <div className="text-sm">
                        <div className="font-semibold">ROMÂNIA</div>
                        <div>MINISTERUL APĂRĂRII NAȚIONALE</div>
                        <div>{settings?.name || 'UM ________'}</div>
                      </div>
                      <div className="text-sm text-right">
                        <div>Neclasificat</div>
                        <div>Exemplar unic</div>
                      </div>
                    </div>
                    <div className="mt-3 text-center">
                      <div className="font-bold text-lg">STAT DE PLATĂ</div>
                      <div className="text-sm">pentru decontarea medicamentelor pensionarilor militari cf. M 110/2009</div>
                    </div>
                    <div className="flex justify-between text-sm mt-2">
                      <div>Nr. .......... din ..........</div>
                      <div>Data plății: {fmtShortDate(pkg.data_plata)}</div>
                    </div>
                  </th>
                </tr>
                <tr>
                  <th className="border px-2 py-1 w-24 text-left">Nr. Dosar</th>
                  <th className="border px-2 py-1 text-left">Nume și prenume</th>
                  <th className="border px-2 py-1 w-40 text-left">CNP</th>
                  <th className="border px-2 py-1 w-[360px] text-left">IBAN</th>
                  <th className="border px-2 py-1 w-24 text-right">Suma</th>
                  <th className="border px-2 py-1 w-28 text-center">Semnatura/OP</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id} className="break-inside-avoid">
                    <td className="border px-2 py-1">{p.nr_dosar || ''}</td>
                    <td className="border px-2 py-1">{p.beneficiary_name}</td>
                    <td className="border px-2 py-1">{p.beneficiary_cnp || ''}</td>
                    <td className="border px-2 py-1">{p.beneficiary_account || ''}</td>
                    <td className="border px-2 py-1 text-right">{(p.suma / 100).toFixed(2)}</td>
                    <td className="border px-2 py-1" />
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4">
              <div className="text-right font-semibold">TOTAL GENERAL: {(totalSum / 100).toFixed(2)}</div>
              <div className="mt-10 flex justify-between text-sm">
                <div>INTOCMIT: {settings?.responsibleName || ''}</div>
                <div>VIZAT CFPP: {settings?.cfppVisaHolder || ''}</div>
              </div>
            </div>

            <div className="mt-3 text-xs flex justify-between">
              <div>{fmtLongDate(today)}</div>
            </div>
          </section>

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
        </div>
      )
    }</div>
  )
}
