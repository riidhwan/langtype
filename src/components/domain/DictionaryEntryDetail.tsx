import type { DictionaryEntry, DictionaryForm } from '@/types/dictionary'
import {
    formatDictionaryPartOfSpeech,
    getDictionarySubjectForTags,
    getPastParticiplePrefix,
    groupDictionaryForms,
    groupIndicativeForms,
    groupSubjunctiveForms,
    type DictionaryFormGroup,
} from '@/lib/dictionaryForms'

interface Props {
    entry: DictionaryEntry
}

export function DictionaryEntryDetail({ entry }: Props) {
    const formGroups = groupDictionaryForms(entry.forms ?? [])
    const senses = entry.senses ?? []

    return (
        <div>
            <div className="mb-4">
                <p className="mono-label mb-1">{formatDictionaryPartOfSpeech(entry.pos)}</p>
                <h2 className="text-2xl font-bold">
                    {entry.article ? `${entry.article} ` : ''}{entry.lemma}
                </h2>
            </div>

            <DetailFacts entry={entry} />

            {senses.length > 0 && (
                <section className="mt-5">
                    <p className="mono-label mb-2">meanings</p>
                    <ol className="list-decimal space-y-2 pl-5 text-sm">
                        {senses.map((sense) => <li key={sense}>{sense}</li>)}
                    </ol>
                </section>
            )}

            {formGroups.length > 0 && (
                <section className="mt-5">
                    <p className="mono-label mb-2">forms</p>
                    <div className="space-y-3">
                        {formGroups.map((group) => (
                            <div key={group.key}>
                                <p className="mb-1 font-mono text-[11px] uppercase text-muted-foreground">
                                    {group.label}
                                </p>
                                {group.key === 'subjunctive'
                                    ? <SubjunctiveForms forms={group.forms} />
                                    : group.key === 'indicative'
                                        ? <IndicativeForms forms={group.forms} />
                                        : <FlatForms group={group} />}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {entry.etymology && (
                <section className="mt-5">
                    <p className="mono-label mb-2">etymology</p>
                    <p className="text-sm text-muted-foreground">{entry.etymology}</p>
                </section>
            )}
        </div>
    )
}

interface DetailFactsProps {
    entry: DictionaryEntry
}

function DetailFacts({ entry }: DetailFactsProps) {
    const details = entry.details ?? {}
    const pastParticiplePrefix = getPastParticiplePrefix(entry.forms ?? [])
    const facts = [
        { label: 'Gender', value: details.gender },
        { label: 'Genitive', value: details.genitive },
        { label: 'Plural', value: details.plural },
        { label: 'Auxiliary', value: details.auxiliary },
        {
            label: 'Past participle',
            value: details.pastParticiple,
            prefix: pastParticiplePrefix,
        },
        { label: 'Comparative', value: details.comparative },
        { label: 'Superlative', value: details.superlative },
    ].filter((fact) => Boolean(fact.value))

    if (facts.length === 0) return null

    return (
        <dl className="grid gap-2 sm:grid-cols-2">
            {facts.map((fact) => (
                <div key={fact.label} className="rounded-[var(--radius-sm)] border border-border px-3 py-2">
                    <dt className="font-mono text-[11px] uppercase text-muted-foreground">{fact.label}</dt>
                    <dd className="text-sm font-medium">
                        {fact.prefix && <span className="italic">{fact.prefix} </span>}
                        {fact.value}
                    </dd>
                </div>
            ))}
        </dl>
    )
}

interface FlatFormsProps {
    group: DictionaryFormGroup
}

function FlatForms({ group }: FlatFormsProps) {
    return (
        <div className="flex flex-wrap gap-2">
            {group.forms.map((form) => (
                <FormPill
                    key={`${group.key}-${form.form}-${form.tags.join('-')}`}
                    form={form}
                />
            ))}
        </div>
    )
}

interface SubjunctiveFormsProps {
    forms: DictionaryForm[]
}

function SubjunctiveForms({ forms }: SubjunctiveFormsProps) {
    const groups = groupSubjunctiveForms(forms)

    return (
        <div className="space-y-2">
            {groups.map((group) => (
                <div key={group.label}>
                    <p className="mb-1 text-xs font-semibold">{group.label}</p>
                    <div className="flex flex-wrap gap-2">
                        {group.forms.map((form) => (
                            <FormPill
                                key={`${group.label}-${form.form}-${form.tags.join('-')}`}
                                form={form}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}

interface IndicativeFormsProps {
    forms: DictionaryForm[]
}

function IndicativeForms({ forms }: IndicativeFormsProps) {
    const groups = groupIndicativeForms(forms)

    return (
        <div className="space-y-2">
            {groups.map((group) => (
                <div key={group.label}>
                    <p className="mb-1 text-xs font-semibold">{group.label}</p>
                    <div className="flex flex-wrap gap-2">
                        {group.forms.map((form) => (
                            <FormPill
                                key={`${group.label}-${form.form}-${form.tags.join('-')}`}
                                form={form}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}

interface FormPillProps {
    form: DictionaryForm
}

function FormPill({ form }: FormPillProps) {
    const subject = getDictionarySubjectForTags(form.tags)

    return (
        <span className="rounded-full border border-border px-3 py-1 text-xs">
            <span className="font-semibold">
                {subject && <span className="italic">{subject} </span>}
                {form.form}
            </span>
            {form.tags.length > 0 && (
                <span className="text-muted-foreground"> · {form.tags.join(', ')}</span>
            )}
        </span>
    )
}
