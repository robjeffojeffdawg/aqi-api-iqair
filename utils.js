// ============================================================
// Jeffo Blogs' AQI Monitor — Shared Utilities
// utils.js · Loaded by all pages
// ============================================================

// ── Loading states ───────────────────────────────────────────

const LOADING_MESSAGES = [
    'Fetching air quality data…',
    'Contacting IQAir network…',
    'Polling monitoring stations…',
    'Reading sensor data…',
    'Calculating AQI values…',
];

function randomLoadingMsg() {
    return LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)];
}

function showLoadingSpinner(containerId, message) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = `
        <div class="aq-loading">
            <div class="aq-spinner"></div>
            <p class="aq-loading-msg">${message || randomLoadingMsg()}</p>
        </div>`;
}

// ── Friendly error messages ──────────────────────────────────

const ERROR_MAP = {
    // API / network
    'Failed to fetch':          { title: 'Cannot reach the server',      msg: 'Check your internet connection and try again.',                    icon: '📡' },
    'NetworkError':             { title: 'Network error',                 msg: 'Something interrupted the connection. Please try again.',          icon: '📡' },
    '429':                      { title: 'Rate limit reached',            msg: 'Too many requests. Please wait a moment before trying again.',     icon: '⏳' },
    'rate limit':               { title: 'Rate limit reached',            msg: 'Too many requests. Please wait a moment before trying again.',     icon: '⏳' },
    // City / data
    'City not found':           { title: 'City not found',               msg: 'We couldn\'t find that city. Try a nearby major city or use your location instead.', icon: '🗺️' },
    'No stations found':        { title: 'No stations nearby',            msg: 'There are no monitoring stations close to this location. Try a different city.', icon: '📍' },
    'No air quality':           { title: 'No data available',             msg: 'IQAir has no current readings for this location. Try again later.', icon: '🌫️' },
    'No countries':             { title: 'Couldn\'t load countries',      msg: 'The country list failed to load. Refresh and try again.',           icon: '🌍' },
    'No states':                { title: 'Couldn\'t load regions',        msg: 'Regions for this country couldn\'t be loaded. Try again.',          icon: '🗺️' },
    'No cities':                { title: 'Couldn\'t load cities',         msg: 'Cities for this region couldn\'t be loaded. Try again.',            icon: '🏙️' },
    // Auth / location
    'Location access denied':   { title: 'Location access denied',        msg: 'Enable location permissions in your browser, or use Browse Cities to search manually.', icon: '📍' },
    'denied':                   { title: 'Location access denied',        msg: 'Enable location permissions in your browser, or use Browse Cities to search manually.', icon: '📍' },
    // Generic
    '500':                      { title: 'Server error',                  msg: 'Something went wrong on our end. Please try again in a moment.',   icon: '🔧' },
    '502':                      { title: 'Server unavailable',            msg: 'The API is temporarily unavailable. Please try again shortly.',    icon: '🔧' },
    '503':                      { title: 'Service unavailable',           msg: 'The service is down for maintenance. Please try again later.',     icon: '🔧' },
};

function getFriendlyError(rawMessage) {
    if (!rawMessage) return { title: 'Something went wrong', msg: 'An unexpected error occurred. Please try again.', icon: '⚠️' };
    const lower = rawMessage.toLowerCase();
    for (const [key, val] of Object.entries(ERROR_MAP)) {
        if (lower.includes(key.toLowerCase())) return val;
    }
    return { title: 'Something went wrong', msg: rawMessage, icon: '⚠️' };
}

function showError(errorBoxId, rawMessage, autoDismiss = true) {
    const box = document.getElementById(errorBoxId);
    if (!box) return;
    const err = getFriendlyError(rawMessage);
    box.innerHTML = `
        <div class="aq-error-bar">
            <span class="aq-error-icon">${err.icon}</span>
            <div class="aq-error-text">
                <div class="aq-error-title">${err.title}</div>
                <div class="aq-error-msg">${err.msg}</div>
            </div>
            <button class="aq-error-close" onclick="this.closest('.aq-error-bar').remove()">✕</button>
        </div>`;
    if (autoDismiss) setTimeout(() => box.innerHTML = '', 8000);
}

function showEmptyState(containerId, icon, title, message) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = `
        <div class="aq-empty">
            <span class="aq-empty-icon">${icon}</span>
            <h3 class="aq-empty-title">${title}</h3>
            <p class="aq-empty-msg">${message}</p>
        </div>`;
}

// ── Favourites ────────────────────────────────────────────────

const FAV_KEY = 'jeffo_aqi_favourites';
const FAV_MAX = 8;

function getFavourites() {
    try {
        return JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
    } catch {
        return [];
    }
}

function saveFavourites(favs) {
    try {
        localStorage.setItem(FAV_KEY, JSON.stringify(favs));
    } catch {
        console.warn('Could not save favourites to localStorage');
    }
}

function addFavourite(city, state, country) {
    const favs = getFavourites();
    const exists = favs.some(f => f.city === city && f.country === country);
    if (exists) return false;
    if (favs.length >= FAV_MAX) {
        favs.shift(); // remove oldest
    }
    favs.push({ city, state: state || '', country, addedAt: Date.now() });
    saveFavourites(favs);
    return true;
}

function removeFavourite(city, country) {
    const favs = getFavourites().filter(f => !(f.city === city && f.country === country));
    saveFavourites(favs);
}

function isFavourite(city, country) {
    return getFavourites().some(f => f.city === city && f.country === country);
}

// ── Shared CSS injected into <head> ──────────────────────────
// Call injectSharedStyles() once per page load.

function injectSharedStyles() {
    if (document.getElementById('aq-shared-styles')) return;
    const style = document.createElement('style');
    style.id = 'aq-shared-styles';
    style.textContent = `
        /* ── Loading ── */
        .aq-loading {
            text-align: center;
            padding: 60px 20px;
        }
        .aq-spinner {
            width: 44px; height: 44px;
            border: 3px solid rgba(255,255,255,0.08);
            border-top-color: #4f8ef7;
            border-radius: 50%;
            animation: aq-spin 0.8s linear infinite;
            margin: 0 auto 18px;
        }
        @keyframes aq-spin { to { transform: rotate(360deg); } }
        .aq-loading-msg {
            font-family: 'DM Mono', monospace;
            font-size: 14px;
            color: #9aaac4;
            animation: aq-fade-cycle 2s ease-in-out infinite;
        }
        @keyframes aq-fade-cycle {
            0%,100% { opacity: 0.5; }
            50%      { opacity: 1;   }
        }

        /* ── Error bar ── */
        .aq-error-bar {
            display: flex;
            align-items: flex-start;
            gap: 14px;
            background: rgba(239,68,68,0.08);
            border: 1px solid rgba(239,68,68,0.22);
            border-radius: 12px;
            padding: 14px 18px;
            margin-bottom: 20px;
            animation: aq-fadein 0.2s ease;
        }
        @keyframes aq-fadein { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        .aq-error-icon { font-size: 20px; flex-shrink: 0; margin-top: 1px; }
        .aq-error-text { flex: 1; }
        .aq-error-title {
            font-size: 14px; font-weight: 700;
            color: #fca5a5; margin-bottom: 3px;
        }
        .aq-error-msg {
            font-size: 13px;
            font-family: 'DM Mono', monospace;
            color: #f87171;
            line-height: 1.5;
        }
        .aq-error-close {
            background: none; border: none;
            color: #f87171; font-size: 14px;
            cursor: pointer; padding: 2px 4px;
            opacity: 0.6; transition: opacity 0.2s;
            flex-shrink: 0;
        }
        .aq-error-close:hover { opacity: 1; }

        /* ── Empty state ── */
        .aq-empty {
            text-align: center;
            padding: 52px 20px;
        }
        .aq-empty-icon {
            font-size: 44px; display: block;
            margin-bottom: 16px; opacity: 0.35;
        }
        .aq-empty-title {
            font-size: 17px; font-weight: 700;
            color: #e2e8f8; margin-bottom: 8px;
        }
        .aq-empty-msg {
            font-size: 13px; line-height: 1.7;
            color: #9aaac4;
            font-family: 'DM Mono', monospace;
            max-width: 360px; margin: 0 auto;
        }

        /* ── Favourites strip ── */
        .fav-section {
            background: #0e1420;
            border: 1px solid rgba(255,255,255,0.10);
            border-radius: 16px;
            padding: 20px 24px;
            margin-bottom: 20px;
        }
        .fav-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 14px;
        }
        .fav-title {
            font-size: 11px; font-weight: 600;
            text-transform: uppercase; letter-spacing: 1.2px;
            color: #5a6a8a;
        }
        .fav-clear {
            font-size: 11px; color: #5a6a8a;
            background: none; border: none;
            cursor: pointer; font-family: 'Syne', sans-serif;
            transition: color 0.2s;
        }
        .fav-clear:hover { color: #ef4444; }
        .fav-pills {
            display: flex; gap: 8px; flex-wrap: wrap;
        }
        .fav-pill {
            display: inline-flex; align-items: center; gap: 7px;
            padding: 8px 14px;
            background: #141c2e;
            border: 1px solid rgba(255,255,255,0.10);
            border-radius: 999px;
            font-size: 13px; font-weight: 600;
            color: #e2e8f8;
            cursor: pointer;
            transition: all 0.2s;
            font-family: 'Syne', sans-serif;
        }
        .fav-pill:hover {
            background: #1a2440;
            border-color: rgba(255,255,255,0.2);
            transform: translateY(-1px);
        }
        .fav-pill-remove {
            font-size: 11px; color: #5a6a8a;
            background: none; border: none;
            cursor: pointer; padding: 0;
            line-height: 1; transition: color 0.2s;
            font-family: inherit;
        }
        .fav-pill-remove:hover { color: #ef4444; }
        .fav-empty-msg {
            font-size: 13px; color: #5a6a8a;
            font-family: 'DM Mono', monospace;
        }

        /* ── Mobile touch targets ── */
        @media (max-width: 640px) {
            .fav-pill { padding: 10px 16px; font-size: 14px; }
            .aq-error-bar { flex-direction: column; gap: 10px; }
        }
    `;
    document.head.appendChild(style);
}

// Auto-inject on load
injectSharedStyles();
