/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SteelType {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  typeId: string;
  diameter: string; // e.g., "12 ملم"
  price: number; // Price per ton in Iraqi Dinar (د.ع)
  quantity: number; // Available quantity in tons
  imageUrl: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  pin?: string;
  managerName?: string;
  governorate?: string;
  address?: string;
  status?: "pending" | "active" | "suspended";
  createdAt?: string;
}

export interface AdminNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number; // quantity ordered in tons
  price: number; // Price per ton at the time of order
  diameter: string;
  typeName: string;
}

export type OrderStatus = 'pending_review' | 'approved' | 'assigned' | 'preparing' | 'ready' | 'delivered' | 'rejected';

export interface OrderStatusHistory {
  status: OrderStatus;
  updatedAt: string;
  note?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  governorate: string;
  address?: string;
  createdAt: string;
  status?: 'active' | 'suspended';
}

export interface Order {
  id: string;
  customerId?: string | null;
  clientName: string;
  clientPhone: string;
  clientProvince?: string;
  clientAddress: string;
  items: OrderItem[];
  totalPrice: number;
  status: OrderStatus;
  supplierId: string | null;
  createdAt: string;
  statusHistory: OrderStatusHistory[];
}

export interface CartItem {
  product: Product;
  quantity: number;
}
