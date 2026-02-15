const App = {
    defaultCity: 'Berlin',
    currentCity: '',

    init() {
        // UI-Elemente initialisieren
        WeatherUI.initElements();

        const form = document.getElementById('search-form');
        const input = document.getElementById('city-input');
        const themeToggle = document.getElementById('theme-toggle');
        const errorRetry = document.getElementById('error-retry');

        // Suche
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const city = input.value.trim();
            if (city) {
                this.loadWeather(city);
            }
        });

        // Theme Toggle
        const savedTheme = localStorage.getItem('weatherDashboard_theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);

        themeToggle.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('weatherDashboard_theme', next);
        });

        // Retry-Button
        errorRetry.addEventListener('click', () => {
            if (this.currentCity) {
                this.loadWeather(this.currentCity);
            }
        });

        // Gespeicherte Stadt laden
        const savedCity = localStorage.getItem('weatherDashboard_city') || this.defaultCity;
        input.value = savedCity;
        this.loadWeather(savedCity);
    },

    async loadWeather(city) {
        this.currentCity = city;
        WeatherUI.showLoading();

        try {
            const [weatherData, forecastData] = await Promise.all([
                WeatherAPI.getCurrentWeather(city),
                WeatherAPI.getForecast(city),
            ]);

            WeatherUI.hideLoading();
            WeatherUI.hideError();
            WeatherUI.displayCurrentWeather(weatherData);
            WeatherUI.displayForecast(forecastData);

            // Stadt speichern
            localStorage.setItem('weatherDashboard_city', city);

            // Browser-Tab-Titel aktualisieren
            document.title = `${Math.round(weatherData.main.temp)}°C ${weatherData.name} - Wetter Dashboard`;
        } catch (error) {
            WeatherUI.hideLoading();
            WeatherUI.showError(error.message);
        }
    },
};

// App starten wenn DOM bereit ist
document.addEventListener('DOMContentLoaded', () => App.init());
