import { FreeTranslationInput } from './FreeTranslationInput'
import { SlotTranslationInput } from './SlotTranslationInput'
import type { TranslationInputStatus } from './visualTranslationInputHelpers'

interface Props {
    value: string
    onChange: (value: string) => void
    onSubmit?: () => void
    targetText: string
    preFilledIndices?: Set<number>
    status?: TranslationInputStatus
    freeInput?: boolean
}

export function VisualTranslationInput({
    value,
    onChange,
    onSubmit,
    targetText,
    preFilledIndices,
    status = 'typing',
    freeInput = false,
}: Props) {
    if (freeInput) {
        return (
            <FreeTranslationInput
                value={value}
                onChange={onChange}
                onSubmit={onSubmit}
                targetText={targetText}
                preFilledIndices={preFilledIndices}
                status={status}
            />
        )
    }

    return (
        <SlotTranslationInput
            value={value}
            onChange={onChange}
            onSubmit={onSubmit}
            targetText={targetText}
            preFilledIndices={preFilledIndices}
            status={status}
        />
    )
}
