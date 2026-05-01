import type { DictionaryForm } from '@/types/dictionary'

export type DictionaryFormGroupKey = 'indicative' | 'imperative' | 'perfect' | 'subjunctive'

export interface DictionaryFormGroup {
    key: DictionaryFormGroupKey
    label: string
    forms: DictionaryForm[]
}

export interface DictionaryFormSubgroup {
    label: string
    forms: DictionaryForm[]
}

/** Formats dictionary part-of-speech ids for display. */
export function formatDictionaryPartOfSpeech(pos: string) {
    return pos.replace('-', ' ')
}

/** Groups supported dictionary forms into the user-facing sections shown on entry details. */
export function groupDictionaryForms(forms: DictionaryForm[]): DictionaryFormGroup[] {
    const groups: Record<DictionaryFormGroupKey, DictionaryForm[]> = {
        indicative: [],
        imperative: [],
        perfect: [],
        subjunctive: [],
    }

    for (const form of forms) {
        const groupKey = getFormGroupKey(form.tags)
        if (groupKey) groups[groupKey].push(form)
    }

    const orderedGroups: DictionaryFormGroup[] = [
        { key: 'indicative', label: 'Indicative', forms: groups.indicative },
        { key: 'imperative', label: 'Imperative', forms: groups.imperative },
        { key: 'perfect', label: 'Perfect', forms: groups.perfect },
        { key: 'subjunctive', label: 'Subjunctive', forms: groups.subjunctive },
    ]

    return orderedGroups.filter((group) => group.forms.length > 0)
}

/** Groups indicative forms into stable tense sections. */
export function groupIndicativeForms(forms: DictionaryForm[]): DictionaryFormSubgroup[] {
    const groups = new Map<string, DictionaryForm[]>()

    for (const form of forms) {
        const label = getIndicativeSubcategory(form.tags)
        if (!label) continue
        groups.set(label, [...(groups.get(label) ?? []), form])
    }

    return [
        'Present',
        'Past',
        'Perfect',
        'Pluperfect',
        'Future I',
        'Future II',
    ].flatMap((label) => {
        const groupForms = groups.get(label)
        return groupForms ? [{ label, forms: groupForms }] : []
    })
}

/** Groups subjunctive forms into stable mood and tense sections. */
export function groupSubjunctiveForms(forms: DictionaryForm[]): DictionaryFormSubgroup[] {
    const groups = new Map<string, DictionaryForm[]>()

    for (const form of forms) {
        const label = getSubjunctiveSubcategory(form.tags)
        if (!label) continue
        groups.set(label, [...(groups.get(label) ?? []), form])
    }

    return [
        'Subjunctive I',
        'Subjunctive II',
        'Perfect',
        'Pluperfect',
        'Future I',
        'Future II',
        'Präteritum (würde)',
        'Pluperfect (würde)',
    ].flatMap((label) => {
        const groupForms = groups.get(label)
        return groupForms ? [{ label, forms: groupForms }] : []
    })
}

/** Returns the German subject pronoun implied by person/number tags. */
export function getDictionarySubjectForTags(tags: string[]) {
    const normalizedTags = tags.map((tag) => tag.toLowerCase())
    const hasTag = (value: string) => normalizedTags.includes(value)

    if (hasTag('first-person') && hasTag('singular')) return 'ich'
    if (hasTag('second-person') && hasTag('singular')) return 'du'
    if (hasTag('third-person') && hasTag('singular')) return 'er'
    if (hasTag('first-person') && hasTag('plural')) return 'wir'
    if (hasTag('second-person') && hasTag('plural')) return 'ihr'
    if (hasTag('third-person') && hasTag('plural')) return 'sie'
    return ''
}

/** Returns the finite auxiliary prefix used before a displayed past participle. */
export function getPastParticiplePrefix(forms: DictionaryForm[]) {
    const auxiliary = forms.find((form) =>
        form.tags.some((tag) => tag.toLowerCase() === 'auxiliary')
    )?.form.toLowerCase()

    if (auxiliary === 'haben') return 'hat'
    if (auxiliary === 'sein') return 'ist'
    return ''
}

function getFormGroupKey(tags: string[]): DictionaryFormGroupKey | '' {
    const normalizedTags = tags.map((tag) => tag.toLowerCase())
    if (normalizedTags.some((tag) => tag.includes('subjunctive') || tag === 'konjunktiv')) {
        return 'subjunctive'
    }
    if (normalizedTags.includes('indicative')) {
        return 'indicative'
    }
    if (normalizedTags.includes('imperative')) {
        return 'imperative'
    }
    if (normalizedTags.some((tag) => tag.includes('perfect') || tag === 'perfekt')) {
        return 'perfect'
    }
    return ''
}

function getIndicativeSubcategory(tags: string[]) {
    const normalizedTags = tags.map((tag) => tag.toLowerCase())
    const hasTag = (value: string) => normalizedTags.includes(value)

    if (hasTag('future-ii')) return 'Future II'
    if (hasTag('future-i')) return 'Future I'
    if (hasTag('pluperfect')) return 'Pluperfect'
    if (hasTag('perfect')) return 'Perfect'
    if (hasTag('preterite')) return 'Past'
    if (hasTag('present')) return 'Present'
    return ''
}

function getSubjunctiveSubcategory(tags: string[]) {
    const normalizedTags = tags.map((tag) => tag.toLowerCase())
    const hasTag = (value: string) => normalizedTags.includes(value)

    if (hasTag('future-ii') && hasTag('subjunctive-ii')) return 'Pluperfect (würde)'
    if (hasTag('future-i') && hasTag('subjunctive-ii')) return 'Präteritum (würde)'
    if (hasTag('future-ii') && hasTag('subjunctive-i')) return 'Future II'
    if (hasTag('future-i') && hasTag('subjunctive-i')) return 'Future I'
    if (hasTag('pluperfect')) return 'Pluperfect'
    if (hasTag('perfect')) return 'Perfect'
    if (hasTag('subjunctive-ii')) return 'Subjunctive II'
    if (hasTag('subjunctive-i')) return 'Subjunctive I'
    return ''
}
