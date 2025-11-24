import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Beneficiary } from './BeneficiariesList'

interface BeneficiaryFormProps {
  initialData?: Omit<Beneficiary, 'id'>
  onSubmit: (data: Omit<Beneficiary, 'id'>) => void
}

export function BeneficiaryForm({ initialData, onSubmit }: BeneficiaryFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    cnp: initialData?.cnp || '',
    account: initialData?.account || '',
    observations: initialData?.observations || '',
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.cnp || !formData.account) {
      alert('Vă rugăm completați câmpurile obligatorii (Nume, CNP, Cont Bancar)')
      return
    }
    onSubmit(formData)
    setFormData({ name: '', cnp: '', account: '', observations: '' })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nume *</Label>
        <Input
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Introduceți numele beneficiarului"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cnp">CNP *</Label>
        <Input
          id="cnp"
          name="cnp"
          value={formData.cnp}
          onChange={handleChange}
          placeholder="ex: 1234567890123"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="account">Cont Bancar *</Label>
        <Input
          id="account"
          name="account"
          value={formData.account}
          onChange={handleChange}
          placeholder="ex: RO12ABCD1234567890123456"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="observations">Observații</Label>
        <Textarea
          id="observations"
          name="observations"
          value={formData.observations}
          onChange={handleChange}
          placeholder="Introduceți orice observații relevante"
          rows={3}
        />
      </div>

      <Button type="submit" className="w-full">
        {initialData ? 'Salvează Modificări' : 'Adaugă Beneficiar'}
      </Button>
    </form>
  )
}
