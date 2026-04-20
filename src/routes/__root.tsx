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
            { rel: 'stylesheet', href: appCss },
        ],
    }),
    shellComponent: RootDocument,
    notFoundComponent: NotFound,
})

function RootComponent() {
    React.useEffect(() => {
        useSRSStore.persist.rehydrate()
    }, [])
    return <Outlet />
}

function RootDocument({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <head>
                <HeadContent />
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
