import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const csv = readFileSync(join(__dirname, '../src/data/collections/raw/netzwerk_neu_a1_kapitel_2_nomen.csv'), 'utf-8')

const challenges = csv.trim().split('\n').map((line, i) => {
    const parts = line.trim().split(' ')
    const article = parts[0]           // der / die / das
    const noun = parts.slice(1).join(' ')  // rest (handles compound nouns with spaces)
    return {
        id: String(i + 1),
        translation: `${article} (${noun})`,
    }
})

const collection = {
    id: 'netzwerk_neu_a1_k2_artikel',
    title: 'Netzwerk Neu A1 — Kapitel 2: Artikel',
    description: 'Type the article (der/die/das) for each noun from Netzwerk Neu A1, Kapitel 2.',
    challenges,
}

const out = join(__dirname, '../src/data/collections/netzwerk_neu_a1_k2_artikel.json')
writeFileSync(out, JSON.stringify(collection, null, 4))
console.log(`Wrote ${challenges.length} challenges → ${out}`)
