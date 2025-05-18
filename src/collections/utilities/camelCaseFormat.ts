export const camelCaseFormat = (value: string): string => {
  return value
    ? value.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
    : ''
}
