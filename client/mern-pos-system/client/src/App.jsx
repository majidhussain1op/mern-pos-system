import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Dashboard from "./pages/dashboard/Dashboard";
import ProtectedRoute from "./gaurd/ProtextRoute";
// import ManageUsers from "./pages/staff/ManageUsers"
import Items from "./pages/pos/Items";
import Purchase from "./pages/pos/Purchase";
import Stock from "./pages/pos/Stock";
import Receive from "./pages/pos/Recieve";
import Payment from "./pages/pos/Payment";
import Journal from "./pages/pos/Journal";
import Reports from "./pages/pos/Reports";
import Settings from "./pages/pos/Settings";
import SalesHistory from "./pages/pos/SalesHistory";
import FillReceipt from "./pages/filereceipt/FileReceipt";
import ManageUsers from "./pages/users/ManageUsers";
import ShiftManagement from "./pages/shiftmanagement/ShiftManagement";
import CashMovementHistory from "./pages/cashmovementhistory/CashMovementHistory";
import CustomerList from "./pages/customer/CustomerList";
import CustomerStatement from "./pages/customer/CustomerStatement";
import ShiftReport from "./pages/shiftmanagement/ShiftReport";
import ShiftHistory from "./pages/shiftmanagement/ShiftHistory";
import TopSellingItems from "./pages/report/ReportSelling";
import SalesReport from "./pages/report/SalesReport";
import StockReport from "./pages/report/StockReport";
import CustomerLedgerReport from "./pages/report/CustomerLedgerReport";
import CategorySupplierManager from "./pages/inventory/CategorySupplierManager";
import ExpiryReport from "./pages/report/ExpiryReport";
import PurchaseReturn from "./pages/inventory/PurchaseReturn";
import PurchaseOrderDetail from "./pages/inventory/PurchaseOrderDetail";
import PurchaseOrderList from "./pages/inventory/PurchaseOrderList";
import BarcodePrint from "./pages/inventory/BarcodePrint";
import AccountLedger from "./pages/inventory/AccountLedger";
import TrialBalance from "./pages/inventory/TrialBalance";
import JournalEntries from "./pages/inventory/JournalEntries";
import ChartOfAccounts from "./pages/inventory/ChartOfAccount";
import VoucherEntry from "./pages/inventory/VoucherEntry";
import ConsolidatedLedger from "./pages/inventory/ConsolidateLedger";
import BalanceSheet from "./pages/inventory/BalanceSheet";
import IncomeStatement from "./pages/inventory/IncomeStatement";
import CashFlowStatement from "./pages/inventory/cashFlowstatement";
import DateWiseReceiptPayment from "./pages/inventory/DateWiseReceipt";
import SupplierPaymentSummary from "./pages/inventory/SupplierPaymentSummary";
import BudgetVsExpenses from "./pages/inventory/BudgetVSexpense";
import AIAssistant from "./components/AiAssitant";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <ManageUsers />
            </ProtectedRoute>
          }
        />
        {/* ---------- POS routes ---------- */}
        <Route
          path="/fill-receipt"
          element={
            <ProtectedRoute>
              <FillReceipt />
            </ProtectedRoute>
          }
        />
        <Route
          path="/items"
          element={
            <ProtectedRoute>
              <Items />
            </ProtectedRoute>
          }
        />
        <Route
          path="/purchase"
          element={
            <ProtectedRoute>
              <Purchase />
            </ProtectedRoute>
          }
        />
        <Route
          path="/stock"
          element={
            <ProtectedRoute>
              <Stock />
            </ProtectedRoute>
          }
        />
        <Route
          path="/receive"
          element={
            <ProtectedRoute>
              <Receive />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payment"
          element={
            <ProtectedRoute>
              <Payment />
            </ProtectedRoute>
          }
        />
        <Route
          path="/journal"
          element={
            <ProtectedRoute>
              <Journal />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
              <Reports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sales-history"
          element={
            <ProtectedRoute>
              <SalesHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pos/shift"
          element={
            <ProtectedRoute allowedRoles={["CASHIER", "ADMIN", "MANAGER"]}>
              <ShiftManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pos/cash-movements"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
              <CashMovementHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customers"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "MANAGER", "CASHIER"]}>
              <CustomerList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customers/:id/statement"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "MANAGER", "CASHIER"]}>
              <CustomerStatement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pos/shift/history"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
              <ShiftHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pos/shift/:id/report"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
              <ShiftReport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pos/reports/top-selling"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
              <TopSellingItems />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pos/reports/sales"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
              <SalesReport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pos/reports/stock"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
              <StockReport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pos/reports/customer-ledger"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
              <CustomerLedgerReport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pos/reports/customer-ledger/:id"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
              <CustomerStatement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pos/inventory/categories-suppliers"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <CategorySupplierManager />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pos/reports/expiry"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
              <ExpiryReport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pos/purchase-orders"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <PurchaseOrderList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pos/purchase-orders/:id"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <PurchaseOrderDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pos/purchase-returns"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <PurchaseReturn />
            </ProtectedRoute>
          }
        />
        <Route
          path="/barcode-print"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <BarcodePrint />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pos/inventory/trial-balance"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
              <TrialBalance />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pos/inventory/journal"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
              <JournalEntries />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pos/inventory/ledger/:id"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
              <AccountLedger />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pos/inventory/chart-of-accounts"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "MANAGER", "CASHIER"]}>
              <ChartOfAccounts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pos/inventory/voucher-entry"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
              <VoucherEntry />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pos/inventory/consolidated-ledger"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
              <ConsolidatedLedger />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pos/inventory/income-statement"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
              <IncomeStatement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pos/inventory/balance-sheet"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
              <BalanceSheet />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pos/inventory/cash-flow"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
              <CashFlowStatement />
            </ProtectedRoute>
          }
        />

        <Route
          path="/pos/inventory/date-wise-receipt-payment"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
              <DateWiseReceiptPayment />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pos/inventory/supplier-payment-summary"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
              <SupplierPaymentSummary />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pos/inventory/budget-vs-expenses"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
              <BudgetVsExpenses />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ai-assistant"
          element={
            <ProtectedRoute>
              <AIAssistant />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
