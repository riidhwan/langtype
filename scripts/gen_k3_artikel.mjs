import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const csv = readFileSync(join(__dirname, '../src/data/collections/raw/netzwerk_neu_a1_kapitel_3_nomen.csv'), 'utf-8')

const challenges = csv.trim().split('\n').map((line, i) => {
    const commaIdx = line.indexOf(',')
    const german = (commaIdx === -1 ? line : line.slice(0, commaIdx)).trim()
    const english = commaIdx === -1 ? '' : line.slice(commaIdx + 1).trim()

    const spaceIdx = german.indexOf(' ')
    const article = german.slice(0, spaceIdx)
    const noun = german.slice(spaceIdx + 1)

    const challenge = {
        id: String(i + 1),
        translation: `${article} (${noun})`,
    }
    if (english) challenge.original = english
    return challenge
})

const collection = {
    id: 'netzwerk_neu_a1_k3_artikel',
    title: 'Netzwerk Neu A1 — Kapitel 3: Artikel',
    description: 'Type the article (der/die/das) for each noun from Netzwerk Neu A1, Kapitel 3.',
    challenges,
}

const out = join(__dirname, '../src/data/collections/netzwerk_neu_a1_k3_artikel.json')
writeFileSync(out, JSON.stringify(collection, null, 4))
console.log(`Wrote ${challenges.length} challenges → ${out}`)
