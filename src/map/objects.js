import L from 'leaflet';

export function createDefensePoint(map, index, coords) {
  if (!Array.isArray(coords) || !Number.isFinite(coords[0]) || !Number.isFinite(coords[1])) {
    console.error(`Invalid coords for defense point ${index}:`, coords);
    return null;
  }
  const [lat, lng] = coords;
  const iconUrl = Math.random() < 0.5 ? 'assets/tet.png' : 'assets/gas.png';
  const icon = L.icon({ iconUrl, iconSize: [60, 60], iconAnchor: [30, 30], popupAnchor: [0, -30] });
  const marker = L.marker([lat, lng], { icon }).addTo(map).bindPopup('🎯 Ціль');
  const noBuildCircle = L.circle([lat, lng], {
    radius: 100,
    color: 'red',
    fillColor: '#ff4444',
    fillOpacity: 0.2,
    dashArray: '4, 4',
    interactive: false,
  }).addTo(map);
  console.log(`Activated defense point ${index} at [${lat}, ${lng}] with icon ${iconUrl}`);
  return { lat, lng, marker, noBuildCircle, alive: true };
}

export function createAirport(map, coords) {
  const [lat, lng] = coords;
  const icon = L.icon({
    iconUrl: 'assets/aeroport.png',
    iconSize: [55, 55],
    iconAnchor: [25, 25],
    popupAnchor: [0, 25],
  });
  const marker = L.marker([lat, lng], { icon }).addTo(map).bindPopup('✈️ Аеропорт');
  const noBuildCircle = L.circle([lat, lng], {
    radius: 180,
    color: '#1f8cff',
    fillColor: '#1f8cff',
    fillOpacity: 0.2,
    dashArray: '4, 4',
    interactive: false,
  }).addTo(map);
  console.log(`Activated airport at [${lat}, ${lng}]`);
  return { lat, lng, marker, noBuildCircle, alive: true, radius: 180 };
}

