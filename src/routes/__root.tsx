/// <reference types="vite/client" />
import {
    HeadContent,
    Outlet,
    Scripts,
    createRootRoute,
    Link,
} from '@tanstack/react-router'
import * as React from 'react'
import appCss from '../globals.css?url'
import { useSRSStore } from '@/store/useSRSStore'
import { IconSun, IconMoon } from '@/components/ui/icons'

type Theme = 'warm' | 'ink'

export const Route = createRootRoute({
    component: RootComponent,
    head: () => ({
        meta: [
            {
                charSet: 'utf-8',
            },
            {
                name: 'viewport',
                content: 'width=device-width, initial-scale=1',
            },
            {
                title: 'LangType',
            },
        ],
        links: [
            { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
            {
                rel: 'stylesheet',
                href: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,400;0,500;0,600;0,700;1,400&family=DM+Sans:wght@400;500;600&display=swap',
            },
            { rel: 'stylesheet', href: appCss },
        ],
    }),
    shellComponent: RootDocument,
    notFoundComponent: NotFound,
})

function RootComponent() {
    const [theme, setTheme] = React.useState<Theme>('warm')

    React.useEffect(() => {
        const stored = localStorage.getItem('lt_theme') as Theme | null
        if (stored === 'ink') setTheme('ink')
    }, [])

    React.useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme)
        localStorage.setItem('lt_theme', theme)
    }, [theme])

    React.useEffect(() => {
        useSRSStore.persist.rehydrate()
    }, [])

    const toggleTheme = () => setTheme(prev => prev === 'warm' ? 'ink' : 'warm')

    return (
        <>
            <Outlet />
            <button
                onClick={toggleTheme}
                aria-label={theme === 'warm' ? 'Switch to dark mode' : 'Switch to light mode'}
                className="fixed bottom-4 right-4 p-2 rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary transition-colors z-50"
            >
                {theme === 'warm' ? <IconMoon className="h-4 w-4" /> : <IconSun className="h-4 w-4" />}
            </button>
        </>
    )
}

function RootDocument({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <head>
                <HeadContent />
                <script dangerouslySetInnerHTML={{
                    __html: `document.documentElement.setAttribute('data-theme', localStorage.getItem('lt_theme') || 'warm')`
                }} />
            </head>
            <body>
                {children}
                <Scripts />
            </body>
        </html>
    )
}

function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-background">
            <h1 className="text-4xl font-bold mb-4">404</h1>
            <p className="text-xl text-muted-foreground mb-8">Page not found</p>
            <Link
                to="/"
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
                Go Home
            </Link>
        </div>
    )
}
