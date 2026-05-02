import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
    children: ReactNode
    confirmMessage: string
    onConfirm: () => void
}

export function ConfirmButton({
    children,
    className,
    confirmMessage,
    onConfirm,
    type = 'button',
    ...props
}: Props) {
    const handleClick = () => {
        if (!window.confirm(confirmMessage)) return
        onConfirm()
    }

    return (
        <button
            type={type}
            onClick={handleClick}
            className={cn(
                'rounded-[var(--radius)] border border-border px-3 py-2 text-sm font-medium text-[var(--incorrect)] transition-colors hover:bg-[var(--bg2)] disabled:cursor-not-allowed disabled:opacity-50',
                className
            )}
            {...props}
        >
            {children}
        </button>
    )
}
