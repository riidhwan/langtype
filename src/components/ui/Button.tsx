import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type ButtonVariant = 'secondary' | 'link' | 'dangerLink' | 'pill'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant
    selected?: boolean
}

export function Button({
    className,
    selected = false,
    type = 'button',
    variant = 'secondary',
    ...props
}: Props) {
    return (
        <button
            type={type}
            className={cn(
                variant === 'secondary' && 'inline-flex items-center justify-center gap-2 rounded-[var(--radius)] border border-border bg-card px-3 py-2 text-sm font-medium transition-colors hover:border-primary hover:bg-[var(--bg2)] disabled:cursor-not-allowed disabled:opacity-45',
                variant === 'link' && 'text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-45',
                variant === 'dangerLink' && 'font-medium text-[var(--incorrect)] transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-45',
                variant === 'pill' && cn(
                    'rounded-full border px-3 py-1 text-xs font-mono transition-colors disabled:cursor-not-allowed disabled:opacity-45',
                    selected
                        ? 'border-primary bg-[var(--accent-dim)] font-semibold text-primary'
                        : 'border-border text-muted-foreground hover:text-foreground'
                ),
                className
            )}
            {...props}
        />
    )
}
