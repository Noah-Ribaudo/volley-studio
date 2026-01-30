'use client'

import { use, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface TeamPageProps {
  params: Promise<{ slug: string }>
}

export default function TeamPage({ params }: TeamPageProps) {
  const { slug } = use(params)
  const router = useRouter()

  useEffect(() => {
    router.replace(`/volleyball?team=${encodeURIComponent(slug)}`)
  }, [router, slug])

  return null
}











