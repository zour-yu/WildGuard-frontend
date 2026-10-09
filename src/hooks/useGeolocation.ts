/**
 * UC-01: useGeolocation Custom React Hook
 * 
 * Auto-fetches GPS coordinates with high accuracy on mobile field devices.
 * Gracefully falls back to manual coordinate entry upon permission denial or hardware error.
 */

import { useState, useEffect, useCallback } from 'react';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface GeolocationState {
  coordinates: Coordinates | null;
  accuracy: number | null; // in meters
  isLoading: boolean;
  error: string | null;
  isManual: boolean;
  refresh: () => void;
  setManualCoordinates: (lat: number, lng: number) => void;
  toggleManualMode: (enable?: boolean) => void;
}

export function useGeolocation(
  defaultCoords: Coordinates = { lat: 6.834, lng: 80.988 }
): GeolocationState {
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isManual, setIsManual] = useState<boolean>(false);

  const fetchGPS = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setError('Geolocation hardware is not supported on this device.');
      setIsLoading(false);
      setIsManual(true);
      setCoordinates(defaultCoords);
      return;
    }

    setIsLoading(true);
    setError(null);

    const geoOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    };

    navigator.geolocation.getCurrentPosition(
      (position: GeolocationPosition) => {
        setCoordinates({
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
        });
        setAccuracy(Number(position.coords.accuracy.toFixed(1)));
        setIsLoading(false);
        setError(null);
        setIsManual(false);
      },
      (geoError: GeolocationPositionError) => {
        let msg = 'Unable to acquire GPS coordinates.';
        switch (geoError.code) {
          case geoError.PERMISSION_DENIED:
            msg = 'GPS permission denied by user. Please enter coordinates manually.';
            break;
          case geoError.POSITION_UNAVAILABLE:
            msg = 'GPS signal unavailable in this sector. Falling back to manual entry.';
            break;
          case geoError.TIMEOUT:
            msg = 'GPS acquisition timed out. Falling back to manual entry.';
            break;
        }
        setError(msg);
        setIsLoading(false);
        setIsManual(true);
        // Default to park sector anchor so ranger can easily refine
        setCoordinates(defaultCoords);
      },
      geoOptions
    );
  }, [defaultCoords.lat, defaultCoords.lng]);

  useEffect(() => {
    fetchGPS();
  }, [fetchGPS]);

  const setManualCoordinates = useCallback((lat: number, lng: number) => {
    setCoordinates({ lat, lng });
    setAccuracy(null);
    setIsManual(true);
  }, []);

  const toggleManualMode = useCallback((enable?: boolean) => {
    setIsManual((prev) => (enable !== undefined ? enable : !prev));
  }, []);

  return {
    coordinates,
    accuracy,
    isLoading,
    error,
    isManual,
    refresh: fetchGPS,
    setManualCoordinates,
    toggleManualMode,
  };
}
