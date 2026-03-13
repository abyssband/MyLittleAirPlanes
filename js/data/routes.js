// ===== Airport & Route Data =====

export const AIRPORTS = {
    taipei: {
        id: 'taipei',
        name: '台北',
        code: 'TPE',
        flag: '🇹🇼',
        mapX: 0.78,  // normalized position on world map (0-1)
        mapY: 0.48,
        color: '#FF6B9D',
        unlocked: true,
    },
    tokyo: {
        id: 'tokyo',
        name: '東京',
        code: 'NRT',
        flag: '🇯🇵',
        mapX: 0.82,
        mapY: 0.38,
        color: '#FF4757',
        unlocked: true,
    },
    paris: {
        id: 'paris',
        name: '巴黎',
        code: 'CDG',
        flag: '🇫🇷',
        mapX: 0.47,
        mapY: 0.32,
        color: '#5352ED',
        unlocked: true,
    },
    newyork: {
        id: 'newyork',
        name: '紐約',
        code: 'JFK',
        flag: '🇺🇸',
        mapX: 0.25,
        mapY: 0.36,
        color: '#2ED573',
        unlocked: false,
    },
    sydney: {
        id: 'sydney',
        name: '雪梨',
        code: 'SYD',
        flag: '🇦🇺',
        mapX: 0.85,
        mapY: 0.75,
        color: '#FFA502',
        unlocked: false,
    },
    cairo: {
        id: 'cairo',
        name: '開羅',
        code: 'CAI',
        flag: '🇪🇬',
        mapX: 0.53,
        mapY: 0.47,
        color: '#ECCC68',
        unlocked: false,
    },
};

export const ROUTES = [
    {
        id: 'tpe-nrt',
        from: 'taipei',
        to: 'tokyo',
        distance: 12000,      // game world distance
        difficulty: 1,
        windSpeed: 0,
        unlocked: true,
        stars: 0,             // player's best star rating (0 = not played)
        bestScore: 0,
        theme: 'ocean',       // background theme
    },
    {
        id: 'tpe-cdg',
        from: 'taipei',
        to: 'paris',
        distance: 18000,
        difficulty: 2,
        windSpeed: 1,
        unlocked: true,
        stars: 0,
        bestScore: 0,
        theme: 'continent',
    },
    {
        id: 'nrt-jfk',
        from: 'tokyo',
        to: 'newyork',
        distance: 22000,
        difficulty: 3,
        windSpeed: 2,
        unlocked: false,
        stars: 0,
        bestScore: 0,
        theme: 'ocean',
    },
    {
        id: 'cdg-cai',
        from: 'paris',
        to: 'cairo',
        distance: 16000,
        difficulty: 2,
        windSpeed: 1,
        unlocked: false,
        stars: 0,
        bestScore: 0,
        theme: 'desert',
    },
    {
        id: 'jfk-cdg',
        from: 'newyork',
        to: 'paris',
        distance: 20000,
        difficulty: 3,
        windSpeed: 2,
        unlocked: false,
        stars: 0,
        bestScore: 0,
        theme: 'ocean',
    },
    {
        id: 'cai-syd',
        from: 'cairo',
        to: 'sydney',
        distance: 25000,
        difficulty: 4,
        windSpeed: 3,
        unlocked: false,
        stars: 0,
        bestScore: 0,
        theme: 'continent',
    },
];

// Get route by ID
export function getRoute(routeId) {
    return ROUTES.find(r => r.id === routeId);
}

// Get airport by ID
export function getAirport(airportId) {
    return AIRPORTS[airportId];
}

// Unlock routes connected to a completed airport
export function unlockRoutesFrom(airportId) {
    ROUTES.forEach(route => {
        if (route.from === airportId || route.to === airportId) {
            route.unlocked = true;
            // Also unlock the airports
            AIRPORTS[route.from].unlocked = true;
            AIRPORTS[route.to].unlocked = true;
        }
    });
}
