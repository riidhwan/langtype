import { createFileRoute } from '@tanstack/react-router'
import { NewCustomCollectionPage } from '@/components/features/NewCustomCollectionPage'

export const Route = createFileRoute('/custom-collections/new')({
    component: NewCustomCollectionPage,
})
