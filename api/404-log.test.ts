import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock fetch first
global.fetch = vi.fn();

describe("404-log API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      text: async () => "",
    });
  });

  it("1. Rejects non-POST requests with 405", async () => {
    vi.doMock("@upstash/redis", () => ({
      Redis: {
        fromEnv: () => ({
          get: vi.fn().mockResolvedValue(null),
          set: vi.fn().mockResolvedValue("OK"),
          incr: vi.fn().mockResolvedValue(1),
          zincrby: vi.fn(),
          lpush: vi.fn(),
          ltrim: vi.fn(),
          expire: vi.fn(),
        }),
      },
    }));

    const { default: handler } = await import("./404-log");

    const req: any = {
      method: "GET",
      headers: { origin: "https://scriptor.pro" },
      socket: { remoteAddress: "1.2.3.4" },
    };
    const res: any = { status: vi.fn().mockReturnValue({ end: vi.fn() }) };

    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it("2. Sends email on valid POST", async () => {
    vi.doMock("@upstash/redis", () => ({
      Redis: {
        fromEnv: () => ({
          get: vi.fn().mockResolvedValue(null),
          set: vi.fn().mockResolvedValue("OK"),
          incr: vi.fn().mockResolvedValue(1),
          zincrby: vi.fn(),
          lpush: vi.fn(),
          ltrim: vi.fn(),
          expire: vi.fn(),
        }),
      },
    }));

    const { default: handler } = await import("./404-log");

    const req: any = {
      method: "POST",
      headers: { origin: "https://scriptor.pro", "content-type": "application/json" },
      body: { url: "https://scriptor.pro/test", occurredAt: new Date().toISOString() },
      socket: { remoteAddress: "1.2.3.4" },
    };
    const res: any = { status: vi.fn().mockReturnValue({ end: vi.fn() }) };

    await handler(req, res);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.any(Object),
    );
    expect(res.status).toHaveBeenCalledWith(204);
  });

  it("3. Rejects mismatched origin", async () => {
    vi.doMock("@upstash/redis", () => ({
      Redis: {
        fromEnv: () => ({
          get: vi.fn().mockResolvedValue(null),
          set: vi.fn().mockResolvedValue("OK"),
          incr: vi.fn().mockResolvedValue(1),
          zincrby: vi.fn(),
          lpush: vi.fn(),
          ltrim: vi.fn(),
          expire: vi.fn(),
        }),
      },
    }));

    const { default: handler } = await import("./404-log");

    const req: any = {
      method: "POST",
      headers: { origin: "https://evil.com", "content-type": "application/json" },
      body: { url: "https://scriptor.pro/test" },
      socket: { remoteAddress: "1.2.3.4" },
    };
    const res: any = { status: vi.fn().mockReturnValue({ end: vi.fn() }) };

    await handler(req, res);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(204);
  });

  it("4. Sanitizes malformed payloads", async () => {
    vi.doMock("@upstash/redis", () => ({
      Redis: {
        fromEnv: () => ({
          get: vi.fn().mockResolvedValue(null),
          set: vi.fn().mockResolvedValue("OK"),
          incr: vi.fn().mockResolvedValue(1),
          zincrby: vi.fn(),
          lpush: vi.fn(),
          ltrim: vi.fn(),
          expire: vi.fn(),
        }),
      },
    }));

    const { default: handler } = await import("./404-log");

    const req: any = {
      method: "POST",
      headers: { origin: "https://scriptor.pro", "content-type": "application/json" },
      body: { url: 123, referrer: null, userAgent: "test" }, // Invalid type
      socket: { remoteAddress: "1.2.3.4" },
    };
    const res: any = { status: vi.fn().mockReturnValue({ end: vi.fn() }) };

    await handler(req, res);
    const callArg = (global.fetch as any).mock.calls[0][1];
    const body = JSON.parse(callArg.body);
    expect(body.text).toContain('"url": null');
  });

  it("5. Truncates long URL strings", async () => {
    vi.doMock("@upstash/redis", () => ({
      Redis: {
        fromEnv: () => ({
          get: vi.fn().mockResolvedValue(null),
          set: vi.fn().mockResolvedValue("OK"),
          incr: vi.fn().mockResolvedValue(1),
          zincrby: vi.fn(),
          lpush: vi.fn(),
          ltrim: vi.fn(),
          expire: vi.fn(),
        }),
      },
    }));

    const { default: handler } = await import("./404-log");

    const longUrl = "https://scriptor.pro/" + "x".repeat(3000);
    const req: any = {
      method: "POST",
      headers: { origin: "https://scriptor.pro" },
      body: { url: longUrl, occurredAt: new Date().toISOString() },
      socket: { remoteAddress: "1.2.3.4" },
    };
    const res: any = { status: vi.fn().mockReturnValue({ end: vi.fn() }) };

    await handler(req, res);
    const callArg = (global.fetch as any).mock.calls[0][1];
    const body = JSON.parse(callArg.body);
    const parsed = JSON.parse(body.text);
    expect(parsed.url?.length || 0).toBeLessThanOrEqual(2000);
  });

  it("6. Handles Resend failure gracefully", async () => {
    vi.doMock("@upstash/redis", () => ({
      Redis: {
        fromEnv: () => ({
          get: vi.fn().mockResolvedValue(null),
          set: vi.fn().mockResolvedValue("OK"),
          incr: vi.fn().mockResolvedValue(1),
          zincrby: vi.fn(),
          lpush: vi.fn(),
          ltrim: vi.fn(),
          expire: vi.fn(),
        }),
      },
    }));

    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => "Invalid email",
    });

    const { default: handler } = await import("./404-log");

    const req: any = {
      method: "POST",
      headers: { origin: "https://scriptor.pro" },
      body: { url: "https://scriptor.pro/test", occurredAt: new Date().toISOString() },
      socket: { remoteAddress: "1.2.3.4" },
    };
    const res: any = { status: vi.fn().mockReturnValue({ end: vi.fn() }) };

    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(204); // Still returns 204
  });

  it("7. Handles network errors gracefully", async () => {
    vi.doMock("@upstash/redis", () => ({
      Redis: {
        fromEnv: () => ({
          get: vi.fn().mockResolvedValue(null),
          set: vi.fn().mockResolvedValue("OK"),
          incr: vi.fn().mockResolvedValue(1),
          zincrby: vi.fn(),
          lpush: vi.fn(),
          ltrim: vi.fn(),
          expire: vi.fn(),
        }),
      },
    }));

    (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

    const { default: handler } = await import("./404-log");

    const req: any = {
      method: "POST",
      headers: { origin: "https://scriptor.pro" },
      body: { url: "https://scriptor.pro/test", occurredAt: new Date().toISOString() },
      socket: { remoteAddress: "1.2.3.4" },
    };
    const res: any = { status: vi.fn().mockReturnValue({ end: vi.fn() }) };

    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(204); // No crash
  });
});
