'use client'

import { use, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface TeamPageProps {
  params: Promise<{ id: string }>
}

export default function TeamPage({ params }: TeamPageProps) {
  const { id } = use(params)
  const router = useRouter()

  useEffect(() => {
    router.replace(`/teams/${encodeURIComponent(id)}`)
  }, [router, id])

  return null
}
