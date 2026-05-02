import * as React from 'react'
import { cn } from '@/lib/utils'

interface Props extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, Props>(
    ({ className, children, ...props }, ref) => {
        return (
            <select
                className={cn(
                    'flex h-9 w-full rounded-[var(--radius)] border border-border bg-card px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
                    className
                )}
                ref={ref}
                {...props}
            >
                {children}
            </select>
        )
    }
)
Select.displayName = 'Select'

export { Select }
