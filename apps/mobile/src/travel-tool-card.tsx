import { ExternalLink, Map, ShieldCheck } from "lucide-react-native";
import { Linking, Text, View } from "react-native";
import { Button, Card, Chip, colors, s } from "./ui";

export function TravelToolCard({ result, loading }: { result: unknown; loading: boolean }) {
  let value: any = result;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      value = {};
    }
  }
  if (loading)
    return (
      <Card style={{ gap: 10 }}>
        <Text style={s.heading}>Montando opções de viagem…</Text>
        <Text style={s.muted}>Comparando provedores e preferências.</Text>
      </Card>
    );
  const plan = value?.plan;
  const providers = Array.isArray(value?.providers) ? value.providers : [];
  const comparisons = Array.isArray(value?.comparison) ? value.comparison : [];
  return (
    <Card style={{ gap: 12, backgroundColor: colors.sky }}>
      <View style={s.between}>
        <View style={[s.row, { gap: 9 }]}>
          <View style={[s.iconBox, { backgroundColor: colors.card }]}>
            <Map size={18} color={colors.blueDark} />
          </View>
          <View>
            <Text style={s.heading}>Viagens</Text>
            <Text style={s.small}>
              {plan?.origin} → {plan?.destination} · {plan?.departure}
            </Text>
          </View>
        </View>
        <Chip tint={colors.card}>pesquisa</Chip>
      </View>
      <Text style={s.muted}>
        {value?.template?.label ?? "Roteiro personalizado"}. {value?.nextStep}
      </Text>
      <View style={{ gap: 7 }}>
        {comparisons.slice(0, 3).map((item: any) => (
          <View key={item.id} style={[s.row, { gap: 8 }]}>
            <ShieldCheck size={15} color={colors.blueDark} />
            <View style={{ flex: 1 }}>
              <Text style={[s.text, { fontWeight: "600" }]}>{item.label}</Text>
              <Text style={s.small}>{item.rationale}</Text>
            </View>
          </View>
        ))}
      </View>
      <View style={{ gap: 8 }}>
        {providers.map((item: any) => (
          <Button
            key={item.name}
            small
            icon={ExternalLink}
            onPress={() => void Linking.openURL(item.url)}
          >
            {item.name}
          </Button>
        ))}
      </View>
    </Card>
  );
}
