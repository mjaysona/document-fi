'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { resolveScopedBackPath } from '@/utilities/resolveScopedBackPath'

const MAX_HISTORY_STACK_SIZE = 10

type BackNavigationOptions = {
  fallbackPath?: string
  allowedPrefixes?: string[]
  params?: Record<string, string | number | boolean | null | undefined>
}

type NavigationHistoryContextType = {
  previousPath: string | null
  currentPath: string | null
  getBackPath: (scopePath: string, options?: BackNavigationOptions) => string
}

const NavigationHistoryContext = createContext<NavigationHistoryContextType>({
  previousPath: null,
  currentPath: null,
  getBackPath: () => '/',
})

export const NavigationHistoryProvider = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname()
  const [previousPath, setPreviousPath] = useState<string | null>(null)
  const [currentPath, setCurrentPath] = useState<string | null>(null)
  const pathStackRef = useRef<string[]>([])

  const getBackPath = useCallback(
    (scopePath: string, options?: BackNavigationOptions): string => {
      const normalizedCurrent = String(pathname || '').trim()
      const nextStack = [...pathStackRef.current]

      // Remove the current page so repeated Back clicks keep walking backward.
      while (nextStack.length > 0 && nextStack[nextStack.length - 1] === normalizedCurrent) {
        nextStack.pop()
      }

      const candidatePreviousPath = nextStack[nextStack.length - 1] ?? null
      const targetPath = resolveScopedBackPath({
        previousPath: candidatePreviousPath,
        scopePath,
        fallbackPath: options?.fallbackPath,
        allowedPrefixes: options?.allowedPrefixes,
        params: options?.params,
      })

      const [targetBasePath] = targetPath.split('?')
      if (candidatePreviousPath && targetBasePath === candidatePreviousPath) {
        nextStack.pop()
      }

      pathStackRef.current = nextStack.slice(-MAX_HISTORY_STACK_SIZE)
      const updatedPrevious = pathStackRef.current[pathStackRef.current.length - 1] ?? null
      setPreviousPath(updatedPrevious)

      return targetPath
    },
    [pathname],
  )

  useEffect(() => {
    const normalizedPath = String(pathname || '').trim()
    if (!normalizedPath) return

    // Keep only one entry per route by moving the latest visit to the top.
    const nextStack = pathStackRef.current.filter((stackPath) => stackPath !== normalizedPath)
    nextStack.push(normalizedPath)

    pathStackRef.current = nextStack.slice(-MAX_HISTORY_STACK_SIZE)
    const stackLength = pathStackRef.current.length
    const nextCurrentPath = pathStackRef.current[stackLength - 1] ?? null
    const nextPreviousPath = stackLength > 1 ? pathStackRef.current[stackLength - 2] : null

    setCurrentPath(nextCurrentPath)
    setPreviousPath(nextPreviousPath)
  }, [pathname])

  return (
    <NavigationHistoryContext.Provider value={{ previousPath, currentPath, getBackPath }}>
      {children}
    </NavigationHistoryContext.Provider>
  )
}

export const useNavigationHistory = () => useContext(NavigationHistoryContext)
