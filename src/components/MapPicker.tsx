"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface MapPickerProps {
  latitude: number;
  longitude: number;
  onSelect: (lat: number, lng: number) => void;
  height?: string;
}

export default function MapPicker({
  latitude,
  longitude,
  onSelect,
  height = "400px",
}: MapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current).setView([latitude, longitude], 15);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const markerIcon = L.divIcon({
      className: "custom-marker",
      html: `<div style="width:24px;height:24px;background:#c9a84c;border:3px solid #1a1a2e;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    const marker = L.marker([latitude, longitude], { icon: markerIcon, draggable: true }).addTo(map);

    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      onSelect(pos.lat, pos.lng);
    });

    map.on("click", (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      onSelect(e.latlng.lat, e.latlng.lng);
    });

    mapInstance.current = map;
    markerRef.current = marker;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  useEffect(() => {
    if (mapInstance.current && markerRef.current) {
      markerRef.current.setLatLng([latitude, longitude]);
      mapInstance.current.setView([latitude, longitude], mapInstance.current.getZoom());
    }
  }, [latitude, longitude]);

  return <div ref={mapRef} style={{ height, width: "100%", borderRadius: "12px" }} />;
}
