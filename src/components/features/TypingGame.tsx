import { useTypingEngine } from "@/hooks/useTypingEngine"
import { useUrlSync } from "@/hooks/useUrlSync"
import { useMemo } from "react"
import { SRS_INTERVAL_LABELS } from "@/types/srs"
import { SentenceDisplay } from "@/components/domain/SentenceDisplay"
import { VisualTranslationInput } from "@/components/domain/VisualTranslationInput"
import { Challenge } from "@/types/challenge"
import { useTypingSessionQueue } from "@/hooks/useTypingSessionQueue"
import { SRS_INTERVAL_ORDER, useSRSReviewRecording } from "@/hooks/useSRSReviewRecording"
import { useTypingRetryReinsertion } from "@/hooks/useTypingRetryReinsertion"
import { useTypingSessionCompletion } from "@/hooks/useTypingSessionCompletion"

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

export function TypingGame({ challenges, initialQuestionId, onQuestionChange, onFinished, srsContext, freeInput }: Props) {
    const initialIndex = useMemo(() => {
        if (!initialQuestionId) return 0
        const idx = challenges.findIndex((c) => c.id === initialQuestionId)
        return idx !== -1 ? idx : 0
    }, [challenges, initialQuestionId])

    const {
        sessionQueue,
        translations,
        pendingReinsertRef,
        reinsertCurrentChallenge,
    } = useTypingSessionQueue(challenges)

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

    const { intervalChoice, showingIntervalPills, handleIntervalClick } = useSRSReviewRecording({
        status,
        timeLeft,
        currentIndex,
        currentChallenge,
        srsContext,
        isCorrect,
        setIsPaused,
        setTimeLeft,
        reinsertCurrentChallenge,
    })

    useTypingRetryReinsertion({
        currentIndex,
        hasSRSContext: !!srsContext,
        status,
        timeLeft,
        reinsertCurrentChallenge,
    })

    useTypingSessionCompletion({
        challenges,
        currentIndex,
        pendingReinsertRef,
        sessionQueueLength: sessionQueue.length,
        status,
        timeLeft,
        onFinished,
    })

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
                                        {SRS_INTERVAL_ORDER.map((choice, i) => (
                                            // eslint-disable-next-line langtype/no-raw-ui-controls -- SRS interval choices are keycap-like game controls with number-key affordances.
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
                                        or press <span className="text-foreground">1–9</span>
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
