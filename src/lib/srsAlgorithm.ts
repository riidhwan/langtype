import type { SRSCard, SRSGrade, SRSIntervalChoice } from '@/types/srs'
import { SRS_INTERVAL_DAYS } from '@/types/srs'

const INITIAL_EASE_FACTOR = 2.5
const MIN_EASE_FACTOR = 1.3
const EASE_BONUS_CORRECT = 0.1
const EASE_PENALTY_HARD = 0.1
const EASE_PENALTY_INCORRECT = 0.2
const HARD_INTERVAL_MULTIPLIER = 0.6
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
            interval: 0,
            repetitions: 0,
            easeFactor: Math.max(MIN_EASE_FACTOR, card.easeFactor - EASE_PENALTY_INCORRECT),
            nextReviewAt: now,
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

const INTERVAL_EF_STEPS = [
    { maxDays: 0,        efDelta: -0.2,  resetReps: true  },
    { maxDays: 0.05,     efDelta: -0.15, resetReps: true  },
    { maxDays: 0.26,     efDelta: -0.1,  resetReps: false },
    { maxDays: 0.51,     efDelta: -0.05, resetReps: false },
    { maxDays: 1.01,     efDelta:  0,    resetReps: false },
    { maxDays: 3.01,     efDelta: +0.1,  resetReps: false },
    { maxDays: Infinity, efDelta: +0.15, resetReps: false },
]

export function computeReviewFromInterval(
    card: SRSCard,
    intervalDays: number,
    now: number = Date.now(),
): Partial<SRSCard> {
    const step = INTERVAL_EF_STEPS.find((s) => intervalDays <= s.maxDays)!
    return {
        interval: intervalDays,
        repetitions: step.resetReps ? 0 : card.repetitions + 1,
        easeFactor: Math.min(4.0, Math.max(MIN_EASE_FACTOR, card.easeFactor + step.efDelta)),
        nextReviewAt: now + intervalDays * MS_PER_DAY,
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

const BUCKET_CHOICES: SRSIntervalChoice[] = ['1h', '3h', '6h', '12h', '1d', '3d', '1w', '2w']

export type BucketCounts = Array<{ label: string; count: number }>

export function getQueueLoadBuckets(
    collectionId: string,
    challengeIds: string[],
    cards: Record<string, SRSCard>,
    now: number = Date.now(),
): BucketCounts {
    const counts = BUCKET_CHOICES.map((choice) => ({ label: `< ${choice}`, count: 0 }))

    for (const id of challengeIds) {
        const card = cards[`${collectionId}:${id}`]
        if (!card || card.lastReviewedAt === 0) continue
        if (card.nextReviewAt <= now) continue

        for (let i = 0; i < BUCKET_CHOICES.length; i++) {
            const prevMs = i === 0 ? 0 : SRS_INTERVAL_DAYS[BUCKET_CHOICES[i - 1]] * MS_PER_DAY
            const curMs = SRS_INTERVAL_DAYS[BUCKET_CHOICES[i]] * MS_PER_DAY
            if (card.nextReviewAt > now + prevMs && card.nextReviewAt <= now + curMs) {
                counts[i].count++
                break
            }
        }
    }

    return counts
}

export function getAllCollectionsQueueLoadBuckets(
    cards: Record<string, SRSCard>,
    now: number = Date.now(),
): BucketCounts {
    const counts = BUCKET_CHOICES.map((choice) => ({ label: `< ${choice}`, count: 0 }))

    for (const card of Object.values(cards)) {
        if (card.lastReviewedAt === 0) continue
        if (card.nextReviewAt <= now) continue

        for (let i = 0; i < BUCKET_CHOICES.length; i++) {
            const prevMs = i === 0 ? 0 : SRS_INTERVAL_DAYS[BUCKET_CHOICES[i - 1]] * MS_PER_DAY
            const curMs = SRS_INTERVAL_DAYS[BUCKET_CHOICES[i]] * MS_PER_DAY
            if (card.nextReviewAt > now + prevMs && card.nextReviewAt <= now + curMs) {
                counts[i].count++
                break
            }
        }
    }

    return counts
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
