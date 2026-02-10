// 클라이언트에서는 항상 상대 경로 사용 (web 서버를 통한 프록시)
const TOKEN_KEY = "auth_token";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(path, {
    ...options,
    headers,
    credentials: 'include', // 쿠키 포함
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(body.message || res.statusText, res.status);
  }

  return res.json();
}

export const apiClient = {
  getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY);
  },

  async login(
    email: string,
    password: string
  ): Promise<{
    success: boolean;
    token: string;
    user: { id: number; email: string; name: string; role: string };
  }> {
    const data = await request<{
      success: boolean;
      token: string;
      user: { id: number; email: string; name: string; role: string };
    }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (data.token) {
      localStorage.setItem(TOKEN_KEY, data.token);
      // Next.js middleware용 쿠키도 설정 (웹 앱 도메인에 설정)
      if (typeof document !== "undefined") {
        const maxAge = 24 * 60 * 60; // 24시간
        document.cookie = `admin_session=${data.token}; path=/; max-age=${maxAge}; SameSite=Lax`;
      }
    }
    return data;
  },

  async getMe(): Promise<{
    success: boolean;
    user: { id: number; email: string; name: string; role: string };
  }> {
    return request("/api/auth/me");
  },

  async logout(): Promise<void> {
    try {
      // 서버에 로그아웃 요청
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout API error:", error);
    } finally {
      // 로컬 상태 정리
      if (typeof window !== "undefined") {
        localStorage.removeItem(TOKEN_KEY);
        document.cookie = "admin_session=; path=/; max-age=0";
      }
    }
  },

  // Generic helpers
  get<T>(path: string): Promise<T> {
    return request<T>(path);
  },

  post<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  put<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  delete<T>(path: string): Promise<T> {
    return request<T>(path, { method: "DELETE" });
  },
};
