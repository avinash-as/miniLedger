import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

export const API_BASE =
  Platform.OS === "android" ? "http://10.0.2.2:4000" : "http://localhost:4000";

let token: string | null = null;

export async function loadToken() {
  token = await AsyncStorage.getItem("token");
  return token;
}

export async function setToken(t: string | null) {
  token = t;
  if (t) await AsyncStorage.setItem("token", t);
  else await AsyncStorage.removeItem("token");
}

async function request(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new Error(data?.error || res.statusText);
  return data;
}

export const api = {
  sendOtp: (phone: string) => request("/auth/send-otp", { method: "POST", body: JSON.stringify({ phone }) }),
  verifyOtp: (phone: string, code: string) => request("/auth/verify-otp", { method: "POST", body: JSON.stringify({ phone, code }) }),
  getLoans: () => request("/loans"),
  addLoan: (payload: { friend_name: string; amount: number; due_date: string; receipt?: any }) => {
    if (payload.receipt) {
      const form = new FormData();
      form.append("friend_name", payload.friend_name);
      form.append("amount", String(payload.amount));
      form.append("due_date", payload.due_date);
      form.append("receipt", payload.receipt as any);
      return fetch(`${API_BASE}/loans`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      }).then(async (r) => {
        const t = await r.text();
        const d = t ? JSON.parse(t) : null;
        if (!r.ok) throw new Error(d?.error || r.statusText);
        return d;
      });
    }
    return request("/loans", { method: "POST", body: JSON.stringify({ friend_name: payload.friend_name, amount: payload.amount, due_date: payload.due_date }) });
  },
  repay: (id: number) => request(`/loans/${id}/repay`, { method: "PATCH" }),
  summary: () => request("/loans/summary"),
};
