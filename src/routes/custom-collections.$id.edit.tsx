import { createFileRoute } from '@tanstack/react-router'
import { EditCustomCollectionPage } from '@/components/features/EditCustomCollectionPage'

export const Route = createFileRoute('/custom-collections/$id/edit')({
    component: EditCustomCollectionRoute,
})

function EditCustomCollectionRoute() {
    const { id } = Route.useParams()
    return <EditCustomCollectionPage id={id} />
}
