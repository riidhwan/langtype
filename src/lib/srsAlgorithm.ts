import type { SRSCard, SRSGrade } from '@/types/srs'

const INITIAL_EASE_FACTOR = 2.5
const MIN_EASE_FACTOR = 1.3
const EASE_BONUS_CORRECT = 0.1
const EASE_PENALTY_HARD = 0.1
const EASE_PENALTY_INCORRECT = 0.2
const HARD_INTERVAL_MULTIPLIER = 0.6
const INCORRECT_INTERVAL = 1
const MS_PER_DAY = 86_400_000

export function createNewCard(collectionId: string, challengeId: string): SRSCard {
    return {
        collectionId,
        challengeId,
        interval: 0,
        repetitions: 0,
        easeFactor: INITIAL_EASE_FACTOR,
        nextReviewAt: 0,
        lastReviewedAt: 0,
    }
}

export function computeReview(
    card: SRSCard,
    grade: SRSGrade,
    now: number = Date.now(),
): Partial<SRSCard> {
    if (grade === 'incorrect') {
        return {
            interval: INCORRECT_INTERVAL,
            repetitions: 0,
            easeFactor: Math.max(MIN_EASE_FACTOR, card.easeFactor - EASE_PENALTY_INCORRECT),
            nextReviewAt: now + INCORRECT_INTERVAL * MS_PER_DAY,
            lastReviewedAt: now,
        }
    }

    if (grade === 'hard') {
        const reps = card.repetitions
        let interval: number
        if (reps === 0) interval = 0.25     // 6 hours
        else if (reps === 1) interval = 3
        else interval = Math.max(0.25, Math.round(card.interval * card.easeFactor * HARD_INTERVAL_MULTIPLIER))
        return {
            interval,
            repetitions: reps + 1,
            easeFactor: Math.max(MIN_EASE_FACTOR, card.easeFactor - EASE_PENALTY_HARD),
            nextReviewAt: now + interval * MS_PER_DAY,
            lastReviewedAt: now,
        }
    }

    let interval: number
    const reps = card.repetitions
    if (reps === 0) {
        interval = 1
    } else if (reps === 1) {
        interval = 6
    } else {
        interval = Math.round(card.interval * card.easeFactor)
    }

    return {
        interval,
        repetitions: reps + 1,
        easeFactor: Math.min(card.easeFactor + EASE_BONUS_CORRECT, 4.0),
        nextReviewAt: now + interval * MS_PER_DAY,
        lastReviewedAt: now,
    }
}

export function isCardDue(card: SRSCard, now: number = Date.now()): boolean {
    return card.nextReviewAt === 0 || card.nextReviewAt <= now
}

export function getDueChallengeIds(
    collectionId: string,
    challengeIds: string[],
    cards: Record<string, SRSCard>,
    now: number = Date.now(),
): string[] {
    return challengeIds.filter((id) => {
        const card = cards[`${collectionId}:${id}`]
        return !card || isCardDue(card, now)
    })
}

export function getNextReviewTime(
    collectionId: string,
    challengeIds: string[],
    cards: Record<string, SRSCard>,
    now: number = Date.now(),
): number | null {
    const futureTimes = challengeIds
        .map((id) => cards[`${collectionId}:${id}`])
        .filter((card): card is SRSCard => !!card && !isCardDue(card, now))
        .map((card) => card.nextReviewAt)

    if (futureTimes.length === 0) return null
    return Math.min(...futureTimes)
}
