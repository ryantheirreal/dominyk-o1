import { z } from "zod";

export const travelPlanSchema = z.object({
  origin: z.string().trim().min(2).max(120),
  destination: z.string().trim().min(2).max(120),
  departure: z.string().date(),
  returnDate: z.string().date().optional(),
  travelers: z.number().int().min(1).max(20).default(1),
  cabin: z.enum(["economy", "premium_economy", "business", "first"]).default("economy"),
});
export type TravelPlan = z.infer<typeof travelPlanSchema>;

export function buildTravelSearch(plan: TravelPlan) {
  const value = travelPlanSchema.parse(plan);
  const query = `${value.origin} ${value.destination} ${value.departure}${value.returnDate ? ` ${value.returnDate}` : ""}`;
  const encoded = encodeURIComponent(query);
  return {
    kind: "travel_research",
    plan: value,
    providers: [
      { name: "Google Flights", url: `https://www.google.com/travel/flights?q=${encoded}` },
      {
        name: "Kayak",
        url: `https://www.kayak.com/flights/${encodeURIComponent(value.origin)}-${encodeURIComponent(value.destination)}/${value.departure}${value.returnDate ? `/${value.returnDate}` : ""}`,
      },
      {
        name: "Booking.com",
        url: `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(value.destination)}`,
      },
    ],
    status: "research_only",
    nextStep:
      "Revise as opções e peça confirmação antes de abrir um checkout; a reserva e o pagamento permanecem manuais.",
  };
}
