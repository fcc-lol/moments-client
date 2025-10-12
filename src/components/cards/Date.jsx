import React from "react";
import styled from "styled-components";
import { Card } from "../Card";

const StyledCard = styled(Card)`
  color: ${(props) => props.$textColor || "#fff"};
  font-size: 1.125rem;
  line-height: 1.5;
  min-height: 1.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
  text-transform: uppercase;

  div {
    text-align: right;
  }

  @media (max-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
`;

function DateCard({ dateInfo, dominantColor, textColor }) {
  if (!dateInfo) {
    return null;
  }

  return (
    <StyledCard $bgColor={dominantColor} $textColor={textColor}>
      <span>{dateInfo.date}</span>
      <span>{dateInfo.time}</span>
    </StyledCard>
  );
}

export default DateCard;
