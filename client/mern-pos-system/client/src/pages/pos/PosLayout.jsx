import { Box, Typography, Tabs, Tab } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";

export const COLORS = {
  header: "linear-gradient(90deg,#b3184f 0%,#d81b60 100%)",
  toolbar: "#a3e4e4",
  panelBg: "#f4f4f4",
  border: "#9e9e9e",
  selectedRow: "#29b6f6",
  totalBox: "#7a1f1f",
  totalBox2: "#c77a1f",
};

export const cellSx = {
  border: `1px solid ${COLORS.border}`,
  py: 0.5,
  px: 1,
  fontSize: 13,
};
export const fieldSx = {
  "& .MuiOutlinedInput-root": { borderRadius: 0, background: "#fff" },
  "& .MuiOutlinedInput-notchedOutline": { borderColor: COLORS.border },
};

const TOOLBAR_ROUTES = [
  { label: "Home", path: "/dashboard" },
  { label: "Items", path: "/items" },
  { label: "Purchase", path: "/purchase" },
  { label: "Sales", path: "/fill-receipt" },
  { label: "Stock", path: "/stock" },
  { label: "Receive", path: "/receive" },
  { label: "Payment", path: "/payment" },
  { label: "Journal", path: "/journal" },
  { label: "Shift", path: "/pos/shift" },
  { label: "Reports", path: "/reports" },
  { label: "Settings", path: "/settings" },
  { label: "ShiftHistory", path: "/pos/shift/history" },
];

const SUB_TABS = [
  { label: "Fill Receipt", path: "/fill-receipt" },
  { label: "Sales History", path: "/sales-history" },
  { label: "Reports", path: "/reports" },
  { label: "Settings", path: "/settings" },
];

export default function PosLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const subTabIndex = SUB_TABS.findIndex((t) => t.path === location.pathname);

  return (
    <Box sx={{ bgcolor: COLORS.panelBg, minHeight: "100vh" }}>
      {/* Header */}
      <Box
        sx={{
          background: COLORS.header,
          px: 3,
          py: 1.5,
          display: "flex",
          alignItems: "center",
        }}
      >
        <Typography
          onClick={() => navigate("/dashboard")}
          sx={{
            color: "#fff",
            fontWeight: 700,
            fontSize: 22,
            cursor: "pointer",
          }}
        >
          Nexus POS
        </Typography>
      </Box>

      {/* Toolbar */}
      <Box
        sx={{
          bgcolor: COLORS.toolbar,
          borderBottom: `1px solid ${COLORS.border}`,
          px: 2,
          py: 0.5,
          display: "flex",
          gap: 3,
        }}
      >
        {TOOLBAR_ROUTES.map((t) => (
          <Typography
            key={t.label}
            onClick={() => navigate(t.path)}
            sx={{
              fontSize: 12,
              fontWeight: 600,
              color: location.pathname === t.path ? "#b3184f" : "#333",
              textDecoration:
                location.pathname === t.path ? "underline" : "none",
              cursor: "pointer",
              "&:hover": { color: "#b3184f" },
            }}
          >
            {t.label}
          </Typography>
        ))}
      </Box>

      {/* Sub tabs */}
      <Tabs
        value={subTabIndex === -1 ? false : subTabIndex}
        onChange={(e, newValue) => navigate(SUB_TABS[newValue].path)}
        sx={{
          bgcolor: "#e0e0e0",
          minHeight: 32,
          "& .MuiTab-root": {
            minHeight: 32,
            fontSize: 12,
            textTransform: "none",
          },
        }}
      >
        {SUB_TABS.map((t) => (
          <Tab key={t.label} label={t.label} />
        ))}
      </Tabs>

      <Box sx={{ p: 2 }}>{children}</Box>
    </Box>
  );
}
