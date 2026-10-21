import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as ImagePicker from "expo-image-picker";
import { api, loadToken, setToken } from "./src/api";

type Loan = {
  id: number;
  friend_name: string;
  amount: string | number;
  due_date: string;
  repaid: boolean;
  receipt_path?: string | null;
};

type Summary = {
  total_lent: number;
  total_repaid: number;
  outstanding: number;
  overdue_amount: number;
  overdue_count: number;
};

export default function App() {
  const [ready, setReady] = useState(false);
  const [tokenState, setTokenState] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const [loans, setLoans] = useState<Loan[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [friendName, setFriendName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [receipt, setReceipt] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const t = await loadToken();
      setTokenState(t);
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (tokenState) refresh();
  }, [tokenState]);

  async function refresh() {
    try {
      const [l, s] = await Promise.all([api.getLoans(), api.summary()]);
      setLoans(l);
      setSummary(s);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  }

  async function sendOtp() {
    if (!phone) return Alert.alert("Enter phone");
    setLoading(true);
    try {
      await api.sendOtp(phone);
      setOtpSent(true);
      Alert.alert("OTP sent", "Check server log for the code");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    if (!code) return Alert.alert("Enter OTP");
    setLoading(true);
    try {
      const res = await api.verifyOtp(phone, code);
      await setToken(res.token);
      setTokenState(res.token);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await setToken(null);
    setTokenState(null);
    setLoans([]);
    setSummary(null);
    setOtpSent(false);
    setCode("");
  }

  async function pickReceipt() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert("Permission needed");
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (!res.canceled && res.assets.length) {
      const a = res.assets[0];
      setReceipt({ uri: a.uri, name: a.fileName || "receipt.jpg", type: a.mimeType || "image/jpeg" });
    }
  }

  async function submitLoan() {
    if (!friendName.trim()) return Alert.alert("Friend name required");
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return Alert.alert("Valid amount required");
    if (!dueDate || isNaN(Date.parse(dueDate))) return Alert.alert("Valid due date (YYYY-MM-DD)");
    setLoading(true);
    try {
      await api.addLoan({ friend_name: friendName.trim(), amount: amt, due_date: dueDate, receipt });
      setFriendName(""); setAmount(""); setDueDate(""); setReceipt(null); setShowForm(false);
      await refresh();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  }

  async function markRepaid(id: number) {
    try {
      await api.repay(id);
      await refresh();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  }

  if (!ready) return <View style={styles.center}><ActivityIndicator /></View>;

  if (!tokenState) {
    return (
      <View style={styles.container}>
        <StatusBar style="auto" />
        <Text style={styles.title}>MiniLedger</Text>
        <Text style={styles.subtitle}>Login with phone</Text>
        <TextInput style={styles.input} placeholder="Phone (+91...)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        {!otpSent ? (
          <Pressable style={styles.btn} onPress={sendOtp} disabled={loading}>
            <Text style={styles.btnText}>{loading ? "Sending..." : "Send OTP"}</Text>
          </Pressable>
        ) : (
          <>
            <TextInput style={styles.input} placeholder="OTP" value={code} onChangeText={setCode} keyboardType="number-pad" />
            <Pressable style={styles.btn} onPress={verifyOtp} disabled={loading}>
              <Text style={styles.btnText}>{loading ? "Verifying..." : "Verify OTP"}</Text>
            </Pressable>
          </>
        )}
      </View>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  function isOverdue(l: Loan) {
    return !l.repaid && l.due_date < today;
  }

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <View style={styles.header}>
        <Text style={styles.title}>MiniLedger</Text>
        <Pressable onPress={logout}><Text style={styles.link}>Logout</Text></Pressable>
      </View>

      {summary && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Summary</Text>
          <View style={styles.row}><Text>Total lent</Text><Text>₹{summary.total_lent}</Text></View>
          <View style={styles.row}><Text>Total repaid</Text><Text>₹{summary.total_repaid}</Text></View>
          <View style={styles.row}><Text>Outstanding</Text><Text>₹{summary.outstanding}</Text></View>
          <View style={styles.row}><Text style={styles.overdue}>Overdue</Text><Text style={styles.overdue}>₹{summary.overdue_amount} ({summary.overdue_count})</Text></View>
        </View>
      )}

      <Pressable style={styles.btn} onPress={() => setShowForm(!showForm)}>
        <Text style={styles.btnText}>{showForm ? "Cancel" : "Add Entry"}</Text>
      </Pressable>

      {showForm && (
        <View style={styles.form}>
          <TextInput style={styles.input} placeholder="Friend name" value={friendName} onChangeText={setFriendName} />
          <TextInput style={styles.input} placeholder="Amount" value={amount} onChangeText={setAmount} keyboardType="numeric" />
          <TextInput style={styles.input} placeholder="Due date (YYYY-MM-DD)" value={dueDate} onChangeText={setDueDate} />
          <Pressable style={styles.secondaryBtn} onPress={pickReceipt}>
            <Text>{receipt ? "Receipt selected" : "Attach receipt (optional)"}</Text>
          </Pressable>
          <Pressable style={styles.btn} onPress={submitLoan} disabled={loading}>
            <Text style={styles.btnText}>{loading ? "Saving..." : "Save"}</Text>
          </Pressable>
        </View>
      )}

      <FlatList
        data={loans}
        keyExtractor={(item) => String(item.id)}
        refreshing={false}
        onRefresh={refresh}
        renderItem={({ item }) => (
          <View style={[styles.entry, isOverdue(item) && styles.overdueEntry]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.entryName}>{item.friend_name}</Text>
              <Text>₹{item.amount} • due {item.due_date}</Text>
              {item.repaid && <Text style={styles.repaid}>Repaid</Text>}
              {isOverdue(item) && <Text style={styles.overdue}>Overdue</Text>}
            </View>
            {!item.repaid && (
              <Pressable style={styles.smallBtn} onPress={() => markRepaid(item.id)}>
                <Text style={styles.btnText}>Repaid</Text>
              </Pressable>
            )}
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No entries yet</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f7f7f7" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  title: { fontSize: 24, fontWeight: "700" },
  subtitle: { fontSize: 14, color: "#666", marginBottom: 12 },
  input: { backgroundColor: "#fff", padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: "#ddd" },
  btn: { backgroundColor: "#2563eb", padding: 12, borderRadius: 8, alignItems: "center", marginBottom: 8 },
  secondaryBtn: { backgroundColor: "#e5e7eb", padding: 12, borderRadius: 8, alignItems: "center", marginBottom: 8 },
  btnText: { color: "#fff", fontWeight: "600" },
  card: { backgroundColor: "#fff", padding: 12, borderRadius: 8, marginBottom: 12 },
  cardTitle: { fontWeight: "700", marginBottom: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  form: { backgroundColor: "#fff", padding: 12, borderRadius: 8, marginBottom: 12 },
  entry: { backgroundColor: "#fff", padding: 12, borderRadius: 8, marginBottom: 8, flexDirection: "row", alignItems: "center" },
  overdueEntry: { borderLeftWidth: 4, borderLeftColor: "#dc2626" },
  entryName: { fontWeight: "600" },
  repaid: { color: "#16a34a", fontSize: 12 },
  overdue: { color: "#dc2626", fontSize: 12, fontWeight: "600" },
  smallBtn: { backgroundColor: "#16a34a", padding: 8, borderRadius: 6 },
  empty: { textAlign: "center", color: "#999", marginTop: 20 },
  link: { color: "#2563eb" },
});
