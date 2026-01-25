interface Props {
    text: string
}

export function SentenceDisplay({ text }: Props) {
    return (
        <div className="w-full max-w-xl mb-8 sticky top-0 z-10 bg-background/95 backdrop-blur py-4 transition-all">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Translate this:
            </h2>
            <p className="text-xl md:text-2xl font-serif text-foreground leading-relaxed border-l-4 border-primary pl-4 py-1">
                {text}
            </p>
        </div>
    )
}
