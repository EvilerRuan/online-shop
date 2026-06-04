import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import type { ApiResponse, PageResult } from 'shared/types/api'

export function success<T>(c: Context, data: T, message = 'ok') {
  const body: ApiResponse<T> = { code: 0, message, data }
  return c.json(body)
}

export function paginate<T>(
  c: Context,
  list: T[],
  total: number,
  page: number,
  pageSize: number,
) {
  const data: PageResult<T> = { list, total, page, page_size: pageSize }
  const body: ApiResponse<PageResult<T>> = { code: 0, message: 'ok', data }
  return c.json(body)
}

export function error(
  c: Context,
  code: number,
  message: string,
  status: ContentfulStatusCode = 200,
) {
  const body: ApiResponse<null> = { code, message, data: null }
  return c.json(body, status)
}
