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
