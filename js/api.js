// ============================================
// OpenWeatherMap API
// ============================================
// API-Key wird aus js/config.js geladen.
// Siehe js/config.example.js für die Einrichtung.
// ============================================
const API_KEY = (typeof CONFIG !== 'undefined' && CONFIG.API_KEY) ? CONFIG.API_KEY : '';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

const WeatherAPI = {
    /**
     * Aktuelles Wetter für eine Stadt abrufen
     */
    async getCurrentWeather(city) {
        const url = `${BASE_URL}/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric&lang=de`;
        const response = await fetch(url);

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Ung\u00fcltiger API-Key. Bitte kopiere js/config.example.js als js/config.js und trage deinen Key ein.');
            }
            if (response.status === 404) {
                throw new Error(`Stadt "${city}" wurde nicht gefunden. Bitte \u00fcberpr\u00fcfe die Eingabe.`);
            }
            throw new Error('Wetterdaten konnten nicht geladen werden.');
        }

        return response.json();
    },

    /**
     * 5-Tage-Vorhersage für eine Stadt abrufen
     */
    async getForecast(city) {
        const url = `${BASE_URL}/forecast?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric&lang=de`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error('Vorhersage konnte nicht geladen werden.');
        }

        return response.json();
    },

    /**
     * Icon-URL für ein Wetter-Icon generieren
     */
    getIconUrl(iconCode) {
        return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
    }
};
