/**
 * Unit tests for `setProductCover` — the fetcher function used by
 * the `useSetProductCover` mutation hook.
 *
 * Why a separate fetcher (not just a hook):
 *   The mutation hook (`useSetProductCover`) is a thin TanStack
 *   Query wrapper around a single HTTP call. The interesting logic
 *   — the URL, the method, the body shape, the credentials — lives
 *   in the fetcher. Testing the fetcher directly avoids the
 *   `QueryClientProvider` boilerplate of hook tests and keeps the
 *   assertion focused on the contract the backend expects.
 *
 *   The hook inherits the contract: it just wraps this function in
 *   a mutation with query invalidation and toast on success/error.
 *   If this test passes, the wire format is right.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setProductCover } from '@/lib/api/products'

const KEY_A = 'orgs/00000000-0000-0000-0000-000000000001/vehicles/a.jpg'

describe('setProductCover (fetcher)', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    // Replace global fetch for the duration of the test
    global.fetch = fetchMock as unknown as typeof fetch
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('PATCHes /api/v1/products/{id} with the cover_image_key in the body', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ id: 'prod-1', cover_image_key: KEY_A }),
    })

    await setProductCover('prod-1', KEY_A)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/v1/products/prod-1')
    expect(init.method).toBe('PATCH')
    expect(JSON.parse(init.body)).toEqual({ cover_image_key: KEY_A })
    expect(init.headers['Content-Type']).toBe('application/json')
    // Cookies for auth (the same as every other product call)
    expect(init.credentials).toBe('include')
  })

  it('throws a helpful error when the backend rejects the request', async () => {
    // The backend's PATCH rejects with 422 when the cover key
    // is not in the product's image list. The fetcher must surface
    // a useful error so the UI can show a toast — not just "Failed
    // to update product" (the default message).
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({ detail: "cover_image_key 'X' is not in the product's current image list" }),
    })

    await expect(setProductCover('prod-1', 'X')).rejects.toThrow(
      /cover_image_key.*not in the product/i,
    )
  })

  it('sends a null cover to clear the current cover', async () => {
    // The contract: passing `null` as the cover key means "clear
    // the cover" (PATCH semantics). The body must literally be
    // `{ cover_image_key: null }` — the backend treats `null` as
    // an explicit clear, distinct from omitting the field.
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ id: 'prod-1', cover_image_key: null }),
    })

    await setProductCover('prod-1', null)

    const [, init] = fetchMock.mock.calls[0]
    expect(JSON.parse(init.body)).toEqual({ cover_image_key: null })
  })
})
