import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export interface PaymentPackageInput {
  data_plata: number
  observatii?: string
}

interface PaymentPackageFormProps {
  initialData?: { data_plata: number; observatii?: string }
  onSubmit: (data: PaymentPackageInput) => void
}

export function PaymentPackageForm({ initialData, onSubmit }: PaymentPackageFormProps) {
  const [formData, setFormData] = useState({
    data_plata: initialData?.data_plata || Date.now(),
    observatii: initialData?.observatii || '',
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    if (name === 'data_plata') {
      const epoch = Date.parse(value)
      setFormData((prev) => ({ ...prev, data_plata: Number.isFinite(epoch) ? epoch : prev.data_plata }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  const toDateInputValue = (epochMs: number) => {
    const d = new Date(epochMs)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.data_plata) {
      alert('Vă rugăm selectați data plății')
      return
    }
    onSubmit({ data_plata: formData.data_plata, observatii: formData.observatii })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="data_plata">Data plății *</Label>
        <Input
          id="data_plata"
          name="data_plata"
          type="date"
          value={toDateInputValue(formData.data_plata)}
          onChange={handleChange}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="observatii">Observații</Label>
        <Textarea
          id="observatii"
          name="observatii"
          value={formData.observatii}
          onChange={handleChange}
          placeholder="Note despre pachetul de plăți"
          rows={3}
        />
      </div>

      <Button type="submit" className="w-full">
        {initialData ? 'Salvează Modificări' : 'Adaugă Pachet'}
      </Button>
    </form>
  )
}

