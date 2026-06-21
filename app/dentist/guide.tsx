import { View, Text, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackBar } from "@/components/BackBar";
import { Button } from "@/components/Button";
import { Icon, type IconName } from "@/components/Icon";

export default function DentistGuideScreen() {
  const router = useRouter();
  return (
    <SafeAreaView className="flex-1 bg-bone">
      <BackBar title="Dentist guide" />
      <ScrollView>
        {/* Hero */}
        <View className="px-8 pt-12 pb-8 items-center">
          <View className="mb-6">
            <Icon name="shield" size={56} />
          </View>
          <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-4">
            QuoteMySmile for dentists
          </Text>
          <Text className="font-display text-5xl text-espresso text-center leading-[1.05] mb-6">
            Quote with confidence.
          </Text>
          <Text className="text-sm text-walnut font-sans text-center max-w-md leading-relaxed">
            An AHPRA-aware marketplace that brings patients to your chair — only
            the ones who are ready to book.
          </Text>
        </View>

        {/* About */}
        <Section title="What QuoteMySmile is" icon="info">
          <P>
            We're a transparent dental quote marketplace. Patients submit photos
            + GPS. We route the request to AHPRA-registered dentists within their
            radius. Everyone sees everyone's quotes, including yours.
          </P>
          <P>
            Patients who arrive via QuoteMySmile have already chosen on price,
            availability, location and reviews — show-up rates are dramatically
            higher than cold leads.
          </P>
        </Section>

        {/* How to quote */}
        <Section title="How to quote" icon="list">
          <Bullet n="01" title="Open the request">
            Tap the live request on your dashboard. Review the patient's photos,
            symptom note, photo-quality score, and the other dentists' quotes
            on the same request.
          </Bullet>
          <Bullet n="02" title="Build with templates">
            Use your saved templates (filling+clean, crown consult, whitening)
            or pick ADA item codes directly. Add availability slots and an
            optional note (max 200 chars).
          </Bullet>
          <Bullet n="03" title="Acknowledge + submit">
            Tick the two acks: photo-based, full professional responsibility.
            Submit. Your quote appears in the patient's live feed instantly.
          </Bullet>
        </Section>

        {/* Competitiveness */}
        <Section title="How to win the quote" icon="spark">
          <P>
            Patients don't sort by price by default — they see "Best match"
            (a blend of distance, availability, rating, price). To win:
          </P>
          <Bullet n="·" title="Be sharp on availability">
            Same-day or next-morning slots win 28% of bookings on QMS data.
          </Bullet>
          <Bullet n="·" title="Itemise generously">
            Bundle exam + x-ray + scale + clean instead of leaving extras
            unclear. Patients trust itemised quotes.
          </Bullet>
          <Bullet n="·" title="Quote fast">
            Tier-1 dentists (≤5 km, &lt;5 min median response) get priority
            placement at the top.
          </Bullet>
          <Bullet n="·" title="Don't overprice the first quote">
            You only get one requote (see below). Anchor low if you have
            capacity — the requote is for when competitors arrive.
          </Bullet>
        </Section>

        {/* 1 requote rule */}
        <Section title="The one-requote rule" icon="lock">
          <View className="border border-gold/40 bg-gold/5 p-5 mb-4">
            <Text className="text-[10px] tracking-cap uppercase text-walnut font-sans mb-2">
              Hard cap · enforced by the database
            </Text>
            <Text className="text-base text-espresso font-sans leading-relaxed">
              You may submit one initial quote per request and adjust it{" "}
              <Text className="font-display italic text-gold">exactly once</Text>.
              After the requote, your quote is locked as <Text className="text-gold">Final</Text>{" "}
              for the rest of the window.
            </Text>
          </View>
          <P>
            Use the requote when a sharper competitor arrives, or when you
            free up an earlier slot. It's strategic — wait until the field
            settles, then move decisively.
          </P>
          <P>
            The rule keeps the marketplace honest: no death-spiral
            undercutting, no last-second sniping, patient sees who is genuinely
            committed.
          </P>
        </Section>

        {/* Responsibilities */}
        <Section title="Your responsibilities" icon="shield">
          <Bullet n="·" title="Clinical responsibility">
            You are the responsible AHPRA-registered practitioner for every
            quote you submit. The patient sees your AHPRA registration number
            on every card.
          </Bullet>
          <Bullet n="·" title="AHPRA advertising rules">
            No testimonials, no outcome guarantees, no "best/painless/lifetime"
            language. Our note filter flags banned terms for admin review.
          </Bullet>
          <Bullet n="·" title="Quote accuracy">
            Quotes are indicative based on the patient's photos. Final fees
            are confirmed at the clinical exam. This is the AHPRA-safe framing
            we shield you with on every card.
          </Bullet>
          <Bullet n="·" title="Show-up commitment">
            Once a patient books, the slot is yours. Cancelling without
            reasonable notice impacts your reliability score and Tier-1
            placement.
          </Bullet>
        </Section>

        {/* Emergency requests */}
        <Section title="Emergency requests" icon="emergency">
          <View className="border border-clay/40 bg-clay/5 p-5 mb-4">
            <View className="flex-row items-center gap-2 mb-3">
              <View className="h-2 w-2 rounded-full bg-clay" />
              <Text className="text-[11px] tracking-editorial uppercase text-clay font-sans">
                URGENT · PRIORITY
              </Text>
            </View>
            <Text className="text-base text-espresso font-sans leading-relaxed mb-3">
              Emergency requests use a 15-minute window and are marked with a
              clay-coloured tag. Patients have explicitly acknowledged a premium
              fee structure.
            </Text>
            <Text className="text-sm text-walnut font-sans leading-relaxed">
              Quote 30–50% above standard for emergency work — this reflects
              the real cost of dropping other appointments. Patients expect it
              and have agreed to it before the request was sent.
            </Text>
          </View>
        </Section>

        {/* CTA */}
        <View className="px-8 pb-24 items-center">
          <Button variant="primary" size="lg" onPress={() => router.back()}>
            Got it
          </Button>
          <Text className="text-[10px] tracking-cap uppercase text-taupe font-sans mt-6">
            Free for dentists, always · no subscription
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: IconName;
  children: React.ReactNode;
}) {
  return (
    <View className="px-8 mb-10">
      <View className="flex-row items-center gap-3 mb-5">
        {icon ? <Icon name={icon} size={22} /> : null}
        <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans">
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <Text className="text-base text-walnut font-sans leading-relaxed mb-4">
      {children}
    </Text>
  );
}

function Bullet({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <View className="flex-row mb-5">
      <Text className="font-display text-lg text-gold w-10">{n}</Text>
      <View className="flex-1">
        <Text className="font-display text-lg text-espresso mb-1">{title}</Text>
        <Text className="text-sm text-walnut font-sans leading-relaxed">
          {children}
        </Text>
      </View>
    </View>
  );
}
