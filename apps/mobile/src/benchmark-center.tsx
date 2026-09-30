import { BarChart3, RefreshCw } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Button, Card, colors, ErrorNotice, SectionHeading, s } from "./ui";
import { useWorkspace } from "./workspace";

export function BenchmarkCenter() {
  const { api } = useWorkspace();
  const [summary, setSummary] = useState<{ runs: number; completionRate: number; verificationRate: number; averageDurationMs: number; averageCost: number }>();
  const [error, setError] = useState("");
  async function load() {
    try { setSummary(await api.request("/api/o1/benchmarks/summary")); setError(""); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }
  useEffect(() => { void load(); }, [api]);
  return (
    <Card style={{ gap: 11 }}>
      <View style={[s.row, { gap: 8 }]}><BarChart3 size={18} color={colors.blueDark} /><SectionHeading title="Benchmark Lab" /></View>
      <Text style={s.small}>Measure verified work instead of judging the agent by feature count.</Text>
      {summary && <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
        <Metric label="Runs" value={String(summary.runs)} />
        <Metric label="Completion" value={`${Math.round(summary.completionRate * 100)}%`} />
        <Metric label="Verified" value={`${Math.round(summary.verificationRate * 100)}%`} />
        <Metric label="Avg time" value={`${Math.round(summary.averageDurationMs / 1000)}s`} />
        <Metric label="Avg cost" value={summary.averageCost ? `$${summary.averageCost.toFixed(2)}` : "—"} />
      </View>}
      <Button small icon={RefreshCw} onPress={() => void load()}>Refresh benchmark data</Button>
      <ErrorNotice error={error} />
    </Card>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return <View style={{ minWidth: 75, paddingHorizontal: 9, paddingVertical: 8, borderRadius: 12, backgroundColor: "#F3F5F6" }}><Text style={{ fontSize: 10, fontWeight: "800", color: colors.muted }}>{label}</Text><Text style={{ fontSize: 17, fontWeight: "800", color: colors.text }}>{value}</Text></View>;
}