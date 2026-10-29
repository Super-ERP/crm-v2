/** Database-backed sessions make password recovery and administrative revocation immediate. */
export const authSessionPolicy = {
  expiresIn: 60 * 60 * 24 * 7,
  cookieCache: { enabled: false },
}
