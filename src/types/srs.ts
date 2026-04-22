export interface SRSCard {
    collectionId: string
    challengeId: string
    interval: number        // days until next review
    repetitions: number     // consecutive correct reviews
    easeFactor: number      // starts at 2.5, min 1.3
    nextReviewAt: number    // ms timestamp; 0 = new card (always due)
    lastReviewedAt: number  // ms timestamp; 0 = never reviewed
}

export type SRSGrade = 'correct' | 'hard' | 'incorrect'

export type SRSIntervalChoice = 'asap' | '1h' | '6h' | '12h' | '1d' | '3d' | '1w'

export const SRS_INTERVAL_DAYS: Record<SRSIntervalChoice, number> = {
    asap: 0,
    '1h':  1 / 24,
    '6h':  0.25,
    '12h': 0.5,
    '1d':  1,
    '3d':  3,
    '1w':  7,
}

export const SRS_INTERVAL_LABELS: Record<SRSIntervalChoice, string> = {
    asap: 'ASAP',
    '1h':  '1h',
    '6h':  '6h',
    '12h': '12h',
    '1d':  '1d',
    '3d':  '3d',
    '1w':  '1w',
}
