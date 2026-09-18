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
    timezoneOffset: 25200,
    currentCondition: "",
    clockTimer: null,
    forecastCache: {},
    hourlyCache: {},
    todayHourlyRaw: [],
    isAudioPlaying: false
};

let elements = {};

function initDOMElements() {
    elements = {
        body: document.getElementById("appBody"),
        canvas: document.getElementById("weatherCanvas"),
        cityInput: document.getElementById("cityInput"),
        searchBtn: document.getElementById("searchBtn"),
        optimalTimeBtn: document.getElementById("optimalTimeBtn"),
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
        optimalModal: document.getElementById("optimalModal"),
        optimalModalCloseBtn: document.getElementById("optimalModalCloseBtn"),
        optimalModalScrim: document.getElementById("optimalModalScrim"),
        optimalResultsList: document.getElementById("optimalResultsList"),
        infoModal: document.getElementById("infoModal"),
        infoModalCloseBtn: document.getElementById("infoModalCloseBtn"),
        infoModalScrim: document.getElementById("infoModalScrim"),
        infoModalTitle: document.getElementById("infoModalTitle"),
        infoModalBody: document.getElementById("infoModalBody")
    };
}

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

    renderAQI(aqi, weather);
    renderSafetyAdvice(weather, nextPop);

    if (forecast.list) {
        appState.todayHourlyRaw = forecast.list.slice(0, 8);
        renderTodayHourly(forecast.list);
        render5DayForecast(forecast.list);
    }

    syncAudioTrack(appState.currentCondition);
}

function formatHour(timestamp, offset) {
    const d = new Date((timestamp + offset) * 1000);
    return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

function renderAQI(aqiData, weather) {
    if (!elements.aqiBadge || !elements.aqiValDesc) return;
    
    const condition = weather.weather[0].main.toLowerCase();
    const temp = weather.main.temp;
    const isNiceWeather = !condition.includes("rain") && !condition.includes("storm") && !condition.includes("drizzle") && temp < 33 && temp > 20;

    if (!aqiData || !aqiData.list || aqiData.list.length === 0) {
        elements.aqiBadge.textContent = "Bình thường";
        elements.aqiBadge.className = "aqi-badge-pill";
        elements.aqiValDesc.textContent = "Chất lượng không khí ở mức ổn định.";
        return;
    }

    const val = aqiData.list[0].main.aqi;
    
    if (val === 1 && isNiceWeather) {
        elements.aqiBadge.textContent = "Rất tốt";
        elements.aqiBadge.className = "aqi-badge-pill";
        elements.aqiValDesc.textContent = "Không khí trong lành, rất lý tưởng cho các hoạt động thể thao ngoài trời.";
    } else {
        const configs = {
            1: { text: "Rất tốt", class: "", desc: "Không khí trong lành nhưng trời nắng nóng/có mây." },
            2: { text: "Khá", class: "fair", desc: "Chất lượng không khí chấp nhận được." },
            3: { text: "Trung bình", class: "moderate", desc: "Người nhạy cảm nên hạn chế hoạt động ngoài trời." },
            4: { text: "Kém", class: "poor", desc: "Không khí ô nhiễm nhẹ." },
            5: { text: "Nguy hại", class: "poor", desc: "Mức độ ô nhiễm cao, hạn chế ra ngoài." }
        };
        const c = configs[val] || configs[1];
        elements.aqiBadge.textContent = c.text;
        elements.aqiBadge.className = `aqi-badge-pill ${c.class}`;
        elements.aqiValDesc.textContent = c.desc;
    }
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
        elements.alertText.textContent = "Có dông sét trong khu vực. Hãy chú ý tìm nơi trú ẩn an toàn.";
    } else if (condition.includes("rain") || nextPop >= 70) {
        elements.alertIcon.className = "fa-solid fa-umbrella";
        elements.alertText.textContent = "Khả năng mưa khá cao. Bạn nên mang theo dù hoặc áo mưa.";
    } else if (temp >= 33) {
        elements.weatherAlertBanner.classList.add("danger");
        elements.alertIcon.className = "fa-solid fa-triangle-exclamation";
        elements.alertText.textContent = "Trời đang nắng nóng và oi bức, tia UV cao. Hạn chế ra đường!";
    } else if (wind >= 38) {
        elements.weatherAlertBanner.classList.add("danger");
        elements.alertIcon.className = "fa-solid fa-wind";
        elements.alertText.textContent = "Gió giật mạnh. Cẩn thận chướng ngại vật khi lái xe.";
    } else {
        elements.alertIcon.className = "fa-solid fa-circle-check";
        elements.alertText.textContent = "Điều kiện thời tiết thuận lợi, thích hợp cho công việc và sinh hoạt.";
    }
}

function calculateUVIndex(hour, condition, clouds) {
    if (hour < 6 || hour > 18) return { index: 0, text: "Thấp (An toàn)" };
    if (condition.includes("rain") || condition.includes("storm") || condition.includes("drizzle")) {
        return { index: 1, text: "Thấp (Mưa/Mây che)" };
    }
    if (hour >= 11 && hour <= 14) {
        if (clouds > 75) return { index: 5, text: "Trung bình" };
        return { index: 11, text: "Cực kỳ độc hại (Rất nguy hiểm!)" };
    }
    if (hour >= 9 && hour < 11 || hour > 14 && hour <= 16) {
        return { index: 7, text: "Cao đến Rất cao" };
    }
    return { index: 4, text: "Trung bình" };
}

function getSmartOutdoorAdvice(hour, temp, pop, rainVol, windSpeed, visibility, uvInfo, conditionText) {
    let adviceList = [];
    const isRaining = rainVol > 0 || pop >= 50 || conditionText.includes("mưa") || conditionText.includes("rain");

    if (isRaining) {
        adviceList.push(`☂️ <b>Cảnh báo thời tiết:</b> Đang có mưa (${rainVol} mm), đường trơn trượt.`);
    } else if (hour >= 10 && hour <= 15 && temp >= 32 && uvInfo.index >= 6) {
        adviceList.push(`⚠️ <b>Cảnh báo giữa trưa:</b> Nắng gắt, chỉ số UV ở mức <b>${uvInfo.index} (${uvInfo.text})</b>. Tránh ra ngoài!`);
    } else {
        adviceList.push(`✨ <b>Thời tiết hiện tại:</b> Khô ráo, thuận lợi cho sinh hoạt.`);
    }

    if (isRaining || pop > 50) {
        adviceList.push("⚽ <b>Thể thao ngoài trời:</b> Không lý tưởng, sân trơn bóng ướt.");
    } else if (hour >= 11 && hour <= 15 && temp >= 31) {
        adviceList.push("⚽ <b>Thể thao ngoài trời:</b> Không nên tham gia vào giữa trưa nắng nóng.");
    } else {
        adviceList.push("⚽ <b>Thể thao ngoài trời:</b> Thời tiết ổn định, có thể tham gia.");
    }

    if (visibility < 3) {
        adviceList.push("🚗 <b>Lái xe:</b> Tầm nhìn kém, hãy bật đèn pha.");
    } else if (isRaining) {
        adviceList.push("🚗 <b>Lái xe:</b> Đường trơn trượt do mưa, giảm tốc độ.");
    } else {
        adviceList.push("🚗 <b>Lái xe:</b> Giao thông thuận lợi, tầm nhìn đảm bảo.");
    }

    return adviceList.join("<br>");
}

function openOptimalTimeModal() {
    if (!elements.optimalModal || !elements.optimalResultsList) return;
    elements.optimalResultsList.innerHTML = "";

    const slots = appState.todayHourlyRaw;
    if (!slots || slots.length === 0) {
        elements.optimalResultsList.innerHTML = "<p>Đang cập nhật dữ liệu thời tiết hôm nay...</p>";
        elements.optimalModal.classList.add("active");
        return;
    }

    const runningSlots = slots.filter(s => {
        const h = new Date((s.dt + appState.timezoneOffset) * 1000).getUTCHours();
        const pop = (s.pop || 0) * 100;
        const rain = (s.rain && s.rain["3h"]) ? s.rain["3h"] : 0;
        return ((h >= 5 && h <= 8) || (h >= 17 && h <= 20)) && pop < 40 && rain < 1;
    });
    const bestRunning = runningSlots.length > 0 
        ? runningSlots.reduce((prev, curr) => prev.main.temp < curr.main.temp ? prev : curr)
        : null;

    const footballSlots = slots.filter(s => {
        const h = new Date((s.dt + appState.timezoneOffset) * 1000).getUTCHours();
        const pop = (s.pop || 0) * 100;
        const rain = (s.rain && s.rain["3h"]) ? s.rain["3h"] : 0;
        return h >= 6 && h <= 21 && pop < 40 && rain < 1.5;
    });
    const bestFootball = footballSlots.length > 0 
        ? footballSlots.reduce((prev, curr) => prev.main.temp < curr.main.temp ? prev : curr)
        : null;

    const diningSlots = slots.filter(s => {
        const h = new Date((s.dt + appState.timezoneOffset) * 1000).getUTCHours();
        const rain = (s.rain && s.rain["3h"]) ? s.rain["3h"] : 0;
        return h >= 17 && h <= 22 && rain <= 2.0;
    });
    const bestDining = diningSlots.length > 0 ? diningSlots[0] : null;

    const formatSlotResult = (slot, activityType) => {
        if (!slot) return `❌ <b>Không có khung giờ phù hợp!</b> Nên ở nhà nghỉ ngơi.`;
        const time = formatHour(slot.dt, appState.timezoneOffset);
        const temp = Math.round(slot.main.temp);
        const desc = slot.weather[0].description;
        const rain = (slot.rain && slot.rain["3h"]) ? slot.rain["3h"] : 0;

        if (rain > 1.5) return `Lúc <b>${time}</b> (${temp}°C, ${desc}) — ❌ <b>Đang có mưa to!</b>`;
        if (rain > 0) return `Lúc <b>${time}</b> (${temp}°C, ${desc}) — ☂️ Có mưa nhỏ lất phất.`;
        return `Lúc <b>${time}</b> (${temp}°C, ${desc}) — ✅ <b>Thời tiết rất đẹp, khô ráo!</b>`;
    };

    elements.optimalResultsList.innerHTML = `
        <div class="optimal-item">
            <div class="optimal-icon"><i class="fa-solid fa-person-running"></i></div>
            <div class="optimal-info">
                <h4>Chạy Bộ / Thể Dục</h4>
                <p>${formatSlotResult(bestRunning, 'running')}</p>
            </div>
        </div>
        <div class="optimal-item">
            <div class="optimal-icon"><i class="fa-solid fa-futbol"></i></div>
            <div class="optimal-info">
                <h4>Đá Banh (6:00 - 21:00)</h4>
                <p>${formatSlotResult(bestFootball, 'football')}</p>
            </div>
        </div>
        <div class="optimal-item">
            <div class="optimal-icon"><i class="fa-solid fa-utensils"></i></div>
            <div class="optimal-info">
                <h4>Ăn Uống / Dạo Phố (17:00 - 22:00)</h4>
                <p>${formatSlotResult(bestDining, 'dining')}</p>
            </div>
        </div>
    `;
    elements.optimalModal.classList.add("active");
}

function closeOptimalModal() {
    if (elements.optimalModal) elements.optimalModal.classList.remove("active");
}

function renderTodayHourly(forecastList) {
    if (!elements.todayHourlyTrack || !elements.rainNotice) return;
    elements.todayHourlyTrack.innerHTML = "";
    const todaySlots = forecastList.slice(0, 8);

    const rainSlot = todaySlots.find(s => (s.pop && s.pop >= 0.35) || (s.rain && s.rain["3h"] > 0));
    if (rainSlot) {
        elements.rainNotice.textContent = `Có thể mưa vào khoảng ${formatHour(rainSlot.dt, appState.timezoneOffset)}`;
    } else {
        elements.rainNotice.textContent = "Hôm nay ít khả năng có mưa";
    }

    todaySlots.forEach((slot, index) => {
        const timeStr = formatHour(slot.dt, appState.timezoneOffset);
        const popVal = Math.round((slot.pop || 0) * 100);
        const isRainRisk = popVal >= 40;
        const rainVol = (slot.rain && slot.rain["3h"]) ? slot.rain["3h"] : 0;
        const visibilityKm = slot.visibility ? (slot.visibility / 1000).toFixed(1) : "10";
        const tempVal = Math.round(slot.main.temp);
        const windVal = Math.round(slot.wind.speed * 3.6);
        const cloudsVal = slot.clouds ? slot.clouds.all : 20;
        const descText = slot.weather[0].description.toLowerCase();
        
        const slotDate = new Date((slot.dt + appState.timezoneOffset) * 1000);
        const uvInfo = calculateUVIndex(slotDate.getUTCHours(), descText, cloudsVal);
        const outdoorAdvice = getSmartOutdoorAdvice(slotDate.getUTCHours(), tempVal, popVal, rainVol, windVal, parseFloat(visibilityKm), uvInfo, descText);

        const hKey = `today_hour_${index}`;
        appState.hourlyCache[hKey] = {
            title: `Khung giờ ${timeStr}`,
            temp: tempVal,
            desc: slot.weather[0].description,
            icon: slot.weather[0].icon,
            humidity: slot.main.humidity,
            wind: windVal,
            rainVol: rainVol.toFixed(1),
            pop: popVal,
            visibility: visibilityKm,
            uv: `${uvInfo.index} (${uvInfo.text})`,
            advice: outdoorAdvice,
            isHourly: true
        };

        const node = document.createElement("div");
        node.className = `hour-node ${isRainRisk ? "rain-risk" : ""}`;
        node.dataset.hourKey = hKey;
        node.innerHTML = `
            <span class="h-time">${timeStr}</span>
            <img src="https://openweathermap.org/img/wn/${slot.weather[0].icon}.png" alt="icon">
            <span class="h-temp">${tempVal}°</span>
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

    daysKeys.forEach((dateKey, dayIdx) => {
        const daySlots = grouped[dateKey];
        const midSlot = daySlots.find(s => s.dt_txt && s.dt_txt.includes("12:00:00")) || daySlots[Math.floor(daySlots.length / 2)];

        const dateObj = new Date(dateKey + "T00:00:00");
        const dayLabel = dayNames[dateObj.getDay()];
        const [year, month, day] = dateKey.split('-');
        const fullDateNumeric = `${day}/${month}/${year}`;

        let maxPop = 0;
        daySlots.forEach(s => {
            const p = Math.round((s.pop || 0) * 100);
            if (p > maxPop) maxPop = p;
        });

        const totalRain = daySlots.reduce((sum, curr) => sum + ((curr.rain && curr.rain["3h"]) ? curr.rain["3h"] : 0), 0);
        const visibilityKm = midSlot.visibility ? (midSlot.visibility / 1000).toFixed(1) : "10";
        const midTemp = Math.round(midSlot.main.temp);
        const midWind = Math.round(midSlot.wind.speed * 3.6);
        const midDesc = midSlot.weather[0].description.toLowerCase();
        const midUv = calculateUVIndex(12, midDesc, 40);

        const hourlySlotsData = daySlots.map((s, sIdx) => {
            const hKey = `day_${dayIdx}_slot_${sIdx}`;
            appState.hourlyCache[hKey] = {
                title: `Khung giờ ${formatHour(s.dt, appState.timezoneOffset)}, ${fullDateNumeric}`,
                temp: Math.round(s.main.temp),
                desc: s.weather[0].description,
                icon: s.weather[0].icon,
                humidity: s.main.humidity,
                wind: Math.round(s.wind.speed * 3.6),
                rainVol: ((s.rain && s.rain["3h"]) ? s.rain["3h"] : 0).toFixed(1),
                pop: Math.round((s.pop || 0) * 100),
                visibility: s.visibility ? (s.visibility / 1000).toFixed(1) : "10",
                uv: "5 (Trung bình)",
                advice: "Thời tiết ổn định.",
                isHourly: true
            };
            return {
                time: formatHour(s.dt, appState.timezoneOffset),
                icon: s.weather[0].icon,
                temp: Math.round(s.main.temp),
                pop: Math.round((s.pop || 0) * 100),
                cacheKey: hKey
            };
        });

        appState.forecastCache[dateKey] = {
            title: `${dayLabel}, ${fullDateNumeric}`,
            temp: midTemp,
            desc: midSlot.weather[0].description,
            icon: midSlot.weather[0].icon,
            humidity: midSlot.main.humidity,
            wind: midWind,
            rainVol: totalRain.toFixed(1),
            pop: maxPop,
            visibility: visibilityKm,
            uv: `${midUv.index} (${midUv.text})`,
            advice: "Thời tiết ổn định suốt cả ngày.",
            isHourly: false,
            hourlySlots: hourlySlotsData
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
            <span class="f-temp">${midTemp}°C</span>
        `;
        elements.forecastList.appendChild(itemEl);
    });
}

function setupEventDelegation() {
    if (elements.searchBtn) {
        elements.searchBtn.addEventListener("click", () => searchCity(elements.cityInput.value.trim()));
    }
    if (elements.cityInput) {
        elements.cityInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") searchCity(elements.cityInput.value.trim());
        });
    }
    if (elements.optimalTimeBtn) {
        elements.optimalTimeBtn.addEventListener("click", openOptimalTimeModal);
    }
    if (elements.quickCitiesBar) {
        elements.quickCitiesBar.addEventListener("click", (e) => {
            const btn = e.target.closest(".city-pill");
            if (!btn) return;
            searchCity(btn.dataset.query, btn.dataset.label);
        });
    }
    if (elements.forecastList) {
        elements.forecastList.addEventListener("click", (e) => {
            const row = e.target.closest(".forecast-item");
            if (!row) return;
            openModal(appState.forecastCache[row.dataset.date]);
        });
    }
    if (elements.todayHourlyTrack) {
        elements.todayHourlyTrack.addEventListener("click", (e) => {
            const node = e.target.closest(".hour-node");
            if (!node) return;
            if (appState.hourlyCache[node.dataset.hourKey]) openModal(appState.hourlyCache[node.dataset.hourKey]);
        });
    }
    if (elements.modalCloseBtn) elements.modalCloseBtn.addEventListener("click", closeModal);
    if (elements.modalScrim) elements.modalScrim.addEventListener("click", closeModal);
    if (elements.optimalModalCloseBtn) elements.optimalModalCloseBtn.addEventListener("click", closeOptimalModal);
    if (elements.optimalModalScrim) elements.optimalModalScrim.addEventListener("click", closeOptimalModal);
    if (elements.audioToggleBtn) elements.audioToggleBtn.addEventListener("click", toggleAudio);
}

function openModal(data) {
    if (!data || !elements.dayDetailModal) return;
    document.getElementById("dayModalTitle").textContent = data.title;
    document.getElementById("dayModalTemp").textContent = `${data.temp}°C`;
    document.getElementById("dayModalDesc").textContent = data.desc;
    document.getElementById("dayModalIcon").src = `https://openweathermap.org/img/wn/${data.icon}@2x.png`;
    document.getElementById("dayModalHumidity").textContent = `${data.humidity}%`;
    document.getElementById("dayModalWind").textContent = `${data.wind} km/h`;
    document.getElementById("dayModalRainVol").textContent = `${data.rainVol} mm`;
    document.getElementById("dayModalVisibility").textContent = `${data.visibility} km`;

    let uvEl = document.getElementById("dayModalUV");
    if (!uvEl) {
        const visParent = document.getElementById("dayModalVisibility").parentNode;
        const uvDiv = document.createElement("div");
        uvDiv.className = "modal-metric-item";
        uvDiv.innerHTML = `<span class="m-label">Chỉ số Tia UV</span><strong id="dayModalUV">${data.uv}</strong>`;
        visParent.parentNode.appendChild(uvDiv);
    } else {
        uvEl.textContent = data.uv;
    }

    let adviceBox = document.getElementById("smartAdviceBox");
    if (!adviceBox) {
        adviceBox = document.createElement("div");
        adviceBox.id = "smartAdviceBox";
        adviceBox.className = "smart-advice-modal-box";
        const metricsGrid = document.querySelector(".modal-metrics-grid");
        if (metricsGrid) metricsGrid.parentNode.insertBefore(adviceBox, metricsGrid.nextSibling);
    }
    adviceBox.innerHTML = `
        <div class="box-title"><i class="fa-solid fa-wand-magic-sparkles"></i> Trợ lý tư vấn hoạt động</div>
        <div class="advice-content">${data.advice}</div>
    `;

    document.getElementById("dayModalPop").textContent = `${data.pop}%`;
    elements.dayDetailModal.classList.add("active");
}

function closeModal() {
    if (elements.dayDetailModal) elements.dayDetailModal.classList.remove("active");
}

function syncAudioTrack(condition) {
    if (!elements.ambientAudio) return;
    const isRain = condition.includes("rain") || condition.includes("mưa") || condition.includes("drizzle");
    elements.ambientAudio.src = isRain ? CONFIG.audioSources.rain : CONFIG.audioSources.ambient;
    if (appState.isAudioPlaying) elements.ambientAudio.play().catch(() => {});
}

function toggleAudio() {
    if (!elements.ambientAudio) return;
    if (appState.isAudioPlaying) {
        elements.ambientAudio.pause();
        appState.isAudioPlaying = false;
        elements.audioIcon.className = "fa-solid fa-volume-xmark";
    } else {
        elements.ambientAudio.play().then(() => {
            appState.isAudioPlaying = true;
            elements.audioIcon.className = "fa-solid fa-volume-high";
        }).catch(() => {});
    }
}

document.addEventListener("DOMContentLoaded", () => {
    initDOMElements();
    setupRainCanvas();
    setupEventDelegation();
    startLiveClock();

    // Xóa sạch rác trong bộ nhớ đệm để không bao giờ bị lỗi tìm kiếm địa điểm nữa
    localStorage.removeItem(CONFIG.storageKey);

    // Mặc định gọi thẳng tọa độ TP.HCM chuẩn xác
    loadWeatherByCoords(CONFIG.defaultCity.lat, CONFIG.defaultCity.lon, CONFIG.defaultCity.name);
});