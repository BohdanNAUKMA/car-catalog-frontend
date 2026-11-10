import { ApiError, apiFetch, describeError, safeNextPage, session } from "./api.js";
import { redirectIfAuthenticated, renderHeader } from "./auth.js";
import { clearErrors, readForm, setFormMessage, setSubmitting, showFieldErrors } from "./forms.js";

const form = document.getElementById("login-form");
const next = new URLSearchParams(window.location.search).get("next");

function validate(values) {
    const errors = {};
    if (!values.username) {
        errors.username = "Введіть ім'я користувача.";
    }
    if (!values.password) {
        errors.password = "Введіть пароль.";
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

    setSubmitting(form, true, "Вхід…");
    try {
        const data = await apiFetch("/auth/login/", { method: "POST", body: values });
        session.save(data);
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
        document.getElementById("login-hint").hidden = false;
        const registerLink = document.getElementById("register-link");
        registerLink.href = `register.html?next=${encodeURIComponent(safeNextPage(next))}`;
    }
    form.addEventListener("submit", handleSubmit);
}
