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
    freeInput?: boolean
}

const INTERVAL_ORDER: SRSIntervalChoice[] = ['asap', '1h', '6h', '12h', '1d', '3d', '1w']

export function TypingGame({ challenges, initialQuestionId, onQuestionChange, onFinished, srsContext, freeInput }: Props) {
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

    // Keyboard shortcuts 1–7 for interval pills
    useEffect(() => {
        if (!showingIntervalPills) return
        const handler = (e: KeyboardEvent) => {
            const n = parseInt(e.key)
            if (n >= 1 && n <= INTERVAL_ORDER.length) {
                handleIntervalClick(INTERVAL_ORDER[n - 1])
            }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [showingIntervalPills]) // eslint-disable-line react-hooks/exhaustive-deps

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
                    <p className="mono-label">
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
                    freeInput={freeInput}
                />

                <p className="text-center text-[12px] text-muted-foreground font-mono">
                    press <kbd className="key-hint">enter</kbd> to check
                </p>

                {isCorrect && (
                    <div className="flex flex-col items-center gap-3 mt-2">
                        <p className="font-mono text-[13px] text-[var(--correct)]">
                            {showingIntervalPills
                                ? '✓ correct'
                                : `✓ correct · moving in ${timeLeft}...`}
                        </p>
                        {srsContext && !srsContext.skipRecording && (
                            intervalChoice !== null ? (
                                <p className="font-mono text-[11px] text-muted-foreground">
                                    Review in {SRS_INTERVAL_LABELS[intervalChoice]} ✓
                                </p>
                            ) : (
                                <div className="flex flex-col items-center gap-2">
                                    <p className="mono-label">Review again in:</p>
                                    <div className="flex flex-wrap justify-center gap-2">
                                        {INTERVAL_ORDER.map((choice, i) => (
                                            <button
                                                key={choice}
                                                onClick={() => handleIntervalClick(choice)}
                                                aria-label={SRS_INTERVAL_LABELS[choice]}
                                                title={`Press ${i + 1}`}
                                                className="flex flex-col items-center gap-0.5 px-3 py-2 min-w-[44px]
                                                           border border-border border-b-2 border-b-[var(--border2)]
                                                           rounded-[var(--radius-sm)] bg-card hover:bg-[var(--bg3)]
                                                           cursor-pointer transition-colors"
                                            >
                                                <span className="text-[9px] text-muted-foreground font-mono leading-none">{i + 1}</span>
                                                <span className="text-[13px] font-semibold font-mono leading-none">{SRS_INTERVAL_LABELS[choice]}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-[11px] text-muted-foreground font-mono mt-1">
                                        or press <span className="text-foreground">1–7</span>
                                    </p>
                                </div>
                            )
                        )}
                    </div>
                )}

                {status === 'submitted' && (
                    <div className="flex flex-col items-center gap-2 mt-2">
                        <div className="bg-[var(--incorrect-bg)] border border-[var(--incorrect)] rounded-[var(--radius)] px-5 py-4 text-center">
                            <p className="font-mono text-[13px] text-[var(--incorrect)] mb-2">✗ incorrect</p>
                            <p className="text-sm text-muted-foreground">
                                Correct: <span className="font-mono font-semibold text-foreground">{currentSentence}</span>
                            </p>
                        </div>
                        <p className="font-mono text-[11px] text-muted-foreground">moving in {timeLeft}...</p>
                    </div>
                )}
            </div>

        </div>
    )
}
