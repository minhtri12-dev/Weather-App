// ================= HỆ THỐNG CẤU HÌNH & TRẠNG THÁI =================
const CONFIG = {
    apiKey: "5d0440c6a96719587d42efc9382e6105",
    storageKey: "skycast_saved_city",
    defaultCity: { lat: 10.8231, lon: 106.6297, name: "TP. Hồ Chí Minh" },
    audioSources: {
        rain: "https://actions.google.com/sounds/v1/weather/light_rain.ogg",
        ambient: "https://actions.google.com/sounds/v1/ambiences/spring_day_forest.ogg"
    }
};

const appState = {
    timezoneOffset: 25200, // GMT+7
    currentCondition: "",
    clockTimer: null,
    forecastCache: {},
    isAudioPlaying: false
};

// ================= TÌM KIẾM PHẦN TỬ DOM =================
let elements = {};

function initDOMElements() {
    elements = {
        body: document.getElementById("appBody"),
        canvas: document.getElementById("weatherCanvas"),
        cityInput: document.getElementById("cityInput"),
        searchBtn: document.getElementById("searchBtn"),
        quickCitiesBar: document.getElementById("quickCitiesBar"),
        audioToggleBtn: document.getElementById("audioToggleBtn"),
        audioIcon: document.getElementById("audioIcon"),
        ambientAudio: document.getElementById("ambientAudio"),
        cityNameDisplay: document.getElementById("cityNameDisplay"),
        digitalTime: document.getElementById("digitalTime"),
        digitalTimezoneLabel: document.getElementById("digitalTimezoneLabel"),
        digitalFullDate: document.getElementById("digitalFullDate"),
        analogHourHand: document.getElementById("analogHourHand"),
        analogMinuteHand: document.getElementById("analogMinuteHand"),
        analogSecondHand: document.getElementById("analogSecondHand"),
        weatherIcon: document.getElementById("weatherIcon"),
        tempValue: document.getElementById("tempValue"),
        weatherDesc: document.getElementById("weatherDesc"),
        weatherAlertBanner: document.getElementById("weatherAlertBanner"),
        alertIcon: document.getElementById("alertIcon"),
        alertText: document.getElementById("alertText"),
        humidityVal: document.getElementById("humidityVal"),
        windVal: document.getElementById("windVal"),
        rainVolVal: document.getElementById("rainVolVal"),
        rainPopVal: document.getElementById("rainPopVal"),
        rainNotice: document.getElementById("rainNotice"),
        todayHourlyTrack: document.getElementById("todayHourlyTrack"),
        aqiCard: document.getElementById("aqiCard"),
        aqiBadge: document.getElementById("aqiBadge"),
        aqiValDesc: document.getElementById("aqiValDesc"),
        sunriseTime: document.getElementById("sunriseTime"),
        sunsetTime: document.getElementById("sunsetTime"),
        googleMapIframe: document.getElementById("googleMapIframe"),
        mapCoordinatesLabel: document.getElementById("mapCoordinatesLabel"),
        forecastList: document.getElementById("forecastList"),
        dayDetailModal: document.getElementById("dayDetailModal"),
        modalCloseBtn: document.getElementById("modalCloseBtn"),
        modalScrim: document.getElementById("modalScrim"),
        infoModal: document.getElementById("infoModal"),
        infoModalCloseBtn: document.getElementById("infoModalCloseBtn"),
        infoModalScrim: document.getElementById("infoModalScrim"),
        infoModalTitle: document.getElementById("infoModalTitle"),
        infoModalBody: document.getElementById("infoModalBody")
    };
}

// ================= CANVAS HIỆU ỨNG MƯA =================
let canvasCtx = null;
let rainParticles = [];
let isRainActive = false;
let animFrameId = null;

function setupRainCanvas() {
    if (!elements.canvas) return;
    canvasCtx = elements.canvas.getContext("2d");
    const syncCanvasBounds = () => {
        elements.canvas.width = window.innerWidth;
        elements.canvas.height = window.innerHeight;
    };
    syncCanvasBounds();
    window.addEventListener("resize", syncCanvasBounds);
}

function startRain() {
    if (isRainActive) return;
    isRainActive = true;
    rainParticles = [];
    const count = Math.min(100, Math.floor(window.innerWidth / 12));
    for (let i = 0; i < count; i++) {
        rainParticles.push({
            x: Math.random() * elements.canvas.width,
            y: Math.random() * elements.canvas.height,
            length: Math.random() * 16 + 8,
            speed: Math.random() * 8 + 10
        });
    }
    renderRain();
}

function stopRain() {
    isRainActive = false;
    if (animFrameId) cancelAnimationFrame(animFrameId);
    if (canvasCtx && elements.canvas) {
        canvasCtx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
    }
}

function renderRain() {
    if (!isRainActive || !canvasCtx) return;
    canvasCtx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
    canvasCtx.strokeStyle = "rgba(148, 163, 184, 0.4)";
    canvasCtx.lineWidth = 1;
    canvasCtx.lineCap = "round";

    rainParticles.forEach(p => {
        canvasCtx.beginPath();
        canvasCtx.moveTo(p.x, p.y);
        canvasCtx.lineTo(p.x - 1, p.y + p.length);
        canvasCtx.stroke();
        p.y += p.speed;
        p.x -= 0.5;
        if (p.y > elements.canvas.height) {
            p.y = -p.length;
            p.x = Math.random() * elements.canvas.width;
        }
    });
    animFrameId = requestAnimationFrame(renderRain);
}

// ================= ĐỒNG HỒ THỜI GIAN THỰC (SỐ & KIM QUAY) =================
function startLiveClock() {
    if (appState.clockTimer) clearInterval(appState.clockTimer);
    updateClockTick();
    appState.clockTimer = setInterval(updateClockTick, 1000);
}

function getCityCurrentDate() {
    const now = new Date();
    const utcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
    return new Date(utcMs + (appState.timezoneOffset * 1000));
}

function updateClockTick() {
    const cityDate = getCityCurrentDate();
    const hours = cityDate.getHours();
    const minutes = cityDate.getMinutes();
    const seconds = cityDate.getSeconds();

    applyAtmosphereTheme(hours, minutes, appState.currentCondition);

    // Đồng hồ số
    if (elements.digitalTime) {
        elements.digitalTime.textContent = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const dayName = days[cityDate.getDay()];
    const dateStr = `${String(cityDate.getDate()).padStart(2, "0")}/${String(cityDate.getMonth() + 1).padStart(2, "0")}/${cityDate.getFullYear()}`;
    if (elements.digitalFullDate) {
        elements.digitalFullDate.textContent = `${dayName}, ${dateStr}`;
    }

    const offsetHours = appState.timezoneOffset / 3600;
    if (elements.digitalTimezoneLabel) {
        elements.digitalTimezoneLabel.textContent = `GMT${offsetHours >= 0 ? "+" : ""}${offsetHours}`;
    }

    // XOAY KIM ĐỒNG HỒ CƠ HỌC MINI
    const secondDeg = (seconds / 60) * 360;
    const minuteDeg = ((minutes + seconds / 60) / 60) * 360;
    const hourDeg = (((hours % 12) + minutes / 60) / 12) * 360;

    if (elements.analogSecondHand) elements.analogSecondHand.style.transform = `translateX(-50%) rotate(${secondDeg}deg)`;
    if (elements.analogMinuteHand) elements.analogMinuteHand.style.transform = `translateX(-50%) rotate(${minuteDeg}deg)`;
    if (elements.analogHourHand) elements.analogHourHand.style.transform = `translateX(-50%) rotate(${hourDeg}deg)`;
}

function applyAtmosphereTheme(hour, minute, condition) {
    if (!elements.body) return;
    elements.body.className = "";

    const isRain = condition.includes("rain") || condition.includes("drizzle") || condition.includes("thunderstorm");
    
    if (isRain) {
        elements.body.classList.add("theme-rain");
        startRain();
    } else {
        stopRain();
        const totalMinutes = hour * 60 + minute;
        if (totalMinutes >= 360 && totalMinutes < 990) {
            elements.body.classList.add("theme-day");
        } else if (totalMinutes >= 990 && totalMinutes < 1110) {
            elements.body.classList.add("theme-sunset");
        } else {
            elements.body.classList.add("theme-night");
        }
    }
}

// ================= GỌI DỮ LIỆU THỜI TIẾT =================
async function loadWeatherByCoords(lat, lon, customName = null) {
    try {
        const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=vi&appid=${CONFIG.apiKey}`;
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&lang=vi&appid=${CONFIG.apiKey}`;
        const aqiUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${CONFIG.apiKey}`;

        const [wRes, fRes, aRes] = await Promise.all([
            fetch(weatherUrl),
            fetch(forecastUrl),
            fetch(aqiUrl)
        ]);

        if (!wRes.ok || !fRes.ok) return;

        const weatherData = await wRes.json();
        const forecastData = await fRes.json();
        const aqiData = aRes.ok ? await aRes.json() : null;

        renderWeather(weatherData, forecastData, aqiData, customName);

        localStorage.setItem(CONFIG.storageKey, JSON.stringify({
            query: customName || weatherData.name,
            lat: lat,
            lon: lon
        }));
    } catch (err) {
        console.error("Lỗi cập nhật thời tiết:", err);
    }
}

async function searchCity(query, label = null) {
    if (!query) return;
    try {
        const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=1&appid=${CONFIG.apiKey}`;
        const geoRes = await fetch(geoUrl);
        const geoList = await geoRes.json();

        if (geoList && geoList.length > 0) {
            const loc = geoList[0];
            await loadWeatherByCoords(loc.lat, loc.lon, label || (loc.country ? `${loc.name}, ${loc.country}` : loc.name));
        } else {
            const directUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(query)}&units=metric&lang=vi&appid=${CONFIG.apiKey}`;
            const directRes = await fetch(directUrl);
            if (directRes.ok) {
                const data = await directRes.json();
                await loadWeatherByCoords(data.coord.lat, data.coord.lon, label || data.name);
            } else {
                alert("Không tìm thấy địa điểm này. Vui lòng kiểm tra lại chính tả!");
            }
        }
    } catch (err) {
        console.error("Lỗi tìm kiếm địa điểm:", err);
    }
}

// ================= KẾT XUẤT DỮ LIỆU GIAO DIỆN =================
function renderWeather(weather, forecast, aqi, displayName) {
    const finalName = displayName || `${weather.name}${weather.sys && weather.sys.country ? ', ' + weather.sys.country : ''}`;
    if (elements.cityNameDisplay) elements.cityNameDisplay.textContent = finalName;
    if (elements.cityInput) elements.cityInput.value = "";

    appState.timezoneOffset = weather.timezone || 0;
    appState.currentCondition = (weather.weather && weather.weather[0]) ? weather.weather[0].main.toLowerCase() : "";

    updateClockTick();

    if (elements.tempValue) elements.tempValue.textContent = Math.round(weather.main.temp);
    if (elements.weatherDesc) elements.weatherDesc.textContent = weather.weather[0].description;
    if (elements.weatherIcon) {
        elements.weatherIcon.src = `https://openweathermap.org/img/wn/${weather.weather[0].icon}@4x.png`;
    }

    if (elements.humidityVal) elements.humidityVal.textContent = `${weather.main.humidity}%`;
    if (elements.windVal) elements.windVal.textContent = `${Math.round(weather.wind.speed * 3.6)} km/h`;

    const rain1h = (weather.rain && weather.rain["1h"]) ? weather.rain["1h"] : 0;
    if (elements.rainVolVal) elements.rainVolVal.textContent = `${rain1h} mm`;

    const nextPop = (forecast.list && forecast.list.length > 0) ? Math.round((forecast.list[0].pop || 0) * 100) : 0;
    if (elements.rainPopVal) elements.rainPopVal.textContent = `${nextPop}%`;

    if (elements.sunriseTime) elements.sunriseTime.textContent = formatHour(weather.sys.sunrise, appState.timezoneOffset);
    if (elements.sunsetTime) elements.sunsetTime.textContent = formatHour(weather.sys.sunset, appState.timezoneOffset);

    const lat = weather.coord.lat;
    const lon = weather.coord.lon;
    if (elements.googleMapIframe) {
        elements.googleMapIframe.src = `https://maps.google.com/maps?q=${lat},${lon}&hl=vi&z=13&output=embed`;
    }
    if (elements.mapCoordinatesLabel) {
        elements.mapCoordinatesLabel.textContent = `${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E`;
    }

    renderAQI(aqi);
    renderSafetyAdvice(weather, nextPop);

    if (forecast.list) {
        renderTodayHourly(forecast.list);
        render5DayForecast(forecast.list);
    }

    syncAudioTrack(appState.currentCondition);
}

function formatHour(timestamp, offset) {
    const d = new Date((timestamp + offset) * 1000);
    return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

function renderAQI(aqiData) {
    if (!elements.aqiBadge || !elements.aqiValDesc) return;
    if (!aqiData || !aqiData.list || aqiData.list.length === 0) {
        elements.aqiBadge.textContent = "Bình thường";
        elements.aqiBadge.className = "aqi-badge-pill";
        elements.aqiValDesc.textContent = "Không có cảnh báo đặc biệt về chất lượng không khí.";
        return;
    }

    const val = aqiData.list[0].main.aqi;
    const configs = {
        1: { text: "Rất tốt", class: "", desc: "Không khí trong lành, rất lý tưởng cho các hoạt động thể thao ngoài trời." },
        2: { text: "Khá", class: "fair", desc: "Chất lượng không khí ở mức chấp nhận được, an toàn cho hầu hết mọi người." },
        3: { text: "Trung bình", class: "moderate", desc: "Người có bệnh về đường hô hấp nên chú ý hạn chế ra ngoài lâu." },
        4: { text: "Kém", class: "poor", desc: "Không khí có dấu hiệu ô nhiễm nhẹ. Nên đeo khẩu trang khi di chuyển xa." },
        5: { text: "Nguy hại", class: "poor", desc: "Chỉ số ô nhiễm cao. Tránh vận động mạnh ngoài trời và nên đóng cửa sổ." }
    };
    const c = configs[val] || configs[1];
    elements.aqiBadge.textContent = c.text;
    elements.aqiBadge.className = `aqi-badge-pill ${c.class}`;
    elements.aqiValDesc.textContent = c.desc;
}

function renderSafetyAdvice(weather, nextPop) {
    if (!elements.weatherAlertBanner || !elements.alertIcon || !elements.alertText) return;
    const condition = weather.weather[0].main.toLowerCase();
    const temp = weather.main.temp;
    const wind = weather.wind.speed * 3.6;

    elements.weatherAlertBanner.className = "smart-notice";

    if (condition.includes("thunderstorm")) {
        elements.weatherAlertBanner.classList.add("danger");
        elements.alertIcon.className = "fa-solid fa-cloud-bolt";
        elements.alertText.textContent = "Có dông sét trong khu vực. Hãy chú ý tìm nơi trú ẩn an toàn khi di chuyển.";
    } else if (condition.includes("rain") || nextPop >= 70) {
        elements.alertIcon.className = "fa-solid fa-umbrella";
        elements.alertText.textContent = "Khả năng mưa khá cao. Bạn nên mang theo dù hoặc áo mưa khi ra ngoài.";
    } else if (temp >= 35) {
        elements.weatherAlertBanner.classList.add("danger");
        elements.alertIcon.className = "fa-solid fa-temperature-high";
        elements.alertText.textContent = "Trời nắng gắt và oi bức. Nhớ uống nhiều nước và che chắn cẩn thận.";
    } else if (wind >= 38) {
        elements.weatherAlertBanner.classList.add("danger");
        elements.alertIcon.className = "fa-solid fa-wind";
        elements.alertText.textContent = "Gió giật tương đối mạnh. Cẩn thận chướng ngại vật khi lái xe máy.";
    } else {
        elements.alertIcon.className = "fa-solid fa-circle-check";
        elements.alertText.textContent = "Điều kiện thời tiết thuận lợi, rất thích hợp cho công việc và sinh hoạt ngoài trời.";
    }
}

function renderTodayHourly(forecastList) {
    if (!elements.todayHourlyTrack || !elements.rainNotice) return;
    elements.todayHourlyTrack.innerHTML = "";
    const todaySlots = forecastList.slice(0, 8);

    const rainSlot = todaySlots.find(s => (s.pop && s.pop >= 0.35) || (s.rain && s.rain["3h"] > 0));
    if (rainSlot) {
        const timeStr = formatHour(rainSlot.dt, appState.timezoneOffset);
        elements.rainNotice.textContent = `Có thể mưa vào khoảng ${timeStr}`;
    } else {
        elements.rainNotice.textContent = "Hôm nay ít khả năng có mưa";
    }

    todaySlots.forEach(slot => {
        const timeStr = formatHour(slot.dt, appState.timezoneOffset);
        const popVal = Math.round((slot.pop || 0) * 100);
        const isRainRisk = popVal >= 40;

        const node = document.createElement("div");
        node.className = `hour-node ${isRainRisk ? "rain-risk" : ""}`;
        node.innerHTML = `
            <span class="h-time">${timeStr}</span>
            <img src="https://openweathermap.org/img/wn/${slot.weather[0].icon}.png" alt="icon">
            <span class="h-temp">${Math.round(slot.main.temp)}°</span>
            <span class="h-pop">${popVal > 0 ? popVal + '%' : '--'}</span>
        `;
        elements.todayHourlyTrack.appendChild(node);
    });
}

function render5DayForecast(forecastItems) {
    if (!elements.forecastList) return;
    elements.forecastList.innerHTML = "";
    appState.forecastCache = {};

    const nowUtc = (Math.floor(Date.now() / 1000) + appState.timezoneOffset) * 1000;
    const todayDateStr = new Date(nowUtc).toISOString().split('T')[0];

    const grouped = {};
    forecastItems.forEach(item => {
        const itemUtc = (item.dt + appState.timezoneOffset) * 1000;
        const dStr = new Date(itemUtc).toISOString().split('T')[0];
        if (dStr === todayDateStr) return;
        if (!grouped[dStr]) grouped[dStr] = [];
        grouped[dStr].push(item);
    });

    const daysKeys = Object.keys(grouped).slice(0, 5);
    const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

    daysKeys.forEach(dateKey => {
        const daySlots = grouped[dateKey];
        const midSlot = daySlots.find(s => s.dt_txt && s.dt_txt.includes("12:00:00")) || daySlots[Math.floor(daySlots.length / 2)];

        const dateObj = new Date(dateKey + "T00:00:00");
        const dayLabel = dayNames[dateObj.getDay()];
        const [year, month, day] = dateKey.split('-');
        
        // HIỂN THỊ ĐẦY ĐỦ CẢ NĂM: 19/09/2026
        const fullDateNumeric = `${day}/${month}/${year}`;

        let maxPop = 0;
        let peakHour = null;
        daySlots.forEach(s => {
            const p = Math.round((s.pop || 0) * 100);
            if (p > maxPop) {
                maxPop = p;
                peakHour = formatHour(s.dt, appState.timezoneOffset);
            }
        });

        const totalRain = daySlots.reduce((sum, curr) => sum + ((curr.rain && curr.rain["3h"]) ? curr.rain["3h"] : 0), 0);

        appState.forecastCache[dateKey] = {
            title: `${dayLabel}, ${fullDateNumeric}`,
            temp: Math.round(midSlot.main.temp),
            desc: midSlot.weather[0].description,
            icon: midSlot.weather[0].icon,
            humidity: midSlot.main.humidity,
            wind: Math.round(midSlot.wind.speed * 3.6),
            rainVol: totalRain.toFixed(1),
            pop: maxPop,
            peakHour: peakHour,
            hourlySlots: daySlots.map(s => ({
                time: formatHour(s.dt, appState.timezoneOffset),
                icon: s.weather[0].icon,
                temp: Math.round(s.main.temp),
                pop: Math.round((s.pop || 0) * 100)
            }))
        };

        const itemEl = document.createElement("div");
        itemEl.className = "forecast-item";
        itemEl.dataset.date = dateKey;
        itemEl.innerHTML = `
            <div class="f-day">
                <strong>${dayLabel}</strong>
                <span>${fullDateNumeric}</span>
            </div>
            <img src="https://openweathermap.org/img/wn/${midSlot.weather[0].icon}@2x.png" alt="icon">
            <span class="f-desc">${midSlot.weather[0].description}</span>
            <span class="f-temp">${Math.round(midSlot.main.temp)}°C</span>
        `;
        elements.forecastList.appendChild(itemEl);
    });
}

// ================= MODAL & SỰ KIỆN TƯƠNG TÁC =================
function setupEventDelegation() {
    if (elements.searchBtn) {
        elements.searchBtn.addEventListener("click", () => {
            searchCity(elements.cityInput.value.trim());
        });
    }

    if (elements.cityInput) {
        elements.cityInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                searchCity(elements.cityInput.value.trim());
            }
        });
    }

    if (elements.quickCitiesBar) {
        elements.quickCitiesBar.addEventListener("click", (e) => {
            const btn = e.target.closest(".city-pill");
            if (!btn) return;
            const query = btn.dataset.query;
            const label = btn.dataset.label;
            searchCity(query, label);
        });
    }

    if (elements.forecastList) {
        elements.forecastList.addEventListener("click", (e) => {
            const row = e.target.closest(".forecast-item");
            if (!row) return;
            const dateKey = row.dataset.date;
            openDayModal(dateKey);
        });
    }

    if (elements.modalCloseBtn) elements.modalCloseBtn.addEventListener("click", closeDayModal);
    if (elements.modalScrim) elements.modalScrim.addEventListener("click", closeDayModal);

    document.querySelectorAll("[data-metric]").forEach(el => {
        el.addEventListener("click", () => {
            const metricType = el.dataset.metric;
            openMetricInfoModal(metricType);
        });
    });

    if (elements.infoModalCloseBtn) elements.infoModalCloseBtn.addEventListener("click", closeInfoModal);
    if (elements.infoModalScrim) elements.infoModalScrim.addEventListener("click", closeInfoModal);

    if (elements.audioToggleBtn) elements.audioToggleBtn.addEventListener("click", toggleAudio);

    window.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            closeDayModal();
            closeInfoModal();
        }
    });
}

function openDayModal(dateKey) {
    const data = appState.forecastCache[dateKey];
    if (!data || !elements.dayDetailModal) return;

    document.getElementById("dayModalTitle").textContent = data.title;
    document.getElementById("dayModalTemp").textContent = `${data.temp}°C`;
    document.getElementById("dayModalDesc").textContent = data.desc;
    document.getElementById("dayModalIcon").src = `https://openweathermap.org/img/wn/${data.icon}@2x.png`;
    document.getElementById("dayModalHumidity").textContent = `${data.humidity}%`;
    document.getElementById("dayModalWind").textContent = `${data.wind} km/h`;
    document.getElementById("dayModalRainVol").textContent = `${data.rainVol} mm`;

    const popText = data.pop > 0 && data.peakHour 
        ? `${data.pop}% (Khả năng cao lúc ~${data.peakHour})`
        : `${data.pop}%`;
    document.getElementById("dayModalPop").textContent = popText;

    const hourlyWrap = document.getElementById("dayModalHourlyList");
    hourlyWrap.innerHTML = "";
    data.hourlySlots.forEach(s => {
        const div = document.createElement("div");
        div.className = "hour-node";
        div.innerHTML = `
            <span class="h-time">${s.time}</span>
            <img src="https://openweathermap.org/img/wn/${s.icon}.png" alt="icon">
            <span class="h-temp">${s.temp}°</span>
            <span class="h-pop">${s.pop > 0 ? s.pop + '%' : '--'}</span>
        `;
        hourlyWrap.appendChild(div);
    });

    elements.dayDetailModal.classList.add("active");
}

function closeDayModal() {
    if (elements.dayDetailModal) elements.dayDetailModal.classList.remove("active");
}

function openMetricInfoModal(type) {
    const infoGuide = {
        humidity: {
            title: "Độ ẩm không khí",
            body: "Độ ẩm biểu thị lượng hơi nước trong không khí. Mức từ 45% - 65% là dễ chịu nhất đối với cơ thể người. Trên 85% sẽ gây oi bức."
        },
        wind: {
            title: "Tốc độ gió",
            body: "Vận tốc di chuyển của luồng không khí. Dưới 15 km/h là gió mát nhẹ, từ 20 - 35 km/h là gió vừa, trên 40 km/h là gió lớn cần chú ý an toàn khi di chuyển."
        },
        rain_volume: {
            title: "Lượng nước mưa",
            body: "Tổng lượng nước mưa tích lũy đo được trong 1 giờ qua. Dưới 2 mm là mưa bay nhẹ, từ 2 - 10 mm là mưa rào vừa, trên 15 mm là mưa rất lớn."
        },
        rain_pop: {
            title: "Xác suất có mưa (PoP)",
            body: "Khả năng xuất hiện mưa tại khu vực trong khung giờ tới. Chỉ số từ 50% trở lên là bạn nên chuẩn bị sẵn ô dù hoặc áo mưa."
        },
        aqi: {
            title: "Chất lượng không khí (AQI)",
            body: "Chỉ số đo nồng độ bụi mịn PM2.5, PM10, CO và Ozone. Mức 'Tốt' và 'Khá' an toàn cho hoạt động thể dục thể thao ngoài trời."
        }
    };

    const target = infoGuide[type];
    if (!target || !elements.infoModal) return;

    elements.infoModalTitle.textContent = target.title;
    elements.infoModalBody.textContent = target.body;
    elements.infoModal.classList.add("active");
}

function closeInfoModal() {
    if (elements.infoModal) elements.infoModal.classList.remove("active");
}

// ================= ÂM THANH MÔI TRƯỜNG =================
function syncAudioTrack(condition) {
    if (!elements.ambientAudio) return;
    const isRain = condition.includes("rain") || condition.includes("drizzle") || condition.includes("thunderstorm");
    elements.ambientAudio.src = isRain ? CONFIG.audioSources.rain : CONFIG.audioSources.ambient;
    if (appState.isAudioPlaying) {
        elements.ambientAudio.play().catch(() => {});
    }
}

function toggleAudio() {
    if (!elements.ambientAudio) return;
    if (!elements.ambientAudio.src) syncAudioTrack(appState.currentCondition);

    if (appState.isAudioPlaying) {
        elements.ambientAudio.pause();
        appState.isAudioPlaying = false;
        elements.audioIcon.className = "fa-solid fa-volume-xmark";
    } else {
        elements.ambientAudio.play().then(() => {
            appState.isAudioPlaying = true;
            elements.audioIcon.className = "fa-solid fa-volume-high";
        }).catch(() => {
            console.log("Cần tương tác người dùng để phát âm thanh");
        });
    }
}

// ================= KHỞI ĐỘNG ỨNG DỤNG AN TOÀN =================
document.addEventListener("DOMContentLoaded", () => {
    initDOMElements();
    setupRainCanvas();
    setupEventDelegation();
    startLiveClock();

    const cachedLocation = localStorage.getItem(CONFIG.storageKey);
    if (cachedLocation) {
        try {
            const parsed = JSON.parse(cachedLocation);
            loadWeatherByCoords(parsed.lat, parsed.lon, parsed.query);
            return;
        } catch (e) {}
    }

    let hasLoaded = false;
    const fallbackToDefault = () => {
        if (!hasLoaded) {
            hasLoaded = true;
            loadWeatherByCoords(CONFIG.defaultCity.lat, CONFIG.defaultCity.lon, CONFIG.defaultCity.name);
        }
    };

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            pos => {
                if (!hasLoaded) {
                    hasLoaded = true;
                    loadWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
                }
            },
            () => fallbackToDefault(),
            { timeout: 3500 }
        );
        setTimeout(fallbackToDefault, 4000);
    } else {
        fallbackToDefault();
    }
});