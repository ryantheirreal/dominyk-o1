import { ExternalLink, LockKeyhole, ShoppingBag } from "lucide-react-native";
import { Linking, Text, View } from "react-native";
import { Button, Card, colors, Chip, s } from "./ui";

export function PurchaseToolCard({ result, loading }: { result: unknown; loading: boolean }) {
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
        <Text style={s.heading}>Preparando compra…</Text>
        <Text style={s.muted}>O agente ainda não abriu o checkout.</Text>
      </Card>
    );
  return (
    <Card style={{ gap: 12, backgroundColor: colors.orange }}>
      <View style={s.between}>
        <View style={[s.row, { gap: 9 }]}>
          <View style={[s.iconBox, { backgroundColor: colors.card }]}>
            <ShoppingBag size={18} color={colors.danger} />
          </View>
          <View>
            <Text style={s.heading}>Revisão de compra</Text>
            <Text style={s.small}>{value?.merchant ?? "Loja"}</Text>
          </View>
        </View>
        <Chip tint={colors.card}>aprovação humana</Chip>
      </View>
      <Text style={[s.text, { fontWeight: "600" }]}>{value?.item ?? "Item"}</Text>
      <Text style={s.muted}>
        {value?.quantity ?? 1} × · {value?.amount ?? "—"} {value?.currency ?? ""} · Frete:{" "}
        {value?.shipping ?? "a confirmar"}
      </Text>
      <View style={[s.row, { gap: 8 }]}>
        <LockKeyhole size={15} color={colors.danger} />
        <Text style={[s.small, { flex: 1 }]}>
          O agente não digita dados de pagamento nem confirma o pedido.
        </Text>
      </View>
      {value?.checkoutUrl ? (
        <Button
          primary
          small
          icon={ExternalLink}
          onPress={() => void Linking.openURL(value.checkoutUrl)}
        >
          Abrir checkout para revisar
        </Button>
      ) : null}
    </Card>
  );
}
