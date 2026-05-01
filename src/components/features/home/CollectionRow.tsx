import { Link } from '@tanstack/react-router'
import type { HomeCollectionRow } from '@/lib/homeCollections'
import { IconChevronRight, IconEdit } from '@/components/ui/icons'

interface Props {
    row: HomeCollectionRow
}

export function CollectionRow({ row }: Props) {
    const { collection, dueCount, isCustom } = row

    return (
        <div className="flex items-stretch transition-colors hover:bg-[var(--bg3)]">
            <Link
                to="/collections/$id"
                params={{ id: collection.id }}
                preload={false}
                className="block min-w-0 flex-1 group"
            >
                <div className="flex items-center justify-between px-4 py-4 gap-4">
                    <div className="min-w-0">
                        <div className="mb-0.5 flex flex-wrap items-center gap-2">
                            <h2 className="text-[15px] font-semibold group-hover:text-primary transition-colors">
                                {collection.title}
                            </h2>
                            {isCustom && (
                                <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
                                    Custom
                                </span>
                            )}
                        </div>
                        {collection.description && (
                            <p className="text-sm text-muted-foreground leading-snug">{collection.description}</p>
                        )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {dueCount > 0 && (
                            <span className="bg-primary text-primary-foreground rounded-full px-2.5 py-0.5 text-[11px] font-bold font-mono leading-5">
                                {dueCount} due
                            </span>
                        )}
                        <IconChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                </div>
            </Link>
            {isCustom && (
                <Link
                    to="/custom-collections/$id/edit"
                    params={{ id: collection.id }}
                    title="Edit collection"
                    className="flex shrink-0 items-center border-l border-border px-4 text-muted-foreground transition-colors hover:bg-[var(--bg2)] hover:text-foreground"
                >
                    <IconEdit className="h-4 w-4" />
                    <span className="sr-only">Edit {collection.title}</span>
                </Link>
            )}
        </div>
    )
}
