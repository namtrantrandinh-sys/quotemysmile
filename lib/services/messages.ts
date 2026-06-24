import { supabase } from "@/lib/supabase";
import { breadcrumb, captureError } from "@/lib/observability";

export type MessageAttachment = {
  kind: "image" | "video";
  /** Storage path inside booking-chat-media (NOT a public URL). */
  url: string;
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
};

export type Message = {
  id: string;
  booking_id: string;
  sender_id: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
  attachment_url: string | null;
  attachment_kind: "image" | "video" | null;
  attachment_mime: string | null;
  attachment_size: number | null;
  attachment_w: number | null;
  attachment_h: number | null;
};

const MESSAGE_SELECT =
  "id, booking_id, sender_id, body, read_at, created_at, attachment_url, attachment_kind, attachment_mime, attachment_size, attachment_w, attachment_h";

export async function listMessages(bookingId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select(MESSAGE_SELECT)
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
 * Upload a photo or short video to the booking-chat-media bucket and
 * record a messages row referencing it. Optional caption is sent in the
 * same row so the receiver sees a single bubble with image + caption.
 *
 * Returns the full Message row so the caller can optimistically append
 * it to the on-screen list without waiting for the Realtime echo.
 */
export async function sendAttachment(input: {
  bookingId: string;
  fileUri: string;
  kind: "image" | "video";
  mime?: string;
  width?: number;
  height?: number;
  caption?: string;
}): Promise<Message> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  // 1) Read the local file as a binary Blob so it uploads as the
  //    correct content-type instead of being base64-stringified.
  const response = await fetch(input.fileUri);
  const blob = await response.blob();
  const size = blob.size;

  // 2) Derive a safe extension. expo-image-picker gives .jpg / .mp4
  //    on iOS and Android; if the uri lacks one fall back per-kind.
  const extMatch = input.fileUri.match(/\.([a-zA-Z0-9]{2,4})(\?.*)?$/);
  const ext = (extMatch?.[1] ?? (input.kind === "video" ? "mp4" : "jpg")).toLowerCase();
  const mime =
    input.mime ??
    (input.kind === "video"
      ? ext === "mov"
        ? "video/quicktime"
        : "video/mp4"
      : ext === "png"
        ? "image/png"
        : ext === "webp"
          ? "image/webp"
          : "image/jpeg");

  // 3) Storage path: <bookingId>/<senderId>/<uuid>.<ext> — first two
  //    segments are checked by the RLS policies in migration 0030.
  const uuid =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const path = `${input.bookingId}/${user.id}/${uuid}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("booking-chat-media")
    .upload(path, blob, {
      contentType: mime,
      cacheControl: "3600",
      upsert: false,
    });
  if (uploadError) {
    captureError(uploadError, { ctx: "sendAttachment:upload", bookingId: input.bookingId });
    throw uploadError;
  }

  // 4) Insert the messages row referencing the uploaded object.
  const { data, error } = await supabase
    .from("messages")
    .insert({
      booking_id: input.bookingId,
      sender_id: user.id,
      body: input.caption?.trim() || null,
      attachment_url: path,
      attachment_kind: input.kind,
      attachment_mime: mime,
      attachment_size: size,
      attachment_w: input.width ?? null,
      attachment_h: input.height ?? null,
    })
    .select(MESSAGE_SELECT)
    .single();
  if (error) {
    captureError(error, { ctx: "sendAttachment:insert", bookingId: input.bookingId });
    throw error;
  }
  breadcrumb("booking", "message.attachment.sent", {
    bookingId: input.bookingId,
    kind: input.kind,
    size,
  });
  return data as Message;
}

/**
 * Resolve a private storage path to a short-lived signed URL the client
 * can drop into an <Image> / <Video> source. 1-hour TTL.
 */
export async function getAttachmentUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("booking-chat-media")
    .createSignedUrl(path, 60 * 60);
  if (error) {
    captureError(error, { ctx: "getAttachmentUrl", path });
    return null;
  }
  return data?.signedUrl ?? null;
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
