const API_URL = "http://127.0.0.1:8000/api/v1/cars/";

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

function createCarCard(car) {
    const card = createElement("article", "car-card");
    const body = createElement("div", "car-body");

    const title = createElement("h2", "car-title");
    title.append(
        createElement("span", "car-brand", `${car.brand.name} `),
        document.createTextNode(car.model),
    );

    const specs = createElement("ul", "car-specs");
    const specValues = [
        `${car.year} р.`,
        `${numberFormatter.format(car.mileage)} км`,
        FUEL_LABELS[car.fuelType],
        BODY_LABELS[car.bodyType],
        TRANSMISSION_LABELS[car.transmission],
    ];
    specValues
        .filter(Boolean)
        .forEach((value) => specs.append(createElement("li", "", value)));

    const price = createElement(
        "p",
        "car-price",
        priceFormatter.format(car.price),
    );

    body.append(title, specs, price);
    card.append(createImage(car), body);
    return card;
}

function buildUrl() {
    const url = new URL(API_URL);
    const params = {
        search: document.getElementById("search").value.trim(),
        fuelType: document.getElementById("fuelType").value,
        sort: document.getElementById("sort").value,
    };
    Object.entries(params).forEach(([key, value]) => {
        if (value) {
            url.searchParams.set(key, value);
        }
    });
    return url;
}

async function loadCars() {
    setStatus("Завантаження…");
    carsContainer.replaceChildren();

    try {
        const response = await fetch(buildUrl());
        const payload = await response.json();

        if (!response.ok) {
            throw new Error(payload.error || `HTTP ${response.status}`);
        }

        const cars = payload.data;
        if (cars.length === 0) {
            setStatus("Автомобілів за вашим запитом не знайдено.");
            return;
        }

        carsContainer.append(...cars.map(createCarCard));
        setStatus(`Знайдено автомобілів: ${payload.pagination.totalItems}`);
    } catch (error) {
        const message = error instanceof TypeError
            ? "Не вдалося підключитися до сервера. Переконайтеся, що бекенд запущено на http://127.0.0.1:8000."
            : `Помилка завантаження: ${error.message}`;
        setStatus(message, true);
    }
}

filtersForm.addEventListener("submit", (event) => {
    event.preventDefault();
    loadCars();
});

document.addEventListener("DOMContentLoaded", loadCars);
