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

// Helper function to shuffle array
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

function SlideShowView() {
  const [momentIds, setMomentIds] = useState([]);
  const [moments, setMoments] = useState([]);
  const [shuffledIndices, setShuffledIndices] = useState([]);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const hasShownRef = React.useRef(false);
  const preloadedImagesRef = React.useRef({});

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

        // Create shuffled indices array
        const indices = ids.map((_, i) => i);
        const shuffled = shuffleArray(indices);
        setShuffledIndices(shuffled);

        // Load first two moments using shuffled order
        const initialMoments = await Promise.all(
          shuffled.slice(0, 2).map((idx) =>
            fetch(`${SERVER_URL}/moments/${ids[idx]}`).then((res) => {
              if (!res.ok) throw new Error(`Failed to load moment ${ids[idx]}`);
              return res.json();
            })
          )
        );

        // Store moments in their shuffled order
        const momentsArray = new Array(ids.length);
        shuffled.slice(0, 2).forEach((idx, i) => {
          momentsArray[idx] = initialMoments[i];
        });
        setMoments(momentsArray);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchInitialMoments();
  }, []);

  // Load next moment when currentPosition changes
  useEffect(() => {
    const loadNextMoment = async () => {
      if (momentIds.length === 0 || shuffledIndices.length === 0) return;

      const nextPosition = (currentPosition + 1) % shuffledIndices.length;
      const nextIndex = shuffledIndices[nextPosition];

      // Check if we already have the next moment loaded
      if (moments[nextIndex]) {
        // Preload the next image if not already preloaded
        const imageData =
          moments[nextIndex].imageUrl || moments[nextIndex].imageData;
        let imageUrl = imageData;
        if (imageUrl && !imageUrl.startsWith("http")) {
          imageUrl = imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`;
          imageUrl = `${SERVER_URL}${imageUrl}`;
        }

        // Only preload if we haven't already
        if (!preloadedImagesRef.current[nextIndex]) {
          const img = new Image();
          img.onload = () => {
            preloadedImagesRef.current[nextIndex] = img;
          };
          img.onerror = () => {
            console.error(`Failed to preload image for moment ${nextIndex}`);
          };
          img.src = imageUrl;
        }

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

        // Create an image element to preload and store it
        const img = new Image();
        img.onload = () => {
          preloadedImagesRef.current[nextIndex] = img;
        };
        img.onerror = () => {
          console.error(`Failed to preload image for moment ${nextIndex}`);
        };
        img.src = imageUrl;
      } catch (err) {
        console.error("Error loading next moment:", err);
      }
    };

    loadNextMoment();
  }, [currentPosition, momentIds, moments, shuffledIndices]);

  // Reset states when currentPosition changes
  useEffect(() => {
    setImageLoaded(false);
    setIsVisible(false);
    hasShownRef.current = false;
  }, [currentPosition]);

  // Handle visibility - single source of truth
  useEffect(() => {
    if (hasShownRef.current) return;

    // If image is loaded, show immediately
    if (imageLoaded && !loading) {
      hasShownRef.current = true;
      setIsVisible(true);
      return;
    }

    // Otherwise, set a fallback timeout
    const fallbackTimer = setTimeout(() => {
      if (
        !hasShownRef.current &&
        shuffledIndices.length > 0 &&
        moments[shuffledIndices[currentPosition]] &&
        !loading
      ) {
        hasShownRef.current = true;
        setIsVisible(true);
      }
    }, 200);

    return () => {
      clearTimeout(fallbackTimer);
    };
  }, [imageLoaded, loading, moments, currentPosition, shuffledIndices]);

  // Auto-advance slideshow
  useEffect(() => {
    if (momentIds.length === 0 || shuffledIndices.length === 0) return;

    const interval = setInterval(() => {
      // Fade out current moment
      setIsVisible(false);

      // Wait for fade-out animation, then change position
      setTimeout(() => {
        setCurrentPosition((prevPosition) => {
          const nextPosition = prevPosition + 1;

          // If we've reached the end, reshuffle
          if (nextPosition >= shuffledIndices.length) {
            const currentIndex = shuffledIndices[prevPosition];
            let newShuffled = shuffleArray(momentIds.map((_, i) => i));

            // Make sure the first image of the new shuffle isn't the same as the last image
            // of the previous shuffle (avoid same image twice in a row)
            if (momentIds.length > 1 && newShuffled[0] === currentIndex) {
              // Swap the first element with any other element
              const swapIndex =
                Math.floor(Math.random() * (newShuffled.length - 1)) + 1;
              [newShuffled[0], newShuffled[swapIndex]] = [
                newShuffled[swapIndex],
                newShuffled[0]
              ];
            }

            setShuffledIndices(newShuffled);
            return 0;
          }

          return nextPosition;
        });
      }, 300); // Match the fade-out transition duration
    }, SLIDESHOW_INTERVAL);

    return () => clearInterval(interval);
  }, [momentIds, shuffledIndices]);

  const handleImageLoad = (e) => {
    setImageLoaded(true);
  };

  const handleImageError = () => {
    // Skip to next image on error
    setCurrentPosition((prevPosition) => {
      const nextPosition = prevPosition + 1;
      if (nextPosition >= shuffledIndices.length) {
        return 0; // Loop back to start
      }
      return nextPosition;
    });
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
  }, [currentPosition]);

  if (error) {
    return (
      <Container>
        <ErrorMessage>{error}</ErrorMessage>
      </Container>
    );
  }

  if (loading || momentIds.length === 0 || shuffledIndices.length === 0) {
    return <Container />;
  }

  const currentIndex = shuffledIndices[currentPosition];
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
        key={`moment-${currentPosition}-${moment.id}`}
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
