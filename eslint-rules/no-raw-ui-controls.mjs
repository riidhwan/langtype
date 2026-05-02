import path from 'node:path'

const RAW_CONTROL_NAMES = new Set(['input', 'select', 'textarea'])
const RAW_CONTROL_ALLOWLIST = [
    'src/components/ui/Input.tsx',
    'src/components/ui/Select.tsx',
    'src/components/ui/Textarea.tsx',
    'src/components/domain/FreeTranslationInput.tsx',
    'src/components/domain/SlotTranslationInput.tsx',
]
const CONFIRM_ALLOWLIST = ['src/components/ui/ConfirmButton.tsx']

function normalizeFilename(filename) {
    return filename.split(path.sep).join('/')
}

function isAllowed(filename, allowlist) {
    const normalized = normalizeFilename(filename)
    return allowlist.some((allowedPath) => normalized.endsWith(allowedPath))
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
            rawConfirm: 'Use ConfirmButton instead of calling window.confirm directly.',
        },
        schema: [],
    },
    create(context) {
        const filename = context.filename ?? context.getFilename()

        return {
            JSXOpeningElement(node) {
                const name = getJsxElementName(node.name)
                if (!name || !RAW_CONTROL_NAMES.has(name)) return
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
