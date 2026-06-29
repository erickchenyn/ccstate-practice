/* eslint-disable ccstate/signal-check-await */

export interface HttpResponse<TBody = unknown, TStatus extends number = number> {
  readonly status: TStatus
  readonly body: TBody
  readonly headers: Headers
}

export interface HttpErrorDetails {
  readonly message: string
  readonly code: string
}

export class HttpError extends Error {
  readonly code: string
  readonly status: number
  readonly body: unknown

  constructor(message: string, code: string, status: number, body: unknown) {
    super(message)
    this.name = 'HttpError'
    this.code = code
    this.status = status
    this.body = body
  }
}

export interface HttpRequestOptions {
  readonly body?: unknown
  readonly query?: Record<string, string | number | boolean | null | undefined>
  readonly headers?: HeadersInit
  readonly fetchOptions?: Omit<RequestInit, 'body' | 'headers' | 'method'>
}

export interface HttpEndpoint<
  TOptions extends HttpRequestOptions | undefined = HttpRequestOptions | undefined,
  TResult extends HttpResponse = HttpResponse,
> {
  readonly method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  readonly path: string | ((options: TOptions) => string)
  readonly response?: TResult
}

export type HttpContract = Record<
  string,
  HttpEndpoint<HttpRequestOptions | undefined, HttpResponse>
>

type EndpointOptions<TEndpoint> =
  TEndpoint extends HttpEndpoint<infer TOptions, HttpResponse> ? TOptions : never

type EndpointResult<TEndpoint> =
  TEndpoint extends HttpEndpoint<HttpRequestOptions | undefined, infer TResult> ? TResult : never

type EndpointCall<TOptions, TResult> = undefined extends TOptions
  ? (options?: TOptions) => Promise<TResult>
  : (options: TOptions) => Promise<TResult>

export type HttpClient<TContract extends HttpContract> = {
  readonly [K in keyof TContract]: EndpointCall<
    EndpointOptions<TContract[K]>,
    EndpointResult<TContract[K]>
  >
}

export interface HttpClientOptions {
  readonly baseUrl?: string
  readonly fetch?: typeof fetch
  readonly defaultHeaders?: HeadersInit
}

export type HttpClientFactory = <TContract extends HttpContract>(
  contract: TContract,
) => HttpClient<TContract>

function appendQuery(url: URL, query: HttpRequestOptions['query']) {
  if (!query) {
    return
  }

  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined) {
      continue
    }
    url.searchParams.set(key, String(value))
  }
}

function resolvePath<TOptions extends HttpRequestOptions | undefined>(
  endpoint: HttpEndpoint<TOptions, HttpResponse>,
  options: TOptions,
): string {
  if (typeof endpoint.path === 'function') {
    return endpoint.path(options)
  }
  return endpoint.path
}

function encodeBody(body: unknown): BodyInit | undefined {
  if (body === undefined) {
    return undefined
  }
  if (
    typeof body === 'string' ||
    body instanceof Blob ||
    body instanceof FormData ||
    body instanceof URLSearchParams ||
    body instanceof ArrayBuffer
  ) {
    return body
  }
  return JSON.stringify(body)
}

async function readBody(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return undefined
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return await response.json()
  }
  return await response.text()
}

function extractError(body: unknown, status: number): HttpErrorDetails {
  if (
    body !== null &&
    typeof body === 'object' &&
    'error' in body &&
    body.error !== null &&
    typeof body.error === 'object' &&
    'message' in body.error &&
    typeof body.error.message === 'string'
  ) {
    const code =
      'code' in body.error && typeof body.error.code === 'string' ? body.error.code : 'UNKNOWN'
    return { message: body.error.message, code }
  }
  return { message: `HTTP ${status}`, code: 'UNKNOWN' }
}

export function createHttpClient<TContract extends HttpContract>(
  contract: TContract,
  options: HttpClientOptions = {},
): HttpClient<TContract> {
  const fetchFn = options.fetch ?? fetch
  const baseUrl = options.baseUrl ?? globalThis.location?.origin ?? 'http://localhost'

  return Object.fromEntries(
    Object.entries(contract).map(([name, endpoint]) => {
      return [
        name,
        async (requestOptions?: HttpRequestOptions) => {
          const path = resolvePath(endpoint, requestOptions)
          const url = new URL(path, baseUrl)
          appendQuery(url, requestOptions?.query)

          const headers = new Headers(options.defaultHeaders)
          if (requestOptions?.headers) {
            new Headers(requestOptions.headers).forEach((value, key) => {
              headers.set(key, value)
            })
          }

          const body = encodeBody(requestOptions?.body)
          if (body !== undefined && !headers.has('content-type')) {
            headers.set('content-type', 'application/json')
          }

          const response = await fetchFn(url, {
            ...requestOptions?.fetchOptions,
            method: endpoint.method,
            headers,
            body,
          })

          return {
            status: response.status,
            body: await readBody(response),
            headers: response.headers,
          }
        },
      ]
    }),
  ) as HttpClient<TContract>
}

export async function accept<
  TResult extends HttpResponse<unknown, number>,
  TStatus extends TResult['status'],
>(
  promise: Promise<TResult>,
  statuses: readonly TStatus[],
): Promise<Extract<TResult, { status: TStatus }>> {
  const result = await promise
  if ((statuses as readonly number[]).includes(result.status)) {
    return result as Extract<TResult, { status: TStatus }>
  }

  const { message, code } = extractError(result.body, result.status)
  throw new HttpError(message, code, result.status, result.body)
}
