import React, { useState, useRef, useEffect } from "react";
import { flushSync } from "react-dom";
import styled from "styled-components";
import "leaflet/dist/leaflet.css";
import MomentLayout from "../components/Grid";

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

const DropZone = styled.div`
  display: flex;
  height: 100%;
  background: #000;
  color: #fff;
`;

const DropText = styled.p`
  color: rgba(255, 255, 255, 0.5);
  margin: auto;
  font-family: "DM Mono", monospace;
  text-transform: uppercase;
  padding-bottom: 2rem;
`;

const ValidationMessage = styled.div`
  color: ${(props) =>
    props.$isError ? "rgb(255, 100, 100)" : "rgba(255, 255, 255, 0.5)"};
  margin: auto;
  font-family: "DM Mono", monospace;
  text-transform: uppercase;
  text-align: center;
  padding-bottom: 2rem;
`;

const LoadingMessage = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: rgba(255, 255, 255, 0.5);
  font-family: "DM Mono", monospace;
  text-transform: uppercase;
  text-align: center;
  z-index: 10000;
  pointer-events: none;
  padding-bottom: 2rem;
  animation: ${(props) => (props.$isFadingOut ? "fadeOut" : "fadeIn")} 0.3s
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

const DragOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  pointer-events: none;
  z-index: 9999;
  animation: ${(props) => (props.$isActive ? "fadeIn" : "fadeOut")} 0.2s
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

function HomeView() {
  // API Key validation states
  const [isValidatingKey, setIsValidatingKey] = useState(true);
  const [isValidKey, setIsValidKey] = useState(false);
  const [validationError, setValidationError] = useState(null);

  const [isDragging, setIsDragging] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [momentData, setMomentData] = useState(null);
  const [locationData, setLocationData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isContentVisible, setIsContentVisible] = useState(false);
  const [showProcessing, setShowProcessing] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const imageRef = useRef(null);
  const overlayTimeoutRef = useRef(null);
  const dragCounterRef = useRef(0);

  // Validate API key on mount
  useEffect(() => {
    const validateApiKey = async () => {
      try {
        // Get API key from URL parameters
        const params = new URLSearchParams(window.location.search);
        const apiKey = params.get("fccApiKey") || params.get("apiKey");

        if (!apiKey) {
          setValidationError("No API key");
          setIsValidatingKey(false);
          return;
        }

        // Validate the API key with the server
        const response = await fetch(`${SERVER_URL}/validate-api-key`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ apiKey })
        });

        const data = await response.json();

        if (response.ok && data.valid) {
          setIsValidKey(true);
          setValidationError(null);
        } else {
          setIsValidKey(false);
          setValidationError(data.message || "Invalid API key");
        }
      } catch (error) {
        console.error("Error validating API key:", error);
        setValidationError(
          "Failed to validate API key. Please check your connection."
        );
      } finally {
        setIsValidatingKey(false);
      }
    };

    validateApiKey();
  }, []);

  useEffect(() => {
    if (isDragging || isLoading) {
      // Clear any pending hide timeout
      if (overlayTimeoutRef.current) {
        clearTimeout(overlayTimeoutRef.current);
        overlayTimeoutRef.current = null;
      }
      setShowOverlay(true);
    } else {
      // Delay hiding to allow fade-out animation
      overlayTimeoutRef.current = setTimeout(() => {
        setShowOverlay(false);
      }, 200); // Match the fade-out duration
    }

    return () => {
      if (overlayTimeoutRef.current) {
        clearTimeout(overlayTimeoutRef.current);
      }
    };
  }, [isDragging, isLoading]);

  // Handle processing message fade in/out
  useEffect(() => {
    if (isLoading) {
      setShowProcessing(true);
      setIsFadingOut(false);
    } else if (showProcessing) {
      // Start fade out
      setIsFadingOut(true);
      // Remove after animation completes
      const timeout = setTimeout(() => {
        setShowProcessing(false);
        setIsFadingOut(false);
      }, 300); // Match fade-out duration
      return () => clearTimeout(timeout);
    }
  }, [isLoading, showProcessing]);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    setIsDragging(true);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragging(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Reset drag state immediately
    dragCounterRef.current = 0;
    setIsDragging(false);

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];

      // Check if it's an image
      if (file.type.startsWith("image/")) {
        await processImage(file);
      }
    }
  };

  const processImage = async (file) => {
    // Immediately clear all state to unmount old content
    flushSync(() => {
      setImagePreview(null);
      setMomentData(null);
      setLocationData(null);
      setShowProcessing(false);
      setIsFadingOut(false);
      setIsContentVisible(false);
    });

    // Set loading state
    setIsLoading(true);

    // Create preview for display
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);

    // Upload to server and let it do ALL processing
    try {
      // Get API key from URL parameters
      const params = new URLSearchParams(window.location.search);
      const apiKey = params.get("fccApiKey") || params.get("apiKey");

      if (!apiKey) {
        console.warn("No API key available");
        setIsLoading(false);
        return;
      }

      // Prepare form data with just the image
      const formData = new FormData();
      formData.append("image", file);
      formData.append("apiKey", apiKey);

      // Send to server - it will do EXIF extraction, color extraction, geocoding, and weather
      const response = await fetch(`${SERVER_URL}/save-moment`, {
        method: "POST",
        body: formData
      });

      if (response.ok) {
        const data = await response.json();

        // Server returns ALL processed data - store in single state
        flushSync(() => {
          setMomentData({
            momentId: data.momentId,
            exifData: data.exifData,
            locationData: data.locationData,
            weatherData: data.weatherData,
            dominantColor: data.dominantColor,
            textColor: data.textColor
          });
          setLocationData(data.locationData);
          setIsLoading(false);
        });

        // Wait for Processing fade out, then trigger fade-in
        setTimeout(() => {
          setIsContentVisible(true);
        }, 300);
      } else {
        const errorData = await response.json();
        console.error("Failed to save moment:", errorData.error);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error processing image:", error);
      setIsLoading(false);
    }
  };

  const handleLocationUpdate = (updatedLocationData) => {
    setLocationData(updatedLocationData);
  };

  // Show validation message if key is not valid yet
  if (isValidatingKey) {
    return <DropZone />;
  }

  if (!isValidKey) {
    return (
      <DropZone>
        <ValidationMessage $isError={true}>
          {validationError || "Invalid API key"}
        </ValidationMessage>
      </DropZone>
    );
  }

  return (
    <DropZone
      $isDragging={isDragging}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {showOverlay && <DragOverlay $isActive={isDragging || isLoading} />}

      {showProcessing && (
        <LoadingMessage $isFadingOut={isFadingOut}>Processing</LoadingMessage>
      )}

      {!imagePreview && !isLoading && <DropText>Drop image here</DropText>}

      {imagePreview && momentData && (
        <MomentLayout
          exifData={momentData.exifData}
          locationData={locationData}
          weatherData={momentData.weatherData}
          dominantColor={momentData.dominantColor}
          textColor={momentData.textColor}
          imageData={imagePreview}
          imageRef={imageRef}
          onImageLoad={() => {}}
          onImageError={() => {}}
          isVisible={isContentVisible}
          savedMomentId={momentData.momentId}
          onLocationUpdate={handleLocationUpdate}
        />
      )}
    </DropZone>
  );
}

export default HomeView;
