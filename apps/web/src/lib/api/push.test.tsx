import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useVapidPublicKey,
  useSubscribeToPush,
  useUnsubscribeFromPush,
} from "./push";

const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }
  return Wrapper;
}

describe("useVapidPublicKey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches the VAPID public key", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ public_key: "fake-public-key" }),
    });

    const { result } = renderHook(() => useVapidPublicKey(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.public_key).toBe("fake-public-key");
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/push/vapid-public-key"),
      expect.objectContaining({ credentials: "include" }),
    );
  });
});

describe("useSubscribeToPush", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POSTs the subscription to the backend", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    const { result } = renderHook(() => useSubscribeToPush(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      endpoint: "https://fcm.googleapis.com/fcm/send/abc",
      keys: { p256dh: "key", auth: "secret" },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/push/subscribe"),
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          endpoint: "https://fcm.googleapis.com/fcm/send/abc",
          keys: { p256dh: "key", auth: "secret" },
        }),
      }),
    );
  });
});

describe("useUnsubscribeFromPush", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("DELETEs the subscription by endpoint", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    const { result } = renderHook(() => useUnsubscribeFromPush(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("https://fcm.googleapis.com/fcm/send/abc");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/push/subscribe"),
      expect.objectContaining({
        method: "DELETE",
        credentials: "include",
        body: JSON.stringify({
          endpoint: "https://fcm.googleapis.com/fcm/send/abc",
        }),
      }),
    );
  });
});
