import { useState, useContext } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  InputAdornment,
  IconButton,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  Avatar,
  Divider,
} from "@mui/material";
import {
  Email,
  Lock,
  Visibility,
  VisibilityOff,
  Store,
} from "@mui/icons-material";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import api from "../../services/api";
import { AuthContext } from "../../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);
      const res = await api.post("/auth/login", { email, password });
      login(res.data.token, res.data.user);

      // Role ke hisaab se alag page pe bhej dein
      const role = res.data.user.role;
      if (role === "CASHIER") {
        navigate("/fill-receipt");
      } else {
        navigate("/dashboard"); // ADMIN, MANAGER
      }
    } catch (err) {
      alert(err.response?.data?.message || "Login Failed");
    } finally {
      setLoading(false);
    }
  };

  // ✅ GOOGLE LOGIN HANDLER
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setGoogleLoading(true);

      const res = await api.post("/auth/google-login", {
        credential: credentialResponse.credential,
      });

      login(res.data.token, res.data.user);
      navigate("/dashboard");
    } catch (err) {
      alert(err.response?.data?.message || "Google Login Failed");
    } finally {
      setGoogleLoading(false);
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

          <Typography color="text.secondary">Login to continue</Typography>
        </Box>

        {/* ✅ GOOGLE LOGIN BUTTON */}
        <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
          {googleLoading ? (
            <CircularProgress size={28} />
          ) : (
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => alert("Google Login Failed")}
              width="340"
            />
          )}
        </Box>

        <Divider sx={{ my: 2 }}>OR</Divider>

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

        <FormControlLabel
          control={<Checkbox />}
          label="Remember Me"
          sx={{ mt: 1 }}
        />

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
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <CircularProgress size={24} sx={{ color: "#fff" }} />
          ) : (
            "Login"
          )}
        </Button>
        <Typography align="center" mt={3} fontSize={14}>
          Naya account chahiye?{" "}
          <Link to="/register" style={{ color: "#2563eb", fontWeight: 600 }}>
            Register karein
          </Link>
        </Typography>
        <Typography align="center" color="text.secondary" mt={3} fontSize={13}>
          © 2026 Nexus POS System
        </Typography>
      </Paper>
    </Box>
  );
}
