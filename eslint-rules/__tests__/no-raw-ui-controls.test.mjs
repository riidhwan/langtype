import { RuleTester } from 'eslint'
import { noRawUiControls } from '../no-raw-ui-controls.mjs'

const ruleTester = new RuleTester({
    languageOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        parserOptions: {
            ecmaFeatures: { jsx: true },
        },
    },
})

ruleTester.run('no-raw-ui-controls', noRawUiControls, {
    valid: [
        {
            filename: '/repo/src/components/features/Search.tsx',
            code: "import { Input } from '@/components/ui/Input'; export function Search() { return <Input /> }",
        },
        {
            filename: '/repo/src/components/ui/Input.tsx',
            code: 'export function Input() { return <input /> }',
        },
        {
            filename: '/repo/src/components/domain/SlotTranslationInput.tsx',
            code: 'export function SlotTranslationInput() { return <input /> }',
        },
        {
            filename: '/repo/src/components/features/Tags.tsx',
            code: 'export function Tags() { return <div>{\n/* eslint-disable-next-line rule-to-test/no-raw-ui-controls -- compound chip editor */\n<input />}</div> }',
        },
        {
            filename: '/repo/src/components/ui/ConfirmButton.tsx',
            code: "export function ConfirmButton() { window.confirm('Delete?') }",
        },
    ],
    invalid: [
        {
            filename: '/repo/src/components/features/Search.tsx',
            code: 'export function Search() { return <input /> }',
            errors: [{ messageId: 'rawControl' }],
        },
        {
            filename: '/repo/src/components/features/Editor.tsx',
            code: 'export function Editor() { return <textarea /> }',
            errors: [{ messageId: 'rawControl' }],
        },
        {
            filename: '/repo/src/components/features/Editor.tsx',
            code: 'export function Editor() { return <select /> }',
            errors: [{ messageId: 'rawControl' }],
        },
        {
            filename: '/repo/src/components/features/Delete.tsx',
            code: "export function Delete() { window.confirm('Delete?') }",
            errors: [{ messageId: 'rawConfirm' }],
        },
    ],
})
