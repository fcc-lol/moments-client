import React, { useEffect } from "react";
import styled from "styled-components";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const MapWrapper = styled.div`
  flex: 1;
  min-height: 0;
  border-radius: 0.75rem;
  overflow: hidden;
  position: relative;

  @media (max-width: 768px) {
    width: 100%;
    height: 0;
    padding-bottom: 100%;
    position: relative;
  }

  &::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: ${(props) => props.$overlayColor || "transparent"};
    mix-blend-mode: overlay;
    pointer-events: none;
    border-radius: 0.75rem;
    z-index: 1000;
  }

  .leaflet-container {
    width: 100%;
    height: 100%;
    border-radius: 0.75rem;
    background: black;

    @media (max-width: 768px) {
      position: absolute;
      top: 0;
      left: 0;
    }

    .leaflet-tile {
      filter: brightness(5) contrast(10) invert(1);
    }
  }
`;

const MapOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: ${(props) => props.$overlayColor || "rgba(0, 0, 0, 0.2)"};
  pointer-events: none;
  border-radius: 0.75rem;
  z-index: 1000;
  opacity: 0.1;
  mix-blend-mode: screen;
`;

const MapDot = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  margin-top: -1.75rem;
  background: ${(props) => props.$textColor || "white"};
  z-index: 1001;
  pointer-events: none;
  opacity: 0.5;
  mix-blend-mode: hard-light;
`;

const MapCoords = styled.div`
  position: absolute;
  bottom: 1.75rem;
  left: 1.75rem;
  right: 1.75rem;
  display: flex;
  justify-content: space-between;
  font-family: "DM Mono", monospace;
  color: ${(props) => props.$textColor || "#fff"};
  font-size: 1.125rem;
  height: 1.125rem;
  min-height: 1.125rem;
  z-index: 1001;
  pointer-events: none;
  opacity: 0.5;
  mix-blend-mode: hard-light;
`;

// Component to fix map size on mount
const MapResizer = ({ center }) => {
  const map = useMap();

  useEffect(() => {
    // Invalidate size immediately to avoid jumps
    map.invalidateSize({ animate: false });
    // Always enforce the center position with offset
    if (center) {
      map.setView(center, map.getZoom(), { animate: false });
    }
  }, [map, center]);

  return null;
};

function MapCard({ exifData, dominantColor, textColor }) {
  const hasGPS = exifData?.latitude && exifData?.longitude;

  if (!hasGPS) {
    return null;
  }

  // Offset the map center slightly to position the marker higher in the viewport
  const mapCenter = [exifData.latitude - 0.03, exifData.longitude];

  return (
    <MapWrapper $overlayColor={dominantColor}>
      <MapContainer
        key={`${exifData.latitude}-${exifData.longitude}`}
        center={mapCenter}
        zoom={10}
        zoomControl={false}
        scrollWheelZoom={false}
        dragging={false}
        doubleClickZoom={false}
        attributionControl={false}
        style={{ height: "100%", width: "100%" }}
      >
        <MapResizer center={mapCenter} />
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
          opacity={0.1}
        />
      </MapContainer>
      <MapOverlay $overlayColor={dominantColor} />
      <MapDot $color={dominantColor || "white"} />
      <MapCoords $textColor={textColor}>
        <span>{exifData.latitude.toFixed(6)}</span>
        <span>{exifData.longitude.toFixed(6)}</span>
      </MapCoords>
    </MapWrapper>
  );
}

export default MapCard;
