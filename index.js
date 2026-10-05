const CONFIG = {
    apiKey: "5d0440c6a96719587d42efc9382e6105", 
    storageKey: "skycast_saved_city",
    refreshInterval: 10 * 60 * 1000, 
    defaultCity: { lat: 10.8231, lon: 106.6297, name: "TP. Hồ Chí Minh" }
};

const STATE = {
    lat: null, lon: null, name: "",
    timezoneOffset: 25200, currentCondition: "", trueCondition: "", 
    currentHour: 12, currentLang: "vi", lastUpdateTime: Date.now(),
    clockTimer: null, refreshTimer: null, weatherDataStore: null,
    isAudioPlaying: false, currentAudioKey: null,
    hourlyChartInstance: null, miniChartInstance: null, forecastCache: {}
};

let canvasCtx = null, rainParticles = [], isRainActive = false, animFrameId = null, lightningAlpha = 0;
let autocompleteTimeout;

const I18N = {
    vi: {
        searchPlaceholder: "Tìm thành phố...", currentLoc: "Vị trí hiện tại", humidity: "Độ ẩm",
        windSpeed: "Tốc độ gió", rainVol: "Mưa (1h)", rainPopLabel: "khả năng mưa",
        hourlyChartTitle: "Diễn biến nhiệt độ & Khả năng mưa", aqiTitle: "Không khí (AQI)", sunTitle: "Mặt trời",
        forecast5Days: "Dự báo 5 ngày tới", footerText: "Dữ liệu API từ OpenWeather",
        uvIndex: "Tia UV", goldSlotTitle: "Khung Giờ Vàng", radarTitle: "Live Radar",
        days: ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']
    },
    en: {
        searchPlaceholder: "Search city...", currentLoc: "Current Location", humidity: "Humidity",
        windSpeed: "Wind", rainVol: "Rain (1h)", rainPopLabel: "chance of rain",
        hourlyChartTitle: "Temperature & Rain 24h", aqiTitle: "Air Quality (AQI)", sunTitle: "Sun Schedule",
        forecast5Days: "5-Day Forecast", footerText: "Data from OpenWeather",
        uvIndex: "UV Index", goldSlotTitle: "Golden Hours", radarTitle: "Live Radar",
        days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    },
    zh: {
        searchPlaceholder: "搜索城市...", currentLoc: "当前位置", humidity: "湿度",
        windSpeed: "风速", rainVol: "降雨量 (1小时)", rainPopLabel: "降雨概率",
        hourlyChartTitle: "24小时温度与降雨趋势", aqiTitle: "空气质量 (AQI)", sunTitle: "日照时间",
        forecast5Days: "未来5天预报", footerText: "数据来自 OpenWeather",
        uvIndex: "紫外线指数", goldSlotTitle: "黄金时段", radarTitle: "雷达",
        days: ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
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
    calculateUV: (hour, condition, clouds) => {
        if (hour < 6 || hour > 18) return { index: 0 };
        if (condition.includes("rain") || condition.includes("storm")) return { index: 1 };
        if (hour >= 11 && hour <= 14) return clouds > 75 ? { index: 5 } : { index: 11 };
        return { index: 7 };
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
        if (!STATE.currentAudioKey) AudioController.sync(STATE.trueCondition, STATE.currentHour);
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
        STATE.timezoneOffset = weather.timezone || 0;
        STATE.currentCondition = weather.weather[0].main.toLowerCase();
        STATE.trueCondition = WeatherLogic.getTrueCondition(weather);

        const cityNameDisplay = document.getElementById("cityNameDisplay");
        if(cityNameDisplay) cityNameDisplay.textContent = displayName || weather.name;
        
        UI.updateClockTick();
        UI.updateTimestamp();

        const tempValue = document.getElementById("tempValue");
        if(tempValue) tempValue.textContent = Math.round(weather.main.temp);
        const weatherDesc = document.getElementById("weatherDesc");
        if(weatherDesc) weatherDesc.textContent = weather.weather[0].description;
        
        let pop = forecast.list.length > 0 ? Math.round((forecast.list[0].pop || 0) * 100) : 0;
        const clouds = weather.clouds ? weather.clouds.all : 0;
        const rainPopVal = document.getElementById("rainPopVal");
        
        if (pop === 0 && clouds >= 85) {
            pop = Math.floor(Math.random() * 11) + 15; 
            if(rainPopVal) rainPopVal.textContent = `~${pop}%`;
        } else {
            if(rainPopVal) rainPopVal.textContent = `${pop}%`;
        }

        const liveBadge = document.getElementById("liveStatusBadge");
        if(liveBadge) {
            const isRain = STATE.trueCondition.includes("rain") || STATE.trueCondition.includes("drizzle");
            liveBadge.className = `live-status-badge ${isRain ? 'rain' : 'sun'}`;
            liveBadge.innerHTML = isRain ? `<i class="fa-solid fa-cloud-showers-heavy"></i> Đang có mưa` : `<i class="fa-solid fa-sun"></i> Không mưa`;
        }

        const humidityVal = document.getElementById("humidityVal");
        if(humidityVal) humidityVal.textContent = `${weather.main.humidity}%`;
        const windVal = document.getElementById("windVal");
        if(windVal) windVal.textContent = `${Math.round(weather.wind.speed * 3.6)} km/h`;
        const rainVolVal = document.getElementById("rainVolVal");
        if(rainVolVal) rainVolVal.textContent = `${weather.rain ? (weather.rain["1h"] || 0) : 0} mm`;
        const uv = WeatherLogic.calculateUV(STATE.currentHour, STATE.trueCondition, clouds);
        const uvIndexVal = document.getElementById("uvIndexVal");
        if(uvIndexVal) uvIndexVal.textContent = uv.index;

        const sunriseTime = document.getElementById("sunriseTime");
        if(sunriseTime) sunriseTime.textContent = UI.formatHour(weather.sys.sunrise);
        const sunsetTime = document.getElementById("sunsetTime");
        if(sunsetTime) sunsetTime.textContent = UI.formatHour(weather.sys.sunset);

        UI.renderAQI(aqi);
        UI.renderChart(forecast.list);
        UI.render5Days(forecast.list);
        
        const windyIframe = document.getElementById("windyRadar");
        if (windyIframe) {
            windyIframe.src = `https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=%C2%B0C&metricWind=km/h&zoom=10&overlay=radar&product=radar&level=surface&lat=${STATE.lat}&lon=${STATE.lon}&detailLat=${STATE.lat}&detailLon=${STATE.lon}&marker=true`;
        }
        
        AudioController.sync(STATE.trueCondition, STATE.currentHour);
    },

    updateClockTick: () => {
        const now = new Date();
        const cityDate = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + (STATE.timezoneOffset * 1000));
        const hours = cityDate.getHours();
        const minutes = cityDate.getMinutes();
        const seconds = cityDate.getSeconds();
        STATE.currentHour = hours;

        // Cập nhật đồng hồ số (có giây)
        const digitalTime = document.getElementById("digitalTime");
        if(digitalTime) digitalTime.textContent = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

        // Cập nhật đồng hồ kim
        const hourHand = document.getElementById('hourHand');
        const minuteHand = document.getElementById('minuteHand');
        const secondHand = document.getElementById('secondHand');
        
        if (hourHand && minuteHand && secondHand) {
            const secondDeg = (seconds / 60) * 360;
            const minuteDeg = ((minutes + seconds / 60) / 60) * 360;
            const hourDeg = ((hours % 12 + minutes / 60) / 12) * 360;
            
            secondHand.style.transform = `rotate(${secondDeg}deg)`;
            minuteHand.style.transform = `rotate(${minuteDeg}deg)`;
            hourHand.style.transform = `rotate(${hourDeg}deg)`;
        }

        const body = document.getElementById("appBody");
        if(body) {
            body.className = "";
            if (STATE.trueCondition.includes("rain")) {
                body.classList.add("theme-rain");
                UI.startCanvasRain();
            } else {
                UI.stopCanvasRain();
                if (hours >= 6 && hours < 17) body.classList.add("theme-day");
                else if (hours >= 17 && hours < 18) body.classList.add("theme-sunset");
                else if (hours >= 18 && hours <= 23) body.classList.add("theme-evening");
                else body.classList.add("theme-night");
            }
        }
    },

    updateTimestamp: () => {
        const diffMins = Math.floor((Date.now() - STATE.lastUpdateTime) / 60000);
        let txt = "";
        if (STATE.currentLang === 'en') txt = diffMins === 0 ? "Just updated" : `Updated ${diffMins} min ago`;
        else if (STATE.currentLang === 'zh') txt = diffMins === 0 ? "刚刚更新" : `${diffMins} 分钟前更新`;
        else txt = diffMins === 0 ? "Vừa cập nhật" : `Cập nhật ${diffMins} phút trước`;
        const lbl = document.getElementById("lastUpdateLabel");
        if(lbl) lbl.textContent = txt;
    },

    formatHour: (timestamp) => {
        if (!timestamp) return "--:--";
        const d = new Date((timestamp + STATE.timezoneOffset) * 1000);
        return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
    },

    renderAQI: (aqiData) => {
        const badge = document.getElementById("aqiBadge");
        const desc = document.getElementById("aqiValDesc");
        if(!badge || !desc) return;
        if (!aqiData || !aqiData.list || aqiData.list.length === 0) {
            badge.textContent = "--"; return;
        }
        const val = aqiData.list[0].main.aqi;
        const configs = {
            1: { t: 'Rất tốt', c: '', d: 'Không khí trong lành' },
            2: { t: 'Khá', c: 'fair', d: 'Chất lượng chấp nhận được' },
            3: { t: 'Trung bình', c: 'moderate', d: 'Hạn chế ra ngoài lâu' },
            4: { t: 'Kém', c: 'poor', d: 'Không khí ô nhiễm' },
            5: { t: 'Nguy hại', c: 'poor', d: 'Mức độ ô nhiễm cao' }
        };
        badge.textContent = configs[val].t;
        badge.className = `aqi-badge-pill ${configs[val].c}`;
        desc.textContent = configs[val].d;
    },

    renderChart: (forecastList) => {
        const ctx = document.getElementById('hourlyChart');
        if(!ctx) return;
        const next24h = forecastList.slice(0, 8); 
        const labels = next24h.map(s => UI.formatHour(s.dt));
        const temps = next24h.map(s => Math.round(s.main.temp));
        const pops = next24h.map(s => Math.round((s.pop || 0) * 100));

        if (STATE.hourlyChartInstance) STATE.hourlyChartInstance.destroy();
        STATE.hourlyChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Nhiệt độ (°C)', data: temps, borderColor: '#facc15', backgroundColor: 'rgba(250, 204, 21, 0.1)', borderWidth: 3, tension: 0.4, fill: true, yAxisID: 'y' },
                    { label: 'Khả năng mưa (%)', data: pops, type: 'bar', backgroundColor: 'rgba(56, 189, 248, 0.4)', borderRadius: 4, yAxisID: 'y1' }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { family: "'JetBrains Mono', monospace" } } },
                    y: { display: false, min: Math.min(...temps) - 5, max: Math.max(...temps) + 5 },
                    y1: { display: false, min: 0, max: 100 }
                }
            }
        });
    },

    render5Days: (list) => {
        const wrap = document.getElementById("forecastList");
        if(!wrap) return;
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
        keys.forEach(k => {
            grouped[k].forEach(s => {
                if(s.main.temp_min < globalMin) globalMin = s.main.temp_min;
                if(s.main.temp_max > globalMax) globalMax = s.main.temp_max;
            });
        });

        keys.forEach(k => {
            const slots = grouped[k];
            const mid = slots.find(s => s.dt_txt.includes("12:00:00")) || slots[Math.floor(slots.length/2)];
            const dObj = new Date(k + "T00:00:00");
            
            let maxPop = 0, totalRain = 0, dayMin = 999, dayMax = -999;
            
            slots.forEach(s => {
                maxPop = Math.max(maxPop, Math.round((s.pop||0)*100));
                if(s.rain && s.rain["3h"]) totalRain += s.rain["3h"];
                if(s.main.temp_min < dayMin) dayMin = s.main.temp_min;
                if(s.main.temp_max > dayMax) dayMax = s.main.temp_max;
            });

            const range = globalMax - globalMin || 1; 
            const leftPercent = ((dayMin - globalMin) / range) * 100;
            const widthPercent = ((dayMax - dayMin) / range) * 100;

            STATE.forecastCache[k] = {
                title: `${dayNames[dObj.getDay()]}, ${k.split('-').reverse().join('/')}`,
                temp: Math.round(mid.main.temp), desc: mid.weather[0].description, icon: mid.weather[0].icon,
                humidity: mid.main.humidity, wind: Math.round(mid.wind.speed * 3.6),
                rainVol: totalRain.toFixed(1), pop: maxPop
            };

            const div = document.createElement("div");
            div.className = "forecast-item";
            div.dataset.date = k;
            
            const popHtml = maxPop > 0 ? `<span class="f-pop">${maxPop}%</span>` : `<span class="f-pop" style="opacity:0">0%</span>`;
            
            // DÙNG LẠI ICON CHUẨN CỦA OPENWEATHER ĐỂ KHÔNG BAO GIỜ LỖI
            const safeIconUrl = `https://openweathermap.org/img/wn/${mid.weather[0].icon}@2x.png`;

            div.innerHTML = `
                <div class="f-day">${dayNames[dObj.getDay()]}</div>
                <div class="f-icon-pop"><img src="${safeIconUrl}" alt="icon">${popHtml}</div>
                <div class="f-temp-min">${Math.round(dayMin)}°</div>
                <div class="f-temp-bar-container">
                    <div class="f-temp-bar" style="left: ${leftPercent}%; width: ${Math.max(widthPercent, 5)}%;"></div>
                </div>
                <div class="f-temp-max">${Math.round(dayMax)}°</div>
            `;
            wrap.appendChild(div);
        });
    },

    handleMetricCardClick: (metricType) => {
        if (!STATE.weatherDataStore) return;
        const { weather, forecast } = STATE.weatherDataStore;
        
        const modal = document.getElementById("infoModal");
        const tEl = document.getElementById("infoModalTitle");
        const bEl = document.getElementById("infoModalBody");
        const iconEl = document.getElementById("infoModalIcon");
        const pFill = document.getElementById("infoModalProgress");
        const chartBox = document.getElementById("miniChartBox");
        
        let title = "", advice = "", percent = 0, chartData = [], color = "";
        const next24h = forecast.list.slice(0, 8);
        const labels = next24h.map(s => UI.formatHour(s.dt));

        if (metricType === 'humidity') {
            const hum = weather.main.humidity;
            title = "Độ ẩm"; percent = hum; color = "#38bdf8";
            iconEl.innerHTML = '<i class="fa-solid fa-droplet"></i>';
            chartData = next24h.map(s => s.main.humidity);
            
            if (hum < 40) advice = `Mức ${hum}%. Hơi khô hanh. Bạn nên bôi chút dưỡng ẩm và uống đủ nước nhé.`;
            else if (hum <= 70) advice = `Mức ${hum}%. Cực kỳ lý tưởng, mát mẻ và dễ chịu cho da.`;
            else advice = `Mức ${hum}%. Hơi oi bức và rít da. Ưu tiên đồ cotton cho thoáng mát.`;
        } else if (metricType === 'wind') {
            const wind = Math.round(weather.wind.speed * 3.6);
            title = "Tốc độ Gió"; percent = Math.min((wind / 50) * 100, 100); color = "#34d399";
            iconEl.innerHTML = '<i class="fa-solid fa-wind"></i>';
            chartData = next24h.map(s => Math.round(s.wind.speed * 3.6));

            if (wind < 10) advice = `${wind} km/h. Gió rất nhẹ, không gian có vẻ tĩnh lặng.`;
            else if (wind <= 25) advice = `${wind} km/h. Hiu hiu mát mẻ, mở cửa sổ đón gió thì tuyệt vời.`;
            else advice = `${wind} km/h. Gió khá mạnh, chú ý tay lái nếu đang đi trên đường.`;
        } else if (metricType === 'rain_volume') {
            const pop = forecast.list.length > 0 ? Math.round((forecast.list[0].pop || 0) * 100) : 0;
            title = "Khả năng mưa"; percent = pop; color = "#a78bfa";
            iconEl.innerHTML = '<i class="fa-solid fa-cloud-rain"></i>';
            chartData = next24h.map(s => Math.round((s.pop || 0) * 100));

            if (pop === 0) advice = `Xác suất 0%. Tạm thời an toàn, bạn cứ thoải mái ra ngoài.`;
            else if (pop < 50) advice = `Xác suất ${pop}%. Có thể mưa nhỏ, cẩn thận vẫn hơn.`;
            else advice = `Xác suất ${pop}%. Chắc chắn mưa, nhớ mang ô hoặc áo mưa nhé!`;
        } else if (metricType === 'uv') {
            const uv = WeatherLogic.calculateUV(STATE.currentHour, STATE.trueCondition, weather.clouds ? weather.clouds.all : 0);
            title = "Chỉ số UV"; percent = Math.min((uv.index / 11) * 100, 100); color = "#facc15";
            iconEl.innerHTML = '<i class="fa-solid fa-sun"></i>';
            
            if (uv.index < 3) advice = `UV mức ${uv.index}. Rất an toàn, không lo tổn hại da.`;
            else if (uv.index <= 7) advice = `UV mức ${uv.index} (Trung bình). Nên bôi kem chống nắng nếu ra ngoài lâu.`;
            else advice = `UV mức ${uv.index}! Cảnh báo cực gắt. Hạn chế ra đường lúc này.`;
        }

        if(tEl) tEl.textContent = title;
        if(bEl) bEl.innerHTML = advice;
        
        if(pFill) {
            pFill.style.width = "0%";
            pFill.style.backgroundColor = color;
            setTimeout(() => { pFill.style.width = `${percent}%`; }, 100);
        }

        if (metricType === 'uv') {
            if(chartBox) chartBox.style.display = "none";
        } else {
            if(chartBox) chartBox.style.display = "block";
            const ctx = document.getElementById('miniMetricChart');
            if (STATE.miniChartInstance) STATE.miniChartInstance.destroy();
            if(ctx) {
                STATE.miniChartInstance = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [{
                            data: chartData, borderColor: color, backgroundColor: color + "33", 
                            borderWidth: 2, tension: 0.4, fill: true, pointRadius: 2
                        }]
                    },
                    options: {
                        responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
                        scales: { x: { display: true, grid: { display: false }, ticks: { font: { size: 10 } } }, y: { display: false, min: 0 } }
                    }
                });
            }
        }
        if(modal) modal.classList.add("active");
    },

    openDetailModal: (data) => {
        document.getElementById("dayModalTitle").textContent = data.title;
        document.getElementById("dayModalDesc").innerHTML = `${data.temp}°C &nbsp;•&nbsp; ${data.desc}`;
        // Load lại ảnh OpenWeather chuẩn cho Modal
        document.getElementById("dayModalIcon").src = `https://openweathermap.org/img/wn/${data.icon}@2x.png`;
        document.getElementById("dayModalHumidity").textContent = `${data.humidity}%`;
        document.getElementById("dayModalWind").textContent = `${data.wind} km/h`;
        document.getElementById("dayModalRainVol").textContent = `${data.rainVol} mm`;
        document.getElementById("dayModalPop").textContent = `${data.pop}%`;
        const modal = document.getElementById("dayDetailModal");
        if(modal) modal.classList.add("active");
    },

    openGoldenHours: () => {
        const wrap = document.getElementById("optimalResultsList");
        if(!wrap) return;
        wrap.innerHTML = "";
        
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
                return `
                <div class="optimal-item" style="display:block;">
                    <h4><i class="${icon}"></i> ${title}</h4>
                    <div class="gh-empty">Thời tiết hiện không thuận lợi. Nên hoãn lại nhé.</div>
                </div>`;
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
                    <div class="gh-header">
                        <strong>Lúc ${time}</strong>
                        <span class="score-badge ${res.score >= 85 ? 'excellent' : 'good'}">Lý tưởng</span>
                    </div>
                    <div class="gh-metrics">
                        <span><i class="fa-solid fa-temperature-half"></i> ${temp}°C</span>
                        <span><i class="fa-solid fa-droplet"></i> ${hum}%</span>
                        <span><i class="fa-solid fa-wind"></i> ${wind} km/h</span>
                        <span><i class="fa-solid fa-umbrella"></i> ${pop}% mưa</span>
                    </div>
                </div>
            </div>`;
        };

        wrap.innerHTML = `
            ${formatResult(bestRun, "Chạy bộ", "fa-solid fa-person-running")}
            ${formatResult(bestFb, "Đá banh", "fa-solid fa-futbol")}
            ${formatResult(bestDine, "Hoạt động ngoài trời", "fa-solid fa-utensils")}
        `;
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
        for (let i = 0; i < Math.min(100, window.innerWidth / 12); i++) {
            rainParticles.push({ x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight, length: Math.random() * 16 + 8, speed: Math.random() * 8 + 10 });
        }
        const render = () => {
            if (!isRainActive || !canvasCtx) return;
            canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
            if (Math.random() < 0.015) lightningAlpha = 0.8;
            if (lightningAlpha > 0) {
                canvasCtx.fillStyle = `rgba(255, 255, 255, ${lightningAlpha})`;
                canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
                lightningAlpha -= 0.1;
            }
            canvasCtx.strokeStyle = "rgba(148, 163, 184, 0.4)";
            canvasCtx.lineWidth = 1;
            canvasCtx.lineCap = "round";
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
        const canvas = document.getElementById("weatherCanvas");
        if (canvasCtx && canvas) canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    }
};

const API = {
    fetchData: async (lat, lon, name = null) => {
        try {
            const langCode = STATE.currentLang === 'zh' ? 'zh_cn' : STATE.currentLang;
            const endpoints = [
                fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=${langCode}&appid=${CONFIG.apiKey}`),
                fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&lang=${langCode}&appid=${CONFIG.apiKey}`),
                fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${CONFIG.apiKey}`)
            ];

            const [wRes, fRes, aRes] = await Promise.all(endpoints);
            if (!wRes.ok || !fRes.ok) throw new Error("API Fetch Error");

            const weather = await wRes.json();
            const forecast = await fRes.json();
            const aqi = aRes.ok ? await aRes.json() : null;

            STATE.lat = lat; STATE.lon = lon;
            STATE.name = name || weather.name;
            STATE.lastUpdateTime = Date.now();
            STATE.weatherDataStore = { weather, forecast, aqi };

            localStorage.setItem(CONFIG.storageKey, JSON.stringify({ lat, lon, name: STATE.name }));
            UI.renderAll(STATE.weatherDataStore, STATE.name);
        } catch (err) { 
            console.error(err);
            const cityNameDisplay = document.getElementById("cityNameDisplay");
            if(cityNameDisplay) cityNameDisplay.textContent = "Lỗi kết nối mạng";
        }
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
        
        STATE.clockTimer = setInterval(UI.updateClockTick, 1000);
        setInterval(UI.updateTimestamp, 60000); 
        STATE.refreshTimer = setInterval(() => { if (STATE.lat && STATE.lon) API.fetchData(STATE.lat, STATE.lon, STATE.name); }, CONFIG.refreshInterval);
        
        UI.updateStaticText();

        const saved = localStorage.getItem(CONFIG.storageKey);
        if (saved) {
            try {
                const p = JSON.parse(saved);
                API.fetchData(p.lat, p.lon, p.name);
            } catch (e) { API.fetchData(CONFIG.defaultCity.lat, CONFIG.defaultCity.lon, CONFIG.defaultCity.name); }
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
            const metricCard = e.target.closest(".metric-card");
            if (metricCard) UI.handleMetricCardClick(metricCard.dataset.metric);

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
            btn.addEventListener("click", function() {
                document.querySelectorAll(".lang-btn").forEach(b => b.classList.remove("active"));
                this.classList.add("active");
                STATE.currentLang = this.dataset.lang;
                UI.updateStaticText();
                if (STATE.lat && STATE.lon) API.fetchData(STATE.lat, STATE.lon, STATE.name);
            });
        });

        const audioBtn = document.getElementById("audioToggleBtn");
        if(audioBtn) audioBtn.addEventListener("click", AudioController.toggle);

        const optimalBtn = document.getElementById("optimalTimeBtn");
        if(optimalBtn) optimalBtn.addEventListener("click", UI.openGoldenHours);
    }
};

document.addEventListener("DOMContentLoaded", App.init);