// Константи гри та статичні дані
export const PIXEL_TO_METERS = 1;
// Розміри карти у пікселях (для CRS.Simple)
export const MAP_WIDTH = 2829;
export const MAP_HEIGHT = 4000;
// Зовнішній відступ для спавнів за межами карти
export const OUTER_MARGIN = 200;

export const FIXED_TOTAL_ENEMIES = 100;
export const INITIAL_LIGHT_DRONES = 70;
export const INITIAL_HEAVY_DRONES = 10;
export const INITIAL_ROCKETS = 20;
export const LIGHT_DRONE_DECREMENT = 2;
export const HEAVY_DRONE_INCREMENT = 1;
export const ROCKET_INCREMENT = 1;
export const HEAVY_DRONE_DECREMENT = 2;
export const ROCKET_INCREMENT_NO_LIGHT = 2;

export const regionSpawnPoints = {
  Рівненській: [
    [2332, 1100],
    [2020, 815],
  ],
  Житомирській: [
    [1915, 1360],
    [2105, 1550],
  ],
  Київській: [
    [2030, 1875],
    [2240, 1760],
    [1740, 1780],
  ],
  Чернігівській: [
    [2400, 2200],
    [2050, 2300],
  ],
  Запорізькій: [[940, 2890]],
  Кримській: [[460, 2400]],
  Львівській: [
    [1920, 655],
    [1600, 320],
  ],
  Закарпатській: [[1440, 220]],
  'Івано-Франківській': [[1400, 635]],
  Чернівецькій: [[1260, 910]],
  Тернопільській: [
    [1600, 845],
    [1900, 870],
  ],
  Хмельницькій: [
    [1710, 1200],
    [1460, 1025],
  ],
  Вінницькій: [
    [1330, 1630],
    [1584, 1460],
  ],
  Кіровоградській: [
    [1450, 2400],
    [1240, 2240],
    [1365, 1800],
  ],
  Миколаївській: [
    [840, 2100],
    [1115, 2310],
    [1180, 2000],
  ],
  Херсонській: [
    [770, 2320],
    [1050, 2535],
  ],
  Донецькій: [[1370, 3255]],
  Харківській: [[1690, 3005]],
  Полтавській: [
    [1680, 2625],
    [1955, 2360],
  ],
  Сумській: [[2145, 2515]],
  Черкаській: [
    [1560, 1800],
    [1650, 2060],
    [1830, 2205],
  ],
  Одеській: [
    [555, 1565],
    [1045, 1800],
  ],
  Дніпропетровській: [
    [1220, 2590],
    [1400, 2635],
    [1505, 2865],
    [1335, 3095],
  ],
};

export const waveSchedule = [
  10,
  10,
  30,
  50,
  70,
  ...Array.from({ length: 999 }, (_, t) => 70 + 45 * (t + 1)),
];

export const assetsToLoad = [
  'assets/map.png',
  'assets/drone.png',
  'assets/heavy-drone.png',
  'assets/rocket1.png',
  'assets/kulemet.png',
  'assets/c300.png',
  'assets/kilchen.png',
  'assets/patriot.png',
  'assets/reb.png',
  'assets/f16.png',
  'assets/aeroport.png',
  'assets/tet.png',
  'assets/gas.png',
  'assets/explosion.gif',
];
