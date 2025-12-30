const fetch = require("node-fetch");
const Invoice = require("../models/Invoice");

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// ---------- Parse Invoice From Text ----------
 const parseInvoiceFromText = async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ message: "Text is required" });
  }

  try {
    const prompt = `
You are an expert invoice data extraction AI. Analyze the following text and extract the relevant information to create an invoice.
The output MUST be a valid JSON object with this structure:

{
  "clientName": "string",
  "email": "string (if available)",
  "address": "string (if available)",
  "items": [
    {
      "name": "string",
      "quantity": "number",
      "unitPrice": "number"
    }
  ]
}

Here is the text to parse:
---
${text}
---
Return ONLY the JSON. No extra text.
    `;

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 512,
          temperature: 0.5,
        }),
      }
    );

    const data = await response.json();
    const responseText = data.choices?.[0]?.message?.content || "";

    let parsedData;
    try {
      parsedData = JSON.parse(responseText);
    } catch {
      const match = responseText.match(/{[\s\S]*}/);
      if (!match) throw new Error("No valid JSON found in AI response.");
      parsedData = JSON.parse(match[0]);
    }

    res.status(200).json(parsedData);
  } catch (error) {
    console.error("Error parsing invoice with AI:", error);
    res
      .status(500)
      .json({
        message: "Failed to parse invoice data from text.",
        details: error.message,
      });
  }
};

// ---------- Generate Reminder Email ----------
const generateReminderEmail = async (req, res) => {
  const { invoiceId } = req.body;

  if (!invoiceId) {
    return res.status(400).json({ message: "Invoice ID is required" });
  }

  try {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const user = req.user; // assuming auth middleware sets req.user

    const prompt = `
You are an expert HTML email generator for invoices.

TASK:
Generate a PAYMENT REMINDER email in HTML format ONLY. 
- Do NOT include markdown, backticks, plain text, or explanations.
- Keep it professional and friendly.
- Include client name, invoice number, amount due, due date, business name, and phone number.
- Make sure it is valid HTML ready to be sent as an email.
- Use a simple layout with header, body message, and footer.

Dynamic Values:
- Client Name: ${invoice.billTo.clientName}
- Invoice Number: ${invoice.invoiceNumber}
- Amount Due: ₹${invoice.total.toFixed(2)}
- Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}
- Business Name: ${user.businessName || "N/A"}
- Phone: ${user.phone || "N/A"}
`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 800,
        temperature: 0.3,
      }),
    });

    const data = await response.json();
    const html = data.choices?.[0]?.message?.content || "";
    console.log("🧠 AI Generated HTML:", html);

    // Safety check: Ensure we got valid HTML
    if (!html.includes("<html") || !html.includes("</html>")) {
      throw new Error("AI did not return valid HTML");
    }

    res.status(200).json({ html }); // return only HTML
  } catch (error) {
    console.error("Error generating reminder email with AI:", error);
    res.status(500).json({
      message: "Failed to generate reminder email.",
      details: error.message,
    });
  }
};

// ---------- Send Reminder Email ----------
const sendReminderEmail = async (req, res) => {
  const { invoiceId, reminderText } = req.body;
  console.log("Reminder Text:", reminderText);

  if (!invoiceId || !reminderText) {
    return res
      .status(400)
      .json({ message: "Invoice ID and reminder text are required" });
  }

  try {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    // Check if the invoice belongs to the user
    if (invoice.user.toString() !== req.user.id) {
      return res.status(401).json({ message: "Not authorized" });
    }

    if (!invoice.billTo || !invoice.billTo.email) {
      return res.status(400).json({ message: "BillTo email not available" });
    }

    const { sendEmail } = require("../controllers/sendEmailController");

    const mailOptions = {
      from: "aiinvoicegen@gmail.com",
      to: invoice.billTo.email,
      subject: `Payment Reminder for Invoice ${invoice.invoiceNumber}`,
      html: reminderText, // Use the provided reminder text as HTML
    };

    await sendEmail(mailOptions);

    res.status(200).json({ message: "Reminder email sent successfully" });
  } catch (error) {
    console.error("Error sending reminder email:", error);
    res.status(500).json({
      message: "Failed to send reminder email.",
      details: error.message,
    });
  }
};

// ---------- Get Dashboard Summary ----------
const getDashboardSummary = async (req, res) => {
  try {
    const invoices = await Invoice.find({ user: req.user.id });

    if (invoices.length === 0) {
      return res.status(200).json({
        insights: ["No invoice data available to generate insights."],
      });
    }

    const totalInvoices = invoices.length;
    const paidInvoices = invoices.filter((inv) => inv.status === "Paid");
    const unpaidInvoices = invoices.filter((inv) => inv.status !== "Paid");
    const totalRevenue = paidInvoices.reduce((acc, inv) => acc + inv.total, 0);
    const totalOutstanding = unpaidInvoices.reduce(
      (acc, inv) => acc + inv.total,
      0
    );

    const recentInvoices = invoices
      .slice(0, 5)
      .map(
        (inv) =>
          `Invoice #${inv.invoiceNumber} for ${inv.total.toFixed(2)} (${
            inv.status
          })`
      )
      .join(", ");

    const dataSummary = `
Total invoices: ${totalInvoices}
Paid invoices: ${paidInvoices.length}
Unpaid invoices: ${unpaidInvoices.length}
Total revenue: ${totalRevenue.toFixed(2)}
Outstanding amount: ${totalOutstanding.toFixed(2)}
Recent invoices: ${recentInvoices}
`;

    const prompt = `
You are a friendly and insightful financial analyst.

Analyze this data summary and return 2–3 short, helpful insights.

Rules:
- Output ONLY valid JSON.
- The entire response must be one JSON object in this format:
  { "insights": ["string", "string", "string"] }
- Do not include explanations, greetings, or markdown.

Data Summary:
${dataSummary}
`;

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 256,
          temperature: 0.4,
        }),
      }
    );

    const data = await response.json();
    const responseText = data.choices?.[0]?.message?.content || "";

    console.log("🧠 AI Raw Response:", responseText);

    let parsedData;
    try {
      parsedData = JSON.parse(responseText);
    } catch {
      const match = responseText.match(/{[\s\S]*}/);
      if (match) {
        try {
          parsedData = JSON.parse(match[0]);
        } catch (jsonError) {
          console.warn("⚠ Invalid JSON substring:", jsonError.message);
          parsedData = {
            insights: ["AI returned invalid JSON format. Please retry."],
          };
        }
      } else {
        console.warn("⚠ No valid JSON found. Returning fallback insights.");
        parsedData = { insights: ["Unable to generate insights from data."] };
      }
    }

    res.status(200).json(parsedData);
  } catch (error) {
    console.error("Error dashboard summary with AI:", error);
    res.status(500).json({
      message: "Failed to generate dashboard insights.",
      details: error.message,
    });
  }
};

module.exports = {
  parseInvoiceFromText,
  generateReminderEmail,
  sendReminderEmail,
  getDashboardSummary,
};
