import styled from "styled-components";

const Card = styled.div`
  background: ${(props) =>
    props.$bgColor
      ? props.$bgColor.replace("rgb", "rgba").replace(")", ", 0.2)")
      : "rgba(255, 255, 255, 0.1)"};
  border-radius: 0.75rem;
  padding: 1.75rem;
  font-family: "DM Mono", monospace;
`;

export const DateCard = styled(Card)`
  color: ${(props) => props.$textColor || "#fff"};
  font-size: 1.125rem;
  line-height: 1.5;
  min-height: 1.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
`;

export const LocationCard = styled(Card)`
  color: ${(props) => props.$textColor || "#fff"};
  font-size: 1.125rem;
  line-height: 1.5;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

export const LocationPlaceName = styled.div`
  text-transform: uppercase;
  font-weight: 600;
  font-size: 1.5rem;
  line-height: 1.5;
  min-height: 2.4rem;
  margin-bottom: 0.5rem;
`;

export const LocationAddress = styled.div`
  text-transform: uppercase;
  font-size: 1.125rem;
  line-height: 1.5;
  min-height: 1.75rem;
  opacity: 0.5;
`;

export const DateWeatherWrapper = styled.div`
  display: flex;
  gap: 2rem;
`;

export const WeatherCard = styled(Card)`
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

export const PreviewImage = styled.img`
  flex: 1;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 0.75rem;
  user-select: none;
`;
