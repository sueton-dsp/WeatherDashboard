const WeatherUI = {
    elements: null,
    clockInterval: null,
    timezoneOffset: 0,

    /**
     * DOM-Elemente initialisieren (lazy, erst nach DOMContentLoaded)
     */
    initElements() {
        this.elements = {
            cityName: document.getElementById('city-name'),
            currentDate: document.getElementById('current-date'),
            cityClock: document.getElementById('city-clock'),
            weatherIcon: document.getElementById('weather-icon'),
            temperature: document.getElementById('temperature'),
            description: document.getElementById('description'),
            feelsLike: document.getElementById('feels-like'),
            humidity: document.getElementById('humidity'),
            humidityBar: document.getElementById('humidity-bar'),
            windSpeed: document.getElementById('wind-speed'),
            windDirection: document.getElementById('wind-direction'),
            pressure: document.getElementById('pressure'),
            visibility: document.getElementById('visibility'),
            clouds: document.getElementById('clouds'),
            cloudsBar: document.getElementById('clouds-bar'),
            sunrise: document.getElementById('sunrise'),
            sunset: document.getElementById('sunset'),
            sunProgress: document.getElementById('sun-progress'),
            sunDot: document.getElementById('sun-dot'),
            dashboardLayout: document.getElementById('dashboard-layout'),
            forecastCards: document.getElementById('forecast-cards'),
            errorMessage: document.getElementById('error-message'),
            errorTitle: document.getElementById('error-title'),
            errorText: document.getElementById('error-text'),
            errorRetry: document.getElementById('error-retry'),
            loading: document.getElementById('loading'),
            weatherBg: document.getElementById('weather-bg'),
            bgParticles: document.getElementById('bg-particles'),
        };
    },

    /**
     * Aktuelles Wetter im Dashboard anzeigen
     */
    displayCurrentWeather(data) {
        const { elements } = this;

        // Stadtname & Datum
        elements.cityName.textContent = `${data.name}, ${data.sys.country}`;
        elements.currentDate.textContent = this.formatDate(new Date());

        // Live-Uhr starten
        this.timezoneOffset = data.timezone;
        this.startClock();

        // Haupttemperatur
        elements.weatherIcon.src = WeatherAPI.getIconUrl(data.weather[0].icon);
        elements.weatherIcon.alt = data.weather[0].description;
        elements.temperature.textContent = Math.round(data.main.temp);
        elements.description.textContent = data.weather[0].description;

        // Widgets
        elements.feelsLike.textContent = Math.round(data.main.feels_like);
        elements.humidity.textContent = data.main.humidity;
        elements.humidityBar.style.width = `${data.main.humidity}%`;
        elements.windSpeed.textContent = Math.round(data.wind.speed * 3.6);
        elements.windDirection.textContent = this.getWindDirection(data.wind.deg);
        elements.pressure.textContent = data.main.pressure;
        elements.visibility.textContent = (data.visibility / 1000).toFixed(1);
        elements.clouds.textContent = data.clouds.all;
        elements.cloudsBar.style.width = `${data.clouds.all}%`;

        // Sonnenauf-/untergang
        const sunriseTime = this.formatTime(data.sys.sunrise, data.timezone);
        const sunsetTime = this.formatTime(data.sys.sunset, data.timezone);
        elements.sunrise.textContent = sunriseTime;
        elements.sunset.textContent = sunsetTime;

        // Sonnen-Bogen aktualisieren
        this.updateSunArc(data.sys.sunrise, data.sys.sunset, data.timezone);

        // Dynamischer Hintergrund
        this.updateWeatherBackground(data.weather[0].main, data.weather[0].icon);

        // Animationen neu triggern
        this.triggerAnimations();

        elements.dashboardLayout.hidden = false;
    },

    /**
     * Animationen bei neuen Daten neu abspielen
     */
    triggerAnimations() {
        const cards = document.querySelectorAll('.card--animate');
        cards.forEach(card => {
            card.style.animation = 'none';
            card.offsetHeight; // Force reflow
            card.style.animation = '';
        });
    },

    /**
     * Live-Uhr für den Standort
     */
    startClock() {
        if (this.clockInterval) clearInterval(this.clockInterval);

        const updateClock = () => {
            const now = new Date();
            const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
            const localTime = new Date(utcMs + this.timezoneOffset * 1000);
            const hours = localTime.getHours().toString().padStart(2, '0');
            const minutes = localTime.getMinutes().toString().padStart(2, '0');
            const seconds = localTime.getSeconds().toString().padStart(2, '0');
            this.elements.cityClock.textContent = `${hours}:${minutes}:${seconds}`;
        };

        updateClock();
        this.clockInterval = setInterval(updateClock, 1000);
    },

    /**
     * Sonnen-Bogen (SVG) berechnen und Position setzen
     */
    updateSunArc(sunriseTs, sunsetTs, timezoneOffset) {
        const now = Math.floor(Date.now() / 1000);
        const dayLength = sunsetTs - sunriseTs;
        let progress = (now - sunriseTs) / dayLength;
        progress = Math.max(0, Math.min(1, progress));

        // SVG-Pfad: Quadratische Bezier-Kurve M10,90 Q100,0 190,90
        const t = progress;
        const x = (1 - t) * (1 - t) * 10 + 2 * (1 - t) * t * 100 + t * t * 190;
        const y = (1 - t) * (1 - t) * 90 + 2 * (1 - t) * t * 0 + t * t * 90;

        const sunDot = this.elements.sunDot;
        const sunProgressEl = this.elements.sunProgress;

        sunDot.setAttribute('cx', x);
        sunDot.setAttribute('cy', y);

        // Stroke progress
        const pathLength = sunProgressEl.getTotalLength ? sunProgressEl.getTotalLength() : 300;
        sunProgressEl.style.strokeDasharray = pathLength;
        sunProgressEl.style.strokeDashoffset = pathLength * (1 - progress);
    },

    /**
     * Dynamischer Wetter-Hintergrund
     */
    updateWeatherBackground(weatherMain, iconCode) {
        const bg = this.elements.weatherBg;
        const particles = this.elements.bgParticles;

        // Alle Klassen entfernen
        bg.className = 'weather-bg';
        particles.innerHTML = '';

        const weatherType = weatherMain.toLowerCase();

        if (weatherType.includes('clear')) {
            bg.classList.add('weather-bg--clear');
        } else if (weatherType.includes('cloud')) {
            bg.classList.add('weather-bg--clouds');
        } else if (weatherType.includes('rain') || weatherType.includes('drizzle')) {
            bg.classList.add('weather-bg--rain');
            this.createRainParticles(particles);
        } else if (weatherType.includes('snow')) {
            bg.classList.add('weather-bg--snow');
            this.createSnowParticles(particles);
        } else if (weatherType.includes('thunder')) {
            bg.classList.add('weather-bg--thunder');
        } else if (weatherType.includes('mist') || weatherType.includes('fog') || weatherType.includes('haze')) {
            bg.classList.add('weather-bg--mist');
        } else {
            bg.classList.add('weather-bg--default');
        }
    },

    createRainParticles(container) {
        for (let i = 0; i < 60; i++) {
            const drop = document.createElement('div');
            drop.className = 'rain-drop';
            drop.style.left = `${Math.random() * 100}%`;
            drop.style.height = `${15 + Math.random() * 25}px`;
            drop.style.animationDuration = `${0.5 + Math.random() * 0.5}s`;
            drop.style.animationDelay = `${Math.random() * 2}s`;
            container.appendChild(drop);
        }
    },

    createSnowParticles(container) {
        for (let i = 0; i < 40; i++) {
            const flake = document.createElement('div');
            flake.className = 'snow-flake';
            flake.style.left = `${Math.random() * 100}%`;
            const size = 3 + Math.random() * 6;
            flake.style.width = `${size}px`;
            flake.style.height = `${size}px`;
            flake.style.animationDuration = `${3 + Math.random() * 5}s`;
            flake.style.animationDelay = `${Math.random() * 4}s`;
            container.appendChild(flake);
        }
    },

    /**
     * 5-Tage-Vorhersage anzeigen
     */
    displayForecast(data) {
        const { elements } = this;
        const dailyData = this.getDailyForecast(data.list);

        elements.forecastCards.innerHTML = '';

        dailyData.forEach(day => {
            const item = document.createElement('div');
            item.className = 'forecast-item';
            item.innerHTML = `
                <span class="forecast-item__day">${this.formatDayName(day.date)}</span>
                <img class="forecast-item__icon" src="${WeatherAPI.getIconUrl(day.icon)}" alt="${day.description}">
                <span class="forecast-item__desc">${day.description}</span>
                <div class="forecast-item__temps">
                    <span class="forecast-item__high">${Math.round(day.maxTemp)}&deg;</span>
                    <span class="forecast-item__low">${Math.round(day.minTemp)}&deg;</span>
                </div>
            `;
            elements.forecastCards.appendChild(item);
        });
    },

    /**
     * 3-Stunden-Daten zu Tagesdaten aggregieren
     */
    getDailyForecast(list) {
        const days = {};

        list.forEach(item => {
            const date = item.dt_txt.split(' ')[0];

            if (!days[date]) {
                days[date] = {
                    date: new Date(item.dt * 1000),
                    minTemp: item.main.temp_min,
                    maxTemp: item.main.temp_max,
                    icon: item.weather[0].icon,
                    description: item.weather[0].description,
                };
            } else {
                days[date].minTemp = Math.min(days[date].minTemp, item.main.temp_min);
                days[date].maxTemp = Math.max(days[date].maxTemp, item.main.temp_max);

                // Icon vom Mittag bevorzugen
                if (item.dt_txt.includes('12:00:00')) {
                    days[date].icon = item.weather[0].icon;
                    days[date].description = item.weather[0].description;
                }
            }
        });

        const today = new Date().toISOString().split('T')[0];
        return Object.values(days)
            .filter(d => d.date.toISOString().split('T')[0] !== today)
            .slice(0, 5);
    },

    /**
     * Fehlernachricht anzeigen
     */
    showError(message) {
        const { elements } = this;

        let title = 'Fehler';
        if (message.includes('API-Key')) {
            title = 'API-Key Problem';
        } else if (message.includes('nicht gefunden')) {
            title = 'Stadt nicht gefunden';
        }

        elements.errorTitle.textContent = title;
        elements.errorText.textContent = message;
        elements.errorMessage.hidden = false;
        elements.dashboardLayout.hidden = true;
    },

    hideError() {
        this.elements.errorMessage.hidden = true;
    },

    showLoading() {
        this.elements.loading.hidden = false;
        this.elements.dashboardLayout.hidden = true;
        this.hideError();
    },

    hideLoading() {
        this.elements.loading.hidden = true;
    },

    // === Hilfsfunktionen ===

    formatDate(date) {
        return date.toLocaleDateString('de-DE', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    },

    formatDayName(date) {
        return date.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' });
    },

    formatTime(timestamp, timezoneOffset) {
        const date = new Date((timestamp + timezoneOffset) * 1000);
        const hours = date.getUTCHours().toString().padStart(2, '0');
        const minutes = date.getUTCMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    },

    getWindDirection(degrees) {
        const directions = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'];
        const index = Math.round(degrees / 45) % 8;
        return directions[index];
    },
};
