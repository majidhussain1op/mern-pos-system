const Sale = require("../models/Sale");
const Item = require("../models/item.model");
const Customer = require("../models/customer.model");
const StockLedger = require("../models/stockLedger.model");
const Settings = require("../models/settings.model");
const Shift = require("../models/shift.model");
const {
  postSaleJournal,
  postSaleVoidJournal,
} = require("../../server/services/Accounting.services");
const { postLedgerEntry } = require("./crm.controller");

const FLAT_DISCOUNT_PER_ITEM = 5;

// POST /api/sales   (Fill Receipt -> Save button)
const createSale = async (req, res) => {
  // Agar beech mein koi item stock kam nikle, to isse pehle jo items
  // atomically decrement ho chuke the unko wapas rollback karne ke liye
  const decrementedSoFar = []; // [{ itemId, qty }]

  const rollbackDecrements = async () => {
    for (const d of decrementedSoFar) {
      await Item.findByIdAndUpdate(
        d.itemId,
        { $inc: { stockQty: d.qty } },
        { runValidators: false },
      );
    }
  };

  try {
    const {
      customer,
      items,
      lessPercent = 0,
      lessAmount = 0,
      paymentType,
      payments = [],
      receivedAmount = 0,
      changeDue = 0,
      salesman,
      biltiNo,
      remarks,
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Sale mein kam az kam 1 item zaroori hai",
      });
    }

    // Active shift check — bina shift ke sale nahi ban sakti
    const cashierId = req.user?.id || req.user?._id;
    const activeShift = await Shift.findOne({
      cashier: cashierId,
      status: "OPEN",
      isActive: true,
    });

    if (!activeShift) {
      return res.status(400).json({
        success: false,
        message: "Sale karne ke liye pehle apna shift open karo",
      });
    }

    let settings = await Settings.findOne();
    if (!settings) settings = await Settings.create({});
    const maxPercent = settings?.maxDiscountPercent ?? 20;

    // GST config - agar gstEnabled false hai to sab rates 0 maan lo
    const gstEnabled = settings?.gstEnabled ?? true;
    const defaultGstRate = gstEnabled ? (settings?.defaultGstRate ?? 0) : 0;
    const additionalGstRate = gstEnabled
      ? (settings?.additionalGstRate ?? 0)
      : 0;

    let subTotal = 0;
    let cogsAmount = 0; // Cost of Goods Sold - accounting entry ke liye (qty * purchasePrice, FOC items bhi shamil hain kyunki cost to laga hi)
    let totalGstAmount = 0; // sirf non-FOC lines ka GST - customer se charge hota hai
    let focGstAmount = 0; // FOC lines ka GST - sirf record ke liye, customer se NAHI liya
    const preparedItems = [];

    for (const line of items) {
      const dbItem = await Item.findById(line.item);
      if (!dbItem) {
        return res
          .status(404)
          .json({ success: false, message: `Item not found: ${line.item}` });
      }

      // Expiry hard-block: agar item ki expiry date guzar chuki hai to sale nahi ho sakti
      if (dbItem.expiryDate && new Date(dbItem.expiryDate) < new Date()) {
        return res.status(400).json({
          success: false,
          message: `"${dbItem.itemName}" expire ho chuka hai (${new Date(dbItem.expiryDate).toLocaleDateString()}), sale nahi ho sakti`,
        });
      }

      const gross = line.qty * line.sellPrice;
      const flatDiscountTotal = line.qty * FLAT_DISCOUNT_PER_ITEM;
      const afterFlat = Math.max(gross - flatDiscountTotal, 0);

      const itemLessPercent = line.lessPercent || 0;
      const itemLessAmount = line.lessAmount || 0;

      const effectivePercent =
        itemLessAmount > 0
          ? (itemLessAmount / afterFlat) * 100
          : itemLessPercent;

      if (effectivePercent > maxPercent) {
        return res.status(400).json({
          success: false,
          message: `"${dbItem.itemName}" ka discount allowed max ${maxPercent}% se zyada hai`,
        });
      }

      const extraDiscount =
        itemLessAmount > 0
          ? itemLessAmount
          : (afterFlat * itemLessPercent) / 100;
      let lineTotal = Math.max(afterFlat - extraDiscount, 0);

      // GST rate: item ka apna rate ho to wo, warna Settings ka default
      const effectiveGstRate = dbItem.gstRate ?? defaultGstRate;
      const isFOC = Boolean(line.isFOC);
      let lineGstAmount;

      if (isFOC) {
        // FOC: customer se paisa nahi liya jata (lineTotal force 0), lekin
        // GST record ke liye item ki normal value (qty * sellPrice) pe calculate
        // hota hai - ye customer ko charge NAHI hoga, sirf FBR/accounting record
        lineGstAmount = (line.qty * line.sellPrice * effectiveGstRate) / 100;
        focGstAmount += lineGstAmount;
        lineTotal = 0;
      } else {
        // Normal: GST discount-ke-baad amount pe (jo customer se charge ho raha hai)
        lineGstAmount = (lineTotal * effectiveGstRate) / 100;
        totalGstAmount += lineGstAmount;
      }

      subTotal += lineTotal;
      cogsAmount += line.qty * (dbItem.purchasePrice || 0);
      preparedItems.push({
        item: dbItem._id,
        itemName: dbItem.itemName, // rollback ke baad error message mein naam ke liye
        qty: line.qty,
        sellPrice: line.sellPrice,
        lessPercent: itemLessPercent,
        lessAmount: itemLessAmount,
        lineTotal,
        isFOC,
        gstRate: effectiveGstRate,
        gstAmount: lineGstAmount,
      });
    }

    const billEffectivePercent =
      lessAmount > 0 ? (lessAmount / subTotal) * 100 : lessPercent;

    if (billEffectivePercent > maxPercent) {
      return res.status(400).json({
        success: false,
        message: `Bill discount allowed max ${maxPercent}% se zyada hai`,
      });
    }

    // Atomically har item ka stock decrement karo — condition ke sath
    // (stockQty >= qty), taake race condition mein bhi negative na jaye.
    // Agar koi item beech mein fail ho, jo pehle decrement ho chuke unko
    // rollback karke poori sale abort kar do (all-or-nothing).
    const stockResults = [];
    for (const line of preparedItems) {
      const updatedItem = await Item.findOneAndUpdate(
        { _id: line.item, stockQty: { $gte: line.qty } },
        { $inc: { stockQty: -line.qty } },
        { new: true, runValidators: false },
      );

      if (!updatedItem) {
        // Stock kam pad gaya (ya kisi aur ne beech mein le liya) — abort + rollback
        await rollbackDecrements();
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${line.itemName}`,
        });
      }

      decrementedSoFar.push({ itemId: line.item, qty: line.qty });
      stockResults.push({
        item: line.item,
        balanceAfter: updatedItem.stockQty,
      });
    }

    const billDiscountValue =
      lessAmount > 0 ? lessAmount : (subTotal * lessPercent) / 100;
    const totalAmount = subTotal - billDiscountValue;

    // Additional GST ("Further Tax") - Settings mein set kiya gaya rate,
    // har sale pe automatically apply hota hai (goods value pe, tax-se-pehle)
    const additionalGstAmount = (totalAmount * additionalGstRate) / 100;

    // Grand Total - customer ne asal mein itna dena hai (goods + GST + Additional GST).
    // Note: bill-level discount abhi GST ko proportionally adjust nahi karta -
    // GST line-level (item-discount ke baad) amount pe hi calculate hua hai.
    const grandTotal = totalAmount + totalGstAmount + additionalGstAmount;
    const receivable = grandTotal - receivedAmount;

    const invoiceNo = req.body.invoiceNo || `INV-${Date.now()}`;

    let sale;
    try {
      sale = await Sale.create({
        invoiceNo,
        customer,
        items: preparedItems.map(({ itemName, ...rest }) => rest), // itemName sirf internal tha, schema mein nahi
        subTotal,
        lessPercent,
        lessAmount,
        totalAmount,
        totalGstAmount,
        additionalGstAmount,
        focGstAmount,
        grandTotal,
        paymentType,
        payments,
        receivedAmount,
        changeDue,
        receivable: receivable > 0 ? receivable : 0,
        salesman,
        biltiNo,
        remarks,
        shift: activeShift._id,
        status: "ACTIVE",
        createdBy: cashierId,
      });
    } catch (saleCreateError) {
      // Sale create hi fail ho gayi (validation error waghera) — stock rollback karo
      await rollbackDecrements();
      throw saleCreateError;
    }

    // Stock already atomically decrement ho chuka hai upar — ab sirf ledger trail banao
    for (const line of preparedItems) {
      const result = stockResults.find(
        (r) => String(r.item) === String(line.item),
      );
      await StockLedger.create({
        item: line.item,
        type: "OUT",
        qty: line.qty,
        refType: "Sale",
        refId: sale._id,
        balanceAfter: result.balanceAfter,
      });
    }

    // Live shift counters update karo — taake shift open rehte hue bhi
    // "abhi tak kitni sale hui" dikh sake (closeShift ke waqt Sale collection se
    // dobara authoritative recalculate hoti hai, ye sirf live display ke liye hai)
    let saleCashPortion = 0;
    let saleCardPortion = 0;
    let saleOtherPortion = 0;

    if (sale.payments && sale.payments.length > 0) {
      sale.payments.forEach((p) => {
        if (p.method === "CASH") saleCashPortion += p.amount;
        else if (p.method === "CARD") saleCardPortion += p.amount;
        else saleOtherPortion += p.amount;
      });
    } else if (sale.paymentType === "CASH") {
      saleCashPortion += sale.receivedAmount;
    } else if (sale.paymentType === "CARD") {
      saleCardPortion += sale.receivedAmount;
    } else {
      saleOtherPortion += sale.receivedAmount;
    }

    await Shift.findByIdAndUpdate(
      activeShift._id,
      {
        $inc: {
          totalCashSales: saleCashPortion,
          totalCardSales: saleCardPortion,
          totalOtherTenderSales: saleOtherPortion,
          totalSalesCount: 1,
        },
      },
      { runValidators: false },
    );

    if (customer && receivable > 0) {
      await postLedgerEntry({
        customerId: customer,
        type: "SALE",
        debit: receivable,
        reference: invoiceNo,
        saleId: sale._id,
        note: "Credit sale",
        createdBy: req.user?.id,
      });
    }

    // Accounting: revenue/tax/COGS journal entry post karo. Agar ye fail ho
    // (jaise koi account missing) to sale ko fail nahi karte - cashier ke liye
    // sale complete hona zyada zaroori hai, accounting baad mein reconcile ho sakti hai
    try {
      await postSaleJournal({ sale, cogsAmount, createdBy: cashierId });
    } catch (journalError) {
      console.error(
        "postSaleJournal error (sale saved, journal failed):",
        journalError,
      );
    }

    res.status(201).json({ success: true, sale });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/sales?from=&to=&invoiceNo=&customer=&paymentStatus=&salesman=&page=&limit=
const getAllSales = async (req, res) => {
  try {
    const {
      from,
      to,
      invoiceNo,
      customer,
      paymentStatus,
      salesman,
      status,
      page = 1,
      limit = 30,
    } = req.query;

    const filter = { isActive: { $ne: false } };

    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) {
        const endOfDay = new Date(to);
        endOfDay.setHours(23, 59, 59, 999);
        filter.date.$lte = endOfDay;
      }
    }

    if (invoiceNo) {
      filter.invoiceNo = { $regex: invoiceNo, $options: "i" };
    }

    if (salesman) filter.salesman = salesman;
    if (status) filter.status = status;

    if (paymentStatus === "paid") {
      filter.receivable = { $lte: 0 };
    } else if (paymentStatus === "partial") {
      filter.receivable = { $gt: 0 };
      filter.receivedAmount = { $gt: 0 };
    } else if (paymentStatus === "pending") {
      filter.receivable = { $gt: 0 };
      filter.receivedAmount = { $eq: 0 };
    }

    if (customer) {
      const matchingCustomers = await Customer.find({
        name: { $regex: customer, $options: "i" },
      }).select("_id");
      filter.customer = { $in: matchingCustomers.map((c) => c._id) };
    }

    const pageNum = Math.max(Number(page), 1);
    const limitNum = Math.max(Number(limit), 1);
    const skip = (pageNum - 1) * limitNum;

    const [sales, total] = await Promise.all([
      Sale.find(filter)
        .populate("customer", "name phone")
        .populate("items.item", "itemName barcode")
        .populate("salesman", "name username")
        .sort({ date: -1 })
        .skip(skip)
        .limit(limitNum),
      Sale.countDocuments(filter),
    ]);

    res.json({
      success: true,
      sales,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/sales/:id  (single receipt/reprint/detail view)
const getSaleById = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate("customer")
      .populate("items.item")
      .populate("salesman", "name username")
      .populate("voidedBy", "name username");
    if (!sale)
      return res
        .status(404)
        .json({ success: false, message: "Sale not found" });
    res.json({ success: true, sale });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/sales/:id/void
const voidSale = async (req, res) => {
  try {
    const { password, reason } = req.body;

    if (!password || password !== process.env.VOID_PASSWORD) {
      return res
        .status(401)
        .json({ success: false, message: "Galat password" });
    }

    if (!reason || !reason.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Void reason likhna zaroori hai" });
    }

    const sale = await Sale.findById(req.params.id);
    if (!sale) {
      return res
        .status(404)
        .json({ success: false, message: "Sale not found" });
    }
    if (sale.status === "VOID") {
      return res
        .status(400)
        .json({ success: false, message: "Sale pehle se hi voided hai" });
    }

    for (const line of sale.items) {
      const updatedItem = await Item.findByIdAndUpdate(
        line.item,
        { $inc: { stockQty: line.qty } },
        { new: true, runValidators: false },
      );

      await StockLedger.create({
        item: line.item,
        type: "IN",
        qty: line.qty,
        refType: "SaleVoid", // ab model enum mein add ho chuka hai, ye ab crash nahi karega
        refId: sale._id,
        balanceAfter: updatedItem.stockQty,
      });
    }

    sale.status = "VOID";
    sale.voidedAt = new Date();
    sale.voidedBy = req.user?.id || null;
    sale.voidReason = reason.trim();
    await sale.save();

    // Accounting reversal: original sale ki Revenue/Tax/COGS entries ko ulta karo.
    // COGS reversal ke liye current item.purchasePrice use ho raha hai (sale ke
    // waqt jo tha wo store nahi hota — agar beech mein purchase price badal gayi
    // ho to chhota sa mismatch aa sakta hai, negligible cases mein)
    try {
      const populatedSale = await Sale.findById(sale._id).populate(
        "items.item",
        "purchasePrice",
      );
      const cogsAmount = populatedSale.items.reduce(
        (sum, line) => sum + line.qty * (line.item?.purchasePrice || 0),
        0,
      );
      await postSaleVoidJournal({
        sale,
        cogsAmount,
        createdBy: req.user?.id || req.user?._id || null,
      });
    } catch (journalError) {
      console.error(
        "postSaleVoidJournal error (sale voided, journal reversal failed):",
        journalError,
      );
    }

    return res.json({ success: true, message: "Sale voided", sale });
  } catch (error) {
    console.error("voidSale error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/sales/salesman/:salesmanId?from=&to=
const getSalesBySalesman = async (req, res) => {
  try {
    const { from, to } = req.query;
    const filter = { salesman: req.params.salesmanId, status: "ACTIVE" };

    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    const sales = await Sale.find(filter).sort({ date: -1 });
    const totalSales = sales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalReceived = sales.reduce((sum, s) => sum + s.receivedAmount, 0);
    const totalReceivable = sales.reduce((sum, s) => sum + s.receivable, 0);

    const byPaymentType = sales.reduce((acc, s) => {
      acc[s.paymentType] = (acc[s.paymentType] || 0) + s.receivedAmount;
      return acc;
    }, {});

    res.json({
      success: true,
      sales,
      summary: {
        count: sales.length,
        totalSales,
        totalReceived,
        totalReceivable,
        byPaymentType,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/sales/:id
const updateSale = async (req, res) => {
  try {
    const { salesman, biltiNo, remarks, paymentType } = req.body;

    const sale = await Sale.findById(req.params.id);
    if (!sale) {
      return res
        .status(404)
        .json({ success: false, message: "Sale not found" });
    }
    if (sale.status === "VOID") {
      return res
        .status(400)
        .json({ success: false, message: "Voided sale edit nahi ho sakti" });
    }

    if (salesman !== undefined) sale.salesman = salesman;
    if (biltiNo !== undefined) sale.biltiNo = biltiNo;
    if (remarks !== undefined) sale.remarks = remarks;
    if (paymentType !== undefined) sale.paymentType = paymentType;

    await sale.save();
    res.json({ success: true, sale });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/sales/:id — soft delete
const deleteSale = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password || password !== process.env.VOID_PASSWORD) {
      return res
        .status(401)
        .json({ success: false, message: "Galat password" });
    }

    const sale = await Sale.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true, runValidators: false },
    );

    if (!sale) {
      return res
        .status(404)
        .json({ success: false, message: "Sale not found" });
    }

    res.json({ success: true, message: "Sale deleted", sale });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createSale,
  getAllSales,
  getSaleById,
  voidSale,
  getSalesBySalesman,
  updateSale,
  deleteSale,
};
