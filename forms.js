export function readForm(form) {
    const values = {};
    new FormData(form).forEach((value, key) => {
        const input = form.elements.namedItem(key);
        values[key] = input?.type === "password" ? value : String(value).trim();
    });
    return values;
}

export function clearErrors(form) {
    form.querySelectorAll(".field-error").forEach((element) => {
        element.textContent = "";
    });
    form.querySelectorAll(".invalid").forEach((element) => {
        element.classList.remove("invalid");
        element.removeAttribute("aria-invalid");
    });
    setFormMessage(form, "");
}

export function showFieldErrors(form, errors) {
    const unmatched = [];
    Object.entries(errors || {}).forEach(([field, messages]) => {
        const text = [].concat(messages).join(" ");
        const input = form.elements.namedItem(field);
        const holder = form.querySelector(`[data-error-for="${field}"]`);
        if (input && holder) {
            input.classList.add("invalid");
            input.setAttribute("aria-invalid", "true");
            holder.textContent = text;
        } else {
            unmatched.push(text);
        }
    });
    if (unmatched.length) {
        setFormMessage(form, unmatched.join(" "), "error");
    }
    const firstInvalid = form.querySelector(".invalid");
    if (firstInvalid) {
        firstInvalid.focus();
    }
}

export function setFormMessage(form, text, type = "error") {
    const holder = form.querySelector(".form-message");
    if (!holder) {
        return;
    }
    holder.textContent = text;
    holder.className = `form-message ${text ? type : ""}`.trim();
}

export function setSubmitting(form, isSubmitting, label) {
    const button = form.querySelector("button[type='submit']");
    if (!button) {
        return;
    }
    if (!button.dataset.label) {
        button.dataset.label = button.textContent;
    }
    button.disabled = isSubmitting;
    button.textContent = isSubmitting ? label : button.dataset.label;
}
