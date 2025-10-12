import styled from "styled-components";

// Base card style for all cards
export const Card = styled.div`
  background: ${(props) =>
    props.$bgColor
      ? props.$bgColor.replace("rgb", "rgba").replace(")", ", 0.2)")
      : "rgba(255, 255, 255, 0.1)"};
  border-radius: 0.75rem;
  padding: 1.75rem;
  font-family: "DM Mono", monospace;
  border: none;
`;
