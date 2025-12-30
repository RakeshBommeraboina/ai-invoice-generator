const Invoice = require("../models/Invoice");
const { sendEmail } = require("./sendEmailController");

// @desc    Create new invoice
// @route   POST /api/invoices
// @access  Private
exports.createInvoice = async (req, res) => {
  try {
    const user = req.user;
    const {
      invoiceNumber,
      invoiceDate,
      dueDate,
      billFrom,
      billTo,
      items,
      notes,
      paymentTerms,
    } = req.body;

    // Flatten items if nested
    let flattenedItems = items;
    if (Array.isArray(items) && items.length > 0 && Array.isArray(items[0])) {
      flattenedItems = items.flat();
    }

    // subtotal calculation
    let subtotal = 0;
    let taxTotal = 0;
    flattenedItems.forEach((item) => {
      subtotal += item.unitPrice * item.quantity;
      taxTotal +=
        (item.unitPrice * item.quantity * (item.taxPercent || 0)) / 100;
    });

    const total = subtotal + taxTotal;

    const invoice = new Invoice({
      user,
      invoiceNumber,
      invoiceDate,
      dueDate,
      billFrom,
      billTo,
      items: flattenedItems,
      notes,
      paymentTerms,
      subtotal,
      taxTotal,
      total,
    });

    await invoice.save();

    // Send email notification
    // Send email notification
if (invoice.billTo && invoice.billTo.email) {
  try {
    const mailOptions = {
      to: invoice.billTo.email,
      subject: `Invoice ${invoice.invoiceNumber} from ${
        req.user.businessName || req.user.name
      }`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Invoice ${invoice.invoiceNumber}</title>
</head>
<body style="margin:0; padding:0; background:#f4f6f8; font-family:Arial, Helvetica, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:30px 0;">
        <table width="700" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:8px; overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="padding:24px; border-bottom:1px solid #e5e7eb;">
              <table width="100%">
                <tr>
                  <td>
                    <h2 style="margin:0;">INVOICE</h2>
                    <p style="margin:5px 0 0; color:#555;">
                      # ${invoice.invoiceNumber}
                    </p>
                  </td>
                  <td align="right">
                    <span style="padding:6px 12px; background:#fde68a; color:#92400e; border-radius:12px; font-size:13px;">
                      ${invoice.status || "Unpaid"}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Bill Info -->
          <tr>
            <td style="padding:24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <!-- Bill From -->
                  <td width="50%" valign="top">
                    <h4 style="margin:0 0 8px;">Bill From</h4>
                    <p style="margin:0; color:#444;">
                      <strong>${billFrom?.businessName || req.user.businessName}</strong><br/>
                      ${billFrom?.address || ""}<br/>
                      ${billFrom?.email || req.user.email}<br/>
                      ${billFrom?.phone || ""}
                    </p>
                  </td>

                  <!-- Bill To -->
                  <td width="50%" valign="top">
                    <h4 style="margin:0 0 8px;">Bill To</h4>
                    <p style="margin:0; color:#444;">
                      <strong>${billTo.clientName}</strong><br/>
                      ${billTo.address || ""}<br/>
                      ${billTo.email}<br/>
                      ${billTo.phone || ""}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Dates -->
          <tr>
            <td style="padding:0 24px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td><strong>Invoice Date:</strong></td>
                  <td>${new Date(invoice.invoiceDate).toLocaleDateString()}</td>
                  <td><strong>Due Date:</strong></td>
                  <td>${new Date(invoice.dueDate).toLocaleDateString()}</td>
                  <td><strong>Payment Terms:</strong></td>
                  <td>${invoice.paymentTerms || "N/A"}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Items Table -->
          <tr>
            <td style="padding:0 24px 24px;">
              <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;">
                <tr style="background:#f3f4f6;">
                  <th align="left">Item</th>
                  <th align="center">Qty</th>
                  <th align="right">Price</th>
                  <th align="right">Total</th>
                </tr>

                ${invoice.items
                  .map(
                    (item) => `
                  <tr style="border-bottom:1px solid #e5e7eb;">
                    <td>${item.name}</td>
                    <td align="center">${item.quantity}</td>
                    <td align="right">₹${item.unitPrice.toFixed(2)}</td>
                    <td align="right">
                      ₹${(item.unitPrice * item.quantity * (1 + (item.taxPercent || 0) / 100)).toFixed(2)}
                    </td>
                  </tr>
                `
                  )
                  .join("")}
              </table>
            </td>
          </tr>

          <!-- Totals -->
          <tr>
            <td style="padding:0 24px 24px;">
              <table width="100%">
                <tr>
                  <td align="right" width="80%">Subtotal:</td>
                  <td align="right">₹${invoice.subtotal.toFixed(2)}</td>
                </tr>
                <tr>
                  <td align="right">Tax:</td>
                  <td align="right">₹${invoice.taxTotal.toFixed(2)}</td>
                </tr>
                <tr>
                  <td align="right"><strong>Total:</strong></td>
                  <td align="right">
                    <strong>₹${invoice.total.toFixed(2)}</strong>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Notes -->
          ${
            invoice.notes
              ? `
          <tr>
            <td style="padding:0 24px 24px;">
              <strong>Notes:</strong>
              <p style="margin:8px 0 0; color:#555;">${invoice.notes}</p>
            </td>
          </tr>`
              : ""
          }

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb; padding:16px; text-align:center; font-size:12px; color:#666;">
              Thank you for your business.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
,
    };

    await sendEmail(mailOptions);
    console.log("✅ Invoice email sent to client:", invoice.billTo.email);
  } catch (emailError) {
    console.error("❌ Error sending invoice email:", emailError);
  }
}
 else {
      console.log("BillTo email not available for sending invoice");
    }

    res.status(201).json(invoice);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error creating invoice", error: error.message });
  }
};

// @desc    Get all invoices of logged-in user
// @route   GET /api/invoices
// @access  Private
exports.getInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find({ user: req.user.id }).populate(
      "user",
      "name email"
    );
    res.json(invoices);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching invoice", error: error.message });
  }
};

// @desc    Get single invoice by ID
// @route   GET /api/invoices/:id
// @access  Private
exports.getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate(
      "user",
      "name email"
    );
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });

    // Check if the invoice belongs to the user
    if (invoice.user._id.toString() !== req.user.id) {
      return res.status(401).json({ message: "Not authorized" });
    }

    res.json(invoice);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching invoice", error: error.message });
  }
};

// @desc    Update invoice
// @route   PUT /api/invoices/:id
// @access  Private
exports.updateInvoice = async (req, res) => {
  try {
    const {
      invoiceNumber,
      invoiceDate,
      dueDate,
      billFrom,
      billTo,
      items,
      notes,
      paymentTerms,
      status,
    } = req.body;

    // recalculate totals if items changed
    let subtotal = 0;
    let taxTotal = 0;
    if (items && items.length > 0) {
      items.forEach((item) => {
        subtotal += item.unitPrice * item.quantity;
        taxTotal +=
          (item.unitPrice * item.quantity * (item.taxPercent || 0)) / 100;
      });
    }

    const total = subtotal + taxTotal;

    const updatedInvoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      {
        invoiceNumber,
        invoiceDate,
        dueDate,
        billFrom,
        billTo,
        items,
        notes,
        paymentTerms,
        status,
        subtotal,
        taxTotal,
        total,
      },
      { new: true }
    );

    if (!updatedInvoice)
      return res.status(404).json({ message: "Invoice not found" });

    res.json(updatedInvoice);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating invoice", error: error.message });
  }
};

// @desc    Delete invoice
// @route   DELETE /api/invoices/:id
// @access  Private
exports.deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndDelete(req.params.id);
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    res.json({ message: "Invoice deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting invoice", error: error.message });
  }
};
