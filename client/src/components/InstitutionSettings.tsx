import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export interface InstitutionSettings {
  name: string
  cui: string
  account: string
  bankName: string
  address: string
  contact: string
  programCode?: string
  commitmentCode?: string
  commitmentIndicator?: string
}

export function InstitutionSettings() {
  const [settings, setSettings] = useState<InstitutionSettings>({
    name: '',
    cui: '',
    account: '',
    bankName: '',
    address: '',
    contact: '',
    programCode: '',
    commitmentCode: '',
    commitmentIndicator: '',
  })

  const [isSaved, setIsSaved] = useState(false)
  const API_BASE = 'http://localhost:3765'

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch(`${API_BASE}/settings`)
        const data = await res.json()
        setSettings(data)
      } catch (e) {
        console.error('Eroare la încărcare setări', e)
      }
    })()
  }, [])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setSettings((prev) => ({ ...prev, [name]: value }))
    setIsSaved(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!settings.name || !settings.cui || !settings.account) {
      alert('Vă rugăm completați câmpurile obligatorii')
      return
    }
    try {
      const res = await fetch(`${API_BASE}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      const body = await res.json()
      if (!res.ok) {
        alert(body.error || 'Eroare la salvare setări')
        return
      }
      setSettings(body)
      setIsSaved(true)
      setTimeout(() => setIsSaved(false), 3000)
    } catch (e) {
      console.error('Eroare la salvare setări', e)
    }
  }

  const loadSettings = async () => {
    try {
      const res = await fetch(`${API_BASE}/settings`)
      const data = await res.json()
      setSettings(data)
    } catch (e) {
      console.error('Eroare la reîncărcare setări', e)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Setări Instituție</h2>
        <p className="text-muted-foreground">
          Configurează detaliile instituției care efectuează plăți
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Denumire Instituție *</Label>
            <Input
              id="name"
              name="name"
              value={settings.name}
              onChange={handleChange}
              placeholder="ex: ONG-ul Ajutor Social"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cui">CUI *</Label>
            <Input
              id="cui"
              name="cui"
              value={settings.cui}
              onChange={handleChange}
              placeholder="ex: 12345678"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="account">Cont Bancar Instituție *</Label>
            <Input
              id="account"
              name="account"
              value={settings.account}
              onChange={handleChange}
              placeholder="ex: RO12ABCD1234567890123456"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bankName">Banca</Label>
            <Input
              id="bankName"
              name="bankName"
              value={settings.bankName}
              onChange={handleChange}
              placeholder="ex: Banca Transilvania"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Adresă</Label>
          <Textarea
            id="address"
            name="address"
            value={settings.address}
            onChange={handleChange}
            placeholder="Introduceți adresa instituției"
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact">Contact (telefon/email)</Label>
          <Input
            id="contact"
            name="contact"
            value={settings.contact}
            onChange={handleChange}
            placeholder="ex: +40 123 456 789 / contact@institutie.ro"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="programCode">Cod program</Label>
            <Input
              id="programCode"
              name="programCode"
              value={settings.programCode || ''}
              onChange={handleChange}
              placeholder="ex: 0000001905"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="commitmentCode">Cod angajament</Label>
            <Input
              id="commitmentCode"
              name="commitmentCode"
              value={settings.commitmentCode || ''}
              onChange={handleChange}
              placeholder="ex: AAAX9HRFR52"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="commitmentIndicator">Indicator angajament</Label>
            <Input
              id="commitmentIndicator"
              name="commitmentIndicator"
              value={settings.commitmentIndicator || ''}
              onChange={handleChange}
              placeholder="ex: AA2"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <Button type="submit">Salvează Setări</Button>
          <Button type="button" variant="outline" onClick={loadSettings}>
            Reîncarcă din Server
          </Button>
        </div>

        {isSaved && (
          <div className="bg-green-50 text-green-800 p-3 rounded-md">
            Setări salvate cu succes!
          </div>
        )}
      </form>
    </div>
  )
}
