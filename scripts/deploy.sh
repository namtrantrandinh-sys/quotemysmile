#!/usr/bin/env bash
# ============================================================================
# QuoteMySmile — one-shot deploy
# ============================================================================
# Pushes the latest Supabase migrations, deploys every edge function, verifies
# required secrets are set, and (optionally) kicks off an EAS build.
#
#   ./scripts/deploy.sh              # full backend deploy
#   ./scripts/deploy.sh --eas preview  # plus a preview EAS build
#   ./scripts/deploy.sh --skip-db     # functions only (faster iter)
#
# Exits non-zero on the first missing secret. Run from repo root.
# ============================================================================
set -euo pipefail

PROJECT_REF="mqlaoxcjebzsihiocmzm"

FNS=(
  abn-lookup
  ahpra-lookup
  create-deposit-intent
  stripe-deposit-webhook
  refund-deposit
  send-quote-notification
  send-booking-notification
  send-email
  purge-stale-data
  expire-requests
  delete-account
  sweep-dentist-fees
)

REQUIRED_SECRETS=(
  STRIPE_SECRET_KEY
  STRIPE_WEBHOOK_SECRET
  RESEND_API_KEY
  ABR_GUID
  PURGE_CRON_SECRET
)

# Functions deployed with --no-verify-jwt (webhook + cron callers don't have
# a Supabase JWT; they auth via Stripe signature or our cron secret header)
NO_JWT_FNS=(stripe-deposit-webhook purge-stale-data expire-requests sweep-dentist-fees)

# ----- arg parsing -----
SKIP_DB=0
EAS_PROFILE=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-db) SKIP_DB=1; shift ;;
    --eas) EAS_PROFILE="${2:-}"; shift 2 ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
done

# ----- preflight -----
command -v supabase >/dev/null 2>&1 || { echo "❌ supabase CLI not found"; exit 1; }
command -v jq >/dev/null 2>&1 || { echo "⚠️  jq not found — secret check will be best-effort"; }

cd "$(dirname "$0")/.."

echo "→ Linking Supabase project: $PROJECT_REF"
supabase link --project-ref "$PROJECT_REF" >/dev/null

# ----- secret check -----
echo "→ Verifying required function secrets…"
SECRETS_OUT="$(supabase secrets list --project-ref "$PROJECT_REF" 2>/dev/null || true)"
MISSING=()
for k in "${REQUIRED_SECRETS[@]}"; do
  if ! grep -q "^${k}\b" <<< "$SECRETS_OUT"; then
    MISSING+=("$k")
  fi
done
if [[ ${#MISSING[@]} -gt 0 ]]; then
  echo "❌ Missing secrets:"
  for k in "${MISSING[@]}"; do echo "   - $k"; done
  echo "Set them with:"
  echo "   supabase secrets set ${MISSING[*]/#/<SET>}"
  exit 1
fi
echo "✓ All required secrets present."

# ----- db push -----
if [[ "$SKIP_DB" == "0" ]]; then
  echo "→ Pushing migrations…"
  supabase db push --linked
fi

# ----- function deploys -----
for fn in "${FNS[@]}"; do
  echo "→ Deploying function: $fn"
  if printf '%s\n' "${NO_JWT_FNS[@]}" | grep -qx "$fn"; then
    supabase functions deploy "$fn" --no-verify-jwt
  else
    supabase functions deploy "$fn"
  fi
done

# ----- smoke test -----
if [[ -f scripts/smoke-test-edge-fns.ts ]]; then
  echo "→ Running edge-fn smoke tests…"
  if command -v deno >/dev/null 2>&1; then
    deno run --allow-net --allow-env scripts/smoke-test-edge-fns.ts || true
  else
    echo "⚠️  deno not installed — skipping smoke test"
  fi
fi

# ----- EAS build -----
if [[ -n "$EAS_PROFILE" ]]; then
  command -v eas >/dev/null 2>&1 || { echo "❌ eas CLI not found"; exit 1; }
  echo "→ Triggering EAS build: $EAS_PROFILE"
  eas build --profile "$EAS_PROFILE" --platform all --non-interactive
fi

echo
echo "✅ Deploy complete."
echo "   Edge functions:    $(IFS=,; echo "${FNS[*]}")"
echo "   Cron:              schedule 'purge-stale-data' to '0 14 * * *' in Dashboard"
echo "   Stripe webhook:    https://${PROJECT_REF}.supabase.co/functions/v1/stripe-deposit-webhook"
