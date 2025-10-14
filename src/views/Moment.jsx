import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import styled from "styled-components";
import MomentLayout from "../components/Grid";
import { formatDate } from "../utils/formatDate";

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

const Container = styled.div`
  display: flex;
  height: 100%;
  background: #000;
  color: #fff;
  position: relative;
`;

const ErrorMessage = styled.p`
  color: rgba(255, 255, 255, 0.5);
  font-family: "DM Mono", monospace;
  margin: auto;
  text-transform: uppercase;
  padding-bottom: 2rem;
`;

const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  background: #000;
  z-index: 10;
  pointer-events: ${(props) => (props.$show ? "auto" : "none")};
  opacity: ${(props) => (props.$show ? 1 : 0)};
  transition: opacity 0.4s ease-in-out;
`;

const LoadingMessage = styled.p`
  color: rgba(255, 255, 255, 0.5);
  font-family: "DM Mono", monospace;
  margin: auto;
  text-transform: uppercase;
  padding-bottom: 2rem;
`;

function MomentView() {
  const { id } = useParams();
  const [moment, setMoment] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [showLoading, setShowLoading] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [locationData, setLocationData] = useState(null);

  useEffect(() => {
    const fetchMoment = async () => {
      // Reset states when loading new moment
      setIsVisible(false);
      setShowLoading(true);
      setLoading(true);
      setError(null);
      setImageLoaded(false);

      try {
        const response = await fetch(`${SERVER_URL}/moments/${id}`);

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to load moment");
        }

        const data = await response.json();
        setMoment(data);
        setLocationData(data.locationData);
        setLoading(false);
        // Don't hide loading message yet - wait for image to load
      } catch (err) {
        setError(err.message);
        setLoading(false);
        setShowLoading(false);
      }
    };

    fetchMoment();
  }, [id]);

  const handleLocationUpdate = (updatedLocationData) => {
    setLocationData(updatedLocationData);
    // Also update the page title
    if (updatedLocationData?.line1) {
      const dateInfo = moment.exifData?.DateTimeOriginal
        ? formatDate(moment.exifData.DateTimeOriginal)
        : null;

      if (dateInfo) {
        document.title = `${updatedLocationData.line1} – ${dateInfo.date}`;
      } else {
        document.title = updatedLocationData.line1;
      }
    }
  };

  // Handle image load - fade out loading and fade in content
  useEffect(() => {
    if (imageLoaded && !loading) {
      // Start fading out the loading message
      setShowLoading(false);

      // Wait for fade-out animation to complete, then fade in content
      setTimeout(() => {
        setIsVisible(true);
      }, 400); // Wait for loading overlay fade-out to complete
    }
  }, [imageLoaded, loading]);

  // Update page title when moment data changes
  useEffect(() => {
    if (moment) {
      const placeName = moment.locationData?.line1 || "Location";
      const dateInfo = moment.exifData?.DateTimeOriginal
        ? formatDate(moment.exifData.DateTimeOriginal)
        : null;

      if (dateInfo) {
        document.title = `${placeName} – ${dateInfo.date}`;
      } else {
        document.title = placeName;
      }
    } else {
      document.title = "Moments";
    }
  }, [moment]);

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleImageError = () => {
    setError("Failed to load image");
    setLoading(false);
    setShowLoading(false);
  };

  if (error) {
    return (
      <Container>
        <ErrorMessage>{error}</ErrorMessage>
      </Container>
    );
  }

  if (!moment) {
    // Still loading data or moment not found
    if (loading) {
      return (
        <Container>
          <LoadingOverlay $show={true}>
            <LoadingMessage>Loading</LoadingMessage>
          </LoadingOverlay>
        </Container>
      );
    }
    return (
      <Container>
        <ErrorMessage>Moment not found</ErrorMessage>
      </Container>
    );
  }

  // Construct full image URL
  const imageData = moment.imageUrl || moment.imageData;
  let imageUrl = imageData;
  if (imageUrl && !imageUrl.startsWith("http")) {
    // If it doesn't start with /, add it
    imageUrl = imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`;
    imageUrl = `${SERVER_URL}${imageUrl}`;
  }

  return (
    <Container>
      <LoadingOverlay $show={showLoading}>
        <LoadingMessage>Loading</LoadingMessage>
      </LoadingOverlay>
      <MomentLayout
        exifData={moment.exifData}
        locationData={locationData}
        weatherData={moment.weatherData}
        dominantColor={moment.dominantColor}
        textColor={moment.textColor}
        imageData={imageUrl}
        isVisible={isVisible}
        onImageLoad={handleImageLoad}
        onImageError={handleImageError}
        savedMomentId={id}
        onLocationUpdate={handleLocationUpdate}
      />
    </Container>
  );
}

export default MomentView;
