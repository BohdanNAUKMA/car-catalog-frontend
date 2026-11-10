import { ApiError, apiFetch, describeError, safeNextPage, session } from "./api.js";
import { redirectIfAuthenticated, renderHeader } from "./auth.js";
import { clearErrors, readForm, setFormMessage, setSubmitting, showFieldErrors } from "./forms.js";

const form = document.getElementById("register-form");
const next = new URLSearchParams(window.location.search).get("next");

const USERNAME_PATTERN = /^[\w.@+-]+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME_LENGTH = 150;
const MAX_EMAIL_LENGTH = 254;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

function validate(values) {
    const errors = {};

    if (!values.username) {
        errors.username = "Ім'я користувача є обов'язковим.";
    } else if (values.username.length > MAX_NAME_LENGTH) {
        errors.username = `Не більше ${MAX_NAME_LENGTH} символів.`;
    } else if (!USERNAME_PATTERN.test(values.username)) {
        errors.username = "Дозволені лише літери, цифри та символи @ . + - _";
    }

    if (!values.email) {
        errors.email = "Email є обов'язковим.";
    } else if (values.email.length > MAX_EMAIL_LENGTH) {
        errors.email = `Не більше ${MAX_EMAIL_LENGTH} символів.`;
    } else if (!EMAIL_PATTERN.test(values.email)) {
        errors.email = "Введіть коректну email-адресу.";
    }

    ["first_name", "last_name"].forEach((field) => {
        if (values[field].length > MAX_NAME_LENGTH) {
            errors[field] = `Не більше ${MAX_NAME_LENGTH} символів.`;
        }
    });

    if (!values.password) {
        errors.password = "Пароль є обов'язковим.";
    } else if (values.password.length < MIN_PASSWORD_LENGTH) {
        errors.password = `Пароль має містити щонайменше ${MIN_PASSWORD_LENGTH} символів.`;
    } else if (values.password.length > MAX_PASSWORD_LENGTH) {
        errors.password = `Не більше ${MAX_PASSWORD_LENGTH} символів.`;
    } else if (/^\d+$/.test(values.password)) {
        errors.password = "Пароль не може складатися лише з цифр.";
    }

    if (!values.password_confirm) {
        errors.password_confirm = "Підтвердіть пароль.";
    } else if (values.password !== values.password_confirm) {
        errors.password_confirm = "Паролі не збігаються.";
    }

    return errors;
}

async function handleSubmit(event) {
    event.preventDefault();
    clearErrors(form);

    const values = readForm(form);
    const errors = validate(values);
    if (Object.keys(errors).length) {
        showFieldErrors(form, errors);
        return;
    }

    setSubmitting(form, true, "Реєстрація…");
    try {
        await apiFetch("/auth/register/", { method: "POST", body: values });
        const tokens = await apiFetch("/auth/login/", {
            method: "POST",
            body: { username: values.username, password: values.password },
        });
        session.save(tokens);
        window.location.replace(safeNextPage(next));
    } catch (error) {
        if (error instanceof ApiError && error.details) {
            showFieldErrors(form, error.details);
        } else {
            setFormMessage(form, describeError(error));
        }
        setSubmitting(form, false);
    }
}

if (!redirectIfAuthenticated()) {
    renderHeader();
    if (next) {
        const loginLink = document.getElementById("login-link");
        loginLink.href = `login.html?next=${encodeURIComponent(safeNextPage(next))}`;
    }
    form.addEventListener("submit", handleSubmit);
    form.addEventListener("input", (event) => {
        const holder = form.querySelector(`[data-error-for="${event.target.name}"]`);
        if (holder) {
            holder.textContent = "";
            event.target.classList.remove("invalid");
            event.target.removeAttribute("aria-invalid");
        }
    });
}
