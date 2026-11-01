const COMMON = new Set([
  'password', 'password1', 'password123', '12345678', '123456789', '1234567890', 'qwerty123', 'qwertyuiop',
  'iloveyou', 'abc12345', '11111111', '00000000', 'admin123', 'welcome1', 'letmein123', 'exclusive1',
])

/** Returns a friendly message when the password is too weak, otherwise null. */
export function passwordIssue(pw: string): string | null {
  if (pw.length < 8) return 'Use at least 8 characters.'
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Include both letters and numbers.'
  if (COMMON.has(pw.toLowerCase())) return 'That password is too common. Choose something harder to guess.'
  return null
}
