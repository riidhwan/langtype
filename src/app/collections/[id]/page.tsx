import { getCollection } from "@/services/challengeService"
import { TypingGame } from "@/components/features/TypingGame"
import { notFound } from "next/navigation"

interface Props {
    params: Promise<{
        id: string
    }>
}

export default async function CollectionGamePage({ params }: Props) {
    const { id } = await params
    const collection = await getCollection(id)

    if (!collection) {
        notFound()
    }

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24 bg-background">
            <div className="mb-4 text-center">
                <h2 className="text-xl text-muted-foreground">{collection.title}</h2>
            </div>
            <TypingGame challenges={collection.challenges || []} />
        </main>
    )
}
