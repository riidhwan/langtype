import { useTypingEngine } from "@/hooks/useTypingEngine"
import { useUrlSync } from "@/hooks/useUrlSync"
import { useEffect, useMemo, useRef, useState } from "react"
import type { SRSGrade } from "@/types/srs"
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

    // SRS: confidence override — timer is paused until the user makes an explicit choice
    const [confidenceOverride, setConfidenceOverride] = useState<null | 'again' | 'hard' | 'good'>(null)
    useEffect(() => {
        setConfidenceOverride(null)
    }, [currentIndex])

    const showingConfidenceButtons =
        isCorrect && !!srsContext && !srsContext.skipRecording && confidenceOverride === null

    useEffect(() => {
        setIsPaused(showingConfidenceButtons)
    }, [showingConfidenceButtons]) // eslint-disable-line react-hooks/exhaustive-deps

    const handleConfidenceClick = (override: 'again' | 'hard' | 'good') => {
        setConfidenceOverride(override)
        setIsPaused(false)
        setTimeLeft(2)
    }

    const recordReview = useSRSStore((s) => s.recordReview)
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

        let grade: SRSGrade
        if (status === 'submitted' || confidenceOverride === 'again') {
            grade = 'incorrect'
        } else if (confidenceOverride === 'hard') {
            grade = 'hard'
        } else {
            grade = 'correct'
        }

        const passed = grade !== 'incorrect'
        const id = challenges[currentIndex].id

        if (!srsContext.skipRecording) {
            recordReview(srsContext.collectionId, id, grade)
        }

        srsContext.onCardResult?.(id, passed)
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

            {currentChallenge && (
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
                    <div className="flex flex-col items-center gap-2 mt-4">
                        <div className="text-green-600 font-bold animate-pulse">
                            {showingConfidenceButtons
                                ? '✨ Correct! How confident were you?'
                                : `✨ Correct! Moving to next sentence in ${timeLeft}...`}
                        </div>
                        {srsContext && !srsContext.skipRecording && (
                            confidenceOverride !== null ? (
                                confidenceOverride === 'again' ? (
                                    <p className="text-sm text-muted-foreground">Showing again soon ✓</p>
                                ) : confidenceOverride === 'hard' ? (
                                    <p className="text-sm text-muted-foreground">Scheduling sooner ✓</p>
                                ) : null
                            ) : (
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => handleConfidenceClick('again')}
                                        className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors cursor-pointer px-3 py-2"
                                    >
                                        Not at all
                                    </button>
                                    <button
                                        onClick={() => handleConfidenceClick('hard')}
                                        className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors cursor-pointer px-3 py-2"
                                    >
                                        Somewhat
                                    </button>
                                    <button
                                        onClick={() => handleConfidenceClick('good')}
                                        className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors cursor-pointer px-3 py-2"
                                    >
                                        Very
                                    </button>
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
