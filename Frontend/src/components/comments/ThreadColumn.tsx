import React from "react";
import { Box } from "@mui/material";

interface ThreadColumnProps {
  showLine?: boolean
  isLastChild?: boolean
  hasChildren?: boolean
  isCollapsed?: boolean
  onToggle?: () => void
  isConnector?: boolean
  hasPrevSibling?: boolean
}

export const ThreadColumn: React.FC<ThreadColumnProps> = ({
  showLine = true,
  isLastChild = false,
  hasChildren = false,
  isCollapsed = false,
  isConnector = false,
  hasPrevSibling = false,
  onToggle
}) => {
  if (!showLine) {
    return <Box sx={{ width: 24, flexShrink: 0 }} />;
  }

  return (
    <Box
      sx={{
        width: 24,
        position: "relative",
        flexShrink: 0
      }}
    >

    {/* vertical line ABOVE connector */}
    {hasPrevSibling && (
      <Box
        sx={{
          position: "absolute",
          left: 11,
          top: 0,
          height: 20,
          width: 2,
          backgroundColor: "rgba(0,0,0,0.15)"
        }}
      />
    )}

    {/* vertical line BELOW connector */}
    {!isLastChild && (
      <Box
        sx={{
          position: "absolute",
          left: 11,
          top: 20,
          bottom: 0,
          width: 2,
          backgroundColor: "rgba(0,0,0,0.15)"
        }}
      />
    )}

      {/* connector */}
      {isConnector && (
        <Box
          sx={{
            position: "absolute",
            left: 11,
            top: 20,
            width: 13,
            height: 2,
            backgroundColor: "rgba(0,0,0,0.15)"
          }}
        />
      )}

      {/* collapse toggle */}
      {hasChildren && (
        <Box
          onClick={onToggle}
          sx={{
            position: "absolute",
            left: 8,
            top: 14,
            width: 14,
            height: 14,
            borderRadius: "50%",
            border: "1px solid rgba(0,0,0,0.3)",
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10,
            cursor: "pointer"
          }}
        >
          {isCollapsed ? "+" : "−"}
        </Box>
      )}
    </Box>
  );
};
