import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { formatDate } from "../utils/formatDate";
import LocationInfoCard from "./cards/Address";
import DateTimeCard from "./cards/Date";
import WeatherInfoCard from "./cards/Weather";
import MapCard from "./cards/Map";

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

const DateWeatherWrapper = styled.div`
  display: flex;
  gap: 2rem;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const PreviewImage = styled.img`
  flex: 1;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 0.75rem;
  user-select: none;
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

const NoExifMessage = styled.p`
  color: rgba(255, 255, 255, 0.5);
  font-family: "DM Mono", monospace;
`;

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
  const [currentLocationData, setCurrentLocationData] = useState(locationData);

  // Update currentLocationData when locationData prop changes
  useEffect(() => {
    setCurrentLocationData(locationData);
  }, [locationData]);

  const dateInfo = exifData?.DateTimeOriginal
    ? formatDate(exifData.DateTimeOriginal)
    : null;
  const hasGPS = exifData?.latitude && exifData?.longitude;

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

  const handleLocationUpdate = (updatedLocationData) => {
    setCurrentLocationData(updatedLocationData);
  };

  return (
    <ContentWrapper $isVisible={isVisible}>
      <LeftColumn>
        <LocationInfoCard
          locationData={currentLocationData}
          exifData={exifData}
          dominantColor={dominantColor}
          textColor={textColor}
          momentId={savedMomentId}
          onLocationUpdate={handleLocationUpdate}
        />

        <DateMapSection>
          {(dateInfo || weatherData) && (
            <DateWeatherWrapper>
              <DateTimeCard
                dateInfo={dateInfo}
                dominantColor={dominantColor}
                textColor={textColor}
              />
              <WeatherInfoCard
                weatherData={weatherData}
                dominantColor={dominantColor}
                textColor={textColor}
              />
            </DateWeatherWrapper>
          )}

          <MapCard
            exifData={exifData}
            dominantColor={dominantColor}
            textColor={textColor}
          />

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
