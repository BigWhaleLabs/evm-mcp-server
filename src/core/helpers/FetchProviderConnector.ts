import {
  HttpProviderConnector,
  Headers,
  AuthError,
} from '@1inch/limit-order-sdk'

export default class FetchProviderConnector implements HttpProviderConnector {
  async get<T>(url: string, headers: Headers): Promise<T> {
    const res = await fetch(url, { headers, method: 'GET' })

    if (res.status === 401) {
      throw new AuthError()
    }

    if (res.ok) {
      return res.json() as Promise<T>
    }

    throw new Error(
      `Request failed with status ${res.status}: ${await res.text()}`
    )
  }

  async post<T>(url: string, data: unknown, headers: Headers): Promise<T> {
    const res = await fetch(url, {
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      method: 'POST',
      body: JSON.stringify(data),
    })

    if (res.status === 401) {
      throw new AuthError()
    }

    if (res.ok) {
      return res.json() as Promise<T>
    }

    throw new Error(
      `Request failed with status ${res.status}: ${await res.text()}`
    )
  }
}
