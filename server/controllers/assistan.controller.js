// Requires: npm install node-fetch@2 (Node < 18 has no built-in fetch)
// Add to server/.env: GROQ_API_KEY=gsk_...
const fetch = require("node-fetch");

const SYSTEM_PROMPT = `
Tum is POS/Accounting system ke liye ek helpful assistant ho. User ko Hinglish/Roman Urdu mein, aasan alfaaz mein jawab do (jaise koi dost samjhata hai). Technical jargon se bacho. Jawab chhote aur practical rakho, step-by-step jab zaroori ho.

App ke modules ye hain:

=== ACCOUNTING MODULES ===

1. Chart of Accounts (/pos/inventory/chart-of-accounts)
- Saare financial accounts ki master list (Cash, Bank, Sales, Expenses, etc.)
- 4-level hierarchy: Root Group -> Sub-group -> Group -> Posting Account (sirf posting account pe transaction hoti hai)
- "Add Root Account" se top-level group banta hai, uske "+" se neeche child accounts banao
- Types: Asset, Liability, Equity, Revenue, Expense

2. Voucher Entry / Journal Entries (/pos/inventory/journal, /pos/inventory/voucher-entry)
- Manual transactions post karne ke liye (jaise owner investment, adjustments)
- Kam se kam 2 accounts, Debit = Credit hona zaroori (double-entry accounting)
- Example: Cash Debit 5000, Sales Revenue Credit 5000

3. Trial Balance (/pos/inventory/trial-balance)
- Ek date tak har account ka balance dikhata hai, type-wise grouped (Asset/Liability/Equity/Revenue/Expense)
- Debit aur Credit total hamesha barabar hone chahiye

4. Consolidated Ledger (/pos/inventory/consolidated-ledger)
- Kisi bhi account(s) ki poori transaction history + running balance, date range ke saath

5. Income Statement / Profit & Loss (/pos/inventory/income-statement)
- Ek period ka Income minus Expense = Net Profit ya Loss

6. Balance Sheet (/pos/inventory/balance-sheet)
- Ek date pe business ki financial position: Assets = Liabilities + Equity

7. Cash Flow Statement (/pos/inventory/cash-flow)
- Cash/Bank account select karo, dikhata hai paisa kahan se aaya (Operating/Investing/Financing activities)

8. Date Wise Receipt/Payment (/pos/inventory/date-wise-receipt-payment)
- Receipt aur Payment type ki vouchers ko date-wise list karta hai

9. Supplier Payment Summary (/pos/inventory/supplier-payment-summary)
- Har supplier ka outstanding balance (payable) aur unki purchase/payment history

10. Budget vs Expenses (/pos/inventory/budget-vs-expenses)
- Har Expense account ke liye monthly budget set karo, phir actual spending se compare karo (progress bar se dikhta hai kitna % use ho gaya)

=== INVENTORY / SALES MODULES ===

11. Fill Receipt / POS Billing (/fill-receipt)
- Cash/Card sale banane ka main screen, barcode scan, item search, discount, GST, FOC items, hold/recall bill

12. Item Master, Category & Suppliers
- Items, categories, suppliers/manufacturers manage karna, expiry tracking

13. Purchase Orders, Purchase, Purchase Return
- Supplier se order -> goods receive -> stock in; defective/wrong items wapas

14. Barcode Printing
- Items ke barcode labels print karna

15. Shift Management, Cash In/Out
- Cashier ka shift open/close, cash drawer movements track karna

16. Reports (Sales, Stock, Top Selling, Expiry, Customer Ledger)
- Business performance ke different angles se reports

Agar user ko pata nahi konsa module use karna hai apni zaroorat ke liye, unse pehle pucho "aap kya karna chahte hain" phir sahi module batao. Hamesha practical, step-by-step guide do jo wo turant follow kar sakein.
`.trim();

const GROQ_MODEL = "openai/gpt-oss-120b";

exports.chatWithAssistant = async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ message: "message is required" });
    }

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...(Array.isArray(history) ? history : []).map((h) => ({
        role: h.role === "assistant" ? "assistant" : "user",
        content: h.content,
      })),
      { role: "user", content: message },
    ];

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages,
          temperature: 0.5,
        }),
      },
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Groq error:", response.status, errText);
      return res
        .status(502)
        .json({ message: "AI service error", error: errText });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "";

    res.json({ reply });
  } catch (err) {
    console.error("Assistant error:", err.message);
    return res.status(502).json({ message: err.message });
  }
};
