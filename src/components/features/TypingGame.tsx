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
    skipRecording?: boolean
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

function reinsertChallenge(queue: Challenge[], fromIndex: number, challenge: Challenge): Challenge[] {
    const offset = Math.floor(Math.random() * 4) + 2 // 2–5 positions ahead (always skip at least 1 card)
    const insertAt = Math.min(fromIndex + offset, queue.length)
    const next = [...queue]
    next.splice(insertAt, 0, challenge)
    return next
}

export function TypingGame({ challenges, initialQuestionId, onQuestionChange, onFinished, srsContext, freeInput }: Props) {
    const initialIndex = useMemo(() => {
        if (!initialQuestionId) return 0
        const idx = challenges.findIndex((c) => c.id === initialQuestionId)
        return idx !== -1 ? idx : 0
    }, [challenges, initialQuestionId])

    // sessionQueue starts equal to challenges and grows as missed/ASAP cards are reinserted
    const [sessionQueue, setSessionQueue] = useState<Challenge[]>(challenges)

    // Guards against onFinished firing in the same render as a reinsertion.
    // Effects run in declaration order: recording effect sets this before onFinished effect checks it.
    const pendingReinsertRef = useRef(false)

    // Sync sessionQueue when challenges prop changes (new session start)
    useEffect(() => {
        setSessionQueue(challenges)
        pendingReinsertRef.current = false
    }, [challenges])

    // Reset pendingReinsertRef after reinsertion state settles in the next render
    useEffect(() => {
        pendingReinsertRef.current = false
    }, [sessionQueue])

    const translations = useMemo(() => sessionQueue.map((c) => c.translation), [sessionQueue])

    const {
        input,
        setInput,
        setInputDirect,
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

    const currentChallenge = sessionQueue[currentIndex]

    // Pass the original challenges prop (not sessionQueue) to useUrlSync.
    // sessionQueue contains duplicate card IDs after reinsertions — passing it would cause
    // the incoming sync to find the first occurrence of a duplicate and jump back to that index.
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

    // SRS recording + reinsertion for wrong answers and ASAP interval
    useEffect(() => {
        if (status === 'typing') {
            hasRecordedRef.current = false
            return
        }
        if (!srsContext || hasRecordedRef.current) return
        if (status !== 'completed' && status !== 'submitted') return
        if (timeLeft !== 0) return

        hasRecordedRef.current = true

        const id = sessionQueue[currentIndex].id

        if (status === 'submitted') {
            if (!srsContext.skipRecording) {
                recordReview(srsContext.collectionId, id, 'incorrect')
            }
            pendingReinsertRef.current = true
            setSessionQueue(prev => reinsertChallenge(prev, currentIndex, prev[currentIndex]))
        } else {
            const choice = intervalChoice ?? '1d'
            const intervalDays = SRS_INTERVAL_DAYS[choice]
            const passed = intervalDays > 0
            if (!srsContext.skipRecording) {
                recordReviewWithInterval(srsContext.collectionId, id, intervalDays)
            }
            if (!passed) {
                // ASAP: reinsert so user sees it again within 1–5 cards
                pendingReinsertRef.current = true
                setSessionQueue(prev => reinsertChallenge(prev, currentIndex, prev[currentIndex]))
            }
        }
    }, [status, timeLeft, currentIndex]) // eslint-disable-line react-hooks/exhaustive-deps

    // Normal-mode reinsertion: wrong answers reappear within 1–5 positions
    const hasReinsertedRef = useRef(false)
    useEffect(() => {
        hasReinsertedRef.current = false
    }, [currentIndex])

    useEffect(() => {
        if (srsContext) return
        if (status !== 'submitted' || timeLeft !== 0) return
        if (hasReinsertedRef.current) return
        hasReinsertedRef.current = true
        pendingReinsertRef.current = true
        setSessionQueue(prev => reinsertChallenge(prev, currentIndex, prev[currentIndex]))
    }, [status, timeLeft, currentIndex]) // eslint-disable-line react-hooks/exhaustive-deps

    // Detect end of session: reached the last card in the queue, timer done, no pending reinsertion
    const hasCalledOnFinished = useRef(false)
    useEffect(() => {
        hasCalledOnFinished.current = false
    }, [challenges])

    useEffect(() => {
        if (
            onFinished &&
            !hasCalledOnFinished.current &&
            !pendingReinsertRef.current &&
            status !== 'typing' &&
            timeLeft === 0 &&
            sessionQueue.length > 0 &&
            currentIndex === sessionQueue.length - 1
        ) {
            hasCalledOnFinished.current = true
            onFinished()
        }
    }, [status, timeLeft, currentIndex, sessionQueue.length]) // eslint-disable-line react-hooks/exhaustive-deps

    const cardsRemaining = srsContext ? sessionQueue.length - currentIndex - 1 : null

    return (
        <div className="w-full max-w-2xl flex flex-col items-center gap-4 md:gap-8">

            {currentChallenge?.original && (
                <SentenceDisplay text={currentChallenge.original} />
            )}

            <div className="w-full flex flex-col items-center gap-4">
                {srsContext && cardsRemaining !== null && (
                    <p className="mono-label">
                        {Math.max(0, cardsRemaining)} {cardsRemaining === 1 ? 'card' : 'cards'} remaining
                    </p>
                )}

                <VisualTranslationInput
                    value={input}
                    onChange={freeInput ? setInputDirect : setInput}
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
