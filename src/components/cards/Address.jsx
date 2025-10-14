import React, { useState, useRef, useEffect } from "react";
import styled from "styled-components";
import { Card } from "../Card";

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

const StyledCard = styled(Card)`
  color: ${(props) => props.$textColor || "#fff"};
  font-size: 1.125rem;
  line-height: 1.5;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const AddressPlaceNameWrapper = styled.div`
  position: relative;
  margin-bottom: 0.5rem;
`;

const AddressPlaceName = styled.div`
  text-transform: uppercase;
  font-weight: 600;
  font-size: 1.5rem;
  line-height: 1.5;
  min-height: 2.6875rem;
  margin-right: -0.75rem;
  margin-left: -0.75rem;
  margin-top: -0.75rem;
  margin-bottom: -0.25rem;
  padding-left: 0.75rem;
  padding-top: 0.5rem;
  cursor: ${(props) => (props.$isEditable ? "text" : "default")};
  border-radius: 0.25rem;
  transition: all 0.2s ease;
  word-break: break-word;
  background: ${(props) =>
    props.$isEditing ? "rgba(255, 255, 255, 0.1)" : "transparent"};

  &:hover {
    background: ${(props) =>
      props.$isEditable && !props.$isEditing
        ? "rgba(255, 255, 255, 0.1)"
        : props.$isEditing
        ? "rgba(255, 255, 255, 0.1)"
        : "transparent"};
  }

  &:active {
    background: ${(props) =>
      props.$isEditable ? "rgba(255, 255, 255, 0.15)" : "transparent"};
  }
`;

const EditableInput = styled.input`
  background: transparent;
  border: none;
  color: inherit;
  font-family: inherit;
  font-size: inherit;
  font-weight: inherit;
  text-transform: inherit;
  line-height: inherit;
  width: 100%;
  padding: 0;
  outline: none;

  &::selection {
    background: rgba(255, 255, 255, 0.3);
  }
`;

const AddressLine = styled.div`
  text-transform: uppercase;
  font-size: 1.125rem;
  line-height: 1.5;
  min-height: 1.75rem;
  opacity: 0.5;
`;

function AddressCard({
  locationData,
  exifData,
  dominantColor,
  textColor,
  momentId,
  onLocationUpdate
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const inputRef = useRef(null);
  const hasGPS = exifData?.latitude && exifData?.longitude;

  // Only render if we have actual location data from the server
  if (!locationData) {
    return null;
  }

  // Check if we have an API key to enable editing
  const params = new URLSearchParams(window.location.search);
  const apiKey = params.get("fccApiKey") || params.get("apiKey");

  // Only editable if we have both a momentId and a valid API key
  const isEditable = !!momentId && !!apiKey;

  const handleClick = () => {
    if (!isEditable || isEditing) return;
    setEditValue(locationData.line1 || "");
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!editValue.trim() || editValue === locationData.line1) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    setSaveStatus("Saving...");

    try {
      // Get API key from URL parameters
      const params = new URLSearchParams(window.location.search);
      const apiKey = params.get("fccApiKey") || params.get("apiKey");

      const response = await fetch(
        `${SERVER_URL}/moments/${momentId}/location`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            locationName: editValue.trim(),
            apiKey
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSaveStatus("Saved");

        // Call parent callback if provided
        if (onLocationUpdate) {
          onLocationUpdate(data.locationData);
        }

        setTimeout(() => {
          setSaveStatus("");
          setIsEditing(false);
        }, 1000);
      } else {
        const errorData = await response.json();
        console.error("Failed to update location:", errorData.error);
        setSaveStatus("Failed");
        setTimeout(() => {
          setSaveStatus("");
        }, 2000);
      }
    } catch (error) {
      console.error("Error updating location:", error);
      setSaveStatus("Error");
      setTimeout(() => {
        setSaveStatus("");
      }, 2000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setSaveStatus("");
    }
  };

  const handleBlur = () => {
    if (!isSaving) {
      handleSave();
    }
  };

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  return (
    <StyledCard $bgColor={dominantColor} $textColor={textColor}>
      <AddressPlaceNameWrapper>
        <AddressPlaceName
          onClick={handleClick}
          $isEditable={isEditable}
          $isEditing={isEditing}
          $textColor={textColor}
        >
          {isEditing ? (
            <EditableInput
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              disabled={isSaving}
            />
          ) : (
            locationData.line1
          )}
        </AddressPlaceName>
      </AddressPlaceNameWrapper>
      {locationData.line2 && <AddressLine>{locationData.line2}</AddressLine>}
      {locationData.line3 && <AddressLine>{locationData.line3}</AddressLine>}
      {locationData.line4 && <AddressLine>{locationData.line4}</AddressLine>}
    </StyledCard>
  );
}

export default AddressCard;
