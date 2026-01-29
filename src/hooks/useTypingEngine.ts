import { useState, useMemo, useEffect } from 'react'
import { autoMatchSpacing } from '@/lib/stringUtils'

type Status = 'typing' | 'submitted' | 'completed'

export function useTypingEngine(sentences: string[], initialIndex: number = 0) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex)
    const [input, setInput] = useState('')
    const [status, setStatus] = useState<Status>('typing')

    const currentSentence = sentences[currentIndex] || ''

    const [timeLeft, setTimeLeft] = useState(0)

    // Reset when index changes
    useEffect(() => {
        setInput('')
        setStatus('typing')
        setTimeLeft(0)
    }, [currentIndex])

    useEffect(() => {
        let timer: NodeJS.Timeout
        if ((status === 'submitted' || status === 'completed') && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        return 0
                    }
                    return prev - 1
                })
            }, 1000)
        } else if (timeLeft === 0 && (status === 'submitted' || status === 'completed')) {
            // Timer finished, time to move on
            if (currentIndex < sentences.length - 1) {
                setCurrentIndex(prev => prev + 1)
                setStatus('typing')
                setTimeLeft(0)
            }
        }
        return () => clearInterval(timer)
    }, [status, timeLeft, currentIndex, sentences.length])

    const setInputSafe = (value: string) => {
        if (status === 'completed' || status === 'submitted') return
        const spacedValue = autoMatchSpacing(value, currentSentence)
        setInput(spacedValue)
    }

    const submit = () => {
        if (status === 'completed' || status === 'submitted') return

        const isMatch = input === currentSentence
        setStatus(isMatch ? 'completed' : 'submitted')
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
        setCurrentIndex,
    }
}
