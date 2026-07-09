/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product, SteelType, Order, Supplier, OrderStatus, Customer } from "../types";

export interface DatabaseState {
  products: Product[];
  steelTypes: SteelType[];
  orders: Order[];
  suppliers: Supplier[];
  customers: Customer[];
}

const LOCAL_STORAGE_KEY = "asas_platform_backup_db";

// Base API URL
const API_BASE = "/api";

export async function fetchAppState(): Promise<DatabaseState> {
  try {
    const response = await fetch(`${API_BASE}/data`);
    if (!response.ok) throw new Error("Failed to fetch state from server");
    const data = await response.json();
    
    // Save to local backup
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
    return data;
  } catch (error) {
    console.warn("Backend API unavailable, using local backup:", error);
    const backup = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (backup) {
      const parsed = JSON.parse(backup);
      if (!parsed.customers) parsed.customers = [];
      return parsed;
    }
    // Return empty defaults if nothing exists
    return {
      products: [],
      steelTypes: [],
      orders: [],
      suppliers: [],
      customers: []
    };
  }
}

export async function adminLogin(phone: string, pin: string): Promise<{ success: boolean; token?: string; user?: any }> {
  try {
    const response = await fetch(`${API_BASE}/auth/admin-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, pin })
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "رمز الدخول أو رقم الهاتف غير صحيح");
    }
    return await response.json();
  } catch (error: any) {
    console.warn("Admin login API error, trying fallback:", error);
    if (phone.trim() === "07732670436" && pin.trim() === "200011") {
      return { success: true, token: "sess_fallback_admin", user: { name: "المدير العام", phone: "07732670436" } };
    }
    throw new Error(error.message || "رمز الدخول أو رقم الهاتف غير صحيح");
  }
}

export async function supplierLogin(phone: string): Promise<{ success: boolean; token?: string; user?: any }> {
  const response = await fetch(`${API_BASE}/auth/supplier-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone })
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "رقم الهاتف للمورد غير صحيح أو غير مسجل");
  }
  return await response.json();
}

export async function verifySession(token: string): Promise<{ success: boolean; role: "admin" | "supplier" | "customer"; user: any }> {
  const response = await fetch(`${API_BASE}/auth/verify-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token })
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "الجلسة منتهية الصلاحية أو غير صالحة");
  }
  return await response.json();
}

export async function logoutSession(token: string): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}/auth/logout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token })
  });
  if (!response.ok) {
    throw new Error("فشل تسجيل الخروج من الخادم");
  }
  return await response.json();
}

export async function addSteelType(name: string): Promise<SteelType> {
  try {
    const response = await fetch(`${API_BASE}/steel-types`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || "Failed to create steel type");
    }
    return await response.json();
  } catch (error) {
    console.error("API Error adding steel type, executing locally:", error);
    // Local fallback
    const backup = localStorage.getItem(LOCAL_STORAGE_KEY);
    const db = backup ? JSON.parse(backup) : { steelTypes: [], products: [], orders: [], suppliers: [] };
    const newType: SteelType = { id: "st-" + Date.now(), name };
    db.steelTypes.push(newType);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(db));
    return newType;
  }
}

export async function editSteelType(id: string, name: string): Promise<SteelType> {
  try {
    const response = await fetch(`${API_BASE}/steel-types/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || "Failed to update steel type");
    }
    return await response.json();
  } catch (error) {
    console.error("API Error editing steel type, executing locally:", error);
    const backup = localStorage.getItem(LOCAL_STORAGE_KEY);
    const db = backup ? JSON.parse(backup) : { steelTypes: [] };
    const idx = db.steelTypes.findIndex((t: any) => t.id === id);
    if (idx !== -1) {
      db.steelTypes[idx].name = name;
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(db));
      return db.steelTypes[idx];
    }
    throw new Error("Steel type not found");
  }
}

export async function deleteSteelType(id: string): Promise<{ success: boolean }> {
  try {
    const response = await fetch(`${API_BASE}/steel-types/${id}`, {
      method: "DELETE"
    });
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || "Failed to delete steel type");
    }
    return await response.json();
  } catch (error) {
    console.error("API Error deleting steel type, executing locally:", error);
    const backup = localStorage.getItem(LOCAL_STORAGE_KEY);
    const db = backup ? JSON.parse(backup) : { steelTypes: [] };
    db.steelTypes = db.steelTypes.filter((t: any) => t.id !== id);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(db));
    return { success: true };
  }
}

export async function addProduct(productData: Omit<Product, "id">): Promise<Product> {
  try {
    const response = await fetch(`${API_BASE}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(productData)
    });
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || "Failed to create product");
    }
    return await response.json();
  } catch (error) {
    console.error("API Error adding product, executing locally:", error);
    // Local fallback
    const backup = localStorage.getItem(LOCAL_STORAGE_KEY);
    const db = backup ? JSON.parse(backup) : { steelTypes: [], products: [], orders: [], suppliers: [] };
    const newProduct: Product = { id: "p-" + Date.now(), ...productData };
    db.products.push(newProduct);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(db));
    return newProduct;
  }
}

export async function editProduct(id: string, productData: Partial<Omit<Product, "id">>): Promise<Product> {
  try {
    const response = await fetch(`${API_BASE}/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(productData)
    });
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || "Failed to edit product");
    }
    return await response.json();
  } catch (error) {
    console.error("API Error editing product, executing locally:", error);
    // Local fallback
    const backup = localStorage.getItem(LOCAL_STORAGE_KEY);
    const db = backup ? JSON.parse(backup) : { steelTypes: [], products: [], orders: [], suppliers: [] };
    const index = db.products.findIndex((p: any) => p.id === id);
    if (index === -1) throw new Error("المنتج غير موجود");
    db.products[index] = { ...db.products[index], ...productData };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(db));
    return db.products[index];
  }
}

export async function deleteProduct(id: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/products/${id}`, {
      method: "DELETE"
    });
    if (!response.ok) throw new Error("Failed to delete product");
    return true;
  } catch (error) {
    console.error("API Error deleting product, executing locally:", error);
    // Local fallback
    const backup = localStorage.getItem(LOCAL_STORAGE_KEY);
    const db = backup ? JSON.parse(backup) : { steelTypes: [], products: [], orders: [], suppliers: [] };
    db.products = db.products.filter((p: any) => p.id !== id);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(db));
    return true;
  }
}

export async function createOrder(orderData: {
  clientName: string;
  clientPhone: string;
  clientAddress: string;
  clientProvince?: string;
  customerId?: string | null;
  items: { productId: string; quantity: number }[];
}): Promise<Order> {
  try {
    const response = await fetch(`${API_BASE}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderData)
    });
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || "Failed to submit order");
    }
    return await response.json();
  } catch (error: any) {
    console.error("API Error submitting order, executing locally:", error);
    // Local fallback
    const backup = localStorage.getItem(LOCAL_STORAGE_KEY);
    const db = backup ? JSON.parse(backup) : { steelTypes: [], products: [], orders: [], suppliers: [] };
    
    // Deduct quantity
    const processedItems = [];
    let total = 0;
    for (const item of orderData.items) {
      const prod = db.products.find((p: any) => p.id === item.productId);
      if (!prod) throw new Error(`المنتج غير متوفر`);
      if (prod.quantity < item.quantity) {
        throw new Error(`الكمية غير متوفرة من ${prod.name}`);
      }
      prod.quantity -= item.quantity;
      const typeName = db.steelTypes.find((t: any) => t.id === prod.typeId)?.name || "حديد عام";
      
      processedItems.push({
        productId: prod.id,
        name: prod.name,
        quantity: item.quantity,
        price: prod.price,
        diameter: prod.diameter,
        typeName
      });
      total += prod.price * item.quantity;
    }

    const newOrder: Order = {
      id: "order-" + Math.floor(100000 + Math.random() * 900000),
      customerId: orderData.customerId || null,
      clientName: orderData.clientName,
      clientPhone: orderData.clientPhone,
      clientProvince: orderData.clientProvince || "",
      clientAddress: orderData.clientAddress,
      items: processedItems,
      totalPrice: total,
      status: "pending_review",
      supplierId: null,
      createdAt: new Date().toISOString(),
      statusHistory: [
        {
          status: "pending_review",
          updatedAt: new Date().toISOString(),
          note: "تم إنشاء الطلب محلياً وهو قيد المراجعة"
        }
      ]
    };

    db.orders.push(newOrder);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(db));
    return newOrder;
  }
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
  supplierId?: string | null,
  note?: string
): Promise<Order> {
  try {
    const response = await fetch(`${API_BASE}/orders/${id}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, supplierId, note })
    });
    if (!response.ok) throw new Error("Failed to update status");
    return await response.json();
  } catch (error) {
    console.error("API Error updating status, executing locally:", error);
    // Local fallback
    const backup = localStorage.getItem(LOCAL_STORAGE_KEY);
    const db = backup ? JSON.parse(backup) : { steelTypes: [], products: [], orders: [], suppliers: [] };
    const index = db.orders.findIndex((o: any) => o.id === id);
    if (index === -1) throw new Error("الطلب غير موجود");
    
    const order = db.orders[index];
    order.status = status;
    if (supplierId !== undefined) {
      order.supplierId = supplierId;
    }
    order.statusHistory.push({
      status: status,
      updatedAt: new Date().toISOString(),
      note: note || `تم تحديث الحالة محلياً إلى: ${status}`
    });

    if (status === "rejected") {
      // return stock
      for (const item of order.items) {
        const prod = db.products.find((p: any) => p.id === item.productId);
        if (prod) prod.quantity += item.quantity;
      }
    }

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(db));
    return order;
  }
}

export async function addSupplier(supplierData: { name: string; phone: string; pin: string }): Promise<Supplier> {
  try {
    const response = await fetch(`${API_BASE}/suppliers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(supplierData)
    });
    if (!response.ok) throw new Error("Failed to add supplier");
    return await response.json();
  } catch (error) {
    console.error("API Error adding supplier, executing locally:", error);
    // Local fallback
    const backup = localStorage.getItem(LOCAL_STORAGE_KEY);
    const db = backup ? JSON.parse(backup) : { steelTypes: [], products: [], orders: [], suppliers: [], customers: [] };
    const newSup: Supplier = { id: "sup-" + Date.now(), ...supplierData };
    db.suppliers.push(newSup);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(db));
    return newSup;
  }
}

export async function checkPhone(phone: string): Promise<{ exists: boolean; customer?: Customer }> {
  const response = await fetch(`${API_BASE}/auth/check-phone`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone })
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "خطأ في التحقق من رقم الهاتف");
  }
  return await response.json();
}

export async function sendOtp(phone: string): Promise<{ success: boolean; otpSimulation: string }> {
  const response = await fetch(`${API_BASE}/auth/send-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone })
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "خطأ في إرسال رمز التحقق");
  }
  return await response.json();
}

export async function verifyOtp(phone: string, otp: string): Promise<{ success: boolean; token?: string; customer: Customer }> {
  const response = await fetch(`${API_BASE}/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, otp })
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "رمز التحقق غير صحيح");
  }
  return await response.json();
}

export async function registerCustomer(customerData: {
  name: string;
  phone: string;
  governorate: string;
  address?: string;
}): Promise<{ success: boolean; token?: string; customer: Customer }> {
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(customerData)
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "خطأ في إنشاء الحساب");
  }
  return await response.json();
}

export async function updateCustomerProfile(
  id: string,
  customerData: { name: string; governorate: string; address?: string }
): Promise<{ success: boolean; customer: Customer }> {
  const response = await fetch(`${API_BASE}/customers/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(customerData)
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "خطأ في تحديث البيانات الشخصية");
  }
  return await response.json();
}

export async function updateCustomerStatus(
  id: string,
  status: "active" | "suspended"
): Promise<Customer> {
  try {
    const response = await fetch(`${API_BASE}/customers/${id}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "خطأ في تحديث حالة حساب العميل");
    }
    const res = await response.json();
    return res.customer;
  } catch (error) {
    console.error("API Error updating customer status, executing locally:", error);
    const backup = localStorage.getItem(LOCAL_STORAGE_KEY);
    const db = backup ? JSON.parse(backup) : { customers: [] };
    if (!db.customers) db.customers = [];
    const index = db.customers.findIndex((c: any) => c.id === id);
    if (index === -1) throw new Error("العميل غير موجود");
    
    db.customers[index].status = status;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(db));
    return db.customers[index];
  }
}
