import { createFileRoute } from '@tanstack/react-router'
import { DictionaryPage } from '@/components/features/DictionaryPage'

export const Route = createFileRoute('/dictionary')({
    component: DictionaryPage,
})
