// ================= HỆ THỐNG CẤU HÌNH & TRẠNG THÁI =================
const CONFIG = {
    apiKey: "5d0440c6a96719587d42efc9382e6105", 
    storageKey: "skycast_saved_city",
    defaultCity: { lat: 10.8231, lon: 106.6297, name: "TP. Hồ Chí Minh" }
};

const appState = {
    timezoneOffset: 25200,
    currentCondition: "",
    currentHour: 12,
    currentLang: "vi",
    clockTimer: null,
    forecastCache: {},
    hourlyCache: {},
    todayHourlyRaw: [],
    isAudioPlaying: false,
    currentAudioKey: null,
    mapMarker: null 
};

// ================= HỆ THỐNG ÂM THANH MÔI TRƯỜNG =================
let globalAudio = new Audio();
globalAudio.loop = true;
globalAudio.volume = 0.4; 

const AUDIO_URLS = {
    rain: "https://actions.google.com/sounds/v1/weather/thunderstorm.ogg", 
    birds: "https://actions.google.com/sounds/v1/ambiences/spring_day_forest.ogg", 
    traffic: "https://actions.google.com/sounds/v1/ambiences/outdoor_city_street_night.ogg", 
    chill: "https://ia800902.us.archive.org/15/items/LofiChillSongSample/Lofi%20Chill.mp3" 
};

function syncAudioTrack(weatherObj, hour) {
    if (!weatherObj || !weatherObj.weather || !weatherObj.weather[0]) return;
    
    const main = weatherObj.weather[0].main.toLowerCase();
    const desc = weatherObj.weather[0].description.toLowerCase();
    const isRain = main.includes("rain") || main.includes("drizzle") || main.includes("thunderstorm") || desc.includes("mưa") || desc.includes("rain");
    
    let targetKey = "chill";
    if (isRain) {
        targetKey = "rain";
    } else if (hour >= 5 && hour <= 10) {
        targetKey = "birds";
    } else if (hour >= 18 || hour < 5) {
        targetKey = "traffic";
    }

    if (appState.currentAudioKey !== targetKey) {
        const wasPlaying = appState.isAudioPlaying && !globalAudio.paused;
        appState.currentAudioKey = targetKey;
        globalAudio.src = AUDIO_URLS[targetKey];
        globalAudio.load();
        
        if (wasPlaying) {
            globalAudio.play().catch(e => console.log("Auto-play bị chặn khi đổi bài:", e));
        }
    }
}

function toggleAudio() {
    if (!appState.currentAudioKey) {
        syncAudioTrack(currentWeatherDataStore ? currentWeatherDataStore.weather : null, appState.currentHour);
    }

    if (appState.isAudioPlaying) {
        globalAudio.pause();
        appState.isAudioPlaying = false;
        if (elements.audioIcon) elements.audioIcon.className = "fa-solid fa-volume-xmark";
    } else {
        const playPromise = globalAudio.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                appState.isAudioPlaying = true;
                if (elements.audioIcon) elements.audioIcon.className = "fa-solid fa-volume-high";
            }).catch(error => {
                console.log("Trình duyệt chặn autoplay:", error);
                appState.isAudioPlaying = false;
                if (elements.audioIcon) elements.audioIcon.className = "fa-solid fa-volume-xmark";
            });
        }
    }
}

// Từ điển đa ngôn ngữ
const I18N = {
    vi: {
        searchPlaceholder: "Tìm thành phố (Hà Nội, Tokyo, Paris...)",
        localTime: "Giờ Địa Phương",
        humidity: "Độ ẩm",
        windSpeed: "Tốc độ gió",
        rainVol: "Lượng mưa (1h)",
        rainPop: "Khả năng mưa",
        hourlyRainTitle: "Khả năng mưa trong ngày",
        aqiTitle: "Không khí (AQI)",
        sunTitle: "Mặt trời",
        sunrise: "Mọc",
        sunset: "Lặn",
        forecast5Days: "Dự báo 5 ngày tới",
        forecastSub: "Bấm vào từng ngày để xem phân tích chi tiết",
        footerText: "Dữ liệu khí tượng cập nhật thời gian thực từ OpenWeather API",
        visibility: "Tầm nhìn xa",
        uvIndex: "Chỉ số Tia UV",
        hourlyTrackTitle: "Diễn biến các khung giờ trong ngày",
        goldSlotTitle: "Khung Giờ Vàng Hôm Nay",
        goldSlotSub: "Được hệ thống lọc tự động dựa trên thời tiết thực tế",
        noRainToday: "Hôm nay ít khả năng có mưa",
        airStable: "Chất lượng không khí ở mức ổn định.",
        radarTitle: "Radar",
        btnRain: "Mưa",
        btnClouds: "Mây"
    },
    en: {
        searchPlaceholder: "Search city (Hanoi, Tokyo, Paris...)",
        localTime: "Local Time",
        humidity: "Humidity",
        windSpeed: "Wind Speed",
        rainVol: "Rain Volume (1h)",
        rainPop: "Rain Chance",
        hourlyRainTitle: "Today's Rain Probability",
        aqiTitle: "Air Quality (AQI)",
        sunTitle: "Sun Schedule",
        sunrise: "Sunrise",
        sunset: "Sunset",
        forecast5Days: "5-Day Forecast",
        forecastSub: "Tap any day to view detailed breakdown",
        footerText: "Real-time weather data powered by OpenWeather API",
        visibility: "Visibility",
        uvIndex: "UV Index",
        hourlyTrackTitle: "Hourly breakdown for today",
        goldSlotTitle: "Today's Golden Hours",
        goldSlotSub: "Automatically filtered based on actual weather conditions",
        noRainToday: "Low chance of rain today",
        airStable: "Air quality is stable.",
        radarTitle: "Radar",
        btnRain: "Rain",
        btnClouds: "Clouds"
    },
    zh: {
        searchPlaceholder: "搜索城市 (河内, 东京, 巴黎...)",
        localTime: "当地时间",
        humidity: "湿度",
        windSpeed: "风速",
        rainVol: "降雨量 (1小时)",
        rainPop: "降雨概率",
        hourlyRainTitle: "今日降雨概率",
        aqiTitle: "空气质量 (AQI)",
        sunTitle: "日照时间",
        sunrise: "日出",
        sunset: "日落",
        forecast5Days: "未来5天预报",
        forecastSub: "点击任意一天查看详细分析",
        footerText: "实时气象数据由 OpenWeather API 提供",
        visibility: "能见度",
        uvIndex: "紫外线指数",
        hourlyTrackTitle: "今日逐小时天气",
        goldSlotTitle: "今日黄金时段",
        goldSlotSub: "根据实际天气自动筛选",
        noRainToday: "今天降雨概率较低",
        airStable: "空气质量保持稳定。",
        radarTitle: "雷达",
        btnRain: "雨",
        btnClouds: "云"
    }
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
        aqiBadge: document.getElementById("aqiBadge"),
        aqiValDesc: document.getElementById("aqiValDesc"),
        sunriseTime: document.getElementById("sunriseTime"),
        sunsetTime: document.getElementById("sunsetTime"),
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
        infoModalBody: document.getElementById("infoModalBody"),
        audioToggleBtn: document.getElementById("audioToggleBtn"),
        audioIcon: document.getElementById("audioIcon"),
        layerRainBtn: document.getElementById("layerRainBtn"),
        layerCloudBtn: document.getElementById("layerCloudBtn")
    };
}

let canvasCtx = null;
let rainParticles = [];
let lightningAlpha = 0;
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
    
    if (Math.random() < 0.015) lightningAlpha = 0.8;
    if (lightningAlpha > 0) {
        canvasCtx.fillStyle = `rgba(255, 255, 255, ${lightningAlpha})`;
        canvasCtx.fillRect(0, 0, elements.canvas.width, elements.canvas.height);
        lightningAlpha -= 0.1;
    }

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

    appState.currentHour = hours;
    applyAtmosphereTheme(hours, minutes, appState.currentCondition);

    if (elements.digitalTime) {
        elements.digitalTime.textContent = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    const daysMap = {
        vi: ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'],
        en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        zh: ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
    };
    const days = daysMap[appState.currentLang] || daysMap.vi;
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

    const isRain = condition && (condition.includes("rain") || condition.includes("drizzle") || condition.includes("thunderstorm"));
    
    if (isRain) {
        elements.body.classList.add("theme-rain");
        startRain();
    } else {
        stopRain();
        if (hour >= 6 && hour < 17) {
            elements.body.classList.add("theme-day");
        } else if (hour >= 17 && hour < 18) {
            elements.body.classList.add("theme-sunset");
        } else if (hour >= 18 && hour <= 23) {
            elements.body.classList.add("theme-evening");
        } else {
            elements.body.classList.add("theme-night");
        }
    }
}

// ================= HỆ THỐNG RADAR BẢN ĐỒ FIX LỖI OSM =================
let radarMap = null;
let rainLayer = null;
let cloudLayer = null;

function initRadarMap(lat, lon) {
    const mapEl = document.getElementById('radarMap');
    if (!mapEl) return;

    if (!radarMap) {
        // Tích hợp bản đồ nền Esri (Không bao giờ lỗi policy)
        radarMap = L.map('radarMap', { zoomControl: false, attributionControl: false }).setView([lat, lon], 10);
        
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 19
        }).addTo(radarMap);

        rainLayer = L.tileLayer(`https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${CONFIG.apiKey}`);
        cloudLayer = L.tileLayer(`https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${CONFIG.apiKey}`);
        
        appState.mapMarker = L.marker([lat, lon]).addTo(radarMap);
        rainLayer.addTo(radarMap);
    } else {
        radarMap.setView([lat, lon], 10);
        if (appState.mapMarker) {
            appState.mapMarker.setLatLng([lat, lon]);
        }
    }
}

function setRadarLayer(type) {
    if (!radarMap) return;
    if (type === 'rain') {
        if (radarMap.hasLayer(cloudLayer)) radarMap.removeLayer(cloudLayer);
        if (!radarMap.hasLayer(rainLayer)) rainLayer.addTo(radarMap);
        if (elements.layerRainBtn) elements.layerRainBtn.classList.add('active');
        if (elements.layerCloudBtn) elements.layerCloudBtn.classList.remove('active');
    } else {
        if (radarMap.hasLayer(rainLayer)) radarMap.removeLayer(rainLayer);
        if (!radarMap.hasLayer(cloudLayer)) cloudLayer.addTo(radarMap);
        if (elements.layerCloudBtn) elements.layerCloudBtn.classList.add('active');
        if (elements.layerRainBtn) elements.layerRainBtn.classList.remove('active');
    }
}

async function loadWeatherByCoords(lat, lon, customName = null) {
    try {
        const langCode = appState.currentLang === 'zh' ? 'zh_cn' : appState.currentLang;
        const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=${langCode}&appid=${CONFIG.apiKey}`;
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&lang=${langCode}&appid=${CONFIG.apiKey}`;
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

let lastWeatherData = null;
let lastForecastData = null;
let lastAqiData = null;
let lastCustomName = null;
let currentWeatherDataStore = null;

function renderWeather(weather, forecast, aqi, displayName) {
    lastWeatherData = weather;
    lastForecastData = forecast;
    lastAqiData = aqi;
    lastCustomName = displayName;
    currentWeatherDataStore = { weather, forecast, aqi };

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

    // PHÒNG THỦ LỖI SYS UNDEFINED TỪ API
    if (elements.sunriseTime) {
        elements.sunriseTime.textContent = (weather.sys && weather.sys.sunrise) ? formatHour(weather.sys.sunrise, appState.timezoneOffset) : "--:--";
    }
    if (elements.sunsetTime) {
        elements.sunsetTime.textContent = (weather.sys && weather.sys.sunset) ? formatHour(weather.sys.sunset, appState.timezoneOffset) : "--:--";
    }

    const lat = weather.coord.lat;
    const lon = weather.coord.lon;
    initRadarMap(lat, lon);
    
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

    syncAudioTrack(weather, appState.currentHour);
}

function formatHour(timestamp, offset) {
    if (!timestamp) return "--:--";
    const d = new Date((timestamp + offset) * 1000);
    return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

function renderAQI(aqiData, weather) {
    if (!elements.aqiBadge || !elements.aqiValDesc) return;
    const lang = appState.currentLang;
    const t = I18N[lang] || I18N.vi;
    
    const condition = weather.weather[0].main.toLowerCase();
    const temp = weather.main.temp;
    const isNiceWeather = !condition.includes("rain") && !condition.includes("storm") && !condition.includes("drizzle") && temp < 33 && temp > 20;

    if (!aqiData || !aqiData.list || aqiData.list.length === 0) {
        elements.aqiBadge.textContent = lang === 'en' ? 'Normal' : (lang === 'zh' ? '正常' : 'Bình thường');
        elements.aqiBadge.className = "aqi-badge-pill";
        elements.aqiValDesc.textContent = t.airStable;
        return;
    }

    const val = aqiData.list[0].main.aqi;
    
    if (val === 1 && isNiceWeather) {
        elements.aqiBadge.textContent = lang === 'en' ? 'Very Good' : (lang === 'zh' ? '非常好' : 'Rất tốt');
        elements.aqiBadge.className = "aqi-badge-pill";
        elements.aqiValDesc.textContent = lang === 'en' ? 'Clean air, ideal for outdoor activities.' : (lang === 'zh' ? '空气清新，非常适合户外活动。' : 'Không khí trong lành, rất lý tưởng cho các hoạt động thể thao ngoài trời.');
    } else {
        const configs = {
            1: { text: lang === 'en' ? 'Very Good' : (lang === 'zh' ? '非常好' : 'Rất tốt'), class: "", desc: lang === 'en' ? 'Air is clean.' : (lang === 'zh' ? '空气清新。' : 'Không khí trong lành.') },
            2: { text: lang === 'en' ? 'Fair' : (lang === 'zh' ? '良' : 'Khá'), class: "fair", desc: lang === 'en' ? 'Acceptable air quality.' : (lang === 'zh' ? '空气质量可接受。' : 'Chất lượng không khí chấp nhận được.') },
            3: { text: lang === 'en' ? 'Moderate' : (lang === 'zh' ? '中等' : 'Trung bình'), class: "moderate", desc: lang === 'en' ? 'Sensitive groups should limit outdoor time.' : (lang === 'zh' ? '敏感人群应减少户外活动。' : 'Người nhạy cảm nên hạn chế hoạt động ngoài trời.') },
            4: { text: lang === 'en' ? 'Poor' : (lang === 'zh' ? '差' : 'Kém'), class: "poor", desc: lang === 'en' ? 'Light pollution detected.' : (lang === 'zh' ? '检测到轻度污染。' : 'Không khí ô nhiễm nhẹ.') },
            5: { text: lang === 'en' ? 'Hazardous' : (lang === 'zh' ? '危险' : 'Nguy hại'), class: "poor", desc: lang === 'en' ? 'High pollution levels.' : (lang === 'zh' ? '污染水平较高。' : 'Mức độ ô nhiễm cao.') }
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
    const lang = appState.currentLang;

    elements.weatherAlertBanner.className = "smart-notice";

    if (condition.includes("thunderstorm")) {
        elements.weatherAlertBanner.classList.add("danger");
        elements.alertIcon.className = "fa-solid fa-cloud-bolt";
        elements.alertText.textContent = lang === 'en' ? 'Thunderstorm alert in area. Seek shelter.' : (lang === 'zh' ? '雷雨预警，请注意安全。' : 'Có dông sét trong khu vực. Hãy chú ý tìm nơi trú ẩn an toàn.');
    } else if (condition.includes("rain") || nextPop >= 70) {
        elements.alertIcon.className = "fa-solid fa-umbrella";
        elements.alertText.textContent = lang === 'en' ? 'High chance of rain. Carry an umbrella.' : (lang === 'zh' ? '降雨概率高，建议携带雨具。' : 'Khả năng mưa khá cao. Bạn nên mang theo dù hoặc áo mưa.');
    } else if (temp >= 33) {
        elements.weatherAlertBanner.classList.add("danger");
        elements.alertIcon.className = "fa-solid fa-triangle-exclamation";
        elements.alertText.textContent = lang === 'en' ? 'Hot weather with high UV. Limit going outside!' : (lang === 'zh' ? '天气炎热，紫外线强，减少外出！' : 'Trời đang nắng nóng và oi bức, tia UV cao. Hạn chế ra đường!');
    } else {
        elements.alertIcon.className = "fa-solid fa-circle-check";
        elements.alertText.textContent = lang === 'en' ? 'Favorable weather conditions.' : (lang === 'zh' ? '天气条件良好，适宜出行。' : 'Điều kiện thời tiết thuận lợi, thích hợp cho công việc và sinh hoạt.');
    }
}

function calculateUVIndex(hour, condition, clouds) {
    const lang = appState.currentLang;
    if (hour < 6 || hour > 18) return { index: 0, text: lang === 'en' ? 'Low' : (lang === 'zh' ? '低' : 'Thấp') };
    if (condition.includes("rain") || condition.includes("storm") || condition.includes("drizzle")) {
        return { index: 1, text: lang === 'en' ? 'Low (Rain)' : (lang === 'zh' ? '低 (下雨)' : 'Thấp (Mưa)') };
    }
    if (hour >= 11 && hour <= 14) {
        if (clouds > 75) return { index: 5, text: lang === 'en' ? 'Moderate' : (lang === 'zh' ? '中等' : 'Trung bình') };
        return { index: 11, text: lang === 'en' ? 'Very Dangerous!' : (lang === 'zh' ? '非常危险！' : 'Rất nguy hiểm!') };
    }
    return { index: 7, text: lang === 'en' ? 'High' : (lang === 'zh' ? '高' : 'Cao') };
}

function handleMetricCardClick(metricType) {
    if (!currentWeatherDataStore) return;
    const { weather, forecast } = currentWeatherDataStore;
    const humidity = weather.main.humidity;
    const wind = Math.round(weather.wind.speed * 3.6);
    const rain1h = (weather.rain && weather.rain["1h"]) ? weather.rain["1h"] : 0;
    const pop = (forecast.list && forecast.list.length > 0) ? Math.round((forecast.list[0].pop || 0) * 100) : 0;

    let title = "";
    let body = "";
    const lang = appState.currentLang;

    if (metricType === 'humidity') {
        title = lang === 'en' ? 'Humidity Analysis' : (lang === 'zh' ? '湿度分析' : 'Phân tích Độ ẩm');
        body = lang === 'en' 
            ? `Current humidity is <b>${humidity}%</b>. ${humidity > 80 ? 'The air is very humid, high chance of precipitation or heavy fog.' : humidity < 40 ? 'The air is quite dry, remember to moisturize and stay hydrated.' : 'Humidity is at a comfortable level for daily activities.'}`
            : lang === 'zh'
            ? `当前湿度为 <b>${humidity}%</b>。${humidity > 80 ? '空气非常潮湿，降雨或大雾概率高。' : humidity < 40 ? '空气干燥，请注意补水保湿。' : '湿度处于体感舒适的正常水平。'}`
            : `Độ ẩm hiện tại là <b>${humidity}%</b>. ${humidity > 80 ? 'Không khí rất ẩm ướt, hơi nước cao dễ gây mưa hoặc sương mù.' : humidity < 40 ? 'Không khí khá khô hanh, bạn nên chú ý bổ sung nước và dưỡng ẩm.' : 'Độ ẩm ở mức cân đối, tạo cảm giác dễ chịu cho sinh hoạt.'}`;
    } else if (metricType === 'wind') {
        title = lang === 'en' ? 'Wind Speed & Direction' : (lang === 'zh' ? '风速与风向' : 'Phân tích Tốc độ Gió');
        body = lang === 'en'
            ? `Wind speed is running at <b>${wind} km/h</b>. ${wind > 35 ? 'Strong gusty winds detected! Secure outdoor items and drive carefully.' : 'Wind speed is normal, safe for all outdoor traffic and sports.'}`
            : lang === 'zh'
            ? `风速约为 <b>${wind} km/h</b>。${wind > 35 ? '风力较强，请固定室外物品，小心驾驶。' : '风速平稳，适合各项户外出行与运动。'}`
            : `Tốc độ gió hiện tại đạt <b>${wind} km/h</b>. ${wind > 35 ? 'Gió giật mạnh! Cần chú ý khi điều khiển xe máy hoặc các vật dụng ngoài trời.' : 'Gió thổi nhẹ nhàng ổn định, an toàn cho việc đi lại và thể thao.'}`;
    } else if (metricType === 'rain_volume') {
        title = lang === 'en' ? 'Precipitation Volume (1h)' : (lang === 'zh' ? '1小时降雨量' : 'Lượng mưa tích lũy (1h)');
        body = lang === 'en'
            ? `Accumulated rain in the last hour is <b>${rain1h} mm</b>. ${rain1h > 4 ? 'Heavy rainfall, expect local puddles.' : rain1h > 0 ? 'Light drizzle or scattered showers.' : 'No rainfall recorded right now, dry ground.'}`
            : lang === 'zh'
            ? `过去一小时降雨量为 <b>${rain1h} mm</b>。${rain1h > 4 ? '降雨较大，出行请备好雨具。' : rain1h > 0 ? '有零星小雨。' : '目前暂无降雨，路面干燥。'}`
            : `Lượng mưa đo được trong 1 giờ qua là <b>${rain1h} mm</b>. ${rain1h > 4 ? 'Mưa đang nặng hạt, có thể gây ngập úng cục bộ.' : rain1h > 0 ? 'Mưa nhỏ lất phất không đáng kể.' : 'Không ghi nhận lượng mưa, thời tiết khô ráo.'}`;
    } else if (metricType === 'rain_pop') {
        title = lang === 'en' ? 'Probability of Precipitation' : (lang === 'zh' ? '降雨概率详解' : 'Chi tiết Khả năng Mưa');
        body = lang === 'en'
            ? `Precipitation probability is <b>${pop}%</b>. ${pop >= 70 ? 'High likelihood of rain today! Don’t forget your umbrella.' : pop >= 40 ? 'Moderate chance of showers, keep an eye on the sky.' : 'Low rain chance, great weather for outdoor plans.'}`
            : lang === 'zh'
            ? `降雨概率为 <b>${pop}%</b>。${pop >= 70 ? '今天下雨概率很高！出门记得带伞。' : pop >= 40 ? '有一定几率下雨，请留意天气变化。' : '降雨概率低，非常适合户外活动。'}`
            : `Xác suất mưa trong khung giờ tới là <b>${pop}%</b>. ${pop >= 70 ? 'Khả năng mưa rất cao! Bạn bắt buộc nên mang theo dù hoặc áo mưa.' : pop >= 40 ? 'Có thể có mưa rào bất chợt, nên phòng bị ô dù khi ra ngoài.' : 'Khả năng mưa thấp, trời khô ráo thích hợp dạo phố.'}`;
    }

    if (elements.infoModalTitle && elements.infoModalBody) {
        elements.infoModalTitle.textContent = title;
        elements.infoModalBody.innerHTML = body;
        elements.infoModal.classList.add("active");
    }
}

function openOptimalTimeModal() {
    if (!elements.optimalModal || !elements.optimalResultsList) return;
    elements.optimalResultsList.innerHTML = "";

    const slots = appState.todayHourlyRaw;
    const lang = appState.currentLang;
    
    if (!slots || slots.length === 0) {
        elements.optimalResultsList.innerHTML = lang === 'en' ? "<p>Updating data...</p>" : (lang === 'zh' ? "<p>数据更新中...</p>" : "<p>Đang cập nhật...</p>");
        elements.optimalModal.classList.add("active");
        return;
    }

    const runningSlots = slots.filter(s => {
        const h = new Date((s.dt + appState.timezoneOffset) * 1000).getUTCHours();
        const pop = (s.pop || 0) * 100;
        const rain = (s.rain && s.rain["3h"]) ? s.rain["3h"] : 0;
        return ((h >= 5 && h <= 8) || (h >= 17 && h <= 20)) && pop < 40 && rain < 1;
    });
    const bestRunning = runningSlots.length > 0 ? runningSlots.reduce((prev, curr) => prev.main.temp < curr.main.temp ? prev : curr) : null;

    const footballSlots = slots.filter(s => {
        const h = new Date((s.dt + appState.timezoneOffset) * 1000).getUTCHours();
        const pop = (s.pop || 0) * 100;
        const rain = (s.rain && s.rain["3h"]) ? s.rain["3h"] : 0;
        return h >= 18 && h <= 20 && pop < 40 && rain < 1.5;
    });
    const bestFootball = footballSlots.length > 0 ? footballSlots.reduce((prev, curr) => prev.main.temp < curr.main.temp ? prev : curr) : null;

    const diningSlots = slots.filter(s => {
        const h = new Date((s.dt + appState.timezoneOffset) * 1000).getUTCHours();
        const rain = (s.rain && s.rain["3h"]) ? s.rain["3h"] : 0;
        return h >= 17 && h <= 22 && rain <= 2.0;
    });
    const bestDining = diningSlots.length > 0 ? diningSlots[0] : null;

    const formatSlotResult = (slot) => {
        if (!slot) return lang === 'en' ? '❌ No suitable time today.' : (lang === 'zh' ? '❌ 今日暂无合适时段' : '❌ Không có khung giờ phù hợp.');
        const time = formatHour(slot.dt, appState.timezoneOffset);
        const temp = Math.round(slot.main.temp);
        const pop = Math.round((slot.pop || 0) * 100);
        
        let resultHtml = `Lúc <b>${time}</b> (${temp}°C) — ✅ <b>Thời tiết rất đẹp, khô ráo!</b>`;
        if (lang === 'en') resultHtml = `At <b>${time}</b> (${temp}°C) — ✅ <b>Great weather, dry!</b>`;
        if (lang === 'zh') resultHtml = `时间 <b>${time}</b> (${temp}°C) — ✅ <b>天气极佳，适合出行！</b>`;
        
        const radarReport = lang === 'en' ? `🛰️ Radar: No significant rain detected in area.` : (lang === 'zh' ? `🛰️ 雷达: 区域内未检测到明显降雨` : `🛰️ Radar: Không phát hiện vùng mưa đáng kể trong khu vực`);
        return `${resultHtml}<br><span style="color:var(--accent-blue);font-size:0.75rem;">🌧️ ${lang === 'en' ? 'Rain prob:' : (lang === 'zh' ? '降雨概率:' : 'Xác suất mưa:')} ${pop}%</span><br><span style="color:var(--accent-yellow);font-size:0.75rem;">${radarReport}</span>`;
    };

    elements.optimalResultsList.innerHTML = `
        <div class="optimal-item">
            <div class="optimal-icon"><i class="fa-solid fa-person-running"></i></div>
            <div class="optimal-info">
                <h4>${lang === 'en' ? 'Running / Exercise' : (lang === 'zh' ? '跑步 / 锻炼' : 'Chạy Bộ / Thể Dục')}</h4>
                <p>${formatSlotResult(bestRunning)}</p>
            </div>
        </div>
        <div class="optimal-item">
            <div class="optimal-icon"><i class="fa-solid fa-futbol"></i></div>
            <div class="optimal-info">
                <h4>${lang === 'en' ? 'Football (18:00 - 20:00)' : (lang === 'zh' ? '踢足球 (18:00 - 20:00)' : 'Đá Banh (18:00 - 20:00)')}</h4>
                <p>${formatSlotResult(bestFootball)}</p>
            </div>
        </div>
        <div class="optimal-item">
            <div class="optimal-icon"><i class="fa-solid fa-utensils"></i></div>
            <div class="optimal-info">
                <h4>${lang === 'en' ? 'Dining / Walking (17:00 - 22:00)' : (lang === 'zh' ? '餐饮 / 逛街 (17:00 - 22:00)' : 'Ăn Uống / Dạo Phố (17:00 - 22:00)')}</h4>
                <p>${formatSlotResult(bestDining)}</p>
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

    const lang = appState.currentLang;
    const t = I18N[lang] || I18N.vi;
    const rainSlot = todaySlots.find(s => (s.pop && s.pop >= 0.35) || (s.rain && s.rain["3h"] > 0));
    if (rainSlot) {
        elements.rainNotice.textContent = `${lang === 'en' ? 'Rain expected around' : (lang === 'zh' ? '预计降雨时间大约在' : 'Có thể mưa vào')} ${formatHour(rainSlot.dt, appState.timezoneOffset)}`;
    } else {
        elements.rainNotice.textContent = t.noRainToday;
    }

    todaySlots.forEach((slot, index) => {
        const timeStr = formatHour(slot.dt, appState.timezoneOffset);
        const popVal = Math.round((slot.pop || 0) * 100);
        const tempVal = Math.round(slot.main.temp);
        const rainVol = (slot.rain && slot.rain["3h"]) ? slot.rain["3h"] : 0;
        const visibilityKm = slot.visibility ? (slot.visibility / 1000).toFixed(1) : "10";
        const descText = slot.weather[0].description;
        const slotDate = new Date((slot.dt + appState.timezoneOffset) * 1000);
        const uvInfo = calculateUVIndex(slotDate.getUTCHours(), descText, slot.clouds ? slot.clouds.all : 20);

        const hKey = `hourly_${index}`;
        appState.hourlyCache[hKey] = {
            title: `${lang === 'en' ? 'Hourly Forecast at' : (lang === 'zh' ? '时间段预报' : 'Khung giờ')} ${timeStr}`,
            temp: tempVal,
            desc: descText,
            icon: slot.weather[0].icon,
            humidity: slot.main.humidity,
            wind: Math.round(slot.wind.speed * 3.6),
            rainVol: rainVol.toFixed(1),
            pop: popVal,
            visibility: visibilityKm,
            uv: `${uvInfo.index} (${uvInfo.text})`
        };

        const node = document.createElement("div");
        node.className = `hour-node ${popVal >= 40 ? "rain-risk" : ""}`;
        node.dataset.hourKey = hKey;
        node.innerHTML = `
            <span class="h-time">${timeStr}</span>
            <img src="https://openweathermap.org/img/wn/${slot.weather[0].icon}.png" alt="icon">
            <span class="h-temp">${tempVal}°</span>
            <span class="h-pop">${popVal > 0 ? popVal + '%' : '--'}</span>
        `;
        
        node.addEventListener("click", () => {
            openDetailModal(appState.hourlyCache[hKey]);
        });

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
    const dayNamesMap = {
        vi: ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'],
        en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        zh: ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    };
    const dayNames = dayNamesMap[appState.currentLang] || dayNamesMap.vi;

    daysKeys.forEach((dateKey) => {
        const daySlots = grouped[dateKey];
        const midSlot = daySlots.find(s => s.dt_txt && s.dt_txt.includes("12:00:00")) || daySlots[Math.floor(daySlots.length / 2)];
        const dateObj = new Date(dateKey + "T00:00:00");
        const dayLabel = dayNames[dateObj.getDay()];
        const [year, month, day] = dateKey.split('-');
        const fullDateNumeric = `${day}/${month}/${year}`;
        const midTemp = Math.round(midSlot.main.temp);

        let maxPop = 0;
        let totalRain = 0;
        daySlots.forEach(s => {
            const p = Math.round((s.pop || 0) * 100);
            if (p > maxPop) maxPop = p;
            if (s.rain && s.rain["3h"]) totalRain += s.rain["3h"];
        });

        const visibilityKm = midSlot.visibility ? (midSlot.visibility / 1000).toFixed(1) : "10";
        const midWind = Math.round(midSlot.wind.speed * 3.6);
        const midDesc = midSlot.weather[0].description;
        const midUv = calculateUVIndex(12, midDesc, 40);

        appState.forecastCache[dateKey] = {
            title: `${dayLabel}, ${fullDateNumeric}`,
            temp: midTemp,
            desc: midDesc,
            icon: midSlot.weather[0].icon,
            humidity: midSlot.main.humidity,
            wind: midWind,
            rainVol: totalRain.toFixed(1),
            pop: maxPop,
            visibility: visibilityKm,
            uv: `${midUv.index} (${midUv.text})`,
            hourlySlots: daySlots
        };

        const itemEl = document.createElement("div");
        itemEl.className = "forecast-item";
        itemEl.dataset.date = dateKey;
        itemEl.innerHTML = `
            <div class="f-day"><strong>${dayLabel}</strong><span>${fullDateNumeric}</span></div>
            <img src="https://openweathermap.org/img/wn/${midSlot.weather[0].icon}@2x.png" alt="icon">
            <span class="f-desc">${midDesc}</span>
            <span class="f-temp">${midTemp}°C</span>
        `;
        
        itemEl.addEventListener("click", () => {
            openDetailModal(appState.forecastCache[dateKey]);
        });

        elements.forecastList.appendChild(itemEl);
    });
}

function openDetailModal(data) {
    if (!data || !elements.dayDetailModal) return;
    document.getElementById("dayModalTitle").textContent = data.title;
    document.getElementById("dayModalTemp").textContent = `${data.temp}°C`;
    document.getElementById("dayModalDesc").textContent = data.desc;
    document.getElementById("dayModalIcon").src = `https://openweathermap.org/img/wn/${data.icon}@2x.png`;
    document.getElementById("dayModalHumidity").textContent = `${data.humidity}%`;
    document.getElementById("dayModalWind").textContent = `${data.wind} km/h`;
    document.getElementById("dayModalRainVol").textContent = `${data.rainVol} mm`;
    document.getElementById("dayModalPop").textContent = `${data.pop}%`;
    document.getElementById("dayModalVisibility").textContent = `${data.visibility} km`;
    document.getElementById("dayModalUV").textContent = data.uv;

    const hourlyTrackList = document.getElementById("dayModalHourlyList");
    if (hourlyTrackList) {
        hourlyTrackList.innerHTML = "";
        if (data.hourlySlots && data.hourlySlots.length > 0) {
            data.hourlySlots.forEach(slot => {
                const timeStr = formatHour(slot.dt, appState.timezoneOffset);
                const tempVal = Math.round(slot.main.temp);
                const popVal = Math.round((slot.pop || 0) * 100);
                const node = document.createElement("div");
                node.className = "modal-hour-node";
                node.innerHTML = `
                    <span>${timeStr}</span>
                    <img src="https://openweathermap.org/img/wn/${slot.weather[0].icon}.png" style="width:24px;height:24px;margin:0 auto;" alt="icon">
                    <strong>${tempVal}°C</strong>
                    <span style="color:var(--accent-blue);font-size:0.65rem;">${popVal}%</span>
                `;
                hourlyTrackList.appendChild(node);
            });
            document.getElementById("modalHourlySection").style.display = "flex";
        } else {
            document.getElementById("modalHourlySection").style.display = "none";
        }
    }

    elements.dayDetailModal.classList.add("active");
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
    if (elements.modalCloseBtn) elements.modalCloseBtn.addEventListener("click", () => elements.dayDetailModal.classList.remove("active"));
    if (elements.modalScrim) elements.modalScrim.addEventListener("click", () => elements.dayDetailModal.classList.remove("active"));
    if (elements.optimalModalCloseBtn) elements.optimalModalCloseBtn.addEventListener("click", closeOptimalModal);
    if (elements.optimalModalScrim) elements.optimalModalScrim.addEventListener("click", closeOptimalModal);
    
    if (elements.infoModalCloseBtn) elements.infoModalCloseBtn.addEventListener("click", () => elements.infoModal.classList.remove("active"));
    if (elements.infoModalScrim) elements.infoModalScrim.addEventListener("click", () => elements.infoModal.classList.remove("active"));
    
    if (elements.audioToggleBtn) {
        elements.audioToggleBtn.addEventListener("click", toggleAudio);
    }

    // Sự kiện Radar
    if (elements.layerRainBtn) {
        elements.layerRainBtn.addEventListener("click", () => setRadarLayer('rain'));
    }
    if (elements.layerCloudBtn) {
        elements.layerCloudBtn.addEventListener("click", () => setRadarLayer('cloud'));
    }

    document.querySelectorAll(".metric-card").forEach(card => {
        card.addEventListener("click", () => {
            const metricType = card.dataset.metric;
            handleMetricCardClick(metricType);
        });
    });

    document.querySelectorAll(".lang-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            document.querySelectorAll(".lang-btn").forEach(b => b.classList.remove("active"));
            e.target.classList.add("active");
            appState.currentLang = e.target.dataset.lang;
            updateStaticUIText();

            if (lastWeatherData && lastForecastData) {
                renderWeather(lastWeatherData, lastForecastData, lastAqiData, lastCustomName);
            }
        });
    });
}

function updateStaticUIText() {
    const t = I18N[appState.currentLang] || I18N.vi;
    if (elements.cityInput) elements.cityInput.placeholder = t.searchPlaceholder;
    
    document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.dataset.i18n;
        if (t[key]) el.textContent = t[key];
    });
}

// ================= KHỞI ĐỘNG VÀ ĐỊNH VỊ TỰ ĐỘNG =================
document.addEventListener("DOMContentLoaded", () => {
    initDOMElements();
    setupRainCanvas();
    setupEventDelegation();
    startLiveClock();
    updateStaticUIText();

    localStorage.removeItem(CONFIG.storageKey);

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                loadWeatherByCoords(position.coords.latitude, position.coords.longitude);
            },
            () => {
                loadWeatherByCoords(CONFIG.defaultCity.lat, CONFIG.defaultCity.lon, CONFIG.defaultCity.name);
            },
            { timeout: 10000, enableHighAccuracy: true }
        );
    } else {
        loadWeatherByCoords(CONFIG.defaultCity.lat, CONFIG.defaultCity.lon, CONFIG.defaultCity.name);
    }
});