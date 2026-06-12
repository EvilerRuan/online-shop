import { sign } from 'hono/jwt'

// 签发零售端 JWT
export async function signRetailJwt(
  secret: string,
  userId: string,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  return sign(
    {
      sub: userId,
      channel: 'retail',
      iat: now,
      exp: now + 60 * 60 * 24 * 30, // 30 天
    },
    secret,
    'HS256',
  )
}
