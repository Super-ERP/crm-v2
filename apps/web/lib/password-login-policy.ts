export function canUsePasswordLogin(input: {
  email: string
  platformMasterEmail: string
  isSuperadmin: boolean
  isBreakGlass: boolean
  twoFactorEnabled: boolean
}): boolean {
  const email = input.email.trim().toLowerCase()
  const platformMasterEmail = input.platformMasterEmail.trim().toLowerCase()

  if (platformMasterEmail && email === platformMasterEmail && input.isSuperadmin) {
    return true
  }

  return input.isBreakGlass && input.twoFactorEnabled
}
