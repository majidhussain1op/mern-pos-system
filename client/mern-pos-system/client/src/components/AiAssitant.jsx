import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  CircularProgress,
  Avatar,
} from "@mui/material";
import { SmartToy, Send, Person } from "@mui/icons-material";
import assistantService from "../../src/services/AssistantService";

const WELCOME_MESSAGE = {
  role: "assistant",
  content:
    "Assalam-o-Alaikum! Main aapka AI assistant hoon. Kisi bhi module (Chart of Accounts, Voucher Entry, Reports, POS, wagera) ke baare mein pooch sakte hain — simple alfaaz mein bata dunga.",
};

const SUGGESTIONS = [
  "Voucher Entry kaise use karoon?",
  "Trial Balance kya dikhata hai?",
  "Supplier ko payment kaise record karoon?",
  "Budget vs Expenses kaise set karoon?",
];

export default function AIAssistantPage() {
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const send = async (overrideText) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;

    const userMsg = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const history = newMessages.slice(1, -1);
      const reply = await assistantService.chat(text, history);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Maaf kijiye, abhi jawab nahi de saka. Dobara try karein ya thodi der baad poochein.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <Box sx={{ p: 3, display: "flex", justifyContent: "center" }}>
      <Paper
        variant="outlined"
        sx={{
          width: "100%",
          maxWidth: 760,
          height: "calc(100vh - 140px)",
          display: "flex",
          flexDirection: "column",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <Box
          sx={{
            background: "linear-gradient(90deg,#1565c0 0%,#1976d2 100%)",
            color: "#fff",
            px: 2.5,
            py: 2,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <Avatar sx={{ bgcolor: "rgba(255,255,255,0.2)" }}>
            <SmartToy />
          </Avatar>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: 16 }}>
              AI Assistant
            </Typography>
            <Typography sx={{ fontSize: 12, opacity: 0.85 }}>
              Modules ka usage simple alfaaz mein poochein
            </Typography>
          </Box>
        </Box>

        {/* Messages */}
        <Box
          ref={scrollRef}
          sx={{
            flex: 1,
            overflowY: "auto",
            p: 2,
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
            bgcolor: "#f5f5f5",
          }}
        >
          {messages.map((m, i) => (
            <Box
              key={i}
              sx={{
                display: "flex",
                justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                gap: 1,
              }}
            >
              {m.role === "assistant" && (
                <Avatar sx={{ width: 28, height: 28, bgcolor: "#1565c0" }}>
                  <SmartToy sx={{ fontSize: 16 }} />
                </Avatar>
              )}
              <Box
                sx={{
                  maxWidth: "70%",
                  px: 2,
                  py: 1.2,
                  borderRadius: 2,
                  fontSize: 14,
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                  bgcolor: m.role === "user" ? "#1565c0" : "#fff",
                  color: m.role === "user" ? "#fff" : "#222",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                }}
              >
                {m.content}
              </Box>
              {m.role === "user" && (
                <Avatar sx={{ width: 28, height: 28, bgcolor: "#9e9e9e" }}>
                  <Person sx={{ fontSize: 16 }} />
                </Avatar>
              )}
            </Box>
          ))}
          {loading && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, pl: 5 }}>
              <CircularProgress size={14} />
              <Typography variant="caption" color="text.secondary">
                Likh raha hoon...
              </Typography>
            </Box>
          )}

          {messages.length === 1 && (
            <Box
              sx={{ display: "flex", flexWrap: "wrap", gap: 1, pl: 5, mt: 1 }}
            >
              {SUGGESTIONS.map((s) => (
                <Box
                  key={s}
                  onClick={() => send(s)}
                  sx={{
                    px: 1.5,
                    py: 0.8,
                    borderRadius: 4,
                    border: "1px solid #1565c0",
                    color: "#1565c0",
                    fontSize: 12.5,
                    cursor: "pointer",
                    bgcolor: "#fff",
                    "&:hover": { bgcolor: "#e3f2fd" },
                  }}
                >
                  {s}
                </Box>
              ))}
            </Box>
          )}
        </Box>

        {/* Input */}
        <Box
          sx={{
            p: 1.5,
            borderTop: "1px solid #e0e0e0",
            display: "flex",
            gap: 1,
          }}
        >
          <TextField
            size="small"
            fullWidth
            placeholder="Apna sawal likhein..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            multiline
            maxRows={4}
          />
          <IconButton
            color="primary"
            onClick={() => send()}
            disabled={loading || !input.trim()}
          >
            <Send />
          </IconButton>
        </Box>
      </Paper>
    </Box>
  );
}
