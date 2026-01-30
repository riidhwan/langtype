import { useTypingEngine } from "@/hooks/useTypingEngine"
import { useUrlSync } from "@/hooks/useUrlSync"
import { useMemo } from "react"
import { SentenceDisplay } from "@/components/domain/SentenceDisplay"
import { VisualTranslationInput } from "@/components/domain/VisualTranslationInput"
import { Challenge } from "@/types/challenge"

interface Props {
    challenges: Challenge[]
    initialQuestionId?: string
    onQuestionChange?: (questionId: string) => void
}

export function TypingGame({ challenges, initialQuestionId, onQuestionChange }: Props) {
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

    return (
        <div className="w-full max-w-2xl flex flex-col items-center gap-4 md:gap-8">

            {currentChallenge && (
                <SentenceDisplay text={currentChallenge.original} />
            )}

            <div className="w-full flex flex-col items-center gap-4">
                <VisualTranslationInput
                    value={input}
                    onChange={setInput}
                    onSubmit={submit}
                    targetText={currentSentence}
                    preFilledIndices={preFilledIndices}
                    status={status}
                />

                {isCorrect && (
                    <div className="text-green-600 font-bold animate-pulse mt-4">
                        ✨ Correct! Moving to next sentence in {timeLeft}...
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
