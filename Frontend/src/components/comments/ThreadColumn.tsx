import React from "react";
import { Box } from "@mui/material";

interface ThreadColumnProps {
  showLine?: boolean
  isLastChild?: boolean
  hasChildren?: boolean
  isCollapsed?: boolean
  onToggle?: () => void
  isConnector?: boolean
}

export const ThreadColumn: React.FC<ThreadColumnProps> = ({
  showLine = true,
  isLastChild = false,
  hasChildren = false,
  isCollapsed = false,
  isConnector = false,
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
      {/* main vertical line */}
      <Box
        sx={{
          position: "absolute",
          left: 11,
          top: 0,
          bottom: isLastChild ? "50%" : 0,
          width: 2,
          backgroundColor: "rgba(0,0,0,0.15)"
        }}
      />

      {/* horizontal connector */}
      {isConnector && (
        <Box
          sx={{
            position: "absolute",
            left: 11,
            top: 20,
            bottom: isLastChild ? "calc(100% - 20px)" : 0,
            width: 13,
            height: 2,
            transform: "translateY(-1px)",
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
            top: 20,
            bottom: isLastChild ? "calc(100% - 20px)" : 0,
            transform: "translateY(-50%)",
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

