export const API_BASE = "http://127.0.0.1:8000/api/v1";

const STORAGE_KEYS = {
    access: "autohub.accessToken",
    refresh: "autohub.refreshToken",
    user: "autohub.user",
};

const NEXT_PAGE_PATTERN = /^[\w-]+\.html(\?[\w=&%.+-]*)?$/;
const AUTH_PAGES = ["login.html", "register.html"];

export class ApiError extends Error {
    constructor(message, status, details = null) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.details = details;
    }
}

export const session = {
    getAccessToken() {
        return localStorage.getItem(STORAGE_KEYS.access);
    },
    getRefreshToken() {
        return localStorage.getItem(STORAGE_KEYS.refresh);
    },
    getUser() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEYS.user));
        } catch {
            return null;
        }
    },
    isAuthenticated() {
        return Boolean(this.getRefreshToken());
    },
    save({ access, refresh, user }) {
        localStorage.setItem(STORAGE_KEYS.access, access);
        if (refresh) {
            localStorage.setItem(STORAGE_KEYS.refresh, refresh);
        }
        if (user) {
            localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
        }
    },
    setUser(user) {
        localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
    },
    clear() {
        Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
    },
};

export function currentPage() {
    const page = window.location.pathname.split("/").pop() || "index.html";
    return page + window.location.search;
}

export function safeNextPage(value) {
    if (!value || !NEXT_PAGE_PATTERN.test(value)) {
        return "index.html";
    }
    const page = value.split("?")[0];
    return AUTH_PAGES.includes(page) ? "index.html" : value;
}

export function redirectToLogin(next = currentPage()) {
    const target = new URL("login.html", window.location.href);
    target.searchParams.set("next", safeNextPage(next));
    window.location.assign(target);
}

let refreshInFlight = null;

async function requestNewAccessToken() {
    const refresh = session.getRefreshToken();
    if (!refresh) {
        return false;
    }
    const response = await fetch(`${API_BASE}/auth/token/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ refresh }),
    });
    if (!response.ok) {
        return false;
    }
    const data = await response.json();
    session.save({ access: data.access });
    return true;
}

export function refreshAccessToken() {
    if (!refreshInFlight) {
        refreshInFlight = requestNewAccessToken().finally(() => {
            refreshInFlight = null;
        });
    }
    return refreshInFlight;
}

async function parseResponse(response) {
    if (response.status === 204) {
        return null;
    }
    const data = await response.json().catch(() => null);
    if (!response.ok) {
        throw new ApiError(
            data?.error || `HTTP ${response.status}`,
            response.status,
            data?.details ?? null,
        );
    }
    return data;
}

export async function apiFetch(path, options = {}) {
    const {
        method = "GET",
        body,
        auth = false,
        redirectOnAuthFailure = true,
    } = options;

    const send = () => {
        const headers = { Accept: "application/json" };
        if (body !== undefined) {
            headers["Content-Type"] = "application/json";
        }
        const access = session.getAccessToken();
        if (auth && access) {
            headers.Authorization = `Bearer ${access}`;
        }
        return fetch(`${API_BASE}${path}`, {
            method,
            headers,
            body: body === undefined ? undefined : JSON.stringify(body),
        });
    };

    let response = await send();

    if (auth && response.status === 401) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
            response = await send();
        }
        if (!refreshed || response.status === 401) {
            session.clear();
            if (redirectOnAuthFailure) {
                redirectToLogin();
            }
            throw new ApiError("Сесія завершилась. Увійдіть знову.", 401);
        }
    }

    return parseResponse(response);
}

export function describeError(error) {
    if (error instanceof ApiError) {
        return error.message;
    }
    return "Не вдалося підключитися до сервера. Переконайтеся, що бекенд запущено на http://127.0.0.1:8000.";
}
