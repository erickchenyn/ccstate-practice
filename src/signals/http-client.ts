import { computed, type Computed } from 'ccstate'
import { createHttpClient, type HttpClientFactory, type HttpClientOptions } from '../utils/http.ts'

export interface HttpClientContext {
  readonly httpClient$: Computed<HttpClientFactory>
}

export function createHttpClientContext(options: HttpClientOptions = {}): HttpClientContext {
  return {
    httpClient$: computed(() => {
      return (contract) => createHttpClient(contract, options)
    }),
  } as const
}
