import { describe, expect, it } from 'vitest'
import {
    buildFullAnswer,
    buildSegments,
    getSlotSizing,
    getWordsWithIndices,
} from '../visualTranslationInputHelpers'

describe('visualTranslationInputHelpers', () => {
    describe('buildSegments', () => {
        it('splits spaces and punctuation into prefilled segments', () => {
            expect(buildSegments('Hallo, Welt!')).toEqual([
                { type: 'gap', startIndex: 0, length: 5 },
                { type: 'prefilled', text: ', ' },
                { type: 'gap', startIndex: 7, length: 4 },
                { type: 'prefilled', text: '!' },
            ])
        })

        it('groups preFilledIndices with adjacent freebies', () => {
            expect(buildSegments('der Name', new Set([4, 5, 6, 7]))).toEqual([
                { type: 'gap', startIndex: 0, length: 3 },
                { type: 'prefilled', text: ' Name' },
            ])
        })
    })

    describe('buildFullAnswer', () => {
        it('reassembles gaps with prefilled text', () => {
            const segments = buildSegments('Hallo Welt')

            expect(buildFullAnswer(segments, ['Hallo', 'Welt'])).toBe('Hallo Welt')
        })

        it('treats missing gap values as empty strings', () => {
            const segments = buildSegments('Hallo Welt')

            expect(buildFullAnswer(segments, ['Hallo'])).toBe('Hallo ')
        })
    })

    describe('slot helpers', () => {
        it('tracks word start indices across spaces', () => {
            expect(getWordsWithIndices('der Tisch')).toEqual([
                { text: 'der', startIndex: 0 },
                { text: 'Tisch', startIndex: 4 },
            ])
        })

        it('uses normal slot sizing for short words', () => {
            expect(getSlotSizing(getWordsWithIndices('Hallo'))).toEqual({
                slotSize: 'w-[26px] h-[38px] text-lg md:w-8 md:h-10 md:text-xl',
                wordGap: 'gap-x-1',
            })
        })

        it('uses medium slot sizing for 12-13 character words', () => {
            expect(getSlotSizing(getWordsWithIndices('Verabredungen'))).toEqual({
                slotSize: 'w-5 h-8 text-base md:w-6 md:h-9 md:text-lg',
                wordGap: 'gap-x-1',
            })
        })

        it('uses compact slot sizing and tighter gaps for long words', () => {
            expect(getSlotSizing(getWordsWithIndices('Entschuldigung'))).toEqual({
                slotSize: 'w-4 h-7 text-sm md:w-5 md:h-8 md:text-base',
                wordGap: 'gap-x-0.5',
            })
        })
    })
})
