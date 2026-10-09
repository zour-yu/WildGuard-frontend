/**
 * geoUtils.ts - Geospatial Utilities for Wildlife Guardian
 * 
 * Implements Haversine distance formulas, proximity threat calculations,
 * and ranger ETA estimations.
 */

import { RangerData } from '../types/telemetry';

/**
 * Calculates distance between two GPS coordinates in meters using the Haversine formula.
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Calculates distance in kilometers.
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  return Number((calculateDistanceMeters(lat1, lon1, lat2, lon2) / 1000).toFixed(2));
}

/**
 * Estimates response ETA in minutes given a distance in kilometers.
 * Assumes average patrol jeep/foot speed of 25 km/h across reserve terrain.
 */
export function estimateEtaMinutes(distanceKm: number, speedKmh: number = 25): number {
  const hours = distanceKm / speedKmh;
  const minutes = Math.round(hours * 60);
  return Math.max(1, minutes); // Minimum 1 minute
}

export interface RangerProximityRank {
  ranger: RangerData;
  distanceMeters: number;
  distanceKm: number;
  etaMinutes: number;
}

/**
 * Ranks available field rangers by closest proximity to a target coordinate.
 */
export function rankRangersByProximity(
  targetLocation: [number, number],
  rangers: RangerData[]
): RangerProximityRank[] {
  return rangers
    .map((ranger) => {
      const distM = calculateDistanceMeters(
        targetLocation[0],
        targetLocation[1],
        ranger.location[0],
        ranger.location[1]
      );
      const distKm = Number((distM / 1000).toFixed(2));
      const eta = estimateEtaMinutes(distKm);

      return {
        ranger,
        distanceMeters: distM,
        distanceKm: distKm,
        etaMinutes: eta,
      };
    })
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
}
