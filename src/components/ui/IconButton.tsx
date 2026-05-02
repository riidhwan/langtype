import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
    'aria-label': string
    children: ReactNode
}

export function IconButton({ children, className, type = 'button', ...props }: Props) {
    return (
        <button
            type={type}
            className={cn(
                'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius)] border border-border text-muted-foreground transition-colors hover:bg-[var(--bg2)] hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30',
                className
            )}
            {...props}
        >
            {children}
        </button>
    )
}
