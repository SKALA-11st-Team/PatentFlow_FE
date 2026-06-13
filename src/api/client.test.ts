import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiRequestError, requestJson } from "./client";

function jsonResponse(status: number, body: unknown): Response {
  const response = {
    ok: status >= 200 && status < 300,
    status,
    statusText: "",
    json: async () => body,
    clone: () => response,
  };
  return response as unknown as Response;
}

// BE-14: CSRF_TOKEN_INVALID 403 → /auth/csrf 프라이밍 → 1회 재시도 흐름 검증.
describe("requestJson CSRF 재시도", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("document", { cookie: "XSRF-TOKEN=stale-token" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("CSRF_TOKEN_INVALID 403이면 토큰 프라이밍 후 신선한 토큰으로 1회 재시도한다", async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.endsWith("/auth/csrf")) {
        // 프라이밍 응답이 새 XSRF-TOKEN 쿠키를 내려준 상황을 모사
        (globalThis.document as { cookie: string }).cookie = "XSRF-TOKEN=fresh-token";
        return jsonResponse(200, { data: null, message: "OK" });
      }
      if (fetchMock.mock.calls.length === 1) {
        return jsonResponse(403, { code: "CSRF_TOKEN_INVALID", message: "보안 토큰이 유효하지 않습니다." });
      }
      return jsonResponse(200, { data: { sent: 1 }, message: "OK" });
    });

    const result = await requestJson<{ data: { sent: number } }>("/mailings/send", { method: "POST" });

    expect(result.data.sent).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toContain("/auth/csrf");
    const retryHeaders = fetchMock.mock.calls[2][1].headers as Headers;
    expect(retryHeaders.get("X-XSRF-TOKEN")).toBe("fresh-token");
  });

  it("CSRF가 아닌 일반 403은 재시도 없이 즉시 던진다", async () => {
    fetchMock.mockResolvedValue(jsonResponse(403, { code: "ACCESS_DENIED", message: "접근 권한이 없습니다." }));

    await expect(requestJson("/mailings/send", { method: "POST" })).rejects.toMatchObject({
      name: "ApiRequestError",
      status: 403,
      code: "ACCESS_DENIED",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("재시도 후에도 CSRF 403이면 무한 루프 없이 실패를 드러낸다", async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.endsWith("/auth/csrf")) {
        return jsonResponse(200, { data: null, message: "OK" });
      }
      return jsonResponse(403, { code: "CSRF_TOKEN_INVALID", message: "보안 토큰이 유효하지 않습니다." });
    });

    await expect(requestJson("/mailings/send", { method: "POST" })).rejects.toBeInstanceOf(ApiRequestError);
    // POST → 프라이밍 → 재시도 POST 까지 정확히 3회
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("GET 요청의 403은 CSRF 재시도 대상이 아니다", async () => {
    fetchMock.mockResolvedValue(jsonResponse(403, { code: "CSRF_TOKEN_INVALID", message: "" }));

    await expect(requestJson("/departments")).rejects.toBeInstanceOf(ApiRequestError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
