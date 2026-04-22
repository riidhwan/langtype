interface Props {
    text: string
}

export function SentenceDisplay({ text }: Props) {
    return (
        <div className="w-full max-w-xl mb-10 sticky top-0 z-10 bg-background/95 backdrop-blur py-5">
            <p className="mono-label mb-4">translate</p>
            <p
                className="text-2xl md:text-3xl font-semibold leading-relaxed text-foreground"
                style={{ textWrap: 'pretty' } as React.CSSProperties}
            >
                {text}
            </p>
        </div>
    )
}
