import type { ErrorHandler } from 'hono'

export const errorHandler: ErrorHandler = (err, c) => {
  console.error('Unhandled error:', err)
  console.error('Error stack:', err.stack)

  return c.json(
    { code: 500, message: err.message || '服务器内部错误', data: null },
    500,
  )
}
