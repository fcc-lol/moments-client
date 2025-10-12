import React, { useState, useRef, useEffect } from "react";
import styled from "styled-components";
import exifr from "exifr";
import { MapContainer, TileLayer, Circle, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

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

const ContentWrapper = styled.div`
  display: flex;
  flex: 1;
  gap: 2rem;
  padding: 2rem;
  opacity: ${(props) => (props.$isVisible ? 1 : 0)};
  transition: opacity 0.3s ease-in-out;
  pointer-events: ${(props) => (props.$isVisible ? "auto" : "none")};
`;

const LeftColumn = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 2rem;
`;

const RightColumn = styled.div`
  display: flex;
  flex: 1;
  min-height: 0;
  min-width: 0;
`;

const Card = styled.div`
  background: ${(props) =>
    props.$bgColor
      ? props.$bgColor.replace("rgb", "rgba").replace(")", ", 0.2)")
      : "rgba(255, 255, 255, 0.1)"};
  border-radius: 0.75rem;
  padding: 1.75rem;
  font-family: "DM Mono", monospace;
`;

const DateCard = styled(Card)`
  color: ${(props) => props.$textColor || "#fff"};
  font-size: 1.125rem;
  line-height: 1.5;
  min-height: 1.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
`;

const LocationCard = styled(Card)`
  color: ${(props) => props.$textColor || "#fff"};
  font-size: 1.125rem;
  line-height: 1.5;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const LocationPlaceName = styled.div`
  text-transform: uppercase;
  font-weight: 600;
  font-size: 1.5rem;
  line-height: 1.5;
  min-height: 2.4rem;
  margin-bottom: 0.5rem;
`;

const LocationAddress = styled.div`
  text-transform: uppercase;
  font-size: 1.125rem;
  line-height: 1.5;
  min-height: 1.75rem;
  opacity: 0.5;
`;

const DateWeatherWrapper = styled.div`
  display: flex;
  gap: 2rem;
`;

const WeatherCard = styled(Card)`
  color: ${(props) => props.$textColor || "#fff"};
  font-size: 1.125rem;
  line-height: 1.5;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  text-transform: uppercase;
  flex: 1;
  align-items: flex-end;
`;

const MapWrapper = styled.div`
  flex: 1;
  min-height: 0;
  border-radius: 0.75rem;
  overflow: hidden;
  position: relative;

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

const PreviewImage = styled.img`
  flex: 1;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 0.75rem;
  user-select: none;
`;

const NoExifMessage = styled.p`
  color: rgba(255, 255, 255, 0.5);
  font-family: "DM Mono", monospace;
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

// Component to fix map size on mount
const MapResizer = ({ center }) => {
  const map = useMap();

  useEffect(() => {
    // Small delay to ensure container has rendered
    const timer = setTimeout(() => {
      map.invalidateSize();
      // Always enforce the center position with offset
      if (center) {
        map.setView(center, map.getZoom(), { animate: false });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [map, center]);

  return null;
};

function App() {
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

  const handleDragEnter = (e) => {
    e.preventDefault();
    dragCounterRef.current++;
    if (dragCounterRef.current > 0) {
      setIsDragging(true);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    dragCounterRef.current = 0;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];

      // Check if it's an image
      if (file.type.startsWith("image/")) {
        await processImage(file);
        setIsDragging(false);
      } else {
        setIsDragging(false);
      }
    } else {
      setIsDragging(false);
    }
  };

  const processImage = async (file) => {
    // Fade out immediately if there's existing content
    if (imagePreview) {
      setIsContentVisible(false);
      // Small delay to let fade out complete
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Set loading immediately to prevent UI flicker
    setIsLoading(true);

    // Clear previous state
    setImagePreview(null);
    setExifData(null);
    setLocationData(null);
    setWeatherData(null);
    setDominantColor(null);
    setTextColor(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);

    // Extract EXIF data
    try {
      const exif = await exifr.parse(file, {
        tiff: true,
        exif: true,
        gps: true,
        iptc: true
      });

      if (exif) {
        setExifData(exif);
        // Fetch location name if GPS data exists
        if (exif.latitude && exif.longitude) {
          fetchLocationName(exif.latitude, exif.longitude);

          // Fetch weather data if we have both GPS and date
          if (exif.DateTimeOriginal) {
            fetchWeatherData(
              exif.latitude,
              exif.longitude,
              exif.DateTimeOriginal
            );
          }
        } else {
          setLocationData(null);
        }
      } else {
        setExifData(null);
        setLocationData(null);
        setWeatherData(null);
      }
    } catch (error) {
      console.error("Error reading EXIF data:", error);
      setExifData(null);
      setLocationData(null);
    }
  };

  const fetchLocationName = async (lat, lng) => {
    try {
      // Get API key from URL parameters
      const params = new URLSearchParams(window.location.search);
      const apiKey = params.get("fccApiKey") || params.get("apiKey");

      if (!apiKey) {
        console.warn("No API key available");
        setLocationData(null);
        return;
      }

      // Call server endpoint for geocoding
      const response = await fetch(`${SERVER_URL}/geocode-location`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          apiKey,
          lat,
          lng
        })
      });

      if (response.ok) {
        const data = await response.json();
        setLocationData(data);
      } else {
        console.error("Error fetching location:", await response.text());
        setLocationData(null);
      }
    } catch (error) {
      console.error("Error fetching location name:", error);
      setLocationData(null);
    }
  };

  const fetchWeatherData = async (lat, lng, dateTime) => {
    try {
      // Format date for API (YYYY-MM-DD)
      const date = new Date(dateTime);
      const dateStr = date.toISOString().split("T")[0];

      // Fetch historical weather data
      const response = await fetch(
        `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${dateStr}&end_date=${dateStr}&hourly=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=auto`
      );

      if (response.ok) {
        const data = await response.json();

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

          setWeatherData({
            temperature: Math.round(temperature),
            description:
              weatherDescriptions[weatherCode] || "Unknown conditions"
          });
          return;
        }
      }

      setWeatherData(null);
    } catch (error) {
      console.error("Error fetching weather data:", error);
      setWeatherData(null);
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
          setTimeout(() => {
            setIsContentVisible(true);
          }, 200);
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

        setIsLoading(false);
        // Small delay to ensure map has rendered, then set colors and fade in
        setTimeout(() => {
          setDominantColor(dominantColorStr);
          setTextColor(textColorStr);
          setIsContentVisible(true);
        }, 200);
      } catch (error) {
        console.error("Error extracting color:", error);
        setIsLoading(false);
        setTimeout(() => {
          setDominantColor("rgb(200, 200, 200)"); // Fallback color
          setTextColor("rgb(230, 230, 230)"); // Fallback text color
          setIsContentVisible(true);
        }, 200);
      }
    } else {
      setIsLoading(false);
      setTimeout(() => {
        setIsContentVisible(true);
      }, 200);
    }
  };

  const handleImageError = () => {
    console.error("Error loading image");
    setIsLoading(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return null;

    try {
      const date = new Date(dateString);
      const months = [
        "JAN",
        "FEB",
        "MAR",
        "APR",
        "MAY",
        "JUN",
        "JUL",
        "AUG",
        "SEP",
        "OCT",
        "NOV",
        "DEC"
      ];

      const month = months[date.getMonth()];
      const day = date.getDate();
      const year = date.getFullYear();

      let hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12;

      return {
        date: `${month} ${day}, ${year}`,
        time: `${hours}:${minutes} ${ampm}`
      };
    } catch (e) {
      return null;
    }
  };

  const dateInfo = exifData?.DateTimeOriginal
    ? formatDate(exifData.DateTimeOriginal)
    : null;
  const hasGPS = exifData?.latitude && exifData?.longitude;

  // Offset the map center slightly to position the marker higher in the viewport
  const mapCenter = hasGPS
    ? [exifData.latitude - 0.001, exifData.longitude]
    : null;

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

      {!imagePreview && !isLoading && <DropText>Drop image here</DropText>}

      {imagePreview && (
        <ContentWrapper $isVisible={isContentVisible}>
          <LeftColumn>
            {hasGPS && (
              <LocationCard $bgColor={dominantColor} $textColor={textColor}>
                <LocationPlaceName>
                  {locationData?.line1 || "Location"}
                </LocationPlaceName>
                {locationData?.line2 && (
                  <LocationAddress>{locationData.line2}</LocationAddress>
                )}
                {locationData?.line3 && (
                  <LocationAddress>{locationData.line3}</LocationAddress>
                )}
                {locationData?.line4 && (
                  <LocationAddress>{locationData.line4}</LocationAddress>
                )}
                {!locationData && (
                  <LocationAddress>
                    {exifData.latitude.toFixed(6)},{" "}
                    {exifData.longitude.toFixed(6)}
                  </LocationAddress>
                )}
              </LocationCard>
            )}

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
          </LeftColumn>

          <RightColumn>
            <PreviewImage
              ref={imageRef}
              src={imagePreview}
              alt="Preview"
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          </RightColumn>
        </ContentWrapper>
      )}
    </DropZone>
  );
}

export default App;
