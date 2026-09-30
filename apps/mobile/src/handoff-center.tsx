import { ArrowRight, UserRound, Users } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Button, Card, colors, Empty, ErrorNotice, SectionHeading, s } from "./ui";
import { useWorkspace } from "./workspace";

export function HandoffCenter() {
  const { api } = useWorkspace();
  const [items, setItems] = useState<Array<{ id: string; source: string; target: { type: "agent" | "human"; agentId?: string; reason?: string }; summary: string; status: string }>>([]);
  const [error, setError] = useState("");
  async function load() {
    try { setItems(await api.request("/api/o1/handoffs")); setError(""); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }
  useEffect(() => { void load(); }, [api]);
  async function transition(id: string, status: "accepted" | "returned" | "cancelled") {
    try { await api.request(`/api/o1/handoffs/${id}/transition`, { status }, "POST"); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }
  const pending = items.filter((item) => item.status === "pending");
  if (!pending.length && !error) return null;
  return (
    <Card style={{ gap: 12 }}>
      <View style={[s.row, { gap: 8 }]}>{pending.some((item) => item.target.type === "human") ? <UserRound size={18} color={colors.blueDark} /> : <Users size={18} color={colors.blueDark} />}<SectionHeading title="Handoffs" /></View>
      {pending.length ? pending.map((item) => (
        <View key={item.id} style={{ gap: 7, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.line }}>
          <View style={[s.row, { gap: 7 }]}><Text style={s.text}>{item.summary}</Text><ArrowRight size={14} color={colors.muted} /></View>
          <Text style={s.small}>{item.source} → {item.target.type === "agent" ? item.target.agentId : "you"}</Text>
          <View style={[s.row, { gap: 7 }]}><Button small primary onPress={() => void transition(item.id, "accepted")}>Accept</Button><Button small onPress={() => void transition(item.id, "cancelled")}>Cancel</Button></View>
        </View>
      )) : <Empty icon={Users} title="No pending handoffs" detail="Agent-to-agent and agent-to-human transfers will appear here." />}
      <ErrorNotice error={error} />
    </Card>
  );
}