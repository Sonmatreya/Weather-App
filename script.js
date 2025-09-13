console.log("📡 Weather App JS Loaded");

const apiKey = "6cdc1b47e79ff8ee31fbc0f8a48ab81f";
const searchBtn = document.querySelector(".search-btn");
const geoBtn = document.querySelector(".geo-btn");
const cityInput = document.querySelector(".city-input");
const unitToggle = document.querySelector(".unit-toggle");
const langToggle = document.querySelector(".lang-toggle");
const darkToggle = document.querySelector(".dark-toggle-btn");

const weatherInfo = document.querySelector(".weather-info");
const notFound = document.querySelector(".not-found");
const sectionPrompt = document.querySelector(".section-message");
const rainAlert = document.querySelector(".rain-alert");
const rainSound = document.getElementById("rainSound");

const countryTxt = document.querySelector(".country-txt");
const dateTxt = document.querySelector(".current-date-txt");
const tempTxt = document.querySelector(".temp-txt");
const conditionTxt = document.querySelector(".condition-txt");
const weatherImg = document.querySelector(".weather-summary-img");

const humidityTxt = document.querySelector(".humidity-value-txt");
const windTxt = document.querySelector(".wind-value-txt");
const windDirTxt = document.querySelector(".wind-direction");
const aqiTxt = document.querySelector(".aqi-value");
const aqiEmoji = document.querySelector(".aqi-emoji");
const sunriseTxt = document.querySelector(".sunrise-time");
const sunsetTxt = document.querySelector(".sunset-time");

const hourlyWrapper = document.querySelector(".hourly-chart-wrapper");
const forecastWrapper = document.querySelector(".forecast-wrapper");
const forecastContainer = document.querySelector(".forecast-items-container");

let hourlyChart;
let currentUnit = unitToggle.value;
let currentLang = langToggle.value;
let rainPlaying = false; // ✅ keep this only once at the top

unitToggle.addEventListener("change", () => {
  currentUnit = unitToggle.value;
  if (cityInput.value.trim()) fetchWeather(cityInput.value.trim());
});

langToggle.addEventListener("change", () => {
  currentLang = langToggle.value;
  if (cityInput.value.trim()) fetchWeather(cityInput.value.trim());
});

darkToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark-theme");
});

searchBtn.addEventListener("click", () => {
  if (cityInput.value.trim()) {
    rainPlaying = false; // ✅ reset before new city
    fetchWeather(cityInput.value.trim());
  }
});

cityInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && cityInput.value.trim()) {
    rainPlaying = false; // ✅ reset before new city
    fetchWeather(cityInput.value.trim());
  }
});

geoBtn.addEventListener("click", () => {
  navigator.geolocation.getCurrentPosition(pos => {
    const { latitude, longitude } = pos.coords;
    rainPlaying = false; // ✅ reset before geo fetch
    fetchWeatherByCoords(latitude, longitude);
  });
});

async function fetchWeather(city) {
  try {
    const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${apiKey}`;
    const geoRes = await fetch(geoUrl);
    const geoData = await geoRes.json();
    if (!geoData.length) throw new Error("City not found");
    const { lat, lon, name, country } = geoData[0];
    await fetchWeatherByCoords(lat, lon, name, country);
  } catch {
    showNotFound();
  }
}

async function fetchWeatherByCoords(lat, lon, name = "", country = "") {
  try {
    const weatherURL = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=${currentUnit}&lang=${currentLang}`;
    const forecastURL = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=${currentUnit}&lang=${currentLang}`;
    const airURL = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`;

    const [weatherRes, forecastRes, airRes] = await Promise.all([
      fetch(weatherURL),
      fetch(forecastURL),
      fetch(airURL)
    ]);

    const weather = await weatherRes.json();
    const forecast = await forecastRes.json();
    const air = await airRes.json();

    updateCurrentWeather(weather, name || weather.name, country || weather.sys.country);
    updateAirQuality(air);
    updateForecast(forecast);
    updateChart(forecast);
    handleRainAlert(forecast);
  } catch (err) {
    console.error("❌ Weather Fetch Error:", err);
    showNotFound();
  }
}

function updateCurrentWeather(data, name, country) {
  weatherInfo.style.display = "block";
  notFound.style.display = "none";
  sectionPrompt.style.display = "none";

  const unitLabel = currentUnit === "metric" ? "°C" : "°F";
  countryTxt.textContent = `${name}, ${country}`;
  dateTxt.textContent = new Date().toLocaleDateString(currentLang, {
    weekday: "long", year: "numeric", month: "short", day: "numeric"
  });
  tempTxt.textContent = `${Math.round(data.main.temp)}${unitLabel}`;
  conditionTxt.textContent = data.weather[0].description;
  weatherImg.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;

  humidityTxt.textContent = `${data.main.humidity}%`;
  windTxt.textContent = `${data.wind.speed} ${currentUnit === "metric" ? "m/s" : "mph"}`;
  windDirTxt.textContent = getDirection(data.wind.deg);

  const sunrise = new Date(data.sys.sunrise * 1000);
  const sunset = new Date(data.sys.sunset * 1000);
  sunriseTxt.textContent = sunrise.toLocaleTimeString(currentLang, { hour: "2-digit", minute: "2-digit" });
  sunsetTxt.textContent = sunset.toLocaleTimeString(currentLang, { hour: "2-digit", minute: "2-digit" });
}

function updateAirQuality(data) {
  const aqi = data?.list?.[0]?.main?.aqi ?? 0;
  const aqiText = ["--", "Good", "Fair", "Moderate", "Poor", "Very Poor"];
  const aqiEmojiSet = ["❓", "😄", "🙂", "😐", "😷", "🤢"];
  aqiTxt.textContent = aqiText[aqi] || "--";
  aqiEmoji.textContent = aqiEmojiSet[aqi] || "❓";
}

function updateForecast(forecast) {
  forecastContainer.innerHTML = "";
  const today = new Date().toISOString().split("T")[0];
  const daily = {};

  forecast.list.forEach(item => {
    const date = item.dt_txt.split(" ")[0];
    if (date !== today && (!daily[date] || item.dt_txt.includes("12:00:00"))) {
      daily[date] = item;
    }
  });

  Object.values(daily).slice(0, 5).forEach(day => {
    const div = document.createElement("div");
    div.className = "forecast-item";
    div.innerHTML = `
      <p>${new Date(day.dt_txt).toLocaleDateString(currentLang, { weekday: "short" })}</p>
      <img class="forecast-item-img" src="https://openweathermap.org/img/wn/${day.weather[0].icon}@2x.png" alt="">
      <p>${Math.round(day.main.temp)}°</p>
    `;
    forecastContainer.appendChild(div);
  });

  forecastWrapper.style.display = "block";
}

function updateChart(forecast) {
  const hourly = forecast.list.slice(0, 8);
  const labels = hourly.map(item => new Date(item.dt * 1000).getHours() + ":00");
  const temps = hourly.map(item => item.main.temp);

  const ctx = document.getElementById("hourlyChart").getContext("2d");
  if (hourlyChart) hourlyChart.destroy();

  hourlyChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Temperature",
        data: temps,
        borderColor: "rgba(244, 15, 15, 0.9)",
        backgroundColor: "rgba(244, 164, 15, 0.4)",
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      scales: { y: { beginAtZero: false } }
    }
  });

  hourlyWrapper.style.display = "block";
}

function handleRainAlert(forecast) {
  const rainItem = forecast.list.find(item =>
    item.weather[0].main.toLowerCase().includes("rain")
  );

  if (rainItem) {
    const time = new Date(rainItem.dt * 1000).toLocaleTimeString(currentLang, {
      hour: "2-digit",
      minute: "2-digit"
    });

    rainAlert.style.display = "block";
    rainAlert.textContent = `🌧️ Rain expected around ${time}. Don’t forget your umbrella!`;

    // 🔊 Always restart sound per location
    rainSound.pause();
    rainSound.currentTime = 0;
    rainSound.play().catch(e => console.warn("Rain sound blocked:", e));
    rainPlaying = true;

  } else {
    rainAlert.style.display = "block";
    rainAlert.textContent = `☀️ No rain expected. Enjoy your day!`;

    if (rainPlaying) {
      rainSound.pause();
      rainSound.currentTime = 0;
      rainPlaying = false;
    }
  }
}

function showNotFound() {
  weatherInfo.style.display = "none";
  notFound.style.display = "flex";
}

function getDirection(deg) {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}
