"use client";

import { useState, useCallback } from "react";

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: false,
  });

  const getLocation = useCallback((): Promise<{ latLong: string | null; error: string | null }> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setState((prev) => ({ ...prev, error: "Geolocation not supported" }));
        resolve({ latLong: null, error: "Geolocation not supported" });
        return;
      }

      setState((prev) => ({ ...prev, loading: true, error: null }));

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const latLong = `${position.coords.latitude},${position.coords.longitude}`;
          setState({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            error: null,
            loading: false,
          });
          resolve({ latLong, error: null });
        },
        (err) => {
          setState({
            latitude: null,
            longitude: null,
            error: err.message,
            loading: false,
          });
          resolve({ latLong: null, error: err.message });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }, []);

  const getLatLongString = useCallback((): string | null => {
    if (state.latitude !== null && state.longitude !== null) {
      return `${state.latitude},${state.longitude}`;
    }
    return null;
  }, [state.latitude, state.longitude]);

  return { ...state, getLocation, getLatLongString };
}
