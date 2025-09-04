// Допоміжні функції спавну

export function getRandomSpawnPoint(region, regionSpawnPoints, usedSpawnPoints) {
  const available = regionSpawnPoints[region].filter(
    (pt) => !usedSpawnPoints.some((u) => u[0] === pt[0] && u[1] === pt[1])
  );
  if (available.length === 0) {
    console.warn(`No available spawn points in ${region}, falling back to any available point`);
    const any = Object.values(regionSpawnPoints)
      .flat()
      .filter((pt) => !usedSpawnPoints.some((u) => u[0] === pt[0] && u[1] === pt[1]));
    return any[Math.floor(Math.random() * any.length)];
  }
  return available[Math.floor(Math.random() * available.length)];
}

export function getRandomTarget(allowDefensePoint, defensePoints, pvoList, airport) {
  const aliveDef = defensePoints.filter((d) => d.alive);
  // Якщо немає жодної цілі
  if (aliveDef.length === 0 && pvoList.length === 0 && !(airport && airport.alive)) return null;

  // Як в оригіналі: невеликий шанс обрати ППО (вищий для ракет)
  const pvoChance = allowDefensePoint ? 0.2 : 0.3; // drones: 20%, rockets: 30%
  if (pvoList.length > 0 && Math.random() < pvoChance) {
    const p = pvoList[Math.floor(Math.random() * pvoList.length)];
    if (p.latlng && !isNaN(p.latlng.lat) && !isNaN(p.latlng.lng)) {
      return { lat: p.latlng.lat, lng: p.latlng.lng };
    }
  }

  // 10% імовірності атакувати аеропорт, якщо він живий
  if (airport && airport.alive && Math.random() < 0.1) {
    return { lat: airport.lat, lng: airport.lng };
  }

  // Типово: ціль — оборонна точка, якщо доступна
  if (aliveDef.length > 0) {
    const d = aliveDef[Math.floor(Math.random() * aliveDef.length)];
    return { lat: d.lat, lng: d.lng };
  }

  // Фолбеки коли немає оборонних точок
  if (pvoList.length > 0) {
    const p = pvoList[Math.floor(Math.random() * pvoList.length)];
    if (p.latlng && !isNaN(p.latlng.lat) && !isNaN(p.latlng.lng)) {
      return { lat: p.latlng.lat, lng: p.latlng.lng };
    }
  }
  if (airport && airport.alive) return { lat: airport.lat, lng: airport.lng };
  return null;
}
