import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import styled from "styled-components";
import MomentLayout from "../components/MomentLayout";
import { formatDate } from "../utils/formatDate";

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

const Container = styled.div`
  display: flex;
  height: 100%;
  background: #000;
  color: #fff;
`;

const ErrorMessage = styled.p`
  color: rgba(255, 255, 255, 0.5);
  font-family: "DM Mono", monospace;
  margin: auto;
  text-transform: uppercase;
  padding-bottom: 2rem;
`;

const LoadingMessage = styled.p`
  color: rgba(255, 255, 255, 0.5);
  font-family: "DM Mono", monospace;
  margin: auto;
  text-transform: uppercase;
  padding-bottom: 2rem;
  animation: ${(props) => (props.$isLoading ? "fadeIn" : "fadeOut")} 0.4s
    ease-in-out forwards;

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes fadeOut {
    from {
      opacity: 1;
    }
    to {
      opacity: 0;
    }
  }
`;

function MomentView() {
  const { id } = useParams();
  const [moment, setMoment] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [showLoading, setShowLoading] = useState(true);
  const [loadingFadingOut, setLoadingFadingOut] = useState(false);

  useEffect(() => {
    const fetchMoment = async () => {
      // Reset states when loading new moment
      setIsVisible(false);
      setShowLoading(true);
      setLoadingFadingOut(false);
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${SERVER_URL}/moments/${id}`);

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to load moment");
        }

        const data = await response.json();
        setMoment(data);

        // Start fading out the loading message
        setLoadingFadingOut(true);

        // Wait for fade-out animation to complete
        setTimeout(() => {
          setLoading(false);
          setShowLoading(false);

          // Fade in the content after a brief delay
          setTimeout(() => {
            setIsVisible(true);
          }, 50);
        }, 400); // Match the fadeOut animation duration
      } catch (err) {
        setError(err.message);
        setLoading(false);
        setShowLoading(false);
      }
    };

    fetchMoment();
  }, [id]);

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

  if (showLoading) {
    return (
      <Container>
        <LoadingMessage $isLoading={!loadingFadingOut}>Loading</LoadingMessage>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <ErrorMessage>{error}</ErrorMessage>
      </Container>
    );
  }

  if (!moment) {
    return (
      <Container>
        <ErrorMessage>Moment not found</ErrorMessage>
      </Container>
    );
  }

  return (
    <Container>
      <MomentLayout
        exifData={moment.exifData}
        locationData={moment.locationData}
        weatherData={moment.weatherData}
        dominantColor={moment.dominantColor}
        textColor={moment.textColor}
        imageData={moment.imageData}
        isVisible={isVisible}
      />
    </Container>
  );
}

export default MomentView;
