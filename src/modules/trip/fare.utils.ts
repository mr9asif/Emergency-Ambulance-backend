const BASE_FARE = 300;
const FARE_PER_KM = 50;

const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

export const calculateDistanceKm = (
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number,
): number => {
  const earthRadiusKm = 6371;

  const latDifference = toRadians(latitude2 - latitude1);
  const lonDifference = toRadians(longitude2 - longitude1);

  const a =
    Math.sin(latDifference / 2) ** 2 +
    Math.cos(toRadians(latitude1)) *
      Math.cos(toRadians(latitude2)) *
      Math.sin(lonDifference / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
};

export const calculateFare = (distanceKm: number): number => {
  const fare = BASE_FARE + distanceKm * FARE_PER_KM;

  return Number(fare.toFixed(2));
};
