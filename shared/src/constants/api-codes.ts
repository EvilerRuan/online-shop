export const API_CODES = {
  SUCCESS: 0,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
} as const

export const API_MESSAGES = {
  SUCCESS: 'success',
  BAD_REQUEST: '请求参数错误',
  UNAUTHORIZED: '未登录',
  FORBIDDEN: '无权限访问后台',
  NOT_FOUND: '资源不存在',
  CONFLICT: '业务冲突',
  INTERNAL_ERROR: '服务器内部错误',
} as const
