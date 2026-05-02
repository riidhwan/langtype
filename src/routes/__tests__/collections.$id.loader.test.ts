import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Route } from '../collections.$id'
import * as challengeService from '@/services/challengeService'
import type { Collection } from '@/types/challenge'

type CollectionLoader = (context: { params: { id: string } }) => Promise<
    | { kind: 'bundled'; collection: Collection }
    | { kind: 'custom'; id: string }
>

const loadCollection = Route.options.loader as CollectionLoader

describe('collections.$id route logic', () => {
    beforeEach(() => {
        vi.restoreAllMocks()
    })

    describe('loader', () => {
        it('returns bundled collection data for valid built-in id', async () => {
            const mockCollection: Collection = { id: 'test', title: 'Test' }
            const getCollectionSpy = vi.spyOn(challengeService, 'getCollection').mockResolvedValue(mockCollection)

            const result = await loadCollection({ params: { id: 'test' } })

            expect(result).toEqual({ kind: 'bundled', collection: mockCollection })
            expect(getCollectionSpy).toHaveBeenCalledWith('test')
        })

        it('throws notFound for missing built-in id', async () => {
            vi.spyOn(challengeService, 'getCollection').mockResolvedValue(undefined)

            await expect(async () => {
                await loadCollection({ params: { id: 'invalid' } })
            }).rejects.toThrow() // notFound() throws an error or response
        })

        it('returns a custom placeholder without loading custom ids through challengeService', async () => {
            const getCollectionSpy = vi.spyOn(challengeService, 'getCollection')

            const result = await loadCollection({ params: { id: 'custom_ready' } })

            expect(result).toEqual({ kind: 'custom', id: 'custom_ready' })
            expect(getCollectionSpy).not.toHaveBeenCalled()
        })
    })

    describe('validateSearch', () => {
        const validate = Route.options.validateSearch as (search: Record<string, unknown>) => { questionId?: string | number }

        it('passes through numbers', () => {
            expect(validate({ questionId: 123 })).toEqual({ questionId: 123 })
        })

        it('parses numeric strings', () => {
            expect(validate({ questionId: '456' })).toEqual({ questionId: 456 })
        })

        it('strips quotes from strings', () => {
            expect(validate({ questionId: '"789"' })).toEqual({ questionId: 789 })
        })

        it('keeps non-numeric strings as strings', () => {
            expect(validate({ questionId: 'some-id' })).toEqual({ questionId: 'some-id' })
        })

        it('handles undefined', () => {
            expect(validate({})).toEqual({ questionId: undefined })
        })

        it('handles empty strings', () => {
            // Empty string trim -> empty -> parsed as 0 maybe? or logic says:
            // if (!isNaN(num) && qId.trim() !== '')
            // '' trim is '', so condition false -> returns raw qId which is ''
            expect(validate({ questionId: '' })).toEqual({ questionId: '' })
        })
    })
})
