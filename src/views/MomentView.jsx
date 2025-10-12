import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import styled from "styled-components";
import MomentLayout from "../components/MomentLayout";

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

function MomentView() {
  const { id } = useParams();
  const [moment, setMoment] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const fetchMoment = async () => {
      // Reset visibility when loading new moment
      setIsVisible(false);

      try {
        const response = await fetch(`${SERVER_URL}/moments/${id}`);

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to load moment");
        }

        const data = await response.json();
        setMoment(data);

        // Fade in after a short delay
        setTimeout(() => {
          setIsVisible(true);
        }, 100);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMoment();
  }, [id]);

  if (loading) {
    return <Container />;
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
