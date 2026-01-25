import { Collection } from '@/types/challenge'
import path from 'path'
import { promises as fs } from 'fs'

const DATA_DIR = path.join(process.cwd(), 'src/data/collections')

// Note: In a real app we might want to return a lighter type for the list (CollectionSummary?)
// But for now Collection works if we make challenges optional or just use the index data which matches
export async function getCollections(): Promise<Collection[]> {
    const filePath = path.join(DATA_DIR, 'index.json')
    const fileContents = await fs.readFile(filePath, 'utf8')
    // The index.json doesn't have challenges array, but our type expects it.
    // We should update the type or cast it. For simplicity, let's cast or update type.
    // Actually, better to update the type to make challenges optional or create a CollectionSummary type.
    // Ideally, let's just assert it for now as partial data is fine for the listing page.
    return JSON.parse(fileContents) as Collection[]
}

export async function getCollection(id: string): Promise<Collection | undefined> {
    try {
        const filePath = path.join(DATA_DIR, `${id}.json`)
        const fileContents = await fs.readFile(filePath, 'utf8')
        return JSON.parse(fileContents) as Collection
    } catch (error) {
        return undefined
    }
}
