export const noSpecialCharacters = (value: string): string | boolean => {
  // return true if string contains no special characters except space
  return /^[a-zA-Z0-9 ]+$/.test(value) || 'Special characters are not allowed'
}
