import { describe, expect, it } from 'vitest'
import type { DictionaryForm } from '@/types/dictionary'
import {
    formatDictionaryPartOfSpeech,
    getDictionarySubjectForTags,
    getPastParticiplePrefix,
    groupDictionaryForms,
    groupIndicativeForms,
    groupSubjunctiveForms,
} from '../dictionaryForms'

describe('dictionaryForms', () => {
    it('formats part-of-speech ids for display', () => {
        expect(formatDictionaryPartOfSpeech('proper-noun')).toBe('proper noun')
        expect(formatDictionaryPartOfSpeech('verb')).toBe('verb')
    })

    it('groups supported forms and omits unsupported tags', () => {
        const forms: DictionaryForm[] = [
            { form: 'arbeite-ind', tags: ['indicative', 'present'] },
            { form: 'arbeite-imp', tags: ['imperative'] },
            { form: 'habe gearbeitet', tags: ['perfect'] },
            { form: 'arbeite-sub-i', tags: ['subjunctive', 'subjunctive-i'] },
            { form: 'arbeitend', tags: ['participle'] },
        ]

        expect(groupDictionaryForms(forms)).toEqual([
            { key: 'indicative', label: 'Indicative', forms: [forms[0]] },
            { key: 'imperative', label: 'Imperative', forms: [forms[1]] },
            { key: 'perfect', label: 'Perfect', forms: [forms[2]] },
            { key: 'subjunctive', label: 'Subjunctive', forms: [forms[3]] },
        ])
    })

    it('groups indicative forms in stable tense order', () => {
        const forms: DictionaryForm[] = [
            { form: 'future-ii', tags: ['future-ii'] },
            { form: 'present', tags: ['present'] },
            { form: 'future-i', tags: ['future-i'] },
            { form: 'past', tags: ['preterite'] },
            { form: 'perfect', tags: ['perfect'] },
            { form: 'pluperfect', tags: ['pluperfect'] },
            { form: 'unsupported', tags: ['participle'] },
        ]

        expect(groupIndicativeForms(forms).map((group) => group.label)).toEqual([
            'Present',
            'Past',
            'Perfect',
            'Pluperfect',
            'Future I',
            'Future II',
        ])
    })

    it('groups subjunctive forms in stable mood and tense order', () => {
        const forms: DictionaryForm[] = [
            { form: 'would-have', tags: ['future-ii', 'subjunctive-ii'] },
            { form: 'sub-i', tags: ['subjunctive-i'] },
            { form: 'would', tags: ['future-i', 'subjunctive-ii'] },
            { form: 'sub-ii', tags: ['subjunctive-ii'] },
            { form: 'perfect', tags: ['perfect'] },
            { form: 'pluperfect', tags: ['pluperfect'] },
            { form: 'future-i', tags: ['future-i', 'subjunctive-i'] },
            { form: 'future-ii', tags: ['future-ii', 'subjunctive-i'] },
        ]

        expect(groupSubjunctiveForms(forms).map((group) => group.label)).toEqual([
            'Subjunctive I',
            'Subjunctive II',
            'Perfect',
            'Pluperfect',
            'Future I',
            'Future II',
            'Präteritum (würde)',
            'Pluperfect (würde)',
        ])
    })

    it('derives display prefixes from tags and auxiliaries', () => {
        expect(getDictionarySubjectForTags(['first-person', 'singular'])).toBe('ich')
        expect(getDictionarySubjectForTags(['second-person', 'plural'])).toBe('ihr')
        expect(getDictionarySubjectForTags(['participle'])).toBe('')
        expect(getPastParticiplePrefix([{ form: 'haben', tags: ['auxiliary'] }])).toBe('hat')
        expect(getPastParticiplePrefix([{ form: 'sein', tags: ['auxiliary'] }])).toBe('ist')
        expect(getPastParticiplePrefix([{ form: 'werden', tags: ['auxiliary'] }])).toBe('')
    })
})
