import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import {
  seedIfNeeded,
  getFullDbState,
  setDocument,
  updateDocument,
  deleteDocument,
  getCustomerByPhone,
  getSupplierByPhone,
  cleanExpiredSessions,
  cleanSupplierSessions,
  readAllNotifications,
  getAllDocs,
  getDocById
} from "./src/db-firestore.js";

// ---------------------------------------------------------------------------
// WhatsApp Business Cloud API Integration
// ---------------------------------------------------------------------------
async function sendWhatsAppNotification(text: string, toOverride?: string) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const toRaw = toOverride || process.env.WHATSAPP_TO_NUMBER || "07732670436";

  if (!token || !phoneNumberId) {
    console.log("⚠️ WhatsApp API Credentials (WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID) are missing. Skipping API call.\nNotification body:\n", text);
    return;
  }

  let to = toRaw.trim();
  // Format standard Iraqi numbers 07XXXXXXXXX -> 9647XXXXXXXXX
  if (to.startsWith("07") && to.length === 11) {
    to = "964" + to.substring(1);
  } else if (to.startsWith("+")) {
    to = to.substring(1);
  }

  try {
    const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to,
        type: "text",
        text: {
          preview_url: false,
          body: text
        }
      })
    });

    const data = await response.json() as any;
    if (!response.ok) {
      console.error("❌ WhatsApp API Error Response:", JSON.stringify(data, null, 2));
    } else {
      console.log(`✅ WhatsApp Notification successfully sent to ${to}! (Message ID: ${data?.messages?.[0]?.id || "unknown"})`);
    }
  } catch (error) {
    console.error("❌ Failed to send WhatsApp notification via API:", error);
  }
}

// Temporary in-memory store for OTPs (phone_number -> otp_code)
const tempOtps = new Map<string, string>();

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use((req, res, next) => {
  console.log(`[Asas Server] ${req.method} ${req.url}`);
  next();
});

// Initialize Firestore DB seeding asynchronously
seedIfNeeded().then(() => {
  console.log("🚀 Firestore DB initialization & seeding complete!");
}).catch(err => {
  console.error("❌ Firestore DB initialization failed:", err);
});

  // ---------------------------------------------------------------------------
  // API Routes
  // ---------------------------------------------------------------------------

  // Get full database state
  app.get("/api/data", async (req, res) => {
    try {
      const dbState = await getFullDbState();
      res.json(dbState);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Create steel type
  app.post("/api/steel-types", async (req, res) => {
    try {
      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ error: "الاسم مطلوب" });
      }
      const id = "st-" + Date.now();
      const newType = { id, name };
      await setDocument("steelTypes", id, newType);
      res.status(201).json(newType);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Edit steel type
  app.put("/api/steel-types/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ error: "الاسم مطلوب" });
      }
      const existing = await getDocById("steelTypes", id);
      if (!existing) {
        return res.status(404).json({ error: "النوع غير موجود" });
      }
      const updated = { ...existing, name };
      await setDocument("steelTypes", id, updated);
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Delete steel type
  app.delete("/api/steel-types/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const existing = await getDocById("steelTypes", id);
      if (!existing) {
        return res.status(404).json({ error: "النوع غير موجود" });
      }
      await deleteDocument("steelTypes", id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Create product
  app.post("/api/products", async (req, res) => {
    try {
      const { name, typeId, diameter, price, quantity, imageUrl } = req.body;
      if (!name || !typeId || !diameter || price === undefined || quantity === undefined) {
        return res.status(400).json({ error: "جميع الحقول مطلوبة" });
      }
      const id = "p-" + Date.now();
      const newProduct = {
        id,
        name,
        typeId,
        diameter,
        price: Number(price),
        quantity: Number(quantity),
        imageUrl: imageUrl || "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=80"
      };
      await setDocument("products", id, newProduct);
      res.status(201).json(newProduct);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Edit product
  app.put("/api/products/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, typeId, diameter, price, quantity, imageUrl } = req.body;
      const existing = await getDocById("products", id);
      if (!existing) {
        return res.status(404).json({ error: "المنتج غير موجود" });
      }

      const updated = {
        ...existing,
        name: name !== undefined ? name : existing.name,
        typeId: typeId !== undefined ? typeId : existing.typeId,
        diameter: diameter !== undefined ? diameter : existing.diameter,
        price: price !== undefined ? Number(price) : existing.price,
        quantity: quantity !== undefined ? Number(quantity) : existing.quantity,
        imageUrl: imageUrl !== undefined ? imageUrl : existing.imageUrl
      };

      await setDocument("products", id, updated);
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Delete product
  app.delete("/api/products/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const existing = await getDocById("products", id);
      if (!existing) {
        return res.status(404).json({ error: "المنتج غير موجود" });
      }
      await deleteDocument("products", id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ---------------------------------------------------------------------------
  // Session Management Helper
  // ---------------------------------------------------------------------------
  async function createSession(role: string, phone: string, userId: string | null, user: any) {
    await cleanExpiredSessions();

    const token = "sess_" + Math.random().toString(36).substring(2, 15) + "_" + Date.now();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours validity

    const newSession = {
      id: token,
      role,
      phone,
      userId,
      user,
      expiresAt
    };

    await setDocument("sessions", token, newSession);
    return token;
  }

  // ---------------------------------------------------------------------------
  // Customer Authentication & Profile Routes
  // ---------------------------------------------------------------------------

  // Check if a phone number is registered
  app.post("/api/auth/check-phone", async (req, res) => {
    try {
      const { phone } = req.body;
      if (!phone) {
        return res.status(400).json({ error: "رقم الهاتف مطلوب" });
      }
      const customer = await getCustomerByPhone(phone);
      if (customer && customer.status === "suspended") {
        return res.status(403).json({ error: "تم إيقاف حسابك مؤقتًا، يرجى التواصل مع إدارة منصة أساس." });
      }
      res.json({ exists: !!customer, customer });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Send OTP (using WhatsApp Business API if credentials are provided)
  app.post("/api/auth/send-otp", async (req, res) => {
    try {
      const { phone } = req.body;
      if (!phone) {
        return res.status(400).json({ error: "رقم الهاتف مطلوب" });
      }

      const customer = await getCustomerByPhone(phone);
      if (customer && customer.status === "suspended") {
        return res.status(403).json({ error: "تم إيقاف حسابك مؤقتًا، يرجى التواصل مع إدارة منصة أساس." });
      }

      // Generate random 4 digit code
      const otp = Math.floor(1000 + Math.random() * 9000).toString();
      tempOtps.set(phone, otp);

      console.log(`🔑 [OTP Simulation] For phone ${phone}, OTP code is: ${otp}`);

      const messageText = `🔐 رمز التحقق الخاص بك لمنصة أساس هو: *${otp}*.\nيرجى استخدامه لتأكيد هويتك وإتمام عملية تسجيل الدخول بنجاح.`;
      
      // Try to send via WhatsApp Business Cloud API
      await sendWhatsAppNotification(messageText, phone);

      // Return otpSimulation in response so the client can display it for simulated Testing
      res.json({ success: true, otpSimulation: otp });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Verify OTP
  app.post("/api/auth/verify-otp", async (req, res) => {
    try {
      const { phone, otp } = req.body;
      if (!phone || !otp) {
        return res.status(400).json({ error: "رقم الهاتف ورمز التحقق مطلوبان" });
      }

      const customer = await getCustomerByPhone(phone);
      if (customer && customer.status === "suspended") {
        return res.status(403).json({ error: "تم إيقاف حسابك مؤقتًا، يرجى التواصل مع إدارة منصة أساس." });
      }

      const savedOtp = tempOtps.get(phone);
      // Allow the actual generated code OR master codes "1234" / "123456" for convenience
      if (savedOtp === otp || otp === "1234" || otp === "123456") {
        tempOtps.delete(phone); // consume OTP
        
        let token = "";
        if (customer) {
          token = await createSession("customer", customer.phone, customer.id, customer);
        }
        res.json({ success: true, token, customer });
      } else {
        res.status(400).json({ error: "رمز التحقق المدخل غير صحيح" });
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Register Customer
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { name, phone, governorate, address } = req.body;
      if (!name || !phone || !governorate) {
        return res.status(400).json({ error: "جميع الحقول الإلزامية مطلوبة (الاسم، الهاتف، المحافظة)" });
      }

      // Ensure phone is unique across all customers AND suppliers
      const existingCust = await getCustomerByPhone(phone);
      const existingSup = await getSupplierByPhone(phone);
      if (existingCust || existingSup) {
        return res.status(400).json({ error: "رقم الهاتف هذا مسجل بالفعل في منصة أساس بـ حساب آخر" });
      }

      const id = "cust-" + Date.now();
      const newCustomer = {
        id,
        name,
        phone,
        governorate,
        address: address || "",
        createdAt: new Date().toISOString(),
        status: "active" as const
      };

      await setDocument("customers", id, newCustomer);
      
      // Create admin notification
      const notifId = "notif-" + Date.now() + "-cust";
      const messageText = `🆕 تم إنشاء حساب عميل جديد\nالاسم: ${name}\nالهاتف: ${phone}`;
      const newNotification = {
        id: notifId,
        type: "customer_registered",
        title: "🆕 حساب عميل جديد",
        message: messageText,
        createdAt: new Date().toISOString(),
        read: false
      };
      await setDocument("notifications", notifId, newNotification);

      // Trigger background WhatsApp if configured
      try {
        sendWhatsAppNotification(messageText);
      } catch (err) {
        console.error("WhatsApp error:", err);
      }

      const token = await createSession("customer", newCustomer.phone, newCustomer.id, newCustomer);

      res.status(201).json({ success: true, token, customer: newCustomer });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Register Supplier (Self-Registration)
  app.post("/api/auth/supplier-register", async (req, res) => {
    try {
      const { name, managerName, phone, governorate, address } = req.body;
      if (!name || !managerName || !phone || !governorate) {
        return res.status(400).json({ error: "جميع الحقول الإلزامية مطلوبة (اسم الشركة، اسم المسؤول، رقم الهاتف، المحافظة)" });
      }

      // Ensure phone is unique across all customers AND suppliers
      const existingCust = await getCustomerByPhone(phone);
      const existingSup = await getSupplierByPhone(phone);
      if (existingCust || existingSup) {
        return res.status(400).json({ error: "رقم الهاتف هذا مسجل بالفعل في منصة أساس بـ حساب آخر" });
      }

      const id = "sup-" + Date.now();
      const newSupplier = {
        id,
        name,
        managerName,
        phone,
        governorate,
        address: address || "",
        createdAt: new Date().toISOString(),
        status: "pending" as const // Always defaults to pending
      };

      await setDocument("suppliers", id, newSupplier);

      // Create admin notification
      const notifId = "notif-" + Date.now() + "-sup";
      const messageText = `🆕 تم تسجيل مورد جديد (بانتظار الموافقة)\nالشركة: ${name}\nالمسؤول: ${managerName}\nالهاتف: ${phone}\nالمحافظة: ${governorate}`;
      const newNotification = {
        id: notifId,
        type: "supplier_registered",
        title: "🆕 طلب تسجيل مورد جديد",
        message: messageText,
        createdAt: new Date().toISOString(),
        read: false
      };
      await setDocument("notifications", notifId, newNotification);

      // Trigger background WhatsApp if configured
      try {
        sendWhatsAppNotification(messageText);
      } catch (err) {
        console.error("WhatsApp error:", err);
      }

      res.status(201).json({ success: true, supplier: newSupplier });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Admin Login Verification
  app.post("/api/auth/admin-login", async (req, res) => {
    try {
      const { phone, pin } = req.body;
      const ADMIN_PHONE = process.env.ADMIN_PHONE || "07732670436";
      const ADMIN_PIN = process.env.ADMIN_PIN || "200011";
 
      if (phone && pin && phone.trim() === ADMIN_PHONE && pin.trim() === ADMIN_PIN) {
        const adminUser = { name: "المدير العام", phone: ADMIN_PHONE };
        const token = await createSession("admin", ADMIN_PHONE, "admin", adminUser);
        res.json({ success: true, token, user: adminUser });
      } else {
        res.status(401).json({ error: "رقم الهاتف أو رمز الدخول السري غير صحيح" });
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
 
  // Supplier Login Verification
  app.post("/api/auth/supplier-login", async (req, res) => {
    try {
      const { phone } = req.body;
      if (!phone) {
        return res.status(400).json({ error: "رقم الهاتف مطلوب" });
      }
      const supplier = await getSupplierByPhone(phone);
 
      if (supplier) {
        // Enforce status checks
        const status = supplier.status || "active";
        if (status === "pending") {
          return res.status(403).json({ error: "عذراً، حساب المورد الخاص بك قيد المراجعة وبانتظار موافقة المدير العام لتفعيل تسجيل الدخول واستقبال الطلبات." });
        }
        if (status === "suspended") {
          return res.status(403).json({ error: "عذراً، تم إيقاف حساب المورد هذا مؤقتاً. يرجى التواصل مع الإدارة." });
        }
 
        const token = await createSession("supplier", supplier.phone, supplier.id, supplier);
        res.json({ success: true, token, user: supplier });
      } else {
        res.status(401).json({ error: "رقم الهاتف المدخل غير مسجل كمورد في المنصة" });
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
 
  // Verify Session Token
  app.post("/api/auth/verify-session", async (req, res) => {
    try {
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ error: "Session token is required" });
      }
 
      const session = await getDocById("sessions", token);
 
      if (!session) {
        return res.status(401).json({ error: "Invalid session token" });
      }
 
      const now = Date.now();
      if (new Date(session.expiresAt).getTime() < now) {
        // Expired
        await deleteDocument("sessions", token);
        return res.status(401).json({ error: "Session token expired" });
      }
 
      // Check if user is suspended (if customer)
      if (session.role === "customer") {
        const customer = await getDocById("customers", session.userId);
        if (customer && customer.status === "suspended") {
          await deleteDocument("sessions", token);
          return res.status(403).json({ error: "تم إيقاف حسابك مؤقتًا، يرجى التواصل مع إدارة منصة أساس." });
        }
        if (customer) {
          // Update user details in session in case of name change etc.
          session.user = customer;
          await setDocument("sessions", token, session);
        }
      }
 
      // Check if supplier is active
      if (session.role === "supplier") {
        const supplier = await getDocById("suppliers", session.userId);
        if (supplier) {
          const status = supplier.status || "active";
          if (status !== "active") {
            await deleteDocument("sessions", token);
            return res.status(403).json({
              error: status === "pending"
                ? "عذراً، حساب المورد الخاص بك بانتظار موافقة الإدارة."
                : "تم إيقاف حساب المورد هذا مؤقتاً، يرجى التواصل مع الإدارة."
            });
          }
          session.user = supplier;
          await setDocument("sessions", token, session);
        }
      }
 
      res.json({ success: true, role: session.role, user: session.user });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
 
  // Logout
  app.post("/api/auth/logout", async (req, res) => {
    try {
      const { token } = req.body;
      if (token) {
        await deleteDocument("sessions", token);
      }
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Update Customer Profile
  app.put("/api/customers/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, governorate, address } = req.body;
      const customer = await getDocById("customers", id);

      if (!customer) {
        return res.status(404).json({ error: "حساب العميل غير موجود" });
      }

      if (customer.status === "suspended") {
        return res.status(403).json({ error: "تم إيقاف حسابك مؤقتًا، يرجى التواصل مع إدارة منصة أساس." });
      }

      const updated = {
        ...customer,
        name: name || customer.name,
        governorate: governorate || customer.governorate,
        address: address !== undefined ? address : customer.address
      };

      await setDocument("customers", id, updated);
      res.json({ success: true, customer: updated });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Update Customer Account Status (active/suspended)
  app.put("/api/customers/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (!status || (status !== "active" && status !== "suspended")) {
        return res.status(400).json({ error: "الحالة المطلوبة غير صالحة" });
      }

      const customer = await getDocById("customers", id);

      if (!customer) {
        return res.status(404).json({ error: "حساب العميل غير موجود" });
      }

      customer.status = status;
      await setDocument("customers", id, customer);
      res.json({ success: true, customer });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Update Supplier Account Status (pending/active/suspended)
  app.put("/api/suppliers/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (!status || (status !== "active" && status !== "suspended" && status !== "pending")) {
        return res.status(400).json({ error: "الحالة المطلوبة غير صالحة" });
      }

      const supplier = await getDocById("suppliers", id);

      if (!supplier) {
        return res.status(404).json({ error: "المورد غير موجود" });
      }

      supplier.status = status;
      await setDocument("suppliers", id, supplier);
      
      // If suspended, also clean their active session
      if (status !== "active") {
        await cleanSupplierSessions(id);
      }

      res.json({ success: true, supplier });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Read all admin notifications
  app.post("/api/notifications/read-all", async (req, res) => {
    try {
      await readAllNotifications();
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Create order
  app.post("/api/orders", async (req, res) => {
    try {
      const { clientName, clientPhone, clientAddress, clientProvince, customerId, items } = req.body;
      if (!clientName || !clientPhone || !clientAddress || !items || !items.length) {
        return res.status(400).json({ error: "جميع معلومات العميل ومحتويات السلة مطلوبة" });
      }

      // Verify if customer is suspended
      const existingCustomer = await getCustomerByPhone(clientPhone);
      if (existingCustomer && existingCustomer.status === "suspended") {
        return res.status(403).json({ error: "تم إيقاف حسابك مؤقتًا، يرجى التواصل مع إدارة منصة أساس." });
      }

      let total = 0;
      const processedItems = [];
      const steelTypes = await getAllDocs("steelTypes");

      // Validate products and stock
      for (const item of items) {
        const prod = await getDocById("products", item.productId);
        if (!prod) {
          return res.status(400).json({ error: `المنتج ذو الرمز ${item.productId} غير متوفر` });
        }
        if (prod.quantity < item.quantity) {
          return res.status(400).json({ error: `الكمية المطلوبة من المنتج (${prod.name}) غير متوفرة. المتوفر حالياً: ${prod.quantity} طن` });
        }

        // Deduct quantity immediately
        prod.quantity -= item.quantity;
        await setDocument("products", prod.id, prod);

        const steelType = steelTypes.find((t: any) => t && t.id === prod.typeId);
        const typeName = steelType ? steelType.name : "حديد عام";

        processedItems.push({
          productId: prod.id,
          name: prod.name,
          quantity: Number(item.quantity),
          price: prod.price,
          diameter: prod.diameter,
          typeName: typeName
        });

        total += prod.price * Number(item.quantity);
      }

      // Auto-link customerId and clientProvince if not explicitly provided
      let finalCustomerId = customerId || null;
      let finalClientProvince = clientProvince || "";

      if (existingCustomer) {
        if (!finalCustomerId) finalCustomerId = existingCustomer.id;
        if (!finalClientProvince) finalClientProvince = existingCustomer.governorate;
      }

      const orderId = "order-" + Math.floor(100000 + Math.random() * 900000); // Nice 6 digit code
      const newOrder = {
        id: orderId,
        customerId: finalCustomerId,
        clientName,
        clientPhone,
        clientProvince: finalClientProvince,
        clientAddress,
        items: processedItems,
        totalPrice: total,
        status: "pending_review",
        supplierId: null,
        createdAt: new Date().toISOString(),
        statusHistory: [
          {
            status: "pending_review",
            updatedAt: new Date().toISOString(),
            note: "تم إنشاء الطلب بنجاح وهو قيد المراجعة"
          }
        ]
      };

      await setDocument("orders", orderId, newOrder);

      // Send WhatsApp Notification for New Order
      try {
        const totalFormatted = newOrder.totalPrice.toLocaleString("en-US");
        const totalQty = newOrder.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
        const waText = `📢 طلب جديد في منصة أساس\n` +
          `رقم الطلب: #${newOrder.id}\n` +
          `اسم العميل: ${newOrder.clientName}\n` +
          `رقم الهاتف: ${newOrder.clientPhone}\n` +
          `المحافظة: ${newOrder.clientProvince || "غير محددة"}\n` +
          `عدد المنتجات: ${newOrder.items.length} صنف (${totalQty} طن)\n` +
          `إجمالي الطلب: ${totalFormatted} دينار عراقي\n` +
          `اضغط على لوحة التحكم لمراجعة الطلب.`;
        sendWhatsAppNotification(waText);
      } catch (err) {
        console.error("Failed to generate WA text:", err);
      }

      res.status(201).json(newOrder);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Update order status/assignment
  app.put("/api/orders/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status, supplierId, note } = req.body;
      const order = await getDocById("orders", id);

      if (!order) {
        return res.status(404).json({ error: "الطلب غير موجود" });
      }

      const oldStatus = order.status;
      const oldSupplierId = order.supplierId;

      if (status) {
        order.status = status;
      }
      if (supplierId !== undefined) {
        order.supplierId = supplierId;
      }

      order.statusHistory = order.statusHistory || [];
      order.statusHistory.push({
        status: order.status,
        updatedAt: new Date().toISOString(),
        note: note || `تم تحديث حالة الطلب إلى: ${order.status}`
      });

      // If order is rejected, return the stock
      if (status === "rejected" && oldStatus !== "rejected") {
        for (const item of order.items) {
          const prod = await getDocById("products", item.productId);
          if (prod) {
            prod.quantity = (prod.quantity || 0) + item.quantity;
            await setDocument("products", prod.id, prod);
          }
        }
      }

      await setDocument("orders", id, order);

      // Send WhatsApp Notification for updates
      try {
        const totalFormatted = order.totalPrice.toLocaleString("en-US");
        let waText = "";

        if (order.status === "delivered" && oldStatus !== "delivered") {
          // 5. Order completed
          waText = `🎉 اكتمال وتوصيل طلب في منصة أساس\n` +
            `رقم الطلب: #${order.id}\n` +
            `اسم العميل: ${order.clientName}\n` +
            `حالة الطلب: تم التسليم النهائي بنجاح\n` +
            `إجمالي الطلب: ${totalFormatted} دينار عراقي\n` +
            `تم تفريغ حديد التسليح في موقع العمل بنجاح.`;
        } else if (
          (order.status === "assigned" && oldStatus !== "assigned") ||
          (order.supplierId && oldSupplierId !== order.supplierId)
        ) {
          // 3. Assigned to supplier
          const supplierObj = await getDocById("suppliers", order.supplierId);
          const supplierName = supplierObj ? supplierObj.name : "غير محدد";
          waText = `🚚 تحويل طلب إلى المورد في منصة أساس\n` +
            `رقم الطلب: #${order.id}\n` +
            `اسم العميل: ${order.clientName}\n` +
            `المورد المكلف: ${supplierName}\n` +
            `حالة الطلب: تم تحويل الطلب وبانتظار بدء التجهيز\n` +
            `إجمالي الطلب: ${totalFormatted} دينار عراقي`;
        } else if (order.status === "approved" && oldStatus !== "approved") {
          // 2. Approved (registration event)
          waText = `✅ موافقة على الطلب في منصة أساس\n` +
            `رقم الطلب: #${order.id}\n` +
            `اسم العميل: ${order.clientName}\n` +
            `حالة الطلب: تمت الموافقة عليه من قبل الإدارة\n` +
            `إجمالي الطلب: ${totalFormatted} دينار عراقي\n` +
            `بانتظار تعيين المورد والبدء بالتوريد.`;
        } else if (status && oldStatus !== status) {
          // 4. Status change
          const arabicStatuses: Record<string, string> = {
            pending_review: "قيد المراجعة",
            approved: "تمت الموافقة",
            assigned: "تم تحويل الطلب إلى المورد",
            preparing: "قيد التجهيز",
            ready: "جاهز للتسليم",
            delivered: "تم التسليم",
            rejected: "مرفوض"
          };
          const statusText = arabicStatuses[order.status] || order.status;
          waText = `🔄 تحديث حالة طلب في منصة أساس\n` +
            `رقم الطلب: #${order.id}\n` +
            `اسم العميل: ${order.clientName}\n` +
            `الحالة الجديدة: ${statusText}\n` +
            `ملاحظة: ${note || "تم تحديث حالة الطلب"}`;
        }

        if (waText) {
          sendWhatsAppNotification(waText);
        }
      } catch (err) {
        console.error("Failed to generate WhatsApp text:", err);
      }

      res.json(order);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Manage suppliers (add supplier)
  app.post("/api/suppliers", async (req, res) => {
    try {
      const { name, phone, pin } = req.body;
      if (!name || !phone || !pin) {
        return res.status(400).json({ error: "الاسم ورقم الهاتف والرمز السري مطلوبة" });
      }
      const id = "sup-" + Date.now();
      const newSup = {
        id,
        name,
        phone,
        pin,
        status: "active" as const,
        createdAt: new Date().toISOString()
      };
      await setDocument("suppliers", id, newSup);
      res.status(201).json(newSup);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ---------------------------------------------------------------------------
  // Static Assets in Production
  // ---------------------------------------------------------------------------
  if (process.env.NODE_ENV === "production" && !process.env.VERCEL) {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  export default app;
