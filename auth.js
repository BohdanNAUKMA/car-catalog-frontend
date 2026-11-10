import { apiFetch, redirectToLogin, safeNextPage, session } from "./api.js";

function link(href, text, className = "nav-link") {
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.className = className;
    anchor.textContent = text;
    return anchor;
}

export function renderHeader() {
    const nav = document.getElementById("nav");
    if (!nav) {
        return;
    }
    const user = session.getUser();
    const items = [link("index.html", "Каталог"), link("add-car.html", "Додати авто")];

    if (session.isAuthenticated()) {
        const name = document.createElement("span");
        name.className = "nav-user";
        name.textContent = user?.username ?? "Користувач";

        const logoutButton = document.createElement("button");
        logoutButton.type = "button";
        logoutButton.className = "button button-ghost";
        logoutButton.textContent = "Вийти";
        logoutButton.addEventListener("click", logout);

        items.push(name, logoutButton);
    } else {
        items.push(
            link("login.html", "Увійти", "button button-ghost"),
            link("register.html", "Зареєструватися", "button"),
        );
    }
    nav.replaceChildren(...items);
}

export function logout() {
    session.clear();
    window.location.assign("index.html");
}

export async function syncCurrentUser() {
    if (!session.isAuthenticated()) {
        return null;
    }
    try {
        const user = await apiFetch("/auth/me/", {
            auth: true,
            redirectOnAuthFailure: false,
        });
        session.setUser(user);
        return user;
    } catch (error) {
        if (error.status === 401) {
            session.clear();
        }
        return session.getUser();
    } finally {
        renderHeader();
    }
}

export function requireAuth() {
    if (!session.isAuthenticated()) {
        redirectToLogin();
        return false;
    }
    return true;
}

export function redirectIfAuthenticated() {
    if (!session.isAuthenticated()) {
        return false;
    }
    const next = new URLSearchParams(window.location.search).get("next");
    window.location.replace(safeNextPage(next));
    return true;
}
