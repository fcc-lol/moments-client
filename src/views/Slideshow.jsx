import React, { useState, useEffect } from "react";
import styled from "styled-components";
import MomentLayout from "../components/Grid";

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

const SLIDESHOW_INTERVAL = 5000; // 5 seconds per slide

function SlideShowView() {
  const [momentIds, setMomentIds] = useState([]);
  const [moments, setMoments] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const hasShownRef = React.useRef(false);

  // Fetch moment IDs and load first two moments
  useEffect(() => {
    const fetchInitialMoments = async () => {
      try {
        // First, get all moment IDs
        const idsResponse = await fetch(`${SERVER_URL}/moments`);

        if (!idsResponse.ok) {
          const data = await idsResponse.json();
          throw new Error(data.error || "Failed to load moments");
        }

        const ids = await idsResponse.json();
        if (!ids || ids.length === 0) {
          throw new Error("No moments available");
        }

        setMomentIds(ids);

        // Load first two moments
        const initialMoments = await Promise.all(
          ids.slice(0, 2).map((id) =>
            fetch(`${SERVER_URL}/moments/${id}`).then((res) => {
              if (!res.ok) throw new Error(`Failed to load moment ${id}`);
              return res.json();
            })
          )
        );

        setMoments(initialMoments);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchInitialMoments();
  }, []);

  // Load next moment when currentIndex changes
  useEffect(() => {
    const loadNextMoment = async () => {
      if (momentIds.length === 0) return;

      const nextIndex = (currentIndex + 1) % momentIds.length;

      // Check if we already have the next moment loaded
      if (moments[nextIndex]) {
        // Preload the next image
        const imageData =
          moments[nextIndex].imageUrl || moments[nextIndex].imageData;
        let imageUrl = imageData;
        if (imageUrl && !imageUrl.startsWith("http")) {
          imageUrl = imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`;
          imageUrl = `${SERVER_URL}${imageUrl}`;
        }

        // Create an image element to preload
        const img = new Image();
        img.src = imageUrl;

        return;
      }

      try {
        const nextMomentId = momentIds[nextIndex];
        const response = await fetch(`${SERVER_URL}/moments/${nextMomentId}`);

        if (!response.ok) {
          console.error(`Failed to load moment ${nextMomentId}`);
          return;
        }

        const momentData = await response.json();

        // Insert the moment at the correct index
        setMoments((prevMoments) => {
          const newMoments = [...prevMoments];
          newMoments[nextIndex] = momentData;
          return newMoments;
        });

        // Preload the next image
        const imageData = momentData.imageUrl || momentData.imageData;
        let imageUrl = imageData;
        if (imageUrl && !imageUrl.startsWith("http")) {
          imageUrl = imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`;
          imageUrl = `${SERVER_URL}${imageUrl}`;
        }

        // Create an image element to preload
        const img = new Image();
        img.src = imageUrl;
      } catch (err) {
        console.error("Error loading next moment:", err);
      }
    };

    loadNextMoment();
  }, [currentIndex, momentIds, moments]);

  // Reset states when currentIndex changes and handle visibility
  useEffect(() => {
    setImageLoaded(false);
    setIsVisible(false);
    hasShownRef.current = false;

    let fallbackTimer = null;

    // If moment exists, set a short timeout to show it regardless of image load
    // This ensures we don't get stuck on black screen
    fallbackTimer = setTimeout(() => {
      if (!hasShownRef.current && moments[currentIndex] && !loading) {
        hasShownRef.current = true;
        setIsVisible(true);
      }
    }, 200);

    return () => {
      clearTimeout(fallbackTimer);
    };
  }, [currentIndex, moments, loading]);

  // Handle image load - fade in content immediately
  useEffect(() => {
    if (imageLoaded && !loading && !hasShownRef.current) {
      hasShownRef.current = true;
      setIsVisible(true);
    }
  }, [imageLoaded, loading]);

  // Auto-advance slideshow
  useEffect(() => {
    if (momentIds.length === 0) return;

    const interval = setInterval(() => {
      // Fade out current moment
      setIsVisible(false);

      // Wait for fade-out animation, then change index
      setTimeout(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % momentIds.length);
      }, 300); // Match the fade-out transition duration
    }, SLIDESHOW_INTERVAL);

    return () => clearInterval(interval);
  }, [momentIds.length]);

  const handleImageLoad = (e) => {
    setImageLoaded(true);
  };

  const handleImageError = () => {
    // Skip to next image on error
    setCurrentIndex((prevIndex) => (prevIndex + 1) % momentIds.length);
  };

  // Check if image is already loaded (for cached images)
  useEffect(() => {
    // Check immediately and then again after a small delay
    const checkImage = () => {
      const img = document.querySelector(`img[alt="Moment"]`);
      if (img && img.complete && img.naturalHeight !== 0) {
        setImageLoaded(true);
      }
    };

    checkImage(); // Check immediately

    const timer = setTimeout(checkImage, 50); // Check again after delay

    return () => clearTimeout(timer);
  }, [currentIndex]);

  if (error) {
    return (
      <Container>
        <ErrorMessage>{error}</ErrorMessage>
      </Container>
    );
  }

  if (loading || momentIds.length === 0) {
    return <Container />;
  }

  const moment = moments[currentIndex];

  // If moment isn't loaded yet, show nothing
  if (!moment) {
    return <Container />;
  }

  // Construct full image URL
  const imageData = moment.imageUrl || moment.imageData;
  let imageUrl = imageData;
  if (imageUrl && !imageUrl.startsWith("http")) {
    imageUrl = imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`;
    imageUrl = `${SERVER_URL}${imageUrl}`;
  }

  return (
    <Container>
      <MomentLayout
        key={`moment-${currentIndex}-${moment.id}`}
        exifData={moment.exifData}
        locationData={moment.locationData}
        weatherData={moment.weatherData}
        dominantColor={moment.dominantColor}
        textColor={moment.textColor}
        imageData={imageUrl}
        isVisible={isVisible}
        onImageLoad={handleImageLoad}
        onImageError={handleImageError}
      />
    </Container>
  );
}

export default SlideShowView;
