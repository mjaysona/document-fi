type ResolveScopedBackPathOptions = {
  previousPath?: string | null
  scopePath?: string
  fallbackPath?: string
  allowedPrefixes?: string[]
  params?: Record<string, string | number | boolean | null | undefined>
}

export function handleBack(previousPath: string | null | undefined, scopePath: string): string {
  return resolveScopedBackPath({
    previousPath,
    scopePath,
  })
}

export function resolveScopedBackPath(options: ResolveScopedBackPathOptions): string {
  const scopePath = String(options.scopePath || '').trim()
  const fallbackPath = String(options.fallbackPath || scopePath || '').trim()
  const previousPath = String(options.previousPath || '').trim()
  const allowedPrefixes = (
    options.allowedPrefixes && options.allowedPrefixes.length > 0
      ? options.allowedPrefixes
      : scopePath
        ? [scopePath]
        : []
  )
    .map((prefix) => String(prefix || '').trim())
    .filter(Boolean)

  if (!fallbackPath) {
    return '/'
  }

  if (!previousPath || allowedPrefixes.length === 0) {
    return fallbackPath
  }

  const isAllowed = allowedPrefixes.some((prefix) => previousPath.startsWith(prefix))
  const basePath = isAllowed ? previousPath : fallbackPath

  const entries = Object.entries(options.params || {}).filter(([, value]) => value != null)
  if (entries.length === 0) return basePath

  const searchParams = new URLSearchParams()
  for (const [key, value] of entries) {
    searchParams.set(key, String(value))
  }

  const query = searchParams.toString()
  return query ? `${basePath}?${query}` : basePath
}
