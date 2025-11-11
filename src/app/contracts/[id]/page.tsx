'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function LegacyContractDetailRedirectPage() {
  const router = useRouter()
  const params = useParams<{ id: string | string[] }>()
  const contractId = Array.isArray(params?.id) ? params.id[0] : params?.id

  useEffect(() => {
    if (!contractId) return
    router.replace(`/contract/${contractId}`)
  }, [contractId, router])

  return null
}

