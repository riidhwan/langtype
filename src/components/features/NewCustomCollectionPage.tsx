import { Navigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { CustomCollection, useCustomCollectionsStore } from '@/store/useCustomCollectionsStore'

export function NewCustomCollectionPage() {
    const createDraft = useCustomCollectionsStore((s) => s.createDraft)
    const hasHydrated = useCustomCollectionsStore((s) => s._hasHydrated)
    const [draft, setDraft] = useState<CustomCollection | null>(null)

    useEffect(() => {
        if (!hasHydrated || draft) return
        setDraft(createDraft())
    }, [createDraft, draft, hasHydrated])

    if (!draft) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-background p-4 text-sm text-muted-foreground">
                {hasHydrated ? 'Creating draft...' : 'Loading collections...'}
            </main>
        )
    }

    return <Navigate to="/custom-collections/$id/edit" params={{ id: draft.id }} replace />
}
