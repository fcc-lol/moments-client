import React, { useState, useRef, useEffect } from "react";
import { flushSync } from "react-dom";
import styled from "styled-components";
import exifr from "exifr";
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
  const [exifData, setExifData] = useState(null);
  const [dominantColor, setDominantColor] = useState(null);
  const [textColor, setTextColor] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [locationData, setLocationData] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [isContentVisible, setIsContentVisible] = useState(false);
  const [currentImageFile, setCurrentImageFile] = useState(null);
  const [savedMomentId, setSavedMomentId] = useState(null);
  const [isWaitingForServer, setIsWaitingForServer] = useState(false);
  const [showProcessing, setShowProcessing] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const imageRef = useRef(null);
  const overlayTimeoutRef = useRef(null);
  const dragCounterRef = useRef(0);
  const currentMetadataRef = useRef({
    exif: null,
    location: null,
    weather: null
  });
  const metadataReadyRef = useRef(false);
  const imageLoadedRef = useRef(false);
  const pendingColorsRef = useRef(null);
  const processingIdRef = useRef(0); // Unique ID for each image processing cycle

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
    if (isLoading || isWaitingForServer) {
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
  }, [isLoading, isWaitingForServer, showProcessing]);

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
    // Increment processing ID to track this specific image
    processingIdRef.current += 1;
    const currentProcessingId = processingIdRef.current;

    // Fade out immediately if there's existing content
    if (imagePreview) {
      setIsContentVisible(false);
      // Small delay to let fade out complete
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Force synchronous clearing of all state to prevent stale data
    flushSync(() => {
      setImagePreview(null);
      setExifData(null);
      setLocationData(null);
      setWeatherData(null);
      setDominantColor(null);
      setTextColor(null);
      setSavedMomentId(null);
      setIsWaitingForServer(false);
      setShowProcessing(false);
      setIsFadingOut(false);
      setIsContentVisible(false);
    });

    // Clear refs
    metadataReadyRef.current = false;
    imageLoadedRef.current = false;
    pendingColorsRef.current = null;
    currentMetadataRef.current = {
      exif: null,
      location: null,
      weather: null
    };

    // Set loading and current file after state is cleared
    setIsLoading(true);
    setCurrentImageFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      // Only update preview if this is still the current processing cycle
      if (currentProcessingId === processingIdRef.current) {
        setImagePreview(e.target.result);
      }
    };
    reader.readAsDataURL(file);

    // Extract EXIF data and fetch location/weather
    try {
      const exif = await exifr.parse(file, {
        tiff: true,
        exif: true,
        gps: true,
        iptc: true
      });

      // Check if this is still the current processing cycle
      if (currentProcessingId !== processingIdRef.current) {
        console.log("Skipping EXIF update for outdated image");
        return;
      }

      if (exif) {
        setExifData(exif);
        currentMetadataRef.current.exif = exif;

        // Fetch weather data if GPS data and date exist
        if (exif.latitude && exif.longitude && exif.DateTimeOriginal) {
          const weather = await fetchWeatherData(
            exif.latitude,
            exif.longitude,
            exif.DateTimeOriginal,
            currentProcessingId
          );

          // Check again after async weather fetch
          if (currentProcessingId !== processingIdRef.current) {
            console.log("Skipping weather update for outdated image");
            return;
          }

          currentMetadataRef.current.weather = weather;
        } else {
          setWeatherData(null);
          currentMetadataRef.current.weather = null;
        }

        // Location will be fetched by the server during save
        currentMetadataRef.current.location = null;
      } else {
        setExifData(null);
        setLocationData(null);
        setWeatherData(null);
        currentMetadataRef.current.exif = null;
        currentMetadataRef.current.location = null;
        currentMetadataRef.current.weather = null;
      }
    } catch (error) {
      console.error("Error reading EXIF data:", error);

      // Check if still current before updating error state
      if (currentProcessingId !== processingIdRef.current) {
        return;
      }

      setExifData(null);
      setLocationData(null);
      currentMetadataRef.current.exif = null;
      currentMetadataRef.current.location = null;
      currentMetadataRef.current.weather = null;
    }

    // Check one final time before marking as ready
    if (currentProcessingId !== processingIdRef.current) {
      return;
    }

    // Mark metadata as ready and trigger save if image is already loaded
    metadataReadyRef.current = true;
    if (imageLoadedRef.current && pendingColorsRef.current) {
      setIsLoading(false);
      setIsWaitingForServer(true);
      saveMoment(
        pendingColorsRef.current,
        currentMetadataRef.current.location,
        currentMetadataRef.current.weather,
        currentMetadataRef.current.exif,
        currentProcessingId
      );
    }
  };

  const fetchWeatherData = async (lat, lng, dateTime, processingId) => {
    try {
      // Format date for API (YYYY-MM-DD)
      const date = new Date(dateTime);
      const dateStr = date.toISOString().split("T")[0];

      // Fetch historical weather data
      const response = await fetch(
        `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${dateStr}&end_date=${dateStr}&hourly=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=auto`
      );

      // Check if this is still the current image being processed
      if (processingId !== processingIdRef.current) {
        console.log("Weather fetch aborted - outdated image");
        return null;
      }

      if (response.ok) {
        const data = await response.json();

        // Check again after async JSON parsing
        if (processingId !== processingIdRef.current) {
          console.log("Weather fetch aborted - outdated image");
          return null;
        }

        if (data.hourly && data.hourly.time && data.hourly.time.length > 0) {
          // Find the closest hour to the photo time
          const photoTime = date.getTime();
          let closestIndex = 0;
          let closestDiff = Math.abs(
            new Date(data.hourly.time[0]).getTime() - photoTime
          );

          for (let i = 1; i < data.hourly.time.length; i++) {
            const diff = Math.abs(
              new Date(data.hourly.time[i]).getTime() - photoTime
            );
            if (diff < closestDiff) {
              closestDiff = diff;
              closestIndex = i;
            }
          }

          const temperature = data.hourly.temperature_2m[closestIndex];
          const weatherCode = data.hourly.weather_code[closestIndex];

          // Weather code descriptions based on WMO Weather interpretation codes
          const weatherDescriptions = {
            0: "Clear sky",
            1: "Mainly clear",
            2: "Partly cloudy",
            3: "Overcast",
            45: "Foggy",
            48: "Depositing rime fog",
            51: "Light drizzle",
            53: "Moderate drizzle",
            55: "Dense drizzle",
            56: "Light freezing drizzle",
            57: "Dense freezing drizzle",
            61: "Slight rain",
            63: "Moderate rain",
            65: "Heavy rain",
            66: "Light freezing rain",
            67: "Heavy freezing rain",
            71: "Slight snow fall",
            73: "Moderate snow fall",
            75: "Heavy snow fall",
            77: "Snow grains",
            80: "Slight rain showers",
            81: "Moderate rain showers",
            82: "Violent rain showers",
            85: "Slight snow showers",
            86: "Heavy snow showers",
            95: "Thunderstorm",
            96: "Thunderstorm with slight hail",
            99: "Thunderstorm with heavy hail"
          };

          const weatherInfo = {
            temperature: Math.round(temperature),
            description:
              weatherDescriptions[weatherCode] || "Unknown conditions"
          };

          // Only update state if still the current image
          if (processingId === processingIdRef.current) {
            setWeatherData(weatherInfo);
          }
          return weatherInfo;
        }
      }

      // Only update state if still the current image
      if (processingId === processingIdRef.current) {
        setWeatherData(null);
      }
      return null;
    } catch (error) {
      console.error("Error fetching weather data:", error);
      // Only update state if still the current image
      if (processingId === processingIdRef.current) {
        setWeatherData(null);
      }
      return null;
    }
  };

  const saveMoment = async (colors, location, weather, exif, processingId) => {
    // Check if this is still the current image being processed
    if (processingId !== processingIdRef.current) {
      console.log("Skipping save for outdated image processing cycle");
      return;
    }

    // Only save if we have an image file and all data is ready
    if (!currentImageFile) {
      console.warn("No image file to save");
      setIsLoading(false);
      setIsWaitingForServer(false);
      setTimeout(() => {
        setIsContentVisible(true);
      }, 350);
      return;
    }

    try {
      // Get API key from URL parameters
      const params = new URLSearchParams(window.location.search);
      const apiKey = params.get("fccApiKey") || params.get("apiKey");

      if (!apiKey) {
        console.warn("No API key available for saving");
        setIsLoading(false);
        setIsWaitingForServer(false);
        setTimeout(() => {
          setIsContentVisible(true);
        }, 350);
        return;
      }

      // Prepare form data
      const formData = new FormData();
      formData.append("image", currentImageFile);
      formData.append("apiKey", apiKey);

      // Add coordinates as separate fields
      if (exif && exif.latitude && exif.longitude) {
        formData.append("lat", exif.latitude);
        formData.append("lng", exif.longitude);
      }

      // Add metadata as JSON strings
      if (exif) {
        // Only include relevant EXIF fields to avoid circular references
        const cleanExifData = {
          latitude: exif.latitude,
          longitude: exif.longitude,
          DateTimeOriginal: exif.DateTimeOriginal,
          Make: exif.Make,
          Model: exif.Model,
          LensModel: exif.LensModel,
          FNumber: exif.FNumber,
          ExposureTime: exif.ExposureTime,
          ISO: exif.ISO,
          FocalLength: exif.FocalLength
        };
        formData.append("exifData", JSON.stringify(cleanExifData));
      }

      if (weather) {
        formData.append("weatherData", JSON.stringify(weather));
      }

      if (colors.dominantColor) {
        formData.append("dominantColor", colors.dominantColor);
      }

      if (colors.textColor) {
        formData.append("textColor", colors.textColor);
      }

      // Send to server
      const response = await fetch(`${SERVER_URL}/save-moment`, {
        method: "POST",
        body: formData
      });

      if (response.ok) {
        const data = await response.json();

        // Check if still current image
        if (processingId !== processingIdRef.current) {
          return;
        }

        // Update location data first
        if (data.locationData) {
          flushSync(() => {
            setLocationData(data.locationData);
          });
        }

        // Then update other states
        flushSync(() => {
          setSavedMomentId(data.momentId);
          setIsLoading(false);
          setIsWaitingForServer(false);
        });

        // Wait for Processing fade out, then show content
        setTimeout(() => {
          flushSync(() => {
            setIsContentVisible(true);
          });
        }, 300);
      } else {
        const errorData = await response.json();
        console.error("Failed to save moment:", errorData.error);

        // Stop loading states first
        setIsLoading(false);
        setIsWaitingForServer(false);

        // Show content even on error after fade out
        setTimeout(() => {
          setIsContentVisible(true);
        }, 350);
      }
    } catch (error) {
      console.error("Error saving moment:", error);

      // Stop loading states first
      setIsLoading(false);
      setIsWaitingForServer(false);

      // Show content even on error after fade out
      setTimeout(() => {
        setIsContentVisible(true);
      }, 350);
    }
  };

  const handleImageLoad = () => {
    if (imageRef.current) {
      try {
        const img = imageRef.current;

        // Check if image has valid dimensions
        if (!img.width || !img.height || img.width === 0 || img.height === 0) {
          console.warn("Image dimensions not ready");
          setIsLoading(false);
          // Will wait for server response to show content
          return;
        }

        // Create a canvas to analyze the image
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        // Scale down for performance (sample every nth pixel)
        const scaleFactor = 0.1;
        canvas.width = Math.max(1, Math.floor(img.width * scaleFactor));
        canvas.height = Math.max(1, Math.floor(img.height * scaleFactor));

        // Draw the scaled down image
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Get pixel data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;

        // Calculate average color
        let r = 0,
          g = 0,
          b = 0;
        let pixelCount = 0;

        for (let i = 0; i < pixels.length; i += 4) {
          r += pixels[i];
          g += pixels[i + 1];
          b += pixels[i + 2];
          pixelCount++;
        }

        // Average color
        const avgColor = [
          Math.round(r / pixelCount),
          Math.round(g / pixelCount),
          Math.round(b / pixelCount)
        ];

        // Helper function to calculate perceived brightness (0-255)
        const getBrightness = (rgb) => {
          return (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
        };

        // Apply minimal brightening if needed
        const brightness = getBrightness(avgColor);
        let finalColor = avgColor;

        if (brightness < 120) {
          // Only brighten if quite dark
          const factor = 120 / brightness;
          finalColor = avgColor.map((c) =>
            Math.min(255, Math.round(c * factor))
          );
        } else if (brightness < 160) {
          // Subtle brightening for medium-dark colors
          finalColor = avgColor.map((c) => Math.min(255, c + (255 - c) * 0.3));
        }

        // Create a brighter version for text
        const textBrightness = getBrightness(finalColor);
        let textColorRgb = finalColor;

        if (textBrightness < 200) {
          // Brighten more aggressively for text
          textColorRgb = finalColor.map((c) =>
            Math.min(255, c + (255 - c) * 0.6)
          );
        }

        const dominantColorStr = `rgb(${Math.round(
          finalColor[0]
        )}, ${Math.round(finalColor[1])}, ${Math.round(finalColor[2])})`;

        const textColorStr = `rgb(${Math.round(textColorRgb[0])}, ${Math.round(
          textColorRgb[1]
        )}, ${Math.round(textColorRgb[2])})`;

        const colors = {
          dominantColor: dominantColorStr,
          textColor: textColorStr
        };

        // Small delay to ensure map has rendered, then set colors
        setTimeout(() => {
          // Get the current processing ID to check if still valid
          const currentId = processingIdRef.current;

          setDominantColor(colors.dominantColor);
          setTextColor(colors.textColor);

          // Mark image as loaded and save if metadata is ready
          imageLoadedRef.current = true;
          pendingColorsRef.current = colors;

          if (metadataReadyRef.current) {
            setIsLoading(false);
            setIsWaitingForServer(true);
            saveMoment(
              colors,
              currentMetadataRef.current.location,
              currentMetadataRef.current.weather,
              currentMetadataRef.current.exif,
              currentId
            );
          } else {
            // Keep loading state active until metadata is ready
            // This prevents a blank screen between image load and metadata ready
          }
        }, 200);
      } catch (error) {
        console.error("Error extracting color:", error);
        const fallbackColors = {
          dominantColor: "rgb(200, 200, 200)",
          textColor: "rgb(230, 230, 230)"
        };
        setTimeout(() => {
          // Get the current processing ID to check if still valid
          const currentId = processingIdRef.current;

          setDominantColor(fallbackColors.dominantColor);
          setTextColor(fallbackColors.textColor);

          // Mark image as loaded and save if metadata is ready
          imageLoadedRef.current = true;
          pendingColorsRef.current = fallbackColors;

          if (metadataReadyRef.current) {
            setIsLoading(false);
            setIsWaitingForServer(true);
            saveMoment(
              fallbackColors,
              currentMetadataRef.current.location,
              currentMetadataRef.current.weather,
              currentMetadataRef.current.exif,
              currentId
            );
          } else {
            // Keep loading state active until metadata is ready
            // This prevents a blank screen between image load and metadata ready
          }
        }, 200);
      }
    } else {
      setTimeout(() => {
        // Get the current processing ID to check if still valid
        const currentId = processingIdRef.current;

        // Mark image as loaded and save if metadata is ready
        imageLoadedRef.current = true;
        pendingColorsRef.current = {};

        if (metadataReadyRef.current) {
          setIsLoading(false);
          setIsWaitingForServer(true);
          saveMoment(
            {},
            currentMetadataRef.current.location,
            currentMetadataRef.current.weather,
            currentMetadataRef.current.exif,
            currentId
          );
        } else {
          // Keep loading state active until metadata is ready
          // This prevents a blank screen between image load and metadata ready
        }
      }, 200);
    }
  };

  const handleImageError = () => {
    console.error("Error loading image");
    setIsLoading(false);
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

      {imagePreview && !isContentVisible && (
        <img
          ref={imageRef}
          src={imagePreview}
          alt="Processing"
          onLoad={handleImageLoad}
          onError={handleImageError}
          style={{ display: "none" }}
        />
      )}

      {imagePreview && isContentVisible && (
        <MomentLayout
          key={`moment-${processingIdRef.current}`}
          exifData={exifData}
          locationData={locationData}
          weatherData={weatherData}
          dominantColor={dominantColor}
          textColor={textColor}
          imageData={imagePreview}
          imageRef={imageRef}
          onImageLoad={handleImageLoad}
          onImageError={handleImageError}
          isVisible={isContentVisible}
          savedMomentId={savedMomentId}
        />
      )}
    </DropZone>
  );
}

export default HomeView;
