import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  TextField,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
  Button,
  Alert,
  Chip,
  Collapse,
} from "@mui/material";
import { ExpandMore, ChevronRight, Print } from "@mui/icons-material";
import { COLORS, cellSx } from "../pos/PosLayout";
import supplierPaymentService from "../../services/SupplierPaymentService";

function firstDayOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

export default function SupplierPaymentSummary() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [from, setFrom] = useState(firstDayOfMonth());
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));

  const [expanded, setExpanded] = useState(null);
  const [statements, setStatements] = useState({});
  const [statementLoading, setStatementLoading] = useState(null);

  const loadSuppliers = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await supplierPaymentService.getSuppliers();
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load suppliers");
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const toggleExpand = async (supplier) => {
    if (expanded === supplier._id) {
      setExpanded(null);
      return;
    }
    setExpanded(supplier._id);
    if (!statements[supplier._id]) {
      setStatementLoading(supplier._id);
      try {
        const data = await supplierPaymentService.getStatement(
          supplier._id,
          from,
          to,
        );
        setStatements((prev) => ({ ...prev, [supplier._id]: data }));
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load statement");
      } finally {
        setStatementLoading(null);
      }
    }
  };

  const totalOutstanding = suppliers.reduce(
    (s, sup) => s + (sup.balance || 0),
    0,
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
        }}
      >
        <Typography variant="h6">Supplier Payment Summary</Typography>
        <Button
          variant="outlined"
          startIcon={<Print />}
          onClick={() => window.print()}
        >
          Print
        </Button>
      </Box>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <TextField
            label="Statement From"
            type="date"
            size="small"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Statement To"
            type="date"
            size="small"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setStatements({});
            }}
            InputLabelProps={{ shrink: true }}
          />
          <Typography variant="body2" color="text.secondary">
            Expand a supplier below to view its statement for this range.
          </Typography>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 2 }}>
        <Chip
          label={`Total Outstanding Payable: ${totalOutstanding.toLocaleString()}`}
          color={totalOutstanding > 0 ? "error" : "success"}
        />
      </Box>

      <Paper variant="outlined">
        {loading ? (
          <Typography
            sx={{ p: 3, textAlign: "center", color: "text.secondary" }}
          >
            Loading...
          </Typography>
        ) : suppliers.length === 0 ? (
          <Typography
            sx={{ p: 3, textAlign: "center", color: "text.secondary" }}
          >
            No suppliers found.
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={cellSx} width={40} />
                <TableCell sx={cellSx}>Supplier</TableCell>
                <TableCell sx={cellSx} align="right">
                  Outstanding Balance
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {suppliers.map((sup) => {
                const isOpen = expanded === sup._id;
                const statement = statements[sup._id];
                return (
                  <React.Fragment key={sup._id}>
                    <TableRow hover>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => toggleExpand(sup)}
                        >
                          {isOpen ? (
                            <ExpandMore fontSize="small" />
                          ) : (
                            <ChevronRight fontSize="small" />
                          )}
                        </IconButton>
                      </TableCell>
                      <TableCell>{sup.name}</TableCell>
                      <TableCell align="right">
                        <Chip
                          size="small"
                          label={(sup.balance || 0).toLocaleString()}
                          color={sup.balance > 0 ? "error" : "default"}
                          variant={sup.balance > 0 ? "filled" : "outlined"}
                        />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={3} sx={{ py: 0, border: 0 }}>
                        <Collapse in={isOpen} timeout="auto" unmountOnExit>
                          <Box
                            sx={{
                              p: 1.5,
                              backgroundColor: COLORS?.hoverBg || "#fafafa",
                            }}
                          >
                            {statementLoading === sup._id ? (
                              <Typography
                                sx={{ color: "text.secondary", fontSize: 13 }}
                              >
                                Loading statement...
                              </Typography>
                            ) : statement ? (
                              <>
                                <Box sx={{ display: "flex", gap: 3, mb: 1 }}>
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    Opening:{" "}
                                    {(
                                      statement.openingBalance ?? 0
                                    ).toLocaleString()}
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    Closing:{" "}
                                    {(
                                      statement.closingBalance ?? 0
                                    ).toLocaleString()}
                                  </Typography>
                                </Box>
                                <Table size="small">
                                  <TableHead>
                                    <TableRow>
                                      <TableCell sx={cellSx}>Date</TableCell>
                                      <TableCell sx={cellSx}>Type</TableCell>
                                      <TableCell sx={cellSx}>
                                        Reference
                                      </TableCell>
                                      <TableCell sx={cellSx} align="right">
                                        Amount
                                      </TableCell>
                                      <TableCell sx={cellSx} align="right">
                                        Balance
                                      </TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {(statement.transactions || []).length ===
                                    0 ? (
                                      <TableRow>
                                        <TableCell
                                          colSpan={5}
                                          sx={{
                                            textAlign: "center",
                                            color: "text.secondary",
                                          }}
                                        >
                                          No transactions in this range
                                        </TableCell>
                                      </TableRow>
                                    ) : (
                                      statement.transactions.map((t, i) => (
                                        <TableRow key={i}>
                                          <TableCell>
                                            {new Date(
                                              t.date,
                                            ).toLocaleDateString()}
                                          </TableCell>
                                          <TableCell>
                                            <Chip
                                              size="small"
                                              label={t.type}
                                              color={
                                                t.type === "Payment"
                                                  ? "success"
                                                  : t.type === "Purchase Return"
                                                    ? "warning"
                                                    : "default"
                                              }
                                            />
                                          </TableCell>
                                          <TableCell>{t.reference}</TableCell>
                                          <TableCell align="right">
                                            {t.amount.toLocaleString()}
                                          </TableCell>
                                          <TableCell align="right">
                                            {t.balance?.toLocaleString?.() ??
                                              ""}
                                          </TableCell>
                                        </TableRow>
                                      ))
                                    )}
                                  </TableBody>
                                </Table>
                              </>
                            ) : null}
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Box>
  );
}
