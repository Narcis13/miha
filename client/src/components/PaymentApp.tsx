import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BeneficiariesList } from '@/components/BeneficiariesList'
import { PaymentPackages } from '@/components/PaymentPackages'
import { InstitutionSettings } from '@/components/InstitutionSettings'
import { Users, Settings, CreditCard } from 'lucide-react'

export function PaymentApp() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">Sistem de Gestionare Plăți</h1>
          <p className="text-muted-foreground">
            Gestionează beneficiari și efectuează plăți ușor și rapid. Cu dedicatie pentru colega Mihaela FLOREA!
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <Tabs defaultValue="beneficiaries" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="beneficiaries" className="gap-2">
              <Users className="h-4 w-4" />
              Beneficiari
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              Setări
            </TabsTrigger>
            <TabsTrigger value="packages" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Pachet plăți
            </TabsTrigger>
          </TabsList>

          <TabsContent value="beneficiaries" className="mt-6">
            <BeneficiariesList />
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <InstitutionSettings />
          </TabsContent>

          <TabsContent value="packages" className="mt-6">
            <PaymentPackages />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
