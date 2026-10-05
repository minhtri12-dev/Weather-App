const CONFIG = {
    apiKey: "5d0440c6a96719587d42efc9382e6105", 
    storageKey: "skycast_saved_city", historyKey: "skycast_search_history",
    refreshInterval: 10 * 60 * 1000, 
    defaultCity: { lat: 10.8231, lon: 106.6297, name: "TP. Hồ Chí Minh" }
};

const STATE = {
    lat: null, lon: null, name: "",
    timezoneOffset: 25200, currentLang: "vi",
    isAudioPlaying: false,
    forecastCache: {}, hourlyCache: {}
};

let canvasCtx = null, rainParticles = [], isRainActive = false, animFrameId = null;
let autocompleteTimeout;

const IconMap = {
    '01d': '<i class="fa-solid fa-sun" style="color: #facc15; filter: drop-shadow(0 0 8px rgba(250,204,21,0.5));"></i>',
    '01n': '<i class="fa-solid fa-moon" style="color: #cbd5e1; filter: drop-shadow(0 0 4px rgba(203,213,225,0.5));"></i>',
    '02d': '<i class="fa-solid fa-cloud-sun" style="color: #ffffff; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));"></i>',
    '02n': '<i class="fa-solid fa-cloud-moon" style="color: #ffffff; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));"></i>',
    '03d': '<i class="fa-solid fa-cloud" style="color: #ffffff; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));"></i>',
    '03n': '<i class="fa-solid fa-cloud" style="color: #ffffff; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));"></i>',
    '04d': '<i class="fa-solid fa-cloud" style="color: #cbd5e1; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));"></i>',
    '04n': '<i class="fa-solid fa-cloud" style="color: #cbd5e1; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));"></i>',
    '09d': '<i class="fa-solid fa-cloud-rain" style="color: #60a5fa; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));"></i>',
    '09n': '<i class="fa-solid fa-cloud-rain" style="color: #60a5fa; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));"></i>',
    '10d': '<i class="fa-solid fa-cloud-sun-rain" style="color: #60a5fa; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));"></i>',
    '10n': '<i class="fa-solid fa-cloud-moon-rain" style="color: #60a5fa; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));"></i>',
    '11d': '<i class="fa-solid fa-cloud-bolt" style="color: #a78bfa; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));"></i>',
    '11n': '<i class="fa-solid fa-cloud-bolt" style="color: #a78bfa; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));"></i>',
    '13d': '<i class="fa-solid fa-snowflake" style="color: #ffffff; filter: drop-shadow(0 0 6px rgba(255,255,255,0.6));"></i>',
    '13n': '<i class="fa-solid fa-snowflake" style="color: #ffffff; filter: drop-shadow(0 0 6px rgba(255,255,255,0.6));"></i>',
    '50d': '<i class="fa-solid fa-smog" style="color: #cbd5e1;"></i>',
    '50n': '<i class="fa-solid fa-smog" style="color: #cbd5e1;"></i>'
};

const I18N = {
    vi: {
        searchPlaceholder: "Tìm thành phố...", currentLoc: "Vị trí hiện tại", 
        tabHourly: "Theo giờ", tabWeekly: "Dự báo 5 ngày", highlightsTitle: "Khoảnh khắc đáng chú ý", radarTitle: "Live Radar",
        humidity: "Độ ẩm", windSpeed: "Gió", pressure: "Áp suất", uvIndex: "UV ước tính", aqiTitle: "Không khí (AQI)", sunTitle: "Mặt trời mọc & lặn",
        days: ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'],
        statusSun: "Quang đãng", statusCloudy: "Nhiều mây", statusRain: "Có khả năng mưa", statusHeavyRain: "Mưa rải rác",
        greetings: { morning: "Chào buổi sáng! Khởi đầu ngày mới mát mẻ.", afternoon: "Chào buổi trưa! Cẩn thận trời khá oi bức.", evening: "Chào buổi tối! Không gian lý tưởng để dạo phố.", night: "Đêm muộn rồi! Chúc bạn ngủ ngon." },
        aqiLevel: { 1: {t:'Rất tốt'}, 2: {t:'Khá'}, 3: {t:'Trung bình'}, 4: {t:'Kém'}, 5: {t:'Nguy hại'} },
        now: "Bây giờ", feelsLike: "Cảm giác như", dewpoint: "Sương", pressureNormal: "Bình thường", uvLow: "Thấp", uvHigh: "Cao",
        hlSunset: "Hoàng hôn đẹp", hlTemp: "Đỉnh nhiệt", hlRain: "Mưa cao nhất",
        highlightsDesc: { sunset: "Ánh sáng đẹp vào lúc hoàng hôn. Khoảnh khắc thư giãn trong ngày.", peakTemp: "Trời khá nóng và oi bức. Nhớ bổ sung nước và hạn chế ra ngoài.", peakRain: "Khả năng cao có mưa rào. Đừng quên mang theo ô khi di chuyển." }
    },
    en: {
        searchPlaceholder: "Search city...", currentLoc: "Current Location",
        tabHourly: "Hourly", tabWeekly: "5-Day Forecast", highlightsTitle: "Today's Highlights", radarTitle: "Live Radar",
        humidity: "Humidity", windSpeed: "Wind", pressure: "Pressure", uvIndex: "Estimated UV", aqiTitle: "Air Pollution", sunTitle: "Sunrise & Sunset",
        days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        statusSun: "Clear Sky", statusCloudy: "Cloudy", statusRain: "Chance of Rain", statusHeavyRain: "Showers",
        greetings: { morning: "Good morning! A fresh start.", afternoon: "Good afternoon! Stay hydrated.", evening: "Good evening! Perfect for a walk.", night: "Late night. Have a good rest." },
        aqiLevel: { 1: {t:'Excellent'}, 2: {t:'Fair'}, 3: {t:'Moderate'}, 4: {t:'Poor'}, 5: {t:'Hazardous'} },
        now: "Now", feelsLike: "Feels like", dewpoint: "Dewpoint", pressureNormal: "Normal", uvLow: "Low", uvHigh: "High",
        hlSunset: "Sunset View", hlTemp: "Peak Temp", hlRain: "Rain Peak",
        highlightsDesc: { sunset: "Beautiful sunset view. A great time to relax.", peakTemp: "Temperatures are peaking. Stay indoors and hydrate.", peakRain: "High chance of precipitation. Don't forget your umbrella." }
    },
    zh: {
        searchPlaceholder: "搜索城市...", currentLoc: "当前位置",
        tabHourly: "每小时", tabWeekly: "5天预报", highlightsTitle: "今日亮点", radarTitle: "雷达",
        humidity: "湿度", windSpeed: "风速", pressure: "气压", uvIndex: "紫外线", aqiTitle: "空气质量", sunTitle: "日出与日落",
        days: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
        statusSun: "晴朗", statusCloudy: "多云", statusRain: "可能有雨", statusHeavyRain: "局部有雨",
        greetings: { morning: "早上好！开启新的一天。", afternoon: "下午好！注意防晒。", evening: "晚上好！适合散步。", night: "夜深了，晚安。" },
        aqiLevel: { 1: {t:'优'}, 2: {t:'良'}, 3: {t:'轻污染'}, 4: {t:'中污染'}, 5: {t:'重污染'} },
        now: "现在", feelsLike: "体感温度", dewpoint: "露点", pressureNormal: "正常", uvLow: "低", uvHigh: "高",
        hlSunset: "最佳日落", hlTemp: "最高温", hlRain: "降雨高峰",
        highlightsDesc: { sunset: "傍晚的日落时光，适合放松心情。", peakTemp: "气温达到顶峰，天气炎热，请多补充水分。", peakRain: "降雨概率较高，出行请记得携带雨具。" }
    }
};

const WeatherLogic = {
    getTrueCondition: (weatherData) => {
        if (!weatherData || !weatherData.weather) return "clear";
        const main = weatherData.weather[0].main.toLowerCase();
        const clouds = weatherData.clouds ? weatherData.clouds.all : 0;
        const rain1h = weatherData.rain ? (weatherData.rain["1h"] || 0) : 0;
        const isApiRaining = main.includes("rain") || main.includes("drizzle") || main.includes("thunderstorm");
        if (isApiRaining && rain1h === 0 && clouds < 40) return "clouds"; 
        return main;
    },
    scoreSlot: (slot, targetHoursArray) => {
        const h = new Date((slot.dt + STATE.timezoneOffset) * 1000).getUTCHours();
        if (!targetHoursArray.includes(h)) return { score: -1, slot: null };
        let score = 100;
        const temp = slot.main.temp;
        const pop = Math.round((slot.pop || 0) * 100);
        const rain = slot.rain && slot.rain["3h"] ? slot.rain["3h"] : 0;
        if (temp > 33 || temp < 18) score -= 40;
        else if (temp >= 24 && temp <= 28) score += 10; 
        score -= pop; 
        if (rain > 0.5) score -= 60;
        return { score: Math.max(0, score), slot: slot, hour: h };
    },
    calculateUV: (hour, condition, clouds) => {
        // Mock function based on time
        if (hour < 7 || hour > 17) return { index: 0 };
        let base = hour > 10 && hour < 14 ? 9 : 5;
        if (clouds > 50) base -= 2;
        return { index: Math.max(0, base) };
    }
};

const AudioController = {
    audio: new Audio(),
    urls: {
        rain: "https://actions.google.com/sounds/v1/weather/thunderstorm.ogg", 
        birds: "https://actions.google.com/sounds/v1/ambiences/spring_day_forest.ogg", 
        traffic: "https://actions.google.com/sounds/v1/ambiences/outdoor_city_street_night.ogg", 
        chill: "https://ia800902.us.archive.org/15/items/LofiChillSongSample/Lofi%20Chill.mp3" 
    },
    init: () => {
        AudioController.audio.loop = true;
        AudioController.audio.volume = 0.4;
    },
    sync: (trueCondition, hour) => {
        const isRain = trueCondition.includes("rain") || trueCondition.includes("drizzle") || trueCondition.includes("thunderstorm");
        let targetKey = isRain ? "rain" : (hour >= 5 && hour <= 10 ? "birds" : (hour >= 18 || hour < 5 ? "traffic" : "chill"));
        if (STATE.currentAudioKey !== targetKey) {
            const wasPlaying = STATE.isAudioPlaying && !AudioController.audio.paused;
            STATE.currentAudioKey = targetKey;
            AudioController.audio.src = AudioController.urls[targetKey];
            AudioController.audio.load();
            if (wasPlaying) AudioController.audio.play().catch(()=>{});
        }
    },
    toggle: () => {
        const icon = document.getElementById("audioIcon");
        if (!STATE.currentAudioKey) AudioController.sync(STATE.trueCondition, new Date().getHours());
        if (STATE.isAudioPlaying) {
            AudioController.audio.pause();
            STATE.isAudioPlaying = false;
            if(icon) icon.className = "fa-solid fa-volume-xmark";
        } else {
            AudioController.audio.play().then(() => {
                STATE.isAudioPlaying = true;
                if(icon) icon.className = "fa-solid fa-volume-high";
            }).catch(()=>{ STATE.isAudioPlaying = false; });
        }
    }
};

const UI = {
    renderAll: (data, displayName) => {
        const { weather, forecast, aqi } = data;
        const langData = I18N[STATE.currentLang];
        STATE.timezoneOffset = weather.timezone || 0;
        STATE.trueCondition = WeatherLogic.getTrueCondition(weather);

        document.getElementById("cityNameDisplay").textContent = displayName || weather.name;
        document.getElementById("tempValue").textContent = Math.round(weather.main.temp);
        
        // Mới: Gán trực tiếp mô tả thời tiết (Mây đen u ám) vào thẻ
        document.getElementById("weatherDesc").textContent = weather.weather[0].description;
        
        const iconCode = weather.weather[0].icon;
        document.getElementById("mainWeatherIcon").innerHTML = IconMap[iconCode] || '<i class="fa-solid fa-cloud"></i>';

        let pop = forecast.list.length > 0 ? Math.round((forecast.list[0].pop || 0) * 100) : 0;
        const liveBadge = document.getElementById("liveStatusBadge");
        if(liveBadge) {
            const isRain = STATE.trueCondition.includes("rain") || STATE.trueCondition.includes("drizzle");
            if (pop >= 20 || isRain) {
                liveBadge.className = "live-status-badge rain";
                liveBadge.innerHTML = `<i class="fa-solid fa-cloud-showers-heavy"></i> ${pop >= 60 ? langData.statusHeavyRain : langData.statusRain} (${pop}%)`;
            } else {
                liveBadge.className = "live-status-badge sun";
                liveBadge.innerHTML = `<i class="fa-solid fa-sun"></i> ${langData.statusSun}`;
            }
        }

        UI.updateThemeAndGreeting();
        UI.renderMetrics(weather, aqi);
        UI.renderHourlyStrip(forecast.list);
        UI.render5Days(forecast.list);
        UI.renderHighlights(forecast.list, weather.sys.sunset);
        
        const windyIframe = document.getElementById("windyRadar");
        if (windyIframe && STATE.lat && STATE.lon) {
            windyIframe.src = `https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=%C2%B0C&metricWind=km/h&zoom=10&overlay=radar&product=radar&level=surface&lat=${STATE.lat}&lon=${STATE.lon}&detailLat=${STATE.lat}&detailLon=${STATE.lon}&marker=true`;
        }
        
        UI.renderSearchHistory();
        AudioController.sync(STATE.trueCondition, new Date().getHours());
    },

    renderMetrics: (w, aqiData) => {
        const langData = I18N[STATE.currentLang];
        
        const windSpeed = Math.round(w.wind.speed * 3.6);
        const windDeg = w.wind.deg || 0;
        document.getElementById("windVal").textContent = windSpeed;
        let dir = "N";
        if(windDeg>45 && windDeg<=135) dir = "E";
        else if(windDeg>135 && windDeg<=225) dir = "S";
        else if(windDeg>225 && windDeg<=315) dir = "W";
        document.getElementById("windDesc").textContent = `${langData.statusSun.split(' ')[0]} • ${dir}`; 
        document.getElementById("windCompassArrow").style.transform = `rotate(${windDeg}deg)`;
        
        const hum = w.main.humidity;
        document.getElementById("humidityVal").textContent = hum;
        document.getElementById("humidityBar").style.height = `${hum}%`;
        document.getElementById("humidityDot").style.bottom = `calc(${hum}% - 7px)`;
        const dewpoint = Math.round(w.main.temp - ((100 - hum)/5));
        document.getElementById("dewpointVal").textContent = `${langData.dewpoint}: ${dewpoint}°C`;

        if (aqiData && aqiData.list) {
            const aqiNum = aqiData.list[0].main.aqi;
            document.getElementById("aqiNum").textContent = aqiNum;
            document.getElementById("aqiText").textContent = langData.aqiLevel[aqiNum].t;
            const aqiPercent = ((aqiNum - 1) / 4) * 100;
            document.getElementById("aqiDot").style.left = `calc(${aqiPercent}% - 7px)`;
        }

        const pres = w.main.pressure;
        document.getElementById("pressureVal").textContent = pres;
        let presPercent = ((pres - 950) / 100) * 100;
        presPercent = Math.max(0, Math.min(100, presPercent));
        document.getElementById("pressureBar").style.height = `${presPercent}%`;
        document.getElementById("pressureDot").style.bottom = `calc(${presPercent}% - 7px)`;
        document.getElementById("pressureDesc").textContent = langData.pressureNormal;

        const hour = new Date((w.dt + STATE.timezoneOffset)*1000).getUTCHours();
        let uv = 0;
        if(hour > 6 && hour < 18) uv = w.clouds.all < 50 ? (hour>10 && hour<15 ? 9 : 5) : 2;
        document.getElementById("uvVal").textContent = uv;
        let uvPercent = Math.min((uv / 11) * 100, 100);
        document.getElementById("uvBar").style.height = `${uvPercent}%`;
        document.getElementById("uvDot").style.bottom = `calc(${uvPercent}% - 7px)`;
        document.getElementById("uvDesc").textContent = uv > 6 ? langData.uvHigh : langData.uvLow;

        document.getElementById("sunriseTime").textContent = UI.formatHour(w.sys.sunrise);
        document.getElementById("sunsetTime").textContent = UI.formatHour(w.sys.sunset);
        
        const now = Math.floor(Date.now() / 1000); 
        const sr = w.sys.sunrise;
        const ss = w.sys.sunset;
        let arcDeg = -90; 
        const arcIcon = document.getElementById("sunArcIcon");

        if (now < sr) {
            arcDeg = -90;
            arcIcon.className = "fa-solid fa-moon sun-icon-arc";
            arcIcon.style.color = "#cbd5e1";
        } else if (now >= sr && now <= ss) {
            const progress = (now - sr) / (ss - sr);
            arcDeg = -90 + (progress * 180); 
            arcIcon.className = "fa-solid fa-sun sun-icon-arc";
            arcIcon.style.color = "#facc15";
        } else {
            arcDeg = 90;
            arcIcon.className = "fa-solid fa-moon sun-icon-arc";
            arcIcon.style.color = "#cbd5e1";
        }
        arcIcon.style.transform = `rotate(${arcDeg}deg)`;
    },

    renderHourlyStrip: (list) => {
        const strip = document.getElementById("hourlyStrip");
        strip.innerHTML = "";
        STATE.hourlyCache = {}; 
        const next24 = list.slice(0, 10);
        const langData = I18N[STATE.currentLang];

        next24.forEach((s, index) => {
            const timeStr = index === 0 ? langData.now : UI.formatHour(s.dt);
            const iconCode = s.weather[0].icon;
            const temp = Math.round(s.main.temp);
            
            STATE.hourlyCache[s.dt] = {
                title: timeStr,
                temp: temp, desc: s.weather[0].description, icon: iconCode,
                humidity: s.main.humidity, wind: Math.round(s.wind.speed * 3.6),
                rainVol: s.rain && s.rain["3h"] ? s.rain["3h"].toFixed(1) : 0, pop: Math.round((s.pop||0)*100)
            };

            const div = document.createElement("div");
            div.className = `hourly-item ${index === 0 ? 'now' : ''}`;
            div.dataset.time = s.dt; 
            div.innerHTML = `
                <span class="h-time">${timeStr}</span>
                <div class="h-icon-fa">${IconMap[iconCode] || '<i class="fa-solid fa-cloud"></i>'}</div>
                <span class="h-temp">${temp}°</span>
            `;
            strip.appendChild(div);
        });
    },

    renderHighlights: (list, sunsetTimestamp) => {
        const grid = document.getElementById("highlightsGrid");
        if(!grid) return;
        const lang = STATE.currentLang;
        const h = I18N[lang].hlSunset;
        const t = I18N[lang].hlTemp;
        const r = I18N[lang].hlRain;
        const d = I18N[lang].highlightsDesc;
        
        const sunsetStr = UI.formatHour(sunsetTimestamp);
        let maxT = -99, maxTTime = "--";
        let maxP = -1, maxPTime = "--";

        try {
            list.forEach(s => {
                const dateObj = new Date((s.dt + STATE.timezoneOffset) * 1000);
                const hour = dateObj.getUTCHours();
                if (hour >= 6 && hour <= 18) {
                    if (s.main.temp > maxT) { maxT = s.main.temp; maxTTime = UI.formatHour(s.dt); }
                    const pop = Math.round((s.pop || 0) * 100);
                    if (pop > maxP) { maxP = pop; maxPTime = UI.formatHour(s.dt); }
                }
            });

            if (maxTTime === "--") { maxT = 30; maxTTime = "13:00"; }
            if (maxPTime === "--") { maxP = 0; maxPTime = "15:00"; }

            let html = `
                <div class="h-card">
                    <span class="h-title" style="color:var(--accent-yellow)">${h}</span>
                    <span class="h-val">${d.sunset} (${sunsetStr})</span>
                </div>
                <div class="h-card">
                    <span class="h-title" style="color:var(--accent-red)">${t}</span>
                    <span class="h-val">${d.peakTemp} (${Math.round(maxT)}°C - ${maxTTime})</span>
                </div>
            `;
            if (maxP >= 30) {
                html += `<div class="h-card">
                    <span class="h-title" style="color:var(--accent-blue)">${r}</span>
                    <span class="h-val">${d.peakRain} (${maxP}% - ${maxPTime})</span>
                </div>`;
            }
            grid.innerHTML = html;
        } catch(e) {
            grid.innerHTML = `<div class="h-card"><span class="h-title">Info</span><span class="h-val">Updating...</span></div>`;
        }
    },

    render5Days: (list) => {
        const wrap = document.getElementById("forecastList");
        wrap.innerHTML = "";
        STATE.forecastCache = {};
        
        const grouped = {};
        const todayStr = new Date((Date.now() + STATE.timezoneOffset*1000)).toISOString().split('T')[0];

        list.forEach(item => {
            const dStr = new Date((item.dt + STATE.timezoneOffset)*1000).toISOString().split('T')[0];
            if (dStr !== todayStr) {
                if (!grouped[dStr]) grouped[dStr] = [];
                grouped[dStr].push(item);
            }
        });

        const keys = Object.keys(grouped).slice(0, 5);
        const dayNames = I18N[STATE.currentLang].days;

        let globalMin = 999, globalMax = -999;
        let hottestDayStr = "";
        keys.forEach(k => {
            grouped[k].forEach(s => {
                if(s.main.temp_min < globalMin) globalMin = s.main.temp_min;
                if(s.main.temp_max > globalMax) {
                    globalMax = s.main.temp_max;
                    hottestDayStr = dayNames[new Date(k + "T00:00:00").getDay()];
                }
            });
        });

        const recordBadge = document.getElementById("weeklyRecordBadge");
        if (recordBadge) {
            const recordText = STATE.currentLang === 'en' ? `🔥 Hottest: ${Math.round(globalMax)}°C (${hottestDayStr})` : (STATE.currentLang === 'zh' ? `🔥 最高温: ${Math.round(globalMax)}°C (${hottestDayStr})` : `🔥 Nóng nhất: ${Math.round(globalMax)}°C (${hottestDayStr})`);
            recordBadge.textContent = recordText;
        }

        keys.forEach(k => {
            const slots = grouped[k];
            const mid = slots.find(s => s.dt_txt.includes("12:00:00")) || slots[Math.floor(slots.length/2)];
            const dObj = new Date(k + "T00:00:00");
            
            let dayMin = 999, dayMax = -999;
            slots.forEach(s => {
                if(s.main.temp_min < dayMin) dayMin = s.main.temp_min;
                if(s.main.temp_max > dayMax) dayMax = s.main.temp_max;
            });

            const range = globalMax - globalMin || 1; 
            const leftPercent = ((dayMin - globalMin) / range) * 100;
            const widthPercent = ((dayMax - dayMin) / range) * 100;

            const iconCode = mid.weather[0].icon;

            STATE.forecastCache[k] = {
                title: `${dayNames[dObj.getDay()]}, ${k.split('-').reverse().join('/')}`,
                temp: Math.round(mid.main.temp), desc: mid.weather[0].description, icon: iconCode,
                humidity: mid.main.humidity, wind: Math.round(mid.wind.speed * 3.6),
                rainVol: (slots[0].rain && slots[0].rain["3h"]) ? slots[0].rain["3h"].toFixed(1) : 0, pop: Math.round((slots[0].pop||0)*100)
            };

            const div = document.createElement("div");
            div.className = "forecast-item";
            div.dataset.date = k;
            
            div.innerHTML = `
                <div class="f-day">${dayNames[dObj.getDay()]}</div>
                <div class="f-icon-pop"><div class="f-icon-fa">${IconMap[iconCode]}</div></div>
                <div class="f-temp-min">${Math.round(dayMin)}°</div>
                <div class="f-temp-bar-container"><div class="f-temp-bar" style="left: ${leftPercent}%; width: ${Math.max(widthPercent, 5)}%;"></div></div>
                <div class="f-temp-max">${Math.round(dayMax)}°</div>
            `;
            wrap.appendChild(div);
        });
    },

    updateClockTick: () => {
        const now = new Date();
        const cityDate = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + (STATE.timezoneOffset * 1000));
        
        const h = String(cityDate.getHours()).padStart(2, "0");
        const m = String(cityDate.getMinutes()).padStart(2, "0");
        const s = String(cityDate.getSeconds()).padStart(2, "0");
        
        const lang = STATE.currentLang;
        let dStr = "";
        if (lang === 'vi') dStr = cityDate.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' });
        else if (lang === 'en') dStr = cityDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        else dStr = cityDate.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', weekday: 'short' });

        document.getElementById("digitalTime").textContent = `${h}:${m}:${s}`;
        document.getElementById("digitalDate").textContent = dStr;
    },

    updateThemeAndGreeting: () => {
        const now = new Date();
        const cityDate = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + (STATE.timezoneOffset * 1000));
        const hours = cityDate.getHours();
        
        const g = I18N[STATE.currentLang].greetings;
        let txt = g.morning;
        if (hours >= 12 && hours < 17) txt = g.afternoon;
        else if (hours >= 17 && hours < 22) txt = g.evening;
        else if (hours >= 22 || hours < 5) txt = g.night;
        document.getElementById("smartGreetingLabel").textContent = txt;

        const body = document.getElementById("appBody");
        body.className = "";
        
        if (STATE.trueCondition.includes("rain")) { body.classList.add("theme-rain"); UI.startCanvasRain(); }
        else {
            UI.stopCanvasRain();
            if (hours >= 6 && hours < 17) body.classList.add("theme-day");
            else if (hours >= 17 && hours < 18) body.classList.add("theme-sunset");
            else if (hours >= 18 && hours <= 23) body.classList.add("theme-evening");
            else body.classList.add("theme-night");
        }
    },

    formatHour: (timestamp) => {
        if (!timestamp) return "--:--";
        const d = new Date((timestamp + STATE.timezoneOffset) * 1000);
        return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
    },

    saveSearchHistory: (cityName) => {
        if(!cityName) return;
        const ignoreList = [I18N.vi.currentLoc, I18N.en.currentLoc, I18N.zh.currentLoc];
        if (ignoreList.includes(cityName)) return;

        let history = JSON.parse(localStorage.getItem(CONFIG.historyKey) || "[]");
        history = history.filter(c => c.toLowerCase() !== cityName.toLowerCase());
        history.unshift(cityName);
        if (history.length > 2) history.pop();
        localStorage.setItem(CONFIG.historyKey, JSON.stringify(history));
    },

    renderSearchHistory: () => {
        const container = document.getElementById("historyCitiesContainer");
        if(!container) return;
        container.innerHTML = "";
        let history = JSON.parse(localStorage.getItem(CONFIG.historyKey) || "[]");
        history.forEach(cityName => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "city-pill";
            btn.innerHTML = `<i class="fa-solid fa-clock-rotate-left"></i> ${cityName}`;
            btn.addEventListener("click", () => API.searchSuggestionsQuick(cityName));
            container.appendChild(btn);
        });
    },

    // Bổ sung các thẻ được nhấp (AQI, Áp Suất, Mặt Trời)
    handleMetricCardClick: (metricType) => {
        if (!STATE.weatherDataStore) return;
        const { weather, forecast, aqi } = STATE.weatherDataStore;
        
        const modal = document.getElementById("infoModal");
        const tEl = document.getElementById("infoModalTitle");
        const bEl = document.getElementById("infoModalBody");
        const pFill = document.getElementById("infoModalProgress");
        const chartBox = document.getElementById("miniChartBox");
        
        let title = "", advice = "", percent = 0, chartData = [], color = "";
        const next24h = forecast.list.slice(0, 8);
        const labels = next24h.map(s => UI.formatHour(s.dt));
        const lang = STATE.currentLang;

        if (metricType === 'humidity') {
            const hum = weather.main.humidity;
            title = lang === 'en' ? 'Humidity' : (lang === 'zh' ? '湿度' : 'Độ ẩm');
            percent = hum; color = "#38bdf8";
            chartData = next24h.map(s => s.main.humidity);
            advice = hum < 40 ? `Mức ${hum}%. Khô hanh.` : hum <= 70 ? `Mức ${hum}%. Cực kỳ dễ chịu.` : `Mức ${hum}%. Hơi oi bức.`;
            chartBox.style.display = "block";
        } else if (metricType === 'wind') {
            const wind = Math.round(weather.wind.speed * 3.6);
            title = lang === 'en' ? 'Wind Speed' : (lang === 'zh' ? '风速' : 'Tốc độ Gió');
            percent = Math.min((wind / 50) * 100, 100); color = "#34d399";
            chartData = next24h.map(s => Math.round(s.wind.speed * 3.6));
            advice = `${wind} km/h. Đã có la bàn chỉ hướng ngoài màn hình chính.`;
            chartBox.style.display = "block";
        } else if (metricType === 'uv') {
            const uv = WeatherLogic.calculateUV(new Date().getHours(), STATE.trueCondition, weather.clouds ? weather.clouds.all : 0);
            title = lang === 'en' ? 'Estimated UV Index' : (lang === 'zh' ? '估算紫外线指数' : 'Chỉ số UV ước tính');
            percent = Math.min((uv.index / 11) * 100, 100); color = "#facc15";
            advice = `UV ước tính mức ${uv.index}. Dựa trên góc mặt trời và tầng mây thực tế.`;
            chartBox.style.display = "none";
        } else if (metricType === 'aqi') {
            const aqiNum = aqi && aqi.list ? aqi.list[0].main.aqi : 1;
            title = lang === 'en' ? 'Air Quality (AQI)' : (lang === 'zh' ? '空气质量' : 'Không khí (AQI)');
            percent = ((aqiNum - 1) / 4) * 100; color = "#facc15";
            advice = `Chỉ số AQI mức ${aqiNum}. Chất lượng không khí: ${I18N[lang].aqiLevel[aqiNum].t}.`;
            chartBox.style.display = "none";
        } else if (metricType === 'pressure') {
            const pres = weather.main.pressure;
            title = lang === 'en' ? 'Pressure' : (lang === 'zh' ? '气压' : 'Áp suất');
            percent = Math.min(((pres - 950) / 100) * 100, 100); color = "#34d399";
            advice = `Áp suất hiện tại là ${pres} hPa. ${pres > 1020 ? 'Áp suất cao.' : pres < 1000 ? 'Áp suất thấp.' : 'Mức bình thường.'}`;
            chartBox.style.display = "none";
        } else if (metricType === 'sun') {
            title = lang === 'en' ? 'Sunrise & Sunset' : (lang === 'zh' ? '日出与日落' : 'Mặt trời mọc & lặn');
            percent = 50; color = "#facc15";
            advice = `Mặt trời mọc vào lúc ${UI.formatHour(weather.sys.sunrise)} và lặn vào lúc ${UI.formatHour(weather.sys.sunset)}.`;
            chartBox.style.display = "none";
        } else return; 

        if(tEl) tEl.textContent = title;
        if(bEl) bEl.innerHTML = advice;
        if(pFill) {
            pFill.style.width = "0%"; pFill.style.backgroundColor = color;
            setTimeout(() => { pFill.style.width = `${percent}%`; }, 100);
        }

        if(chartBox && chartBox.style.display !== "none") {
            const ctx = document.getElementById('miniMetricChart');
            if (STATE.miniChartInstance) STATE.miniChartInstance.destroy();
            if(ctx) {
                STATE.miniChartInstance = new Chart(ctx, {
                    type: 'line', data: { labels: labels, datasets: [{ data: chartData, borderColor: color, backgroundColor: color + "33", borderWidth: 2, tension: 0.4, fill: true, pointRadius: 2 }] },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: true, grid: { display: false, color: 'rgba(255,255,255,0.08)' }, ticks: { font: { size: 9 } } }, y: { display: false, min: 0 } } }
                });
            }
        }
        if(modal) modal.classList.add("active");
    },

    openDetailModal: (data) => {
        document.getElementById("detailModalTitle").textContent = data.title;
        document.getElementById("detailModalDesc").innerHTML = `${data.temp}°C &nbsp;•&nbsp; ${data.desc}`;
        document.getElementById("detailModalIcon").innerHTML = IconMap[data.icon] || '<i class="fa-solid fa-cloud"></i>';
        document.getElementById("detailModalHumidity").textContent = `${data.humidity}%`;
        document.getElementById("detailModalWind").textContent = `${data.wind} km/h`;
        document.getElementById("detailModalRainVol").textContent = `${data.rainVol} mm`;
        document.getElementById("detailModalPop").textContent = `${data.pop}%`;
        const modal = document.getElementById("detailModal");
        if(modal) modal.classList.add("active");
    },

    openGoldenHours: () => {
        const wrap = document.getElementById("optimalResultsList");
        if(!wrap) return;
        wrap.innerHTML = "";
        const lang = STATE.currentLang;
        
        const runTarget = [5,6,7,8, 17,18,19,20];
        const fbTarget = [16,17,18,19,20,21];
        const dineTarget = [17,18,19,20,21,22];

        let bestRun = { score: -1 }, bestFb = { score: -1 }, bestDine = { score: -1 };

        if(STATE.weatherDataStore && STATE.weatherDataStore.forecast) {
            const slots = STATE.weatherDataStore.forecast.list.slice(0, 12);
            slots.forEach(slot => {
                const rScore = WeatherLogic.scoreSlot(slot, runTarget);
                if (rScore.score > bestRun.score) bestRun = rScore;
                const fScore = WeatherLogic.scoreSlot(slot, fbTarget);
                if (fScore.score > bestFb.score) bestFb = fScore;
                const dScore = WeatherLogic.scoreSlot(slot, dineTarget);
                if (dScore.score > bestDine.score) bestDine = dScore;
            });
        }

        const formatResult = (res, title, icon) => {
            if (res.score < 50) {
                const emptyMsg = lang === 'en' ? 'Weather is unfavorable.' : 'Thời tiết không thuận lợi.';
                return `<div class="optimal-item" style="display:block;"><h4><i class="${icon}"></i> ${title}</h4><div class="gh-empty">${emptyMsg}</div></div>`;
            }
            const time = UI.formatHour(res.slot.dt);
            const temp = Math.round(res.slot.main.temp);
            const pop = Math.round((res.slot.pop||0)*100);
            const hum = res.slot.main.humidity;
            const wind = Math.round(res.slot.wind.speed * 3.6);
            
            return `
            <div class="optimal-item" style="display:block;">
                <h4><i class="${icon}"></i> ${title}</h4>
                <div class="gh-card">
                    <div class="gh-header"><strong>Lúc ${time}</strong><span class="score-badge excellent">Lý tưởng</span></div>
                    <div class="gh-metrics">
                        <span><i class="fa-solid fa-temperature-half"></i> ${temp}°C</span>
                        <span><i class="fa-solid fa-droplet"></i> ${hum}%</span>
                        <span><i class="fa-solid fa-wind"></i> ${wind} km/h</span>
                        <span><i class="fa-solid fa-umbrella"></i> ${pop}% mưa</span>
                    </div>
                </div>
            </div>`;
        };

        wrap.innerHTML = `${formatResult(bestRun, "Chạy bộ", "fa-solid fa-person-running")}${formatResult(bestFb, "Đá banh", "fa-solid fa-futbol")}${formatResult(bestDine, "Hoạt động ngoài", "fa-solid fa-utensils")}`;
        const modal = document.getElementById("optimalModal");
        if(modal) modal.classList.add("active");
    },

    updateStaticText: () => {
        const t = I18N[STATE.currentLang];
        const ci = document.getElementById("cityInput");
        if(ci) ci.placeholder = t.searchPlaceholder;
        document.querySelectorAll("[data-i18n]").forEach(el => {
            if (t[el.dataset.i18n]) el.innerHTML = t[el.dataset.i18n].includes('<i') ? el.innerHTML : t[el.dataset.i18n];
        });
    },

    startCanvasRain: () => {
        const canvas = document.getElementById("weatherCanvas");
        if (!canvas) return;
        if (!canvasCtx) {
            canvasCtx = canvas.getContext("2d");
            const syncBounds = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
            syncBounds();
            window.addEventListener("resize", syncBounds);
        }
        if (isRainActive) return;
        isRainActive = true;
        rainParticles = [];
        for (let i = 0; i < 100; i++) rainParticles.push({ x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight, length: Math.random() * 16 + 8, speed: Math.random() * 8 + 10 });
        const render = () => {
            if (!isRainActive || !canvasCtx) return;
            canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
            canvasCtx.strokeStyle = "rgba(255, 255, 255, 0.4)";
            canvasCtx.lineWidth = 1; canvasCtx.lineCap = "round";
            rainParticles.forEach(p => {
                canvasCtx.beginPath(); canvasCtx.moveTo(p.x, p.y); canvasCtx.lineTo(p.x - 1, p.y + p.length); canvasCtx.stroke();
                p.y += p.speed; p.x -= 0.5;
                if (p.y > canvas.height) { p.y = -p.length; p.x = Math.random() * canvas.width; }
            });
            animFrameId = requestAnimationFrame(render);
        };
        render();
    },
    stopCanvasRain: () => {
        isRainActive = false;
        if (animFrameId) cancelAnimationFrame(animFrameId);
        if (canvasCtx) canvasCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
};

const API = {
    fetchData: async (lat, lon, name = null) => {
        try {
            // Sửa logic hiển thị sai tên "Vị trí hiện tại"
            const locVariants = [I18N.vi.currentLoc, I18N.en.currentLoc, I18N.zh.currentLoc];
            if (name && locVariants.includes(name)) {
                name = I18N[STATE.currentLang].currentLoc;
            } else if (!name && locVariants.includes(STATE.name)) {
                name = I18N[STATE.currentLang].currentLoc;
            }

            const langCode = STATE.currentLang === 'zh' ? 'zh_cn' : STATE.currentLang;
            const endpoints = [
                fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=${langCode}&appid=${CONFIG.apiKey}`),
                fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&lang=${langCode}&appid=${CONFIG.apiKey}`),
                fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${CONFIG.apiKey}`)
            ];

            const [wRes, fRes, aRes] = await Promise.all(endpoints);
            if (!wRes.ok || !fRes.ok) throw new Error("API Error");

            const weather = await wRes.json();
            const forecast = await fRes.json();
            const aqi = aRes.ok ? await aRes.json() : null;

            STATE.lat = lat; STATE.lon = lon;
            STATE.name = name || weather.name;
            STATE.weatherDataStore = { weather, forecast, aqi };

            localStorage.setItem(CONFIG.storageKey, JSON.stringify({ lat, lon, name: STATE.name }));
            UI.saveSearchHistory(STATE.name);
            UI.renderAll(STATE.weatherDataStore, STATE.name);
        } catch (err) { console.error(err); }
    },
    searchSuggestionsQuick: (query) => {
        fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=1&appid=${CONFIG.apiKey}`)
            .then(res => res.json()).then(data => { if(data.length > 0) API.fetchData(data[0].lat, data[0].lon, data[0].name); });
    },
    searchSuggestions: async (query) => {
        const ul = document.getElementById("autocompleteList");
        if (!query || query.length < 2) return ul && ul.classList.remove("active");
        try {
            const res = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=5&appid=${CONFIG.apiKey}`);
            const data = await res.json();
            ul.innerHTML = "";
            if (data.length === 0) return ul.classList.remove("active");
            data.forEach(item => {
                const li = document.createElement("li");
                li.className = "autocomplete-item";
                li.innerHTML = `<strong>${item.name}</strong><span>${item.state ? ', '+item.state : ''}, ${item.country}</span>`;
                li.addEventListener("click", () => {
                    API.fetchData(item.lat, item.lon, `${item.name}, ${item.country}`);
                    ul.classList.remove("active");
                    document.getElementById("cityInput").value = "";
                });
                ul.appendChild(li);
            });
            ul.classList.add("active");
        } catch (err) { console.error(err); }
    }
};

const App = {
    init: () => {
        AudioController.init();
        App.bindEvents();
        setInterval(UI.updateClockTick, 1000);
        setInterval(UI.updateThemeAndGreeting, 60000); 

        const saved = localStorage.getItem(CONFIG.storageKey);
        if (saved) {
            try { const p = JSON.parse(saved); API.fetchData(p.lat, p.lon, p.name); } 
            catch (e) { API.fetchData(CONFIG.defaultCity.lat, CONFIG.defaultCity.lon, CONFIG.defaultCity.name); }
        } else {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    pos => API.fetchData(pos.coords.latitude, pos.coords.longitude, I18N[STATE.currentLang].currentLoc),
                    () => API.fetchData(CONFIG.defaultCity.lat, CONFIG.defaultCity.lon, CONFIG.defaultCity.name),
                    { enableHighAccuracy: true, timeout: 5000 }
                );
            } else API.fetchData(CONFIG.defaultCity.lat, CONFIG.defaultCity.lon, CONFIG.defaultCity.name);
        }
    },

    bindEvents: () => {
        const ci = document.getElementById("cityInput");
        if(ci) ci.addEventListener("input", (e) => {
            clearTimeout(autocompleteTimeout);
            autocompleteTimeout = setTimeout(() => API.searchSuggestions(e.target.value.trim()), 400);
        });

        document.addEventListener("click", (e) => {
            if (!e.target.closest(".search-container")) {
                const ul = document.getElementById("autocompleteList");
                if(ul) ul.classList.remove("active");
            }
            
            const metricCard = e.target.closest(".metric-box");
            if (metricCard && metricCard.dataset.metric) UI.handleMetricCardClick(metricCard.dataset.metric);

            const hourlyItem = e.target.closest(".hourly-item");
            if (hourlyItem && hourlyItem.dataset.time) {
                const data = STATE.hourlyCache[hourlyItem.dataset.time];
                if (data) UI.openDetailModal(data);
            }

            const forecastItem = e.target.closest(".forecast-item");
            if (forecastItem) {
                const data = STATE.forecastCache[forecastItem.dataset.date];
                if (data) UI.openDetailModal(data);
            }
            
            if (e.target.closest(".modal-close") || e.target.classList.contains("modal-scrim")) {
                const activeModal = e.target.closest(".app-modal");
                if(activeModal) activeModal.classList.remove("active");
            }
            
            const cityPill = e.target.closest(".city-pill");
            if (cityPill) {
                if (cityPill.dataset.type === "current" && navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(pos => API.fetchData(pos.coords.latitude, pos.coords.longitude, I18N[STATE.currentLang].currentLoc));
                } else if (cityPill.dataset.lat) {
                    API.fetchData(cityPill.dataset.lat, cityPill.dataset.lon, cityPill.dataset.label);
                }
            }
        });

        document.querySelectorAll(".lang-btn").forEach(btn => {
            btn.addEventListener("click", function(e) {
                e.preventDefault();
                document.querySelectorAll(".lang-btn").forEach(b => b.classList.remove("active"));
                this.classList.add("active");
                STATE.currentLang = this.dataset.lang;
                UI.updateStaticText();
                if (STATE.lat && STATE.lon) API.fetchData(STATE.lat, STATE.lon, STATE.name);
            });
        });

        const audioBtn = document.getElementById("audioToggleBtn");
        if(audioBtn) {
            audioBtn.addEventListener("click", (e) => {
                e.preventDefault();
                AudioController.toggle();
            });
        }

        const optimalBtn = document.getElementById("optimalTimeBtn");
        if(optimalBtn) {
            optimalBtn.addEventListener("click", (e) => {
                e.preventDefault();
                UI.openGoldenHours();
            });
        }
    }
};

document.addEventListener("DOMContentLoaded", App.init);