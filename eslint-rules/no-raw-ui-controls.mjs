import path from 'node:path'

const RAW_CONTROL_NAMES = new Set(['input', 'select', 'textarea'])
const RAW_BUTTON_NAME = 'button'
const RAW_CONTROL_ALLOWLIST = [
    'src/components/ui/Input.tsx',
    'src/components/ui/Select.tsx',
    'src/components/ui/Textarea.tsx',
    'src/components/domain/FreeTranslationInput.tsx',
    'src/components/domain/SlotTranslationInput.tsx',
]
const RAW_BUTTON_ALLOWLIST = [
    'src/components/ui/Button.tsx',
    'src/components/ui/ConfirmButton.tsx',
    'src/components/ui/IconButton.tsx',
]
const CONFIRM_ALLOWLIST = ['src/components/ui/ConfirmButton.tsx']

function normalizeFilename(filename) {
    return filename.split(path.sep).join('/')
}

function isAllowed(filename, allowlist) {
    const normalized = normalizeFilename(filename)
    return allowlist.some((allowedPath) => normalized.endsWith(allowedPath))
}

function isTestFile(filename) {
    const normalized = normalizeFilename(filename)
    return normalized.includes('/__tests__/') || normalized.endsWith('.test.tsx')
}

function getJsxElementName(name) {
    if (name.type === 'JSXIdentifier') return name.name
    return null
}

function isWindowConfirmCall(node) {
    return (
        node.callee.type === 'MemberExpression'
        && node.callee.object.type === 'Identifier'
        && node.callee.object.name === 'window'
        && node.callee.property.type === 'Identifier'
        && node.callee.property.name === 'confirm'
    )
}

function getPrimitiveName(name) {
    if (name === 'input') return 'Input'
    if (name === 'select') return 'Select'
    return 'Textarea'
}

export const noRawUiControls = {
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Prefer shared UI primitives over raw generic controls.',
        },
        messages: {
            rawControl: 'Use the shared {{primitive}} primitive instead of a raw <{{name}}> control, or add a targeted eslint disable comment for a specialized control.',
            rawButton: 'Use Button or IconButton instead of a raw <button>, or add a targeted eslint disable comment for a specialized control.',
            rawConfirm: 'Use ConfirmButton instead of calling window.confirm directly.',
        },
        schema: [],
    },
    create(context) {
        const filename = context.filename ?? context.getFilename()

        return {
            JSXOpeningElement(node) {
                const name = getJsxElementName(node.name)
                if (!name) return

                if (name === RAW_BUTTON_NAME) {
                    if (isTestFile(filename) || isAllowed(filename, RAW_BUTTON_ALLOWLIST)) return

                    context.report({
                        node,
                        messageId: 'rawButton',
                    })
                    return
                }

                if (!RAW_CONTROL_NAMES.has(name)) return
                if (isAllowed(filename, RAW_CONTROL_ALLOWLIST)) return

                context.report({
                    node,
                    messageId: 'rawControl',
                    data: {
                        name,
                        primitive: getPrimitiveName(name),
                    },
                })
            },
            CallExpression(node) {
                if (!isWindowConfirmCall(node)) return
                if (isAllowed(filename, CONFIRM_ALLOWLIST)) return

                context.report({
                    node,
                    messageId: 'rawConfirm',
                })
            },
        }
    },
}
