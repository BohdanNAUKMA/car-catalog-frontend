import { apiFetch, describeError, session } from "./api.js";
import { renderHeader, syncCurrentUser } from "./auth.js";

const FUEL_LABELS = {
    petrol: "Бензин",
    diesel: "Дизель",
    electric: "Електро",
    hybrid: "Гібрид",
};

const BODY_LABELS = {
    sedan: "Седан",
    suv: "Кросовер",
    hatchback: "Хетчбек",
    wagon: "Універсал",
    coupe: "Купе",
    convertible: "Кабріолет",
    minivan: "Мінівен",
    pickup: "Пікап",
};

const TRANSMISSION_LABELS = {
    manual: "Механіка",
    automatic: "Автомат",
    robotic: "Робот",
    cvt: "Варіатор",
};

const carsContainer = document.getElementById("cars");
const statusElement = document.getElementById("status");
const filtersForm = document.getElementById("filters");

const priceFormatter = new Intl.NumberFormat("uk-UA", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
});
const numberFormatter = new Intl.NumberFormat("uk-UA");

let totalItems = 0;

function setStatus(message, isError = false) {
    statusElement.textContent = message;
    statusElement.classList.toggle("error", isError);
}

function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) {
        element.className = className;
    }
    if (text !== undefined) {
        element.textContent = text;
    }
    return element;
}

function createImage(car) {
    const wrapper = createElement("div", "car-image");
    const placeholder = car.brand.name.charAt(0).toUpperCase();

    if (!car.imageUrl) {
        wrapper.textContent = placeholder;
        return wrapper;
    }

    const image = document.createElement("img");
    image.src = car.imageUrl;
    image.alt = `${car.brand.name} ${car.model}`;
    image.loading = "lazy";
    image.addEventListener("error", () => {
        wrapper.textContent = placeholder;
    });
    wrapper.append(image);
    return wrapper;
}

async function deleteCar(car, card, button) {
    const title = `${car.brand.name} ${car.model}`;
    if (!window.confirm(`Видалити «${title}» з каталогу?`)) {
        return;
    }
    button.disabled = true;
    try {
        await apiFetch(`/cars/${car.id}/`, { method: "DELETE", auth: true });
        card.remove();
        totalItems -= 1;
        setStatus(`Автомобіль «${title}» видалено. Залишилось: ${totalItems}`);
    } catch (error) {
        button.disabled = false;
        setStatus(`Не вдалося видалити: ${describeError(error)}`, true);
    }
}

function createCarCard(car) {
    const card = createElement("article", "car-card");
    const body = createElement("div", "car-body");

    const title = createElement("h2", "car-title");
    title.append(
        createElement("span", "car-brand", `${car.brand.name} `),
        document.createTextNode(car.model),
    );

    const specs = createElement("ul", "car-specs");
    [
        `${car.year} р.`,
        `${numberFormatter.format(car.mileage)} км`,
        FUEL_LABELS[car.fuelType],
        BODY_LABELS[car.bodyType],
        TRANSMISSION_LABELS[car.transmission],
    ]
        .filter(Boolean)
        .forEach((value) => specs.append(createElement("li", "", value)));

    const footer = createElement("div", "car-footer");
    footer.append(createElement("p", "car-price", priceFormatter.format(car.price)));

    if (session.isAuthenticated()) {
        const deleteButton = createElement("button", "button button-danger", "Видалити");
        deleteButton.type = "button";
        deleteButton.addEventListener("click", () => deleteCar(car, card, deleteButton));
        footer.append(deleteButton);
    }

    body.append(title, specs, footer);
    card.append(createImage(car), body);
    return card;
}

function buildQuery() {
    const params = new URLSearchParams();
    const values = {
        search: document.getElementById("search").value.trim(),
        fuelType: document.getElementById("fuelType").value,
        sort: document.getElementById("sort").value,
    };
    Object.entries(values).forEach(([key, value]) => {
        if (value) {
            params.set(key, value);
        }
    });
    const query = params.toString();
    return query ? `?${query}` : "";
}

async function loadCars() {
    setStatus("Завантаження…");
    carsContainer.replaceChildren();

    try {
        const payload = await apiFetch(`/cars/${buildQuery()}`);
        totalItems = payload.pagination.totalItems;

        if (payload.data.length === 0) {
            setStatus("Автомобілів за вашим запитом не знайдено.");
            return;
        }

        carsContainer.append(...payload.data.map(createCarCard));
        setStatus(`Знайдено автомобілів: ${totalItems}`);
    } catch (error) {
        setStatus(`Помилка завантаження: ${describeError(error)}`, true);
    }
}

filtersForm.addEventListener("submit", (event) => {
    event.preventDefault();
    loadCars();
});

renderHeader();
loadCars();
syncCurrentUser().then(() => {
    if (!session.isAuthenticated()) {
        carsContainer.querySelectorAll(".button-danger").forEach((button) => button.remove());
    }
});
