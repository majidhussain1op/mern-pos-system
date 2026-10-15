import useSWR from "swr";
import {
  Box,
  Grid,
  Paper,
  Typography,
  Avatar,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  CircularProgress,
  Button,
} from "@mui/material";
import {
  Inventory2,
  ShoppingCart,
  People,
  AttachMoney,
  Warning,
  PointOfSale,
  AccessTime,
} from "@mui/icons-material";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

// SWR ke liye fetcher function - api instance (axios) use karta hai,
// taake Authorization header wagera automatically laga rahe
const fetcher = (url) => api.get(url).then((res) => res.data.data);

const BAR_COLORS = ["#dc2626", "#f59e0b", "#eab308", "#f97316", "#ef4444"];

export default function Dashboard() {
  const navigate = useNavigate();

  // SWR - data cache karta hai, window refocus/reconnect par khud revalidate
  // karta hai, aur har 30 second mein background mein refresh karta hai
  const {
    data: stats,
    error,
    isLoading,
  } = useSWR("/dashboard/stats", fetcher, {
    refreshInterval: 30000, // 30 sec baad auto-refresh
    revalidateOnFocus: true, // tab switch kar ke wapas aane par refresh
  });

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !stats) {
    return (
      <Typography sx={{ mt: 5, textAlign: "center" }}>
        Failed to load dashboard data
      </Typography>
    );
  }

  const statCards = [
    {
      label: "Total Revenue",
      value: `Rs ${stats.totalRevenue.toLocaleString()}`,
      icon: <AttachMoney />,
      color: "#22c55e",
      bg: "#f0fdf4",
    },
    {
      label: "Total Sales",
      value: stats.totalSales,
      icon: <ShoppingCart />,
      color: "#6366f1",
      bg: "#eef2ff",
    },
    {
      label: "Products",
      value: stats.totalProducts,
      icon: <Inventory2 />,
      color: "#f59e0b",
      bg: "#fffbeb",
    },
    {
      label: "Customers",
      value: stats.totalCustomers,
      icon: <People />,
      color: "#06b6d4",
      bg: "#ecfeff",
    },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 2,
          mb: 1,
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight="bold" sx={{ mb: 1 }}>
            📊 Dashboard
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 4 }}>
            Today's Revenue: <b>Rs {stats.todayRevenue.toLocaleString()}</b>{" "}
            from {stats.todaySalesCount} sales
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<PointOfSale />}
          onClick={() => navigate("/fill-receipt")}
          sx={{
            borderRadius: 2.5,
            px: 3,
            py: 1.2,
            fontWeight: 700,
            textTransform: "none",
            background: "linear-gradient(135deg,#2563eb,#1e3a8a)",
            "&:hover": {
              background: "linear-gradient(135deg,#1e3a8a,#0f172a)",
            },
          }}
        >
          Go to POS
        </Button>

        <Button
          variant="contained"
          startIcon={<AccessTime />}
          onClick={() => navigate("/pos/shift")}
          sx={{
            borderRadius: 2.5,
            px: 3,
            py: 1.2,
            fontWeight: 700,
            textTransform: "none",
            background: "linear-gradient(135deg,#7c3aed,#4c1d95)",
            "&:hover": {
              background: "linear-gradient(135deg,#4c1d95,#2e1065)",
            },
          }}
        >
          Shift
        </Button>
      </Box>

      {/* ===== STAT CARDS ===== */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statCards.map((card) => (
          <Grid item xs={12} sm={6} md={3} key={card.label}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 4,
                border: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                gap: 2,
                transition: "0.25s",
                "&:hover": {
                  boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
                  transform: "translateY(-3px)",
                },
              }}
            >
              <Avatar
                sx={{
                  bgcolor: card.bg,
                  color: card.color,
                  width: 52,
                  height: 52,
                }}
              >
                {card.icon}
              </Avatar>
              <Box>
                <Typography sx={{ fontSize: 13, color: "#64748b" }}>
                  {card.label}
                </Typography>
                <Typography sx={{ fontSize: 22, fontWeight: 700 }}>
                  {card.value}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* ===== SALES CHART ===== */}
        <Grid item xs={12} md={8}>
          <Paper
            elevation={0}
            sx={{ p: 3, borderRadius: 4, border: "1px solid #e2e8f0" }}
          >
            <Typography fontWeight="bold" sx={{ mb: 2 }}>
              Sales — Last 7 Days
            </Typography>

            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={stats.salesChart}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#6366f1"
                  fill="url(#colorRevenue)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* ===== LOW STOCK ===== */}
        <Grid item xs={12} md={4}>
          <Paper
            elevation={0}
            sx={{ p: 3, borderRadius: 4, border: "1px solid #e2e8f0" }}
          >
            <Typography
              fontWeight="bold"
              sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}
            >
              <Warning sx={{ color: "#f59e0b", fontSize: 20 }} /> Low Stock
              Alert
            </Typography>

            {stats.lowStockProducts.length === 0 ? (
              <Typography color="text.secondary" fontSize={14}>
                All products well stocked ✅
              </Typography>
            ) : (
              <List dense>
                {stats.lowStockProducts.map((p) => (
                  <ListItem key={p._id} disableGutters>
                    <ListItemText primary={p.name} />
                    <Chip
                      label={`${p.stock} left`}
                      size="small"
                      sx={{
                        bgcolor: "#fef2f2",
                        color: "#dc2626",
                        fontWeight: 700,
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        {/* ===== LOW STOCK BAR CHART ===== */}
        {stats.lowStockProducts.length > 0 && (
          <Grid item xs={12} md={6}>
            <Paper
              elevation={0}
              sx={{ p: 3, borderRadius: 4, border: "1px solid #e2e8f0" }}
            >
              <Typography fontWeight="bold" sx={{ mb: 2 }}>
                Low Stock Levels
              </Typography>

              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={stats.lowStockProducts}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    fontSize={11}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis fontSize={12} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="stock" radius={[6, 6, 0, 0]}>
                    {stats.lowStockProducts.map((_, i) => (
                      <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        )}

        {/* ===== RECENT SALES BAR CHART ===== */}
        {stats.recentSales.length > 0 && (
          <Grid item xs={12} md={stats.lowStockProducts.length > 0 ? 6 : 12}>
            <Paper
              elevation={0}
              sx={{ p: 3, borderRadius: 4, border: "1px solid #e2e8f0" }}
            >
              <Typography fontWeight="bold" sx={{ mb: 2 }}>
                Recent Sales — Amounts
              </Typography>

              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={stats.recentSales.map((s) => ({
                    name: s.customer?.name || "Walk-in",
                    amount: s.totalAmount || 0,
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    fontSize={11}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="amount" fill="#22c55e" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        )}

        {/* ===== RECENT SALES LIST ===== */}
        <Grid item xs={12}>
          <Paper
            elevation={0}
            sx={{ p: 3, borderRadius: 4, border: "1px solid #e2e8f0" }}
          >
            <Typography fontWeight="bold" sx={{ mb: 2 }}>
              Recent Sales
            </Typography>

            <List>
              {stats.recentSales.map((sale) => (
                <ListItem
                  key={sale._id}
                  sx={{ borderBottom: "1px solid #f1f5f9" }}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: "#eef2ff", color: "#6366f1" }}>
                      <ShoppingCart fontSize="small" />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={sale.customer?.name || "Walk-in Customer"}
                    secondary={new Date(sale.createdAt).toLocaleString()}
                  />
                  <Typography fontWeight="bold" color="success.main">
                    Rs {sale.totalAmount?.toLocaleString()}
                  </Typography>
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
