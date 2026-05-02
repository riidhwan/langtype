import { describe, it, expect, vi } from 'vitest'
import { Route } from '../collections.$id'
import * as challengeService from '@/services/challengeService'
import type { Collection } from '@/types/challenge'

type CollectionLoader = (context: { params: { id: string } }) => Promise<Collection>

const loadCollection = Route.options.loader as CollectionLoader

describe('collections.$id route logic', () => {
    describe('loader', () => {
        it('returns collection for valid id', async () => {
            const mockCollection: Collection = { id: 'test', title: 'Test' }
            const getCollectionSpy = vi.spyOn(challengeService, 'getCollection').mockResolvedValue(mockCollection)

            const result = await loadCollection({ params: { id: 'test' } })

            expect(result).toEqual(mockCollection)
            expect(getCollectionSpy).toHaveBeenCalledWith('test')
        })

        it('throws notFound for invalid id', async () => {
            vi.spyOn(challengeService, 'getCollection').mockResolvedValue(undefined)

            await expect(async () => {
                await loadCollection({ params: { id: 'invalid' } })
            }).rejects.toThrow() // notFound() throws an error or response
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
