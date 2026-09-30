import { LockKeyhole, Sparkles } from "lucide-react-native";
import { Text, View } from "react-native";
import { O1_PLANS } from "../../../packages/domain/src/plans";
import { Card, Chip, colors, SectionHeading, s } from "./ui";

export function PlanCatalog() {
  return (
    <View style={{ gap: 12 }}>
      <SectionHeading title="Plans" />
      <Text style={s.muted}>
        Each plan defines which models are available and how many effort levels are unlocked.
      </Text>
      <View style={{ gap: 12 }}>
        {O1_PLANS.map((plan) => (
          <Card key={plan.id} style={{ padding: 18, gap: 13 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 11,
                  backgroundColor: plan.id === "max-20x" ? colors.orange : colors.sky,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Sparkles size={16} color={colors.text} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.heading}>{plan.name}</Text>
                <Text style={s.small}>
                  {plan.unlockedEfforts}/{plan.totalEfforts} efforts unlocked
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {plan.models.map((model) => (
                <Chip key={model.id}>{model.name}</Chip>
              ))}
            </View>
            <View style={{ flexDirection: "row", gap: 7 }}>
              {Array.from({ length: plan.totalEfforts }, (_, index) => {
                const unlocked = index < plan.unlockedEfforts;
                return (
                  <View
                    key={index}
                    style={{
                      flex: 1,
                      minWidth: 74,
                      paddingHorizontal: 9,
                      paddingVertical: 9,
                      borderRadius: 12,
                      backgroundColor: unlocked ? "#F0F7FA" : "#F6F6F6",
                      borderWidth: 1,
                      borderColor: unlocked ? "#D6E8F0" : colors.line,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 5,
                    }}
                  >
                    {unlocked ? (
                      <Sparkles size={12} color={colors.blueDark} />
                    ) : (
                      <LockKeyhole size={12} color={colors.muted} />
                    )}
                    <Text style={{ fontSize: 11, fontWeight: "700", color: unlocked ? colors.text : colors.muted }}>
                      Effort {index + 1}
                    </Text>
                  </View>
                );
              })}
            </View>
          </Card>
        ))}
      </View>
      <Text style={s.small}>
        The catalog defines product entitlements; billing and account entitlements remain separate server-side controls.
      </Text>
    </View>
  );
}