import { notFound } from 'next/navigation'
import DevLogoSection from '@/components/dev/DevLogoSection'

export default function DeveloperLogoLabPage() {
  if (process.env.NODE_ENV !== 'development') {
    notFound()
  }

  return (
    <main className="min-h-screen">
      <div className="container mx-auto px-4 py-6 pb-32 max-w-5xl space-y-4">
        <h1 className="text-xl font-semibold">Logo Lab</h1>
        <DevLogoSection />
      </div>
    </main>
  )
}
