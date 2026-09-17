// ================= CẤU HÌNH API =================
const API_KEY = "5d0440c6a96719587d42efc9382e6105";
let currentCityTimezoneOffset = 0;

// Google CDN Audio (Hoạt động ổn định, không bị chặn CORS)
const AUDIO_SOURCES = {
    rain: "https://actions.google.com/sounds/v1/weather/light_rain.ogg",
    ambient: "https://actions.google.com/sounds/v1/ambiences/spring_day_forest.ogg"
};

// Lưu trữ dữ liệu 5 ngày để khi click vào ngày nào sẽ đọc chi tiết ngày đó
let forecastDaysStorage = {};

// ================= DOM ELEMENTS =================
const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const weatherIcon = document.getElementById("weatherIcon");
const tempValue = document.getElementById("tempValue");
const weatherDesc = document.getElementById("weatherDesc");
const rainNotice = document.getElementById("rainNotice");
const humidityVal = document.getElementById("humidityVal");
const windVal = document.getElementById("windVal");
const rainVolVal = document.getElementById("rainVolVal");
const rainPopVal = document.getElementById("rainPopVal");
const forecastList = document.getElementById("forecastList");

const audioToggleBtn = document.getElementById("audioToggleBtn");
const audioIcon = document.getElementById("audioIcon");
const ambientAudio = document.getElementById("ambientAudio");

let isAudioPlaying = false;

// ================= KHỞI TẠO ỨNG DỤNG =================
document.addEventListener("DOMContentLoaded", () => {
    // Tự động nhận diện GPS hoặc mặc định nạp TP.HCM
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude),
            () => fetchWeatherByCoords(10.8231, 106.6297) // Fallback TP.HCM
        );
    } else {
        fetchWeatherByCoords(10.8231, 106.6297);
    }

    // Sự kiện tìm kiếm
    if (searchBtn) searchBtn.addEventListener("click", handleSearch);
    if (cityInput) {
        cityInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") handleSearch();
        });
    }

    // Sự kiện âm thanh
    if (audioToggleBtn) audioToggleBtn.addEventListener("click", toggleAmbientAudio);
});

// ================= XỬ LÝ TÌM KIẾM ĐỊA ĐIỂM =================
async function handleSearch() {
    const query = cityInput.value.trim();
    if (!query) return;

    try {
        // Dùng Geocoding API để dịch địa danh Việt Nam (kể cả quận/huyện)
        const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=1&appid=${API_KEY}`;
        const geoRes = await fetch(geoUrl);
        const geoData = await geoRes.json();

        if (geoData && geoData.length > 0) {
            const { lat, lon } = geoData[0];
            await fetchWeatherByCoords(lat, lon);
        } else {
            await fetchWeatherByCityName(query);
        }
    } catch (err) {
        console.error("Lỗi tìm kiếm:", err);
    }
}

// ================= GỌI API THEO TỌA ĐỘ =================
async function fetchWeatherByCoords(lat, lon) {
    try {
        const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=vi&appid=${API_KEY}`;
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&lang=vi&appid=${API_KEY}`;

        const [weatherRes, forecastRes] = await Promise.all([
            fetch(weatherUrl),
            fetch(forecastUrl)
        ]);

        if (!weatherRes.ok || !forecastRes.ok) return;

        const weatherData = await weatherRes.json();
        const forecastData = await forecastRes.json();

        displayWeatherData(weatherData, forecastData);
    } catch (error) {
        console.error("Lỗi nạp thời tiết:", error);
    }
}

// ================= GỌI API THEO TÊN (DỰ PHÒNG) =================
async function fetchWeatherByCityName(name) {
    try {
        const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(name)}&units=metric&lang=vi&appid=${API_KEY}`;
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(name)}&units=metric&lang=vi&appid=${API_KEY}`;

        const [weatherRes, forecastRes] = await Promise.all([
            fetch(weatherUrl),
            fetch(forecastUrl)
        ]);

        if (!weatherRes.ok || !forecastRes.ok) {
            alert("Không tìm thấy địa điểm này. Vui lòng kiểm tra lại chính tả!");
            return;
        }

        const weatherData = await weatherRes.json();
        const forecastData = await forecastRes.json();

        displayWeatherData(weatherData, forecastData);
    } catch (error) {
        console.error("Lỗi fetchWeatherByCityName:", error);
    }
}

// ================= CẬP NHẬT GIAO DIỆN CHÍNH =================
function displayWeatherData(weather, forecast) {
    if (cityInput) cityInput.value = weather.name.toUpperCase();
    currentCityTimezoneOffset = weather.timezone || 0;

    // Nhiệt độ & trạng thái
    if (tempValue) tempValue.textContent = Math.round(weather.main.temp);
    if (weatherDesc) weatherDesc.textContent = weather.weather[0].description;
    if (weatherIcon) {
        weatherIcon.src = `https://openweathermap.org/img/wn/${weather.weather[0].icon}@4x.png`;
    }

    // 4 thông số hiện tại
    if (humidityVal) humidityVal.textContent = `${weather.main.humidity}%`;
    if (windVal) windVal.textContent = `${Math.round(weather.wind.speed * 3.6)} km/h`;

    const rain1h = (weather.rain && weather.rain["1h"]) ? weather.rain["1h"] : 0;
    if (rainVolVal) rainVolVal.textContent = `${rain1h} mm`;

    const nextPop = (forecast.list && forecast.list.length > 0) ? Math.round((forecast.list[0].pop || 0) * 100) : 0;
    if (rainPopVal) rainPopVal.textContent = `${nextPop}%`;

    // Giờ mưa & dự báo 5 ngày
    if (forecast.list) {
        processRainForecast(forecast.list);
        renderNext5Days(forecast.list);
    }

    // Âm thanh môi trường
    if (weather.weather && weather.weather[0]) {
        updateAudioTrack(weather.weather[0].main.toLowerCase());
    }
}

// ================= TÍNH GIỜ CÓ MƯA =================
function processRainForecast(forecastItems) {
    if (!rainNotice) return;

    const rainItem = forecastItems.slice(0, 8).find(item => (item.pop && item.pop >= 0.3) || (item.rain && item.rain["3h"] > 0));

    if (rainItem) {
        const targetUtc = (rainItem.dt + currentCityTimezoneOffset) * 1000;
        const targetDate = new Date(targetUtc);
        const hours = String(targetDate.getUTCHours()).padStart(2, "0");
        const minutes = String(targetDate.getUTCMinutes()).padStart(2, "0");

        rainNotice.textContent = `Dự Báo Có Mưa Lúc ~${hours}:${minutes} (Giờ Địa Phương)`;
    } else {
        rainNotice.textContent = "Hôm nay không có mưa";
    }
}

// ================= RENDER DỰ BÁO 5 NGÀY ĐẦY ĐỦ THỨ & NGÀY THÁNG NĂM =================
function getVietnameseDay(date) {
    const days = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    return days[date.getDay()];
}

function renderNext5Days(forecastItems) {
    if (!forecastList) return;
    forecastList.innerHTML = "";
    forecastDaysStorage = {}; // Reset bộ nhớ chi tiết ngày

    // Xác định ngày hôm nay theo múi giờ địa phương để bỏ qua
    const nowUtc = (Math.floor(Date.now() / 1000) + currentCityTimezoneOffset) * 1000;
    const todayStr = new Date(nowUtc).toISOString().split('T')[0];

    // Gom dữ liệu các mốc 3h theo từng ngày
    const daysMap = {};
    forecastItems.forEach(item => {
        const itemUtc = (item.dt + currentCityTimezoneOffset) * 1000;
        const dateStr = new Date(itemUtc).toISOString().split('T')[0];

        if (dateStr === todayStr) return; // Bỏ qua ngày hôm nay

        if (!daysMap[dateStr]) daysMap[dateStr] = [];
        daysMap[dateStr].push(item);
    });

    const next5DaysKeys = Object.keys(daysMap).slice(0, 5);

    next5DaysKeys.forEach(dateStr => {
        const entries = daysMap[dateStr];
        // Lấy mốc gần 12h trưa làm đại diện
        const midDay = entries.find(e => e.dt_txt && e.dt_txt.includes("12:00:00")) || entries[Math.floor(entries.length / 2)];

        // Tách năm, tháng, ngày chuẩn
        const [year, month, day] = dateStr.split('-');
        const formattedDate = `${day}/${month}/${year}`;

        const dateObj = new Date(dateStr + "T00:00:00");
        const dayName = getVietnameseDay(dateObj); // "Thứ 7", "Chủ Nhật", v.v.
        const fullDayTitle = `${dayName}, ${formattedDate}`; // "Thứ 7, 19/09/2026"

        // Tính các chỉ số trung bình / cực đại của ngày hôm đó
        const temp = Math.round(midDay.main.temp);
        const desc = midDay.weather[0].description;
        const iconCode = midDay.weather[0].icon;
        const humidity = midDay.main.humidity;
        const windSpeed = Math.round(midDay.wind.speed * 3.6);

        // Khả năng mưa cao nhất trong các mốc của ngày
        const maxPop = Math.round(Math.max(...entries.map(e => e.pop || 0)) * 100);
        // Tổng lượng mưa dự kiến trong ngày
        const totalRain = entries.reduce((acc, curr) => acc + ((curr.rain && curr.rain["3h"]) ? curr.rain["3h"] : 0), 0);

        // Lưu vào bộ nhớ theo key dateStr để khi click sẽ mở popup
        forecastDaysStorage[dateStr] = {
            title: fullDayTitle,
            temp: temp,
            desc: desc,
            icon: iconCode,
            humidity: humidity,
            wind: windSpeed,
            rainVol: totalRain.toFixed(2),
            pop: maxPop
        };

        // Tạo thẻ hàng hiển thị
        const row = document.createElement('div');
        row.className = 'forecast-row';
        row.setAttribute('onclick', `openDayDetailModal('${dateStr}')`);
        row.innerHTML = `
            <div class="forecast-date-col">
                <span class="forecast-row-day">${dayName}</span>
                <span class="forecast-row-subdate">${formattedDate}</span>
            </div>
            <img class="forecast-row-icon" src="https://openweathermap.org/img/wn/${iconCode}.png" alt="icon">
            <span class="forecast-row-desc">${desc}</span>
            <span class="forecast-row-temp">${temp}°C</span>
        `;
        forecastList.appendChild(row);
    });
}

// ================= MODAL XEM CHI TIẾT TỪNG NGÀY =================
function openDayDetailModal(dateKey) {
    const data = forecastDaysStorage[dateKey];
    if (!data) return;

    document.getElementById("dayModalTitle").textContent = data.title;
    document.getElementById("dayModalTemp").textContent = `${data.temp}°C`;
    document.getElementById("dayModalDesc").textContent = data.desc;
    document.getElementById("dayModalIcon").src = `https://openweathermap.org/img/wn/${data.icon}@2x.png`;

    document.getElementById("dayModalHumidity").textContent = `${data.humidity}%`;
    document.getElementById("dayModalWind").textContent = `${data.wind} km/h`;
    document.getElementById("dayModalRainVol").textContent = `${data.rainVol} mm`;
    document.getElementById("dayModalPop").textContent = `${data.pop}%`;

    document.getElementById("dayDetailModal").classList.add("active");
}

function closeDayDetailModal() {
    const modal = document.getElementById("dayDetailModal");
    if (modal) modal.classList.remove("active");
}

// ================= MODAL GIẢI THÍCH CHỈ SỐ =================
const modalInfoMap = {
    humidity: {
        title: "Độ Ẩm Không Khí",
        desc: "Tỷ lệ phần trăm hơi nước hiện có trong không khí so với mức bão hòa. Độ ẩm từ 40% - 60% mang lại cảm giác thoải mái nhất cho cơ thể."
    },
    wind: {
        title: "Tốc Độ Gió",
        desc: "Vận tốc di chuyển của luồng không khí được đo theo đơn vị km/h. Gió dưới 15 km/h là gió hiu hiu dễ chịu, trên 40 km/h là gió giật mạnh."
    },
    rain_volume: {
        title: "Lượng Mưa Trong 1 Giờ",
        desc: "Tổng chiều cao lượng nước mưa đo được trên một đơn vị diện tích trong vòng 1 giờ qua. Dưới 2 mm là mưa phùn nhẹ, trên 10 mm là mưa rào lớn."
    },
    rain_pop: {
        title: "Khả Năng Có Mưa",
        desc: "Xác suất xảy ra mưa tại khu vực trong vài giờ tới dựa trên mô hình vệ tinh khí tượng."
    }
};

function openMetricModal(metricKey) {
    const info = modalInfoMap[metricKey];
    if (!info) return;

    const modalTitle = document.getElementById("modalTitle");
    const modalBody = document.getElementById("modalBody");
    const metricModal = document.getElementById("metricModal");

    if (modalTitle) modalTitle.textContent = info.title;
    if (modalBody) modalBody.textContent = info.desc;
    if (metricModal) metricModal.classList.add("active");
}

function closeMetricModal() {
    const metricModal = document.getElementById("metricModal");
    if (metricModal) metricModal.classList.remove("active");
}

// ================= ÂM THANH MÔI TRƯỜNG =================
function updateAudioTrack(condition) {
    if (!ambientAudio) return;
    if (condition.includes("rain") || condition.includes("drizzle") || condition.includes("thunderstorm")) {
        ambientAudio.src = AUDIO_SOURCES.rain;
    } else {
        ambientAudio.src = AUDIO_SOURCES.ambient;
    }

    if (isAudioPlaying) {
        ambientAudio.play().catch(() => {});
    }
}

function toggleAmbientAudio() {
    if (!ambientAudio) return;
    if (!ambientAudio.src) ambientAudio.src = AUDIO_SOURCES.ambient;

    if (isAudioPlaying) {
        ambientAudio.pause();
        isAudioPlaying = false;
        if (audioIcon) audioIcon.className = "fa-solid fa-volume-xmark";
    } else {
        ambientAudio.play().then(() => {
            isAudioPlaying = true;
            if (audioIcon) audioIcon.className = "fa-solid fa-volume-high";
        }).catch(() => {
            console.log("Cần tương tác người dùng để phát âm thanh");
        });
    }
}