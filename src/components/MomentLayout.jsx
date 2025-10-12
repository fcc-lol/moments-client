import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { MapContainer, TileLayer, Circle, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  LocationCard,
  LocationPlaceName,
  LocationAddress,
  DateWeatherWrapper,
  DateCard,
  WeatherCard,
  PreviewImage
} from "./MomentCard";
import { formatDate } from "../utils/formatDate";

const ContentWrapper = styled.div`
  display: flex;
  flex: 1;
  gap: 2rem;
  padding: 2rem;
  opacity: ${(props) => (props.$isVisible ? 1 : 0)};
  transition: opacity 0.3s ease-in-out;
  pointer-events: ${(props) => (props.$isVisible ? "auto" : "none")};

  @media (max-width: 768px) {
    flex-direction: column;
    overflow-y: auto;
  }
`;

const LeftColumn = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 2rem;

  @media (max-width: 768px) {
    flex: 0 0 auto;
    order: 2;
  }
`;

const LocationSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

const DateMapSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  flex: 1;
  min-height: 0;

  @media (max-width: 768px) {
    flex: 0 0 auto;
  }
`;

const RightColumn = styled.div`
  display: flex;
  flex: 1;
  min-height: 0;
  min-width: 0;
  position: relative;

  @media (max-width: 768px) {
    flex: 0 0 auto;
    min-height: 400px;
    max-height: 60vh;
    order: 1;
  }
`;

const CopyLinkButton = styled.button`
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  padding: 0.75rem 1.25rem;
  border: none;
  border-radius: 0.5rem;
  font-family: "DM Mono", monospace;
  font-weight: 700;
  font-size: 0.875rem;
  text-transform: uppercase;
  backdrop-filter: blur(10px);
  transition: all 0.2s ease;
  z-index: 10;
  cursor: pointer;

  &:hover {
    background: rgba(0, 0, 0, 0.75);
  }

  &:active {
    background: rgba(0, 0, 0, 1);
  }
`;

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

const MapCoords = styled.div`
  position: absolute;
  bottom: 1.75rem;
  left: 1.75rem;
  right: 1.75rem;
  display: flex;
  justify-content: space-between;
  font-family: "DM Mono", monospace;
  color: ${(props) => props.$textColor || "#fff"};
  opacity: 0.5;
  font-size: 1.125rem;
  height: 1.125rem;
  min-height: 1.125rem;
  z-index: 1001;
  pointer-events: none;
`;

const NoExifMessage = styled.p`
  color: rgba(255, 255, 255, 0.5);
  font-family: "DM Mono", monospace;
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

function MomentLayout({
  exifData,
  locationData,
  weatherData,
  dominantColor,
  textColor,
  imageData,
  imageRef,
  onImageLoad,
  onImageError,
  isVisible = true,
  savedMomentId
}) {
  const [copyButtonText, setCopyButtonText] = useState("Copy Link");

  const dateInfo = exifData?.DateTimeOriginal
    ? formatDate(exifData.DateTimeOriginal)
    : null;
  const hasGPS = exifData?.latitude && exifData?.longitude;

  // Offset the map center slightly to position the marker higher in the viewport
  const mapCenter = hasGPS
    ? [exifData.latitude - 0.001, exifData.longitude]
    : null;

  const handleCopyLink = async () => {
    if (!savedMomentId) return;

    const url = `${window.location.origin}/${savedMomentId}`;

    try {
      await navigator.clipboard.writeText(url);
      setCopyButtonText("Copied!");
      setTimeout(() => {
        setCopyButtonText("Copy Link");
      }, 2000);
    } catch (error) {
      console.error("Failed to copy link:", error);
      setCopyButtonText("Failed");
      setTimeout(() => {
        setCopyButtonText("Copy Link");
      }, 2000);
    }
  };

  return (
    <ContentWrapper $isVisible={isVisible}>
      <LeftColumn>
        <LocationSection>
          {locationData && (
            <LocationCard $bgColor={dominantColor} $textColor={textColor}>
              <LocationPlaceName>
                {locationData.line1 || "Location"}
              </LocationPlaceName>
              {locationData.line2 && (
                <LocationAddress>{locationData.line2}</LocationAddress>
              )}
              {locationData.line3 && (
                <LocationAddress>{locationData.line3}</LocationAddress>
              )}
              {locationData.line4 && (
                <LocationAddress>{locationData.line4}</LocationAddress>
              )}
            </LocationCard>
          )}

          {hasGPS && !locationData && (
            <LocationCard $bgColor={dominantColor} $textColor={textColor}>
              <LocationPlaceName>Location</LocationPlaceName>
              <LocationAddress>
                {exifData.latitude.toFixed(6)}, {exifData.longitude.toFixed(6)}
              </LocationAddress>
            </LocationCard>
          )}
        </LocationSection>

        <DateMapSection>
          {(dateInfo || weatherData) && (
            <DateWeatherWrapper>
              {dateInfo && (
                <DateCard $bgColor={dominantColor} $textColor={textColor}>
                  <span>{dateInfo.date}</span>
                  <span>{dateInfo.time}</span>
                </DateCard>
              )}

              {weatherData && (
                <WeatherCard $bgColor={dominantColor} $textColor={textColor}>
                  <div>{weatherData.description}</div>
                  <div>{weatherData.temperature}°F</div>
                </WeatherCard>
              )}
            </DateWeatherWrapper>
          )}

          {hasGPS && (
            <MapWrapper $overlayColor={dominantColor}>
              <MapContainer
                key={`${exifData.latitude}-${exifData.longitude}`}
                center={mapCenter}
                zoom={14}
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
                <Circle
                  center={[exifData.latitude, exifData.longitude]}
                  radius={50}
                  pathOptions={{
                    color: dominantColor || "white",
                    fillColor: dominantColor || "white",
                    fillOpacity: 1,
                    weight: 0,
                    opacity: 1
                  }}
                />
              </MapContainer>
              <MapCoords $textColor={textColor}>
                <span>{exifData.latitude.toFixed(6)}</span>
                <span>{exifData.longitude.toFixed(6)}</span>
              </MapCoords>
            </MapWrapper>
          )}

          {!dateInfo && !hasGPS && (
            <NoExifMessage>No EXIF data found</NoExifMessage>
          )}
        </DateMapSection>
      </LeftColumn>

      <RightColumn>
        {savedMomentId && (
          <CopyLinkButton onClick={handleCopyLink}>
            {copyButtonText}
          </CopyLinkButton>
        )}
        <PreviewImage
          ref={imageRef}
          src={imageData}
          alt="Moment"
          onLoad={onImageLoad}
          onError={onImageError}
        />
      </RightColumn>
    </ContentWrapper>
  );
}

export default MomentLayout;
