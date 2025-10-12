import React from "react";
import styled from "styled-components";
import { Card } from "../Card";

const StyledCard = styled(Card)`
  color: ${(props) => props.$textColor || "#fff"};
  font-size: 1.125rem;
  line-height: 1.5;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const AddressPlaceName = styled.div`
  text-transform: uppercase;
  font-weight: 600;
  font-size: 1.5rem;
  line-height: 1.5;
  min-height: 2.4rem;
  margin-bottom: 0.5rem;
`;

const AddressLine = styled.div`
  text-transform: uppercase;
  font-size: 1.125rem;
  line-height: 1.5;
  min-height: 1.75rem;
  opacity: 0.5;
`;

function AddressCard({ locationData, exifData, dominantColor, textColor }) {
  const hasGPS = exifData?.latitude && exifData?.longitude;

  if (!locationData && !hasGPS) {
    return null;
  }

  return (
    <StyledCard $bgColor={dominantColor} $textColor={textColor}>
      <AddressPlaceName>{locationData?.line1 || "Location"}</AddressPlaceName>
      {locationData?.line2 && <AddressLine>{locationData.line2}</AddressLine>}
      {locationData?.line3 && <AddressLine>{locationData.line3}</AddressLine>}
      {locationData?.line4 && <AddressLine>{locationData.line4}</AddressLine>}
      {!locationData && hasGPS && (
        <AddressLine>
          {exifData.latitude.toFixed(6)}, {exifData.longitude.toFixed(6)}
        </AddressLine>
      )}
    </StyledCard>
  );
}

export default AddressCard;
