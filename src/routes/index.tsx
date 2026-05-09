import { createFileRoute } from '@tanstack/react-router'
import { HomePage } from '@/components/features/HomePage'
import { getCollections } from '@/services/challengeService'

export const Route = createFileRoute('/')({
    component: Home,
    loader: async () => {
        const collections = await getCollections()
        return { collections }
    },
})

function Home() {
    const { collections } = Route.useLoaderData()
    return <HomePage collections={collections} />
}
