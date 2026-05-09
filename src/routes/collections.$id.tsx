import { createFileRoute, notFound, useNavigate } from '@tanstack/react-router'
import {
    CollectionGamePage,
    type CollectionLoaderData,
    type CollectionSearchState,
} from '@/components/features/CollectionGamePage'
import { getCollection } from '@/services/challengeService'
import { isCustomCollectionId } from '@/store/useCustomCollectionsStore'

export const Route = createFileRoute('/collections/$id')({
    component: CollectionGameRoute,
    loader: async ({ params }) => {
        if (isCustomCollectionId(params.id)) {
            return { kind: 'custom' as const, id: params.id }
        }

        const collection = await getCollection(params.id)
        if (!collection) {
            throw notFound()
        }
        return { kind: 'bundled' as const, collection }
    },
    validateSearch: (search: Record<string, unknown>): CollectionSearchState => {
        const raw = search.questionId

        let questionId: string | number | undefined
        if (typeof raw === 'number') {
            questionId = raw
        } else if (typeof raw === 'string') {
            let qId = raw
            if (qId.startsWith('"') && qId.endsWith('"')) {
                qId = qId.slice(1, -1)
            }
            const num = Number(qId)
            if (!isNaN(num) && qId.trim() !== '') {
                questionId = num
            } else {
                questionId = qId
            }
        }

        const rawMode = search.mode
        const mode = rawMode === 'srs' ? 'srs' : rawMode === 'normal' ? 'normal' : undefined

        const view = search.view === 'progress' ? ('progress' as const) : undefined

        return { questionId, mode, view }
    },
})

function CollectionGameRoute() {
    const loaderData = Route.useLoaderData() as CollectionLoaderData
    const search = Route.useSearch()
    const navigate = useNavigate({ from: Route.fullPath })

    const goToPicker = () => navigate({ search: () => ({}) })
    const startNormal = () => navigate({ search: () => ({ mode: 'normal' as const }) })
    const startSRS = () => navigate({ search: () => ({ mode: 'srs' as const }) })
    const goToProgress = () => navigate({ search: () => ({ view: 'progress' as const }) })

    return (
        <CollectionGamePage
            loaderData={loaderData}
            search={search}
            onGoToPicker={goToPicker}
            onStartNormal={startNormal}
            onStartSRS={startSRS}
            onGoToProgress={goToProgress}
            onQuestionChange={(newId) => {
                const numericId = Number(newId)
                const isNumeric = !isNaN(numericId) && newId.trim() !== ''
                navigate({
                    search: (prev) => ({
                        ...prev,
                        questionId: isNumeric ? numericId : newId,
                    }),
                    replace: true,
                })
            }}
        />
    )
}
