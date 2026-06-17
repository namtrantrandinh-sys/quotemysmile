// Temporary demo route to preview QuoteCard redesign in browser.
// Safe to delete — not linked from the app.
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { QuoteCard } from "@/components/QuoteCard";
import { SAMPLE_QUOTES } from "@/lib/sampleQuotes";

export default function DemoQuoteScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F1E8" }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 96 }}>
        {SAMPLE_QUOTES.map((q) => (
          <QuoteCard key={q.id} q={q} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
