const container = document.querySelector('.container');
const search = document.querySelector('.search-box button');
const input = document.querySelector('.search-box input');
const weatherBox = document.querySelector('.weather-box');
const weatherDetails = document.querySelector('.weather-details');
const error404 = document.querySelector('.not-found');

const modal = document.getElementById('detailModal');
const modalTitle = document.getElementById('modalTitle');
const modalDesc = document.getElementById('modalDesc');
const closeModal = document.querySelector('.close-modal');
const soundBtn = document.getElementById('soundToggle');

const APIKey = '5d0440c6a96719587d42efc9382e6105';
let currentWeatherDetails = null;
let currentForecastDetails = null;

// ==================== QUẢN LÝ ÂM THANH GOOGLE CDN SIÊU ỔN ĐỊNH ====================
let isAudioPlaying = false;
const audioPlayer = new Audio();
audioPlayer.loop = true;

// Kho âm thanh chính thức từ Google Actions Sounds (không bao giờ bị lỗi 403)
const soundTracks = {
    rain: 'https://actions.google.com/sounds/v1/weather/light_rain.ogg',           // Tiếng mưa rơi dịu nhẹ
    nature: 'https://actions.google.com/sounds/v1/ambiences/spring_day_forest.ogg' // Tiếng chim hót & gió xuân trong lành
};

// Đổi bài hát theo thời tiết hiện tại
function updateAudioSource(weatherMain) {
    const isRaining = ['Rain', 'Drizzle', 'Thunderstorm'].includes(weatherMain);
    const targetUrl = isRaining ? soundTracks.rain : soundTracks.nature;

    if (audioPlayer.src !== targetUrl) {
        audioPlayer.src = targetUrl;
        if (isAudioPlaying) {
            audioPlayer.play().catch(() => {});
        }
    }
}

// Bắt sự kiện click bật/tắt nút loa
if (soundBtn) {
    soundBtn.addEventListener('click', () => {
        // Đảm bảo đã có nguồn nhạc
        if (!audioPlayer.src) {
            const currentMain = currentWeatherDetails ? currentWeatherDetails.weather[0].main : 'Clear';
            updateAudioSource(currentMain);
        }

        if (!isAudioPlaying) {
            audioPlayer.play().then(() => {
                isAudioPlaying = true;
                soundBtn.classList.add('playing');
                soundBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
            }).catch(e => {
                console.log('Lỗi phát âm thanh:', e);
            });
        } else {
            audioPlayer.pause();
            isAudioPlaying = false;
            soundBtn.classList.remove('playing');
            soundBtn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
        }
    });
}

// Tự động chọn chữ trong ô tìm kiếm khi click vào
input.addEventListener('focus', () => input.select());

// Tự động thu nhỏ cỡ chữ khi địa danh quá dài
function adjustInputFontSize(text) {
    if (!text) return;
    if (text.length > 20) {
        input.style.fontSize = '14px';
    } else if (text.length > 15) {
        input.style.fontSize = '16px';
    } else {
        input.style.fontSize = '18px';
    }
}

// Bật/tắt biểu tượng xoay tròn khi đang tìm kiếm
function setLoading(isLoading) {
    if (isLoading) {
        search.classList.remove('fa-magnifying-glass');
        search.classList.add('fa-spinner', 'fa-spin');
    } else {
        search.classList.remove('fa-spinner', 'fa-spin');
        search.classList.add('fa-magnifying-glass');
    }
}

// Cập nhật gradient màu nền theo thời tiết
function updateBackground(weatherMain) {
    document.body.className = '';
    switch (weatherMain) {
        case 'Clear':
            document.body.classList.add('clear-bg');
            break;
        case 'Clouds':
            document.body.classList.add('clouds-bg');
            break;
        case 'Rain':
        case 'Drizzle':
        case 'Thunderstorm':
            document.body.classList.add('rain-bg');
            break;
        case 'Snow':
            document.body.classList.add('snow-bg');
            break;
        case 'Haze':
        case 'Mist':
        case 'Fog':
            document.body.classList.add('mist-bg');
            break;
        default:
            document.body.style.background = '#0b131e';
    }
}

// Gọi API và hiển thị toàn bộ thời tiết
function getWeatherData(endpointWeather, endpointForecast) {
    setLoading(true);

    fetch(endpointWeather)
        .then(response => response.json())
        .then(json => {
            if (json.cod === '404' || json.cod === '400') {
                container.style.height = '400px';
                weatherBox.style.display = 'none';
                weatherDetails.style.display = 'none';
                error404.style.display = 'block';
                error404.classList.add('fadeIn');
                setLoading(false);
                return;
            }

            error404.style.display = 'none';
            error404.classList.remove('fadeIn');

            currentWeatherDetails = json;

            if (json.name) {
                input.value = json.name;
                adjustInputFontSize(json.name);
            }

            const weatherMain = json.weather[0].main;
            updateBackground(weatherMain);
            updateAudioSource(weatherMain);

            const image = document.querySelector('.weather-box img');
            const temperature = document.querySelector('.weather-box .temperature');
            const description = document.querySelector('.weather-box .description');
            const humidity = document.querySelector('.weather-details .humidity span');
            const wind = document.querySelector('.weather-details .wind span');
            const rain = document.querySelector('.weather-details .rain span');
            const rainChance = document.querySelector('.weather-details .rain-chance span');

            switch (weatherMain) {
                case 'Clear': image.src = 'images/clear.png'; break;
                case 'Rain': image.src = 'images/rain.png'; break;
                case 'Snow': image.src = 'images/snow.png'; break;
                case 'Clouds': image.src = 'images/cloud.png'; break;
                case 'Haze':
                case 'Mist': image.src = 'images/mist.png'; break;
                default: image.src = '';
            }

            temperature.innerHTML = `${parseInt(json.main.temp)}<span>°C</span>`;
            humidity.innerHTML = `${json.main.humidity}%`;
            wind.innerHTML = `${parseInt(json.wind.speed)}Km/h`;

            const rainVolume = json.rain && json.rain['1h'] ? json.rain['1h'] : 0;
            if (rain) rain.innerHTML = `${rainVolume} mm`;

            // Gọi API dự báo
            fetch(endpointForecast)
                .then(res => res.json())
                .then(forecastData => {
                    currentForecastDetails = forecastData;

                    if (forecastData.list && forecastData.list.length > 0) {
                        const currentPop = Math.round(forecastData.list[0].pop * 100);
                        if (rainChance) rainChance.innerHTML = `${currentPop}%`;

                        const timezoneOffset = forecastData.city.timezone || 0;
                        const nextRain = forecastData.list.find(item => item.pop >= 0.3 || (item.weather && item.weather[0].main === 'Rain'));

                        if (nextRain) {
                            const localDate = new Date((nextRain.dt + timezoneOffset) * 1000);
                            const hours = String(localDate.getUTCHours()).padStart(2, '0');
                            const minutes = String(localDate.getUTCMinutes()).padStart(2, '0');
                            const timeStr = `${hours}:${minutes}`;

                            description.innerHTML = `${json.weather[0].description} <br><span style="font-size: 14px; color: #facc15; font-weight: 600; display: inline-block; margin-top: 5px;">Dự Báo Có Mưa Lúc ~${timeStr} (Giờ Địa Phương)</span>`;
                        } else {
                            description.innerHTML = `${json.weather[0].description} <br><span style="font-size: 14px; color: #4ade80; font-weight: 600; display: inline-block; margin-top: 5px;">Trời Tạnh Ráo</span>`;
                        }
                    }
                })
                .catch(() => {
                    description.innerHTML = `${json.weather[0].description}`;
                })
                .finally(() => {
                    setLoading(false);
                });

            weatherBox.style.display = '';
            weatherDetails.style.display = '';
            weatherBox.classList.add('fadeIn');
            weatherDetails.classList.add('fadeIn');
            container.style.height = '670px';
        })
        .catch(() => {
            setLoading(false);
        });
}

// Xử lý tìm kiếm qua Geocoding API
function handleSearch() {
    const rawInput = input.value.trim();
    if (rawInput === '') return;

    adjustInputFontSize(rawInput);
    setLoading(true);

    let query = rawInput;
    if (!query.toLowerCase().includes('vn') && !query.toLowerCase().includes('vietnam')) {
        query += ', VN';
    }

    const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=1&appid=${APIKey}`;

    fetch(geoUrl)
        .then(res => res.json())
        .then(data => {
            if (!data || data.length === 0) {
                const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(rawInput)}&units=metric&lang=vi&appid=${APIKey}`;
                const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(rawInput)}&units=metric&lang=vi&appid=${APIKey}`;
                getWeatherData(weatherUrl, forecastUrl);
                return;
            }

            const { lat, lon } = data[0];
            const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=vi&appid=${APIKey}`;
            const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&lang=vi&appid=${APIKey}`;
            getWeatherData(weatherUrl, forecastUrl);
        })
        .catch(() => {
            const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(rawInput)}&units=metric&lang=vi&appid=${APIKey}`;
            const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(rawInput)}&units=metric&lang=vi&appid=${APIKey}`;
            getWeatherData(weatherUrl, forecastUrl);
        });
}

search.addEventListener('click', handleSearch);

input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSearch();
});

// Tự động định vị khi mở trang
window.addEventListener('load', () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=vi&appid=${APIKey}`;
                const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&lang=vi&appid=${APIKey}`;
                getWeatherData(weatherUrl, forecastUrl);
            },
            () => {
                const defaultCity = 'Ho Chi Minh';
                const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${defaultCity}&units=metric&lang=vi&appid=${APIKey}`;
                const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${defaultCity}&units=metric&lang=vi&appid=${APIKey}`;
                getWeatherData(weatherUrl, forecastUrl);
            }
        );
    }
});

// Đóng Popup
if (closeModal) {
    closeModal.addEventListener('click', () => modal.classList.remove('active'));
}
if (modal) {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });
}

// 1. Click vào ô ĐỘ ẨM
const humidityBox = document.querySelector('.weather-details .humidity');
if (humidityBox) {
    humidityBox.addEventListener('click', () => {
        if (!currentWeatherDetails || !modal) return;
        const h = currentWeatherDetails.main.humidity;
        let advice = '';
        if (h < 45) advice = 'Không khí khô hanh, nên uống thêm nước để tránh mất nước.';
        else if (h <= 70) advice = 'Mức độ ẩm lý tưởng, cơ thể cảm thấy dễ chịu và mát mẻ.';
        else advice = 'Độ ẩm cao gây cảm giác oi nồng và khó thoát mồ hôi.';

        modalTitle.innerHTML = '<i class="fa-solid fa-water"></i> Chi Tiết Độ Ẩm';
        modalDesc.innerHTML = `
            <b>Độ ẩm thực tế:</b> ${h}%<br>
            <b>Nhiệt độ cảm nhận:</b> ${Math.round(currentWeatherDetails.main.feels_like)}°C<br>
            <b>Áp suất khí quyển:</b> ${currentWeatherDetails.main.pressure} hPa<br><br>
            <em>${advice}</em>
        `;
        modal.classList.add('active');
    });
}

// 2. Click vào ô TỐC ĐỘ GIÓ
const windBox = document.querySelector('.weather-details .wind');
if (windBox) {
    windBox.addEventListener('click', () => {
        if (!currentWeatherDetails || !modal) return;
        const speed = Math.round(currentWeatherDetails.wind.speed * 3.6);
        const deg = currentWeatherDetails.wind.deg || 0;
        const gust = currentWeatherDetails.wind.gust ? `${Math.round(currentWeatherDetails.wind.gust * 3.6)} km/h` : 'Không đáng kể';

        const directions = ['Bắc', 'Đông Bắc', 'Đông', 'Đông Nam', 'Nam', 'Tây Nam', 'Tây', 'Tây Bắc'];
        const dirIndex = Math.round(deg / 45) % 8;
        const windDir = directions[dirIndex];

        let windLevel = '';
        if (speed < 6) windLevel = 'Cấp 1: Gió nhẹ, khẽ thoảng lá bay';
        else if (speed <= 19) windLevel = 'Cấp 2 - 3: Gió hiu hiu, cảm nhận rõ rệt trên mặt';
        else if (speed <= 38) windLevel = 'Cấp 4 - 5: Gió vừa, cành nhỏ lay động liên tục';
        else windLevel = 'Cấp 6 trở lên: Gió mạnh, cần thận trọng khi điều khiển xe';

        modalTitle.innerHTML = '<i class="fa-solid fa-wind"></i> Chi Tiết Sức Gió';
        modalDesc.innerHTML = `
            <b>Tốc độ gió:</b> ${speed} km/h<br>
            <b>Gió giật:</b> ${gust}<br>
            <b>Hướng gió:</b> ${windDir} (${deg}°)<br>
            <b>Đánh giá:</b> ${windLevel}
        `;
        modal.classList.add('active');
    });
}

// 3. Click vào ô LƯỢNG MƯA
const rainBox = document.querySelector('.weather-details .rain');
if (rainBox) {
    rainBox.addEventListener('click', () => {
        if (!currentWeatherDetails || !modal) return;
        const rainVol = currentWeatherDetails.rain && currentWeatherDetails.rain['1h'] ? currentWeatherDetails.rain['1h'] : 0;
        let rainStatus = '';
        if (rainVol === 0) rainStatus = 'Không ghi nhận lượng mưa trong 1 giờ qua.';
        else if (rainVol < 2.5) rainStatus = 'Mưa phùn / Mưa hạt nhỏ rải rác.';
        else if (rainVol < 10) rainStatus = 'Mưa vừa, nên trang bị áo mưa hoặc dù.';
        else rainStatus = 'Mưa to đến rất to, đề phòng ngập úng cục bộ.';

        modalTitle.innerHTML = '<i class="fa-solid fa-cloud-showers-heavy"></i> Chi Tiết Lượng Mưa';
        modalDesc.innerHTML = `
            <b>Lượng mưa (1 giờ qua):</b> ${rainVol} mm<br>
            <b>Tình trạng:</b> ${rainStatus}
        `;
        modal.classList.add('active');
    });
}

// 4. Click vào ô KHẢ NĂNG MƯA
const rainChanceBox = document.querySelector('.weather-details .rain-chance');
if (rainChanceBox) {
    rainChanceBox.addEventListener('click', () => {
        if (!currentForecastDetails || !modal) return;
        const pop = currentForecastDetails.list && currentForecastDetails.list[0] ? Math.round(currentForecastDetails.list[0].pop * 100) : 0;
        modalTitle.innerHTML = '<i class="fa-solid fa-cloud-rain"></i> Khả Năng Mưa';
        modalDesc.innerHTML = `
            <b>Xác suất có mưa (3h tới):</b> ${pop}%<br>
            <b>Dự báo:</b> ${pop >= 50 ? 'Khả năng cao sẽ có mưa, hãy chuẩn bị ô hoặc áo mưa khi ra ngoài.' : 'Khả năng có mưa thấp, thời tiết thuận lợi cho các hoạt động ngoài trời.'}
        `;
        modal.classList.add('active');
    });
}