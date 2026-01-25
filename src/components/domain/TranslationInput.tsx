import { Input } from '@/components/ui/Input'

interface Props {
    value: string
    onChange: (value: string) => void
    targetWordCount: number
    targetCharCount: number
}

export function TranslationInput({ value, onChange, targetWordCount, targetCharCount }: Props) {
    return (
        <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Type translation (${targetWordCount} words, ${targetCharCount} chars)...`}
            className="w-full max-w-xl text-lg p-6"
        />
    )
}
