import { useTypingEngine } from "@/hooks/useTypingEngine"
import { useUrlSync } from "@/hooks/useUrlSync"
import { useEffect, useMemo, useRef, useState } from "react"
import type { SRSIntervalChoice } from "@/types/srs"
import { SRS_INTERVAL_DAYS, SRS_INTERVAL_LABELS } from "@/types/srs"
import { SentenceDisplay } from "@/components/domain/SentenceDisplay"
import { VisualTranslationInput } from "@/components/domain/VisualTranslationInput"
import { Challenge } from "@/types/challenge"
import { useSRSStore } from "@/store/useSRSStore"

interface SRSContext {
    collectionId: string
    totalDue: number
    cardsCompleted?: number
    isRetry?: boolean
    skipRecording?: boolean
    onCardResult?: (challengeId: string, passed: boolean) => void
}

interface Props {
    challenges: Challenge[]
    initialQuestionId?: string
    onQuestionChange?: (questionId: string) => void
    onFinished?: () => void
    srsContext?: SRSContext
}

type PillColor = 'red' | 'yellow' | 'green'

const PILL_COLORS: Record<SRSIntervalChoice, PillColor> = {
    asap: 'red', '1h': 'red', '6h': 'red',
    '12h': 'yellow', '1d': 'yellow',
    '3d': 'green', '1w': 'green',
}

const PILL_CLASSES: Record<PillColor, string> = {
    red:    'border text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950',
    yellow: 'border text-yellow-600 border-yellow-400 hover:bg-amber-50 dark:hover:bg-amber-950',
    green:  'border text-green-600 border-green-400 hover:bg-green-50 dark:hover:bg-green-950',
}

const INTERVAL_ORDER: SRSIntervalChoice[] = ['asap', '1h', '6h', '12h', '1d', '3d', '1w']

export function TypingGame({ challenges, initialQuestionId, onQuestionChange, onFinished, srsContext }: Props) {
    const initialIndex = useMemo(() => {
        if (!initialQuestionId) return 0
        const idx = challenges.findIndex((c) => c.id === initialQuestionId)
        return idx !== -1 ? idx : 0
    }, [challenges, initialQuestionId])

    const translations = useMemo(() => challenges.map((c) => c.translation), [challenges])

    const {
        input,
        setInput,
        isCorrect,
        status,
        submit,
        currentIndex,
        currentSentence,
        timeLeft,
        setTimeLeft,
        setIsPaused,
        setCurrentIndex,
        preFilledIndices,
    } = useTypingEngine(
        translations,
        initialIndex,
    )

    const currentChallenge = challenges[currentIndex]

    useUrlSync({
        currentIndex,
        challenges,
        initialQuestionId,
        setCurrentIndex,
        onQuestionChange
    })

    // SRS: interval choice — timer is paused until the user selects a pill
    const [intervalChoice, setIntervalChoice] = useState<SRSIntervalChoice | null>(null)
    useEffect(() => {
        setIntervalChoice(null)
    }, [currentIndex])

    const showingIntervalPills =
        isCorrect && !!srsContext && !srsContext.skipRecording && intervalChoice === null

    useEffect(() => {
        setIsPaused(showingIntervalPills)
    }, [showingIntervalPills]) // eslint-disable-line react-hooks/exhaustive-deps

    const handleIntervalClick = (choice: SRSIntervalChoice) => {
        setIntervalChoice(choice)
        setIsPaused(false)
        setTimeLeft(2)
    }

    const recordReview = useSRSStore((s) => s.recordReview)
    const recordReviewWithInterval = useSRSStore((s) => s.recordReviewWithInterval)
    const hasRecordedRef = useRef(false)

    useEffect(() => {
        if (status === 'typing') {
            hasRecordedRef.current = false
            return
        }
        if (!srsContext || hasRecordedRef.current) return
        if (status !== 'completed' && status !== 'submitted') return
        if (timeLeft !== 0) return

        hasRecordedRef.current = true

        const id = challenges[currentIndex].id

        if (status === 'submitted') {
            if (!srsContext.skipRecording) {
                recordReview(srsContext.collectionId, id, 'incorrect')
            }
            srsContext.onCardResult?.(id, false)
        } else {
            const choice = intervalChoice ?? '1d'
            const intervalDays = SRS_INTERVAL_DAYS[choice]
            const passed = intervalDays > 0
            if (!srsContext.skipRecording) {
                recordReviewWithInterval(srsContext.collectionId, id, intervalDays)
            }
            srsContext.onCardResult?.(id, passed)
        }
    }, [status, timeLeft, currentIndex]) // eslint-disable-line react-hooks/exhaustive-deps

    // Detect end of session: last card done, timer expired, nothing left to advance to
    const hasCalledOnFinished = useRef(false)
    useEffect(() => {
        hasCalledOnFinished.current = false
    }, [challenges])

    useEffect(() => {
        if (
            onFinished &&
            !hasCalledOnFinished.current &&
            status !== 'typing' &&
            timeLeft === 0 &&
            challenges.length > 0 &&
            currentIndex === challenges.length - 1
        ) {
            hasCalledOnFinished.current = true
            onFinished()
        }
    }, [status, timeLeft, currentIndex, challenges.length]) // eslint-disable-line react-hooks/exhaustive-deps

    const cardsRemaining = srsContext
        ? srsContext.totalDue - (srsContext.cardsCompleted ?? currentIndex)
        : null

    return (
        <div className="w-full max-w-2xl flex flex-col items-center gap-4 md:gap-8">

            {currentChallenge?.original && (
                <SentenceDisplay text={currentChallenge.original} />
            )}

            <div className="w-full flex flex-col items-center gap-4">
                {srsContext && cardsRemaining !== null && (
                    <p className="text-sm text-muted-foreground">
                        {srsContext.isRetry
                            ? `Reviewing ${Math.max(0, cardsRemaining)} missed ${cardsRemaining === 1 ? 'card' : 'cards'}`
                            : `${Math.max(0, cardsRemaining)} ${cardsRemaining === 1 ? 'card' : 'cards'} remaining`}
                    </p>
                )}

                <VisualTranslationInput
                    value={input}
                    onChange={setInput}
                    onSubmit={submit}
                    targetText={currentSentence}
                    preFilledIndices={preFilledIndices}
                    status={status}
                />

                {isCorrect && (
                    <div className="flex flex-col items-center gap-3 mt-4">
                        <div className="text-green-600 font-bold animate-pulse">
                            {showingIntervalPills
                                ? '✨ Correct!'
                                : `✨ Correct! Moving to next sentence in ${timeLeft}...`}
                        </div>
                        {srsContext && !srsContext.skipRecording && (
                            intervalChoice !== null ? (
                                <p className="text-sm text-muted-foreground">
                                    Review in {SRS_INTERVAL_LABELS[intervalChoice]} ✓
                                </p>
                            ) : (
                                <div className="flex flex-col items-center gap-2">
                                    <p className="text-sm text-muted-foreground">Review again in:</p>
                                    <div className="flex flex-wrap justify-center gap-2">
                                        {INTERVAL_ORDER.map((choice) => (
                                            <button
                                                key={choice}
                                                onClick={() => handleIntervalClick(choice)}
                                                className={`rounded-full px-3 py-1 text-sm cursor-pointer transition-colors ${PILL_CLASSES[PILL_COLORS[choice]]}`}
                                            >
                                                {SRS_INTERVAL_LABELS[choice]}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )
                        )}
                    </div>
                )}

                {status === 'submitted' && (
                    <div className="flex flex-col items-center gap-2 mt-4">
                        <div className="text-red-600 font-bold">
                            ❌ Incorrect. Moving in {timeLeft}...
                        </div>
                        <div className="text-muted-foreground">
                            Correct answer: <span className="font-mono font-bold text-foreground">{currentSentence}</span>
                        </div>
                    </div>
                )}
            </div>

        </div>
    )
}
