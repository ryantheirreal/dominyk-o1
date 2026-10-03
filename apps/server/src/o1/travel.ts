import { z } from "zod";

export const travelTemplateSchema = z.enum(["weekend", "family", "business", "long_stay"]);
export type TravelTemplate = z.infer<typeof travelTemplateSchema>;

export const travelPlanSchema = z.object({
  origin: z.string().trim().min(2).max(120),
  destination: z.string().trim().min(2).max(120),
  departure: z.string().date(),
  returnDate: z.string().date().optional(),
  travelers: z.number().int().min(1).max(20).default(1),
  cabin: z.enum(["economy", "premium_economy", "business", "first"]).default("economy"),
  template: travelTemplateSchema.default("weekend"),
  preferences: z.array(z.string().trim().min(1).max(120)).max(12).default([]),
});
export type TravelPlan = z.infer<typeof travelPlanSchema>;

const templates: Record<TravelTemplate, { label: string; checklist: string[] }> = {
  weekend: { label: "Fim de semana", checklist: ["voo direto quando possível", "hotel central", "bagagem de mão", "roteiro curto"] },
  family: { label: "Família", checklist: ["quartos comunicantes ou familiares", "cancelamento flexível", "transfer do aeroporto", "atividades para todas as idades"] },
  business: { label: "Negócios", checklist: ["voo em horário útil", "hotel próximo ao compromisso", "Wi-Fi e espaço de trabalho", "nota fiscal"] },
  long_stay: { label: "Estadia longa", checklist: ["cozinha ou lavanderia", "seguro viagem", "tarifa com desconto", "transporte local"] },
};

export function buildTravelSearch(plan: TravelPlan) {
  const value = travelPlanSchema.parse(plan);
  const query = `${value.origin} ${value.destination} ${value.departure}${value.returnDate ? ` ${value.returnDate}` : ""}`;
  const encoded = encodeURIComponent(query);
  const template = templates[value.template];
  return {
    kind: "travel_research",
    plan: value,
    template: { id: value.template, label: template.label, checklist: template.checklist },
    comparison: [
      { id: "best_value", label: "Melhor valor", rationale: "Prioriza preço total e flexibilidade mínima", reviewRequired: true },
      { id: "most_flexible", label: "Mais flexível", rationale: "Prioriza cancelamento e alteração", reviewRequired: true },
      { id: "least_friction", label: "Menos atrito", rationale: "Prioriza voo direto, localização e poucos passos", reviewRequired: true },
    ],
    providers: [
      { name: "Google Flights", url: `https://www.google.com/travel/flights?q=${encoded}`, purpose: "comparar voos" },
      { name: "Kayak", url: `https://www.kayak.com/flights/${encodeURIComponent(value.origin)}-${encodeURIComponent(value.destination)}/${value.departure}${value.returnDate ? `/${value.returnDate}` : ""}`, purpose: "comparar tarifas" },
      { name: "Booking.com", url: `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(value.destination)}`, purpose: "pesquisar hospedagem" },
    ],
    status: "research_only",
    nextStep: "Escolha uma opção. O Whilo prepara um checkout e abre o navegador para revisão humana antes da confirmação final.",
  };
}
