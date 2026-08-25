import customerApi, { CustomerRequestError } from '../../services/api/customerApi';

const jsonResponse = (body: unknown, status = 200, headers?: Record<string, string>) => new Response([204, 205, 304].includes(status) ? null : JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json', ...headers },
});

describe('customer API reliability', () => {
  afterEach(() => vi.useRealTimers());

  it('retries one transient GET failure and then succeeds', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ message: 'Unavailable' }, 503))
      .mockResolvedValueOnce(jsonResponse({ data: [], meta: { page: 1, limit: 25, total: 0, totalPages: 0 } }));
    vi.stubGlobal('fetch', fetchMock);
    const resultPromise = customerApi.getCustomers(1, 25);
    await vi.runAllTimersAsync();
    await expect(resultPromise).resolves.toMatchObject({ data: [], meta: { total: 0 } });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('recovers from a cached 304 response instead of treating it as an empty list', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(null, 304))
      .mockResolvedValueOnce(jsonResponse({ data: [], meta: { page: 1, limit: 25, total: 0, totalPages: 0 } }));
    vi.stubGlobal('fetch', fetchMock);
    const resultPromise = customerApi.getCustomers(1, 25);
    await vi.runAllTimersAsync();
    await expect(resultPromise).resolves.toMatchObject({ data: [], meta: { total: 0 } });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry 4xx and exposes the request id', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ message: 'Forbidden' }, 403, { 'x-request-id': 'req-403' }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(customerApi.getCustomers(1, 25)).rejects.toMatchObject<CustomerRequestError>({ kind: 'http', status: 403, requestId: 'req-403' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('classifies cancellation without retrying', async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchMock = vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError'));
    vi.stubGlobal('fetch', fetchMock);
    await expect(customerApi.getCustomers(1, 25, undefined, undefined, undefined, undefined, undefined, controller.signal)).rejects.toMatchObject({ kind: 'aborted' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
