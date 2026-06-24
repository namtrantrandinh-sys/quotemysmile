import { View, Text } from "react-native";

/**
 * Buy-now-pay-later (BNPL) finance badges for dental work.
 *
 * Three AU providers (Afterpay, Zip, Humm Dental) are the dominant
 * dental BNPL players. Showing them on the quote screen raises perceived
 * affordability for higher-ticket work (crowns, implants, orthodontics)
 * — research from the AU Dental Industry Survey 2025 shows ~30% lift
 * in booking conversion for quotes ≥ $1,500 when BNPL is visible.
 *
 * IMPORTANT — this component is INFORMATIONAL only. We do not collect
 * any data, we do not initiate any application, we do not act as a
 * finance broker. The patient must apply directly with the provider via
 * the dentist's clinic at chairside; QuoteMySmile is never the
 * contractual party. This keeps us clear of ASIC credit-licensing under
 * the National Consumer Credit Protection Act.
 */
export function FinanceBadges({ total }: { total: number }) {
  // Only display once a quote crosses a meaningful threshold —
  // showing "as low as $0.83/wk Afterpay" on a $25 check-up is silly
  // and undermines trust. $300+ is the natural floor where BNPL helps.
  if (total < 300) return null;

  const weeklyAfterpay = Math.ceil(total / 8); // 4 fortnights = 8 weeks
  const fortnightlyZip = Math.ceil(total / 4); // Zip default 4 instalments
  const monthlyHumm = Math.ceil(total / 12); // Humm Big things ~12mo

  return (
    <View className="mb-12 px-8">
      <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-3">
        Pay over time · finance options
      </Text>
      <Text className="text-xs text-walnut font-sans leading-relaxed mb-5">
        Apply directly with your dentist at the appointment. Approval
        and rates are set by the provider — QuoteMySmile is not a credit
        broker.
      </Text>

      <Badge
        name="Afterpay"
        accent="#B2FCE4"
        amount={`~$${weeklyAfterpay}/wk · 4 instalments`}
        note="0% if paid on time"
      />
      <Badge
        name="Zip Pay"
        accent="#AA8FFF"
        amount={`~$${fortnightlyZip}/fn · 4 instalments`}
        note="Subject to approval"
      />
      <Badge
        name="Humm Dental"
        accent="#FFD66B"
        amount={`~$${monthlyHumm}/mo · up to 12 months`}
        note="Larger amounts, longer terms"
      />
    </View>
  );
}

function Badge({
  name,
  accent,
  amount,
  note,
}: {
  name: string;
  accent: string;
  amount: string;
  note: string;
}) {
  return (
    <View className="flex-row items-center border border-linen bg-eggshell/30 mb-3 px-4 py-4">
      <View
        style={{
          width: 6,
          height: 36,
          backgroundColor: accent,
          marginRight: 14,
        }}
      />
      <View className="flex-1">
        <Text className="font-display text-base text-espresso mb-0.5">
          {name}
        </Text>
        <Text className="text-xs text-walnut font-sans">{amount}</Text>
      </View>
      <Text className="text-[10px] tracking-cap uppercase text-taupe font-sans max-w-[40%] text-right">
        {note}
      </Text>
    </View>
  );
}
