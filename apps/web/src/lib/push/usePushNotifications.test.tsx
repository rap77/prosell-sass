import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { usePushNotifications } from "./usePushNotifications";

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

describe("usePushNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reports unsupported when the browser has no Notification API", async () => {
    vi.stubGlobal("Notification", undefined);

    const { result } = renderHook(() => usePushNotifications(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.permission).toBe("unsupported"));
  });

  it("reports the current Notification.permission when supported", async () => {
    vi.stubGlobal("Notification", {
      permission: "default",
      requestPermission: vi.fn(),
    });
    vi.stubGlobal("navigator", { serviceWorker: {} });

    const { result } = renderHook(() => usePushNotifications(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.permission).toBe("default"));
  });

  it("enable() requests permission, subscribes, and registers with the backend", async () => {
    const requestPermission = vi.fn().mockResolvedValue("granted");
    const toJSON = vi.fn().mockReturnValue({
      endpoint: "https://fcm.googleapis.com/fcm/send/abc",
      keys: { p256dh: "key", auth: "secret" },
    });
    const subscribe = vi.fn().mockResolvedValue({ toJSON });
    const register = vi.fn().mockResolvedValue({ pushManager: { subscribe } });

    vi.stubGlobal("Notification", { permission: "default", requestPermission });
    vi.stubGlobal("navigator", { serviceWorker: { register } });
    vi.stubGlobal("atob", (s: string) =>
      Buffer.from(s, "base64").toString("binary"),
    );

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ public_key: "ZmFrZS1rZXk" }),
    });
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    const { result } = renderHook(() => usePushNotifications(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.permission).toBe("default"));

    await act(async () => {
      await result.current.enable();
    });

    expect(requestPermission).toHaveBeenCalled();
    expect(register).toHaveBeenCalledWith("/sw.js");
    expect(subscribe).toHaveBeenCalledWith(
      expect.objectContaining({ userVisibleOnly: true }),
    );
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/push/subscribe"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          endpoint: "https://fcm.googleapis.com/fcm/send/abc",
          keys: { p256dh: "key", auth: "secret" },
        }),
      }),
    );
  });

  it("enable() does nothing further when permission is denied", async () => {
    const requestPermission = vi.fn().mockResolvedValue("denied");
    const register = vi.fn();

    vi.stubGlobal("Notification", { permission: "default", requestPermission });
    vi.stubGlobal("navigator", { serviceWorker: { register } });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ public_key: "ZmFrZS1rZXk" }),
    });

    const { result } = renderHook(() => usePushNotifications(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.permission).toBe("default"));

    await act(async () => {
      await result.current.enable();
    });

    expect(register).not.toHaveBeenCalled();
  });
});
