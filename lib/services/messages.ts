import { supabase } from "@/lib/supabase";
import { breadcrumb, captureError } from "@/lib/observability";

export type Message = {
  id: string;
  booking_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

export async function listMessages(bookingId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("id, booking_id, sender_id, body, read_at, created_at")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: true })
    .limit(500);
  if (error) {
    captureError(error, { ctx: "listMessages", bookingId });
    throw error;
  }
  return (data ?? []) as Message[];
}

export async function sendMessage(bookingId: string, body: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const trimmed = body.trim();
  if (!trimmed) return null;
  const { data, error } = await supabase
    .from("messages")
    .insert({ booking_id: bookingId, sender_id: user.id, body: trimmed })
    .select("id, body, created_at")
    .single();
  if (error) {
    captureError(error, { ctx: "sendMessage", bookingId });
    throw error;
  }
  breadcrumb("booking", "message.sent", { bookingId, len: trimmed.length });
  return data;
}

/**
 * Subscribe to new messages on a booking. Returns the channel — call
 * .unsubscribe() in cleanup.
 */
export function subscribeMessages(
  bookingId: string,
  onMessage: (msg: Message) => void,
) {
  return supabase
    .channel(`messages:${bookingId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `booking_id=eq.${bookingId}`,
      },
      (payload) => onMessage(payload.new as Message),
    )
    .subscribe();
}

/**
 * Mark all unread inbound messages on this booking as read.
 */
export async function markMessagesRead(bookingId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("booking_id", bookingId)
    .is("read_at", null)
    .neq("sender_id", user.id);
}
