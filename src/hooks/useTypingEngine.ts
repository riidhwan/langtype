import { useState, useMemo, useEffect } from 'react'
import { autoMatchSpacing, isFlexibleMatch, parseSentence } from '@/lib/stringUtils'

type Status = 'typing' | 'submitted' | 'completed'

export function useTypingEngine(sentences: string[], initialIndex: number = 0) {
    const parsedSentences = useMemo(() => sentences.map(s => parseSentence(s)), [sentences])

    const [currentIndex, setCurrentIndex] = useState(initialIndex)
    const [input, setInput] = useState('')
    const [status, setStatus] = useState<Status>('typing')

    const { text: currentSentence, preFilledIndices } = useMemo(() => {
        return parsedSentences[currentIndex] || { text: '', preFilledIndices: new Set<number>() }
    }, [parsedSentences, currentIndex])

    const [timeLeft, setTimeLeft] = useState(0)
    const [isPaused, setIsPaused] = useState(false)

    // Reset when index changes
    useEffect(() => {
        const initialInput = autoMatchSpacing('', currentSentence, preFilledIndices)
        setInput(initialInput)
        setStatus('typing')
        setTimeLeft(0)
        setIsPaused(false)
    }, [currentIndex, currentSentence, preFilledIndices])

    useEffect(() => {
        let timer: NodeJS.Timeout
        if ((status === 'submitted' || status === 'completed') && timeLeft > 0 && !isPaused) {
            timer = setInterval(() => {
                setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1))
            }, 1000)
        } else if (timeLeft === 0 && (status === 'submitted' || status === 'completed') && !isPaused) {
            // Timer finished, time to move on
            if (currentIndex < sentences.length - 1) {
                setCurrentIndex(prev => prev + 1)
                setStatus('typing')
                setTimeLeft(0)
            }
        }
        return () => clearInterval(timer)
    }, [status, timeLeft, currentIndex, sentences.length, isPaused])

    const setInputSafe = (value: string) => {
        if (status === 'completed' || status === 'submitted') return
        const spacedValue = autoMatchSpacing(value, currentSentence, preFilledIndices)
        setInput(spacedValue)
    }

    const submit = () => {
        if (status === 'completed' || status === 'submitted') return

        const isMatch = input === currentSentence
        const isFlexMatch = isFlexibleMatch(input, currentSentence, preFilledIndices)

        if (isFlexMatch) {
            setInput(currentSentence) // Fill in any trailing punctuation
            setStatus('completed')
        } else {
            setStatus('submitted')
        }

        setTimeLeft(5) // Start 5 second countdown
    }

    const wordCount = useMemo(() => {
        if (!currentSentence) return 0
        return currentSentence.trim().split(/\s+/).length
    }, [currentSentence])

    const charCount = useMemo(() => currentSentence.length, [currentSentence])

    const isCorrect = status === 'completed'

    return {
        input,
        setInput: setInputSafe,
        currentSentence,
        currentIndex,
        wordCount,
        charCount,
        isCorrect,
        status,
        submit,
        timeLeft,
        setTimeLeft,
        setIsPaused,
        setCurrentIndex,
        preFilledIndices,
    }
}
