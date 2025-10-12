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
  text-transform: uppercase;
  flex: 1;
  align-items: flex-end;

  @media (max-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
`;

function WeatherInfoCard({ weatherData, dominantColor, textColor }) {
  if (!weatherData) {
    return null;
  }

  return (
    <StyledCard $bgColor={dominantColor} $textColor={textColor}>
      <div>{weatherData.description}</div>
      <div>{weatherData.temperature}°F</div>
    </StyledCard>
  );
}

export default WeatherInfoCard;
