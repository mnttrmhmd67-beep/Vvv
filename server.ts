import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DB_DIR, "db.json");

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

// Define initial seed data
const initialSteelTypes = [
  { id: "st-1", name: "حديد تركي (إسكندرون)" },
  { id: "st-2", name: "حديد عراقي (أربيل)" },
  { id: "st-3", name: "حديد إماراتي (الإمارات)" },
  { id: "st-4", name: "حديد سابك (السعودية)" }
];

const initialProducts = [
  {
    id: "p-1",
    name: "شيش حديد تسليح قياس 12 ملم",
    typeId: "st-1",
    diameter: "12 ملم",
    price: 950000,
    quantity: 120,
    imageUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "p-2",
    name: "شيش حديد تسليح قياس 16 ملم",
    typeId: "st-2",
    diameter: "16 ملم",
    price: 910000,
    quantity: 85,
    imageUrl: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "p-3",
    name: "شيش حديد تسليح قياس 10 ملم",
    typeId: "st-3",
    diameter: "10 ملم",
    price: 980000,
    quantity: 60,
    imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "p-4",
    name: "حديد تسليح قياس 25 ملم ثقيل",
    typeId: "st-1",
    diameter: "25 ملم",
    price: 960000,
    quantity: 40,
    imageUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "p-5",
    name: "لفات سلك ربط حديد ناعم",
    typeId: "st-2",
    diameter: "1.5 ملم",
    price: 1100000,
    quantity: 15,
    imageUrl: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=600&q=80"
  }
];

const initialSuppliers = [
  { id: "sup-1", name: "مذخر حديد الرافدين", phone: "07701111111", pin: "100020" },
  { id: "sup-2", name: "شركة نينوى للتجهيزات الإنشائية", phone: "07702222222", pin: "100030" },
  { id: "sup-3", name: "مورد حديد الفرات الأوسط", phone: "07703333333", pin: "100040" }
];

const initialOrders = [];

// Helper to initialize and load the database
function initDb() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  const defaultDb = {
    steelTypes: initialSteelTypes,
    products: initialProducts,
    suppliers: initialSuppliers.map(s => ({ ...s, status: "active" })),
    orders: initialOrders,
    customers: [],
    sessions: [],
    notifications: []
  };

  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultDb, null, 2), "utf-8");
    return defaultDb;
  }

  try {
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    const data = JSON.parse(raw);
    let changed = false;
    if (!data.customers) {
      data.customers = [];
      changed = true;
    }
    if (!data.orders) {
      data.orders = [];
      changed = true;
    }
    if (!data.sessions) {
      data.sessions = [];
      changed = true;
    }
    if (!data.notifications) {
      data.notifications = [];
      changed = true;
    }
    if (data.suppliers) {
      data.suppliers.forEach((s: any) => {
        if (!s.status) {
          s.status = "active";
          changed = true;
        }
      });
    }
    if (changed) {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
    }
    return data;
  } catch (error) {
    console.error("Error reading database file, resetting to defaults", error);
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultDb, null, 2), "utf-8");
    return defaultDb;
  }
}

// Get raw DB state
function getDb() {
  return initDb();
}

// Save DB state
function saveDb(data: any) {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json());

  // Init DB log
  initDb();

  // ---------------------------------------------------------------------------
  // API Routes
  // ---------------------------------------------------------------------------

  // Get full database state
  app.get("/api/data", (req, res) => {
    try {
      const db = getDb();
      res.json(db);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Create steel type
  app.post("/api/steel-types", (req, res) => {
    try {
      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ error: "الاسم مطلوب" });
      }
      const db = getDb();
      const newType = {
        id: "st-" + Date.now(),
        name
      };
      db.steelTypes.push(newType);
      saveDb(db);
      res.status(201).json(newType);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Edit steel type
  app.put("/api/steel-types/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ error: "الاسم مطلوب" });
      }
      const db = getDb();
      const index = db.steelTypes.findIndex((t: any) => t.id === id);
      if (index === -1) {
        return res.status(404).json({ error: "النوع غير موجود" });
      }
      db.steelTypes[index].name = name;
      saveDb(db);
      res.json(db.steelTypes[index]);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Delete steel type
  app.delete("/api/steel-types/:id", (req, res) => {
    try {
      const { id } = req.params;
      const db = getDb();
      const index = db.steelTypes.findIndex((t: any) => t.id === id);
      if (index === -1) {
        return res.status(404).json({ error: "النوع غير موجود" });
      }
      db.steelTypes.splice(index, 1);
      saveDb(db);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Create product
  app.post("/api/products", (req, res) => {
    try {
      const { name, typeId, diameter, price, quantity, imageUrl } = req.body;
      if (!name || !typeId || !diameter || price === undefined || quantity === undefined) {
        return res.status(400).json({ error: "جميع الحقول مطلوبة" });
      }
      const db = getDb();
      const newProduct = {
        id: "p-" + Date.now(),
        name,
        typeId,
        diameter,
        price: Number(price),
        quantity: Number(quantity),
        imageUrl: imageUrl || "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=80"
      };
      db.products.push(newProduct);
      saveDb(db);
      res.status(201).json(newProduct);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Edit product
  app.put("/api/products/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { name, typeId, diameter, price, quantity, imageUrl } = req.body;
      const db = getDb();
      const index = db.products.findIndex((p: any) => p.id === id);
      if (index === -1) {
        return res.status(404).json({ error: "المنتج غير موجود" });
      }

      db.products[index] = {
        ...db.products[index],
        name: name !== undefined ? name : db.products[index].name,
        typeId: typeId !== undefined ? typeId : db.products[index].typeId,
        diameter: diameter !== undefined ? diameter : db.products[index].diameter,
        price: price !== undefined ? Number(price) : db.products[index].price,
        quantity: quantity !== undefined ? Number(quantity) : db.products[index].quantity,
        imageUrl: imageUrl !== undefined ? imageUrl : db.products[index].imageUrl
      };

      saveDb(db);
      res.json(db.products[index]);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Delete product
  app.delete("/api/products/:id", (req, res) => {
    try {
      const { id } = req.params;
      const db = getDb();
      const filtered = db.products.filter((p: any) => p.id !== id);
      if (filtered.length === db.products.length) {
        return res.status(404).json({ error: "المنتج غير موجود" });
      }
      db.products = filtered;
      saveDb(db);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ---------------------------------------------------------------------------
  // Session Management Helper
  // ---------------------------------------------------------------------------
  function createSession(role: string, phone: string, userId: string | null, user: any) {
    const db = getDb();
    db.sessions = db.sessions || [];
    
    // Clean up expired sessions
    const now = Date.now();
    db.sessions = db.sessions.filter((s: any) => new Date(s.expiresAt).getTime() > now);

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

    db.sessions.push(newSession);
    saveDb(db);
    return token;
  }

  // ---------------------------------------------------------------------------
  // Customer Authentication & Profile Routes
  // ---------------------------------------------------------------------------

  // Check if a phone number is registered
  app.post("/api/auth/check-phone", (req, res) => {
    try {
      const { phone } = req.body;
      if (!phone) {
        return res.status(400).json({ error: "رقم الهاتف مطلوب" });
      }
      const db = getDb();
      const customer = db.customers.find((c: any) => c.phone === phone);
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

      const db = getDb();
      const customer = db.customers.find((c: any) => c.phone === phone);
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
  app.post("/api/auth/verify-otp", (req, res) => {
    try {
      const { phone, otp } = req.body;
      if (!phone || !otp) {
        return res.status(400).json({ error: "رقم الهاتف ورمز التحقق مطلوبان" });
      }

      const db = getDb();
      const customer = db.customers.find((c: any) => c.phone === phone);
      if (customer && customer.status === "suspended") {
        return res.status(403).json({ error: "تم إيقاف حسابك مؤقتًا، يرجى التواصل مع إدارة منصة أساس." });
      }

      const savedOtp = tempOtps.get(phone);
      // Allow the actual generated code OR master codes "1234" / "123456" for convenience
      if (savedOtp === otp || otp === "1234" || otp === "123456") {
        tempOtps.delete(phone); // consume OTP
        
        let token = "";
        if (customer) {
          token = createSession("customer", customer.phone, customer.id, customer);
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
  app.post("/api/auth/register", (req, res) => {
    try {
      const { name, phone, governorate, address } = req.body;
      if (!name || !phone || !governorate) {
        return res.status(400).json({ error: "جميع الحقول الإلزامية مطلوبة (الاسم، الهاتف، المحافظة)" });
      }

      const db = getDb();
      
      // Ensure phone is unique across all customers AND suppliers
      const existingCust = db.customers.find((c: any) => c.phone.trim() === phone.trim());
      const existingSup = db.suppliers.find((s: any) => s.phone.trim() === phone.trim());
      if (existingCust || existingSup) {
        return res.status(400).json({ error: "رقم الهاتف هذا مسجل بالفعل في منصة أساس بـ حساب آخر" });
      }

      const newCustomer = {
        id: "cust-" + Date.now(),
        name,
        phone,
        governorate,
        address: address || "",
        createdAt: new Date().toISOString(),
        status: "active" as const
      };

      db.customers.push(newCustomer);
      
      // Create admin notification
      db.notifications = db.notifications || [];
      const messageText = `🆕 تم إنشاء حساب عميل جديد\nالاسم: ${name}\nالهاتف: ${phone}`;
      db.notifications.push({
        id: "notif-" + Date.now() + "-cust",
        type: "customer_registered",
        title: "🆕 حساب عميل جديد",
        message: messageText,
        createdAt: new Date().toISOString(),
        read: false
      });
      
      saveDb(db);

      // Trigger background WhatsApp if configured
      try {
        sendWhatsAppNotification(messageText);
      } catch (err) {
        console.error("WhatsApp error:", err);
      }

      const token = createSession("customer", newCustomer.phone, newCustomer.id, newCustomer);

      res.status(201).json({ success: true, token, customer: newCustomer });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Register Supplier (Self-Registration)
  app.post("/api/auth/supplier-register", (req, res) => {
    try {
      const { name, managerName, phone, governorate, address } = req.body;
      if (!name || !managerName || !phone || !governorate) {
        return res.status(400).json({ error: "جميع الحقول الإلزامية مطلوبة (اسم الشركة، اسم المسؤول، رقم الهاتف، المحافظة)" });
      }

      const db = getDb();

      // Ensure phone is unique across all customers AND suppliers
      const existingCust = db.customers.find((c: any) => c.phone.trim() === phone.trim());
      const existingSup = db.suppliers.find((s: any) => s.phone.trim() === phone.trim());
      if (existingCust || existingSup) {
        return res.status(400).json({ error: "رقم الهاتف هذا مسجل بالفعل في منصة أساس بـ حساب آخر" });
      }

      const newSupplier = {
        id: "sup-" + Date.now(),
        name,
        managerName,
        phone,
        governorate,
        address: address || "",
        createdAt: new Date().toISOString(),
        status: "pending" as const // Always defaults to pending
      };

      db.suppliers.push(newSupplier);

      // Create admin notification
      db.notifications = db.notifications || [];
      const messageText = `🆕 تم تسجيل مورد جديد (بانتظار الموافقة)\nالشركة: ${name}\nالمسؤول: ${managerName}\nالهاتف: ${phone}\nالمحافظة: ${governorate}`;
      db.notifications.push({
        id: "notif-" + Date.now() + "-sup",
        type: "supplier_registered",
        title: "🆕 طلب تسجيل مورد جديد",
        message: messageText,
        createdAt: new Date().toISOString(),
        read: false
      });

      saveDb(db);

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
  app.post("/api/auth/admin-login", (req, res) => {
    try {
      const { phone, pin } = req.body;
      const ADMIN_PHONE = process.env.ADMIN_PHONE || "07732670436";
      const ADMIN_PIN = process.env.ADMIN_PIN || "200011";

      if (phone && pin && phone.trim() === ADMIN_PHONE && pin.trim() === ADMIN_PIN) {
        const adminUser = { name: "المدير العام", phone: ADMIN_PHONE };
        const token = createSession("admin", ADMIN_PHONE, "admin", adminUser);
        res.json({ success: true, token, user: adminUser });
      } else {
        res.status(401).json({ error: "رقم الهاتف أو رمز الدخول السري غير صحيح" });
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Supplier Login Verification
  app.post("/api/auth/supplier-login", (req, res) => {
    try {
      const { phone } = req.body;
      if (!phone) {
        return res.status(400).json({ error: "رقم الهاتف مطلوب" });
      }
      const db = getDb();
      const supplier = db.suppliers.find(
        (s: any) => s.phone.trim() === phone.trim()
      );

      if (supplier) {
        // Enforce status checks
        const status = supplier.status || "active";
        if (status === "pending") {
          return res.status(403).json({ error: "عذراً، حساب المورد الخاص بك قيد المراجعة وبانتظار موافقة المدير العام لتفعيل تسجيل الدخول واستقبال الطلبات." });
        }
        if (status === "suspended") {
          return res.status(403).json({ error: "عذراً، تم إيقاف حساب المورد هذا مؤقتاً. يرجى التواصل مع الإدارة." });
        }

        const token = createSession("supplier", supplier.phone, supplier.id, supplier);
        res.json({ success: true, token, user: supplier });
      } else {
        res.status(401).json({ error: "رقم الهاتف المدخل غير مسجل كمورد في المنصة" });
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Verify Session Token
  app.post("/api/auth/verify-session", (req, res) => {
    try {
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ error: "Session token is required" });
      }

      const db = getDb();
      db.sessions = db.sessions || [];
      const session = db.sessions.find((s: any) => s.id === token);

      if (!session) {
        return res.status(401).json({ error: "Invalid session token" });
      }

      const now = Date.now();
      if (new Date(session.expiresAt).getTime() < now) {
        // Expired
        db.sessions = db.sessions.filter((s: any) => s.id !== token);
        saveDb(db);
        return res.status(401).json({ error: "Session token expired" });
      }

      // Check if user is suspended (if customer)
      if (session.role === "customer") {
        const customer = db.customers.find((c: any) => c.id === session.userId);
        if (customer && customer.status === "suspended") {
          db.sessions = db.sessions.filter((s: any) => s.id !== token);
          saveDb(db);
          return res.status(403).json({ error: "تم إيقاف حسابك مؤقتًا، يرجى التواصل مع إدارة منصة أساس." });
        }
        if (customer) {
          // Update user details in session in case of name change etc.
          session.user = customer;
          saveDb(db);
        }
      }

      // Check if supplier is active
      if (session.role === "supplier") {
        const supplier = db.suppliers.find((s: any) => s.id === session.userId);
        if (supplier) {
          const status = supplier.status || "active";
          if (status !== "active") {
            db.sessions = db.sessions.filter((s: any) => s.id !== token);
            saveDb(db);
            return res.status(403).json({
              error: status === "pending"
                ? "عذراً، حساب المورد الخاص بك بانتظار موافقة الإدارة."
                : "تم إيقاف حساب المورد هذا مؤقتاً، يرجى التواصل مع الإدارة."
            });
          }
          session.user = supplier;
          saveDb(db);
        }
      }

      res.json({ success: true, role: session.role, user: session.user });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    try {
      const { token } = req.body;
      if (token) {
        const db = getDb();
        db.sessions = db.sessions || [];
        db.sessions = db.sessions.filter((s: any) => s.id !== token);
        saveDb(db);
      }
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Update Customer Profile
  app.put("/api/customers/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { name, governorate, address } = req.body;
      const db = getDb();
      const index = db.customers.findIndex((c: any) => c.id === id);

      if (index === -1) {
        return res.status(404).json({ error: "حساب العميل غير موجود" });
      }

      if (db.customers[index].status === "suspended") {
        return res.status(403).json({ error: "تم إيقاف حسابك مؤقتًا، يرجى التواصل مع إدارة منصة أساس." });
      }

      db.customers[index] = {
        ...db.customers[index],
        name: name || db.customers[index].name,
        governorate: governorate || db.customers[index].governorate,
        address: address !== undefined ? address : db.customers[index].address
      };

      saveDb(db);
      res.json({ success: true, customer: db.customers[index] });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Update Customer Account Status (active/suspended)
  app.put("/api/customers/:id/status", (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (!status || (status !== "active" && status !== "suspended")) {
        return res.status(400).json({ error: "الحالة المطلوبة غير صالحة" });
      }

      const db = getDb();
      const index = db.customers.findIndex((c: any) => c.id === id);

      if (index === -1) {
        return res.status(404).json({ error: "حساب العميل غير موجود" });
      }

      db.customers[index].status = status;
      saveDb(db);
      res.json({ success: true, customer: db.customers[index] });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Update Supplier Account Status (pending/active/suspended)
  app.put("/api/suppliers/:id/status", (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (!status || (status !== "active" && status !== "suspended" && status !== "pending")) {
        return res.status(400).json({ error: "الحالة المطلوبة غير صالحة" });
      }

      const db = getDb();
      const index = db.suppliers.findIndex((s: any) => s.id === id);

      if (index === -1) {
        return res.status(404).json({ error: "المورد غير موجود" });
      }

      db.suppliers[index].status = status;
      
      // If suspended, also clean their active session
      if (status !== "active") {
        db.sessions = db.sessions || [];
        db.sessions = db.sessions.filter((s: any) => !(s.role === "supplier" && s.userId === id));
      }

      saveDb(db);
      res.json({ success: true, supplier: db.suppliers[index] });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Read all admin notifications
  app.post("/api/notifications/read-all", (req, res) => {
    try {
      const db = getDb();
      db.notifications = db.notifications || [];
      db.notifications.forEach((n: any) => n.read = true);
      saveDb(db);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Create order
  app.post("/api/orders", (req, res) => {
    try {
      const { clientName, clientPhone, clientAddress, clientProvince, customerId, items } = req.body;
      if (!clientName || !clientPhone || !clientAddress || !items || !items.length) {
        return res.status(400).json({ error: "جميع معلومات العميل ومحتويات السلة مطلوبة" });
      }

      const db = getDb();
      
      // Verify if customer is suspended
      const existingCustomer = db.customers.find((c: any) => c.phone === clientPhone);
      if (existingCustomer && existingCustomer.status === "suspended") {
        return res.status(403).json({ error: "تم إيقاف حسابك مؤقتًا، يرجى التواصل مع إدارة منصة أساس." });
      }

      let total = 0;
      const processedItems = [];

      // Validate products and stock
      for (const item of items) {
        const prod = db.products.find((p: any) => p.id === item.productId);
        if (!prod) {
          return res.status(400).json({ error: `المنتج ذو الرمز ${item.productId} غير متوفر` });
        }
        if (prod.quantity < item.quantity) {
          return res.status(400).json({ error: `الكمية المطلوبة من المنتج (${prod.name}) غير متوفرة. المتوفر حالياً: ${prod.quantity} طن` });
        }

        // Deduct quantity immediately
        prod.quantity -= item.quantity;

        const steelType = db.steelTypes.find((t: any) => t.id === prod.typeId);
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

      const newOrder = {
        id: "order-" + Math.floor(100000 + Math.random() * 900000), // Nice 6 digit code
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

      db.orders.push(newOrder);
      saveDb(db);

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
  app.put("/api/orders/:id/status", (req, res) => {
    try {
      const { id } = req.params;
      const { status, supplierId, note } = req.body;
      const db = getDb();
      const orderIndex = db.orders.findIndex((o: any) => o.id === id);

      if (orderIndex === -1) {
        return res.status(404).json({ error: "الطلب غير موجود" });
      }

      const order = db.orders[orderIndex];
      const oldStatus = order.status;
      const oldSupplierId = order.supplierId;

      if (status) {
        order.status = status;
      }
      if (supplierId !== undefined) {
        order.supplierId = supplierId;
      }

      order.statusHistory.push({
        status: order.status,
        updatedAt: new Date().toISOString(),
        note: note || `تم تحديث حالة الطلب إلى: ${order.status}`
      });

      // If order is rejected, return the stock
      if (status === "rejected") {
        for (const item of order.items) {
          const prod = db.products.find((p: any) => p.id === item.productId);
          if (prod) {
            prod.quantity += item.quantity;
          }
        }
      }

      db.orders[orderIndex] = order;
      saveDb(db);

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
          const supplierObj = db.suppliers.find((s: any) => s.id === order.supplierId);
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
  app.post("/api/suppliers", (req, res) => {
    try {
      const { name, phone, pin } = req.body;
      if (!name || !phone || !pin) {
        return res.status(400).json({ error: "الاسم ورقم الهاتف والرمز السري مطلوبة" });
      }
      const db = getDb();
      const newSup = {
        id: "sup-" + Date.now(),
        name,
        phone,
        pin
      };
      db.suppliers.push(newSup);
      saveDb(db);
      res.status(201).json(newSup);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ---------------------------------------------------------------------------
  // Vite Integration & Static Assets
  // ---------------------------------------------------------------------------

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Asas Platform] Server running on http://localhost:${PORT}`);
  });
}

startServer();
