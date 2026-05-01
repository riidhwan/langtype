import { createFileRoute } from '@tanstack/react-router'
import { DictionaryBrowser } from '@/components/features/DictionaryBrowser'

export const Route = createFileRoute('/dictionary')({
    component: DictionaryPage,
})

export function DictionaryPage() {
    return <DictionaryBrowser />
}
