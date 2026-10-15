import { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  InputAdornment,
  IconButton,
  CircularProgress,
  Avatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import {
  Person,
  Email,
  Lock,
  Visibility,
  VisibilityOff,
  Store,
  AdminPanelSettings,
} from "@mui/icons-material";
import { useNavigate, Link } from "react-router-dom";
import api from "../../services/api";

export default function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("CASHIER");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      alert("Sab fields fill karna zaroori hai");
      return;
    }
    try {
      setLoading(true);
      await api.post("/auth/register", { name, email, password, role });
      alert("Account ban gaya! Ab login kar lein.");
      navigate("/");
    } catch (err) {
      alert(err.response?.data?.message || "Registration Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg,#2563eb 0%,#1e3a8a 50%,#0f172a 100%)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        p: 2,
      }}
    >
      <Paper
        elevation={10}
        sx={{
          width: 420,
          borderRadius: 5,
          p: 5,
          backdropFilter: "blur(20px)",
          background: "rgba(255,255,255,.95)",
        }}
      >
        <Box textAlign="center" mb={4}>
          <Avatar
            sx={{
              bgcolor: "#2563eb",
              width: 70,
              height: 70,
              margin: "auto",
              mb: 2,
            }}
          >
            <Store sx={{ fontSize: 40 }} />
          </Avatar>
          <Typography variant="h4" fontWeight="bold">
            Nexus POS
          </Typography>
          <Typography color="text.secondary">Create your account</Typography>
        </Box>

        <TextField
          fullWidth
          label="Full Name"
          margin="normal"
          value={name}
          onChange={(e) => setName(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Person color="primary" />
              </InputAdornment>
            ),
          }}
        />

        <TextField
          fullWidth
          label="Email Address"
          margin="normal"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Email color="primary" />
              </InputAdornment>
            ),
          }}
        />

        <TextField
          fullWidth
          margin="normal"
          label="Password"
          type={show ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Lock color="primary" />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setShow(!show)}>
                  {show ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <FormControl fullWidth margin="normal">
          <InputLabel>Role</InputLabel>
          <Select
            value={role}
            label="Role"
            onChange={(e) => setRole(e.target.value)}
            startAdornment={
              <InputAdornment position="start">
                <AdminPanelSettings fontSize="small" sx={{ ml: 1 }} />
              </InputAdornment>
            }
          >
            <MenuItem value="ADMIN">Admin</MenuItem>
            <MenuItem value="MANAGER">Manager</MenuItem>
            <MenuItem value="CASHIER">Cashier</MenuItem>
          </Select>
        </FormControl>

        <Button
          fullWidth
          size="large"
          variant="contained"
          sx={{
            mt: 3,
            py: 1.5,
            borderRadius: 3,
            fontWeight: 700,
            fontSize: 16,
            textTransform: "none",
          }}
          onClick={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <CircularProgress size={24} sx={{ color: "#fff" }} />
          ) : (
            "Register"
          )}
        </Button>

        <Typography align="center" mt={3} fontSize={14}>
          Already have an account?{" "}
          <Link to="/" style={{ color: "#2563eb", fontWeight: 600 }}>
            Login
          </Link>
        </Typography>
      </Paper>
    </Box>
  );
}
