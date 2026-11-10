import { ApiError, apiFetch, describeError } from "./api.js";
import { renderHeader, requireAuth, syncCurrentUser } from "./auth.js";
import { clearErrors, readForm, setFormMessage, setSubmitting, showFieldErrors } from "./forms.js";

const form = document.getElementById("car-form");
const brandSelect = form.elements.namedItem("brandId");

const REQUIRED_FIELDS = {
    brandId: "Оберіть бренд.",
    model: "Вкажіть модель.",
    year: "Вкажіть рік випуску.",
    price: "Вкажіть ціну.",
    mileage: "Вкажіть пробіг.",
};
const NUMBER_FIELDS = ["brandId", "year", "price", "mileage"];
const OPTIONAL_FIELDS = ["bodyType", "fuelType", "transmission", "imageUrl", "description"];
const MIN_YEAR = 1886;

async function loadBrands() {
    try {
        const brands = await apiFetch("/brands/");
        const options = brands.map((brand) => new Option(brand.name, brand.id));
        brandSelect.replaceChildren(new Option("Оберіть бренд", ""), ...options);
    } catch (error) {
        brandSelect.replaceChildren(new Option("Бренди недоступні", ""));
        setFormMessage(form, describeError(error));
    }
}

function validate(values) {
    const errors = {};
    Object.entries(REQUIRED_FIELDS).forEach(([field, message]) => {
        if (!values[field]) {
            errors[field] = message;
        }
    });
    const maxYear = new Date().getFullYear() + 1;
    const year = Number(values.year);
    if (values.year && (!Number.isInteger(year) || year < MIN_YEAR || year > maxYear)) {
        errors.year = `Рік має бути в межах ${MIN_YEAR}–${maxYear}.`;
    }
    if (values.price && Number(values.price) < 0) {
        errors.price = "Ціна не може бути від'ємною.";
    }
    if (values.mileage && (!Number.isInteger(Number(values.mileage)) || Number(values.mileage) < 0)) {
        errors.mileage = "Пробіг має бути цілим невід'ємним числом.";
    }
    return errors;
}

function buildPayload(values) {
    const payload = { model: values.model };
    NUMBER_FIELDS.forEach((field) => {
        payload[field] = Number(values[field]);
    });
    OPTIONAL_FIELDS.forEach((field) => {
        if (values[field]) {
            payload[field] = values[field];
        }
    });
    return payload;
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

    setSubmitting(form, true, "Збереження…");
    try {
        const car = await apiFetch("/cars/", {
            method: "POST",
            body: buildPayload(values),
            auth: true,
        });
        form.reset();
        brandSelect.value = "";
        setFormMessage(
            form,
            `Автомобіль «${car.brand.name} ${car.model}» додано до каталогу (id ${car.id}).`,
            "success",
        );
    } catch (error) {
        if (error instanceof ApiError && error.details) {
            showFieldErrors(form, error.details);
        } else if (!(error instanceof ApiError && error.status === 401)) {
            setFormMessage(form, describeError(error));
        }
    } finally {
        setSubmitting(form, false);
    }
}

if (requireAuth()) {
    renderHeader();
    syncCurrentUser();
    loadBrands();
    form.addEventListener("submit", handleSubmit);
}
