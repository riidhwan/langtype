export interface Challenge {
    id: string
    original: string
    translation: string
}

export interface Collection {
    id: string
    title: string
    description?: string
    challenges?: Challenge[]
}
