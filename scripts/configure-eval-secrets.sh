#!/usr/bin/env bash
# Puts the sandbox and billing credentials the eval runtime falls back to on
# the App Runner service. Without these an organisation with no sandbox
# connection of its own cannot run anything, because the fallback adapter has
# no account to build itself from, and usage goes uncounted.
#
# Reads them from .env, so what production runs on is what was tested locally.
# Safe to re-run: each secret is created or updated, and the service
# configuration is merged rather than replaced.
set -euo pipefail

REGION="${AWS_REGION:-us-east-2}"
SERVICE="${APPRUNNER_SERVICE:-anpord-server}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Credentials, stored in Secrets Manager. The Vercel team and project ids
# below are identifiers rather than secrets and go on the service directly.
NAMES=(DAYTONA_API_KEY E2B_API_KEY VERCEL_TOKEN AUTUMN_API_KEY)

[ -f "${ROOT}/.env" ] || { echo "No .env at ${ROOT}" >&2; exit 1; }

ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
echo "==> Account ${ACCOUNT}, region ${REGION}"

declare -A ARNS

for NAME in "${NAMES[@]}"; do
  VALUE="$(bun --env-file="${ROOT}/.env" -e "process.stdout.write(process.env.${NAME} ?? '')")"

  [ -n "${VALUE}" ] || { echo "  ${NAME} is not set in .env, skipping"; continue; }

  SECRET="anpord/server/${NAME}"

  if aws secretsmanager describe-secret --secret-id "${SECRET}" --region "${REGION}" >/dev/null 2>&1; then
    echo "==> Updating ${SECRET}"
    aws secretsmanager put-secret-value --secret-id "${SECRET}" \
      --secret-string "${VALUE}" --region "${REGION}" >/dev/null
  else
    echo "==> Creating ${SECRET}"
    aws secretsmanager create-secret --name "${SECRET}" \
      --secret-string "${VALUE}" --region "${REGION}" >/dev/null
  fi

  ARNS["${NAME}"]="$(aws secretsmanager describe-secret --secret-id "${SECRET}" \
    --region "${REGION}" --query ARN --output text)"
done

SERVICE_ARN="$(aws apprunner list-services --region "${REGION}" \
  --query "ServiceSummaryList[?ServiceName=='${SERVICE}'].ServiceArn | [0]" --output text)"

[ "${SERVICE_ARN}" != "None" ] || { echo "No App Runner service named ${SERVICE}" >&2; exit 1; }

echo "==> Reading current configuration"
CURRENT="$(aws apprunner describe-service --service-arn "${SERVICE_ARN}" \
  --region "${REGION}" --query 'Service.SourceConfiguration' --output json)"

ADDED="$(for NAME in "${!ARNS[@]}"; do printf '%s=%s\n' "${NAME}" "${ARNS[${NAME}]}"; done)"

UPDATED="$(ADDED="${ADDED}" \
  VERCEL_TEAM_ID="$(bun --env-file="${ROOT}/.env" -e "process.stdout.write(process.env.VERCEL_TEAM_ID ?? '')")" \
  VERCEL_PROJECT_ID="$(bun --env-file="${ROOT}/.env" -e "process.stdout.write(process.env.VERCEL_PROJECT_ID ?? '')")" \
  node -e '
  const current = JSON.parse(require("node:fs").readFileSync(0, "utf8"));
  const image = current.ImageRepository;
  const config = (image.ImageConfiguration ??= {});
  const added = Object.fromEntries(
    (process.env.ADDED ?? "").split("\n").filter(Boolean).map((line) => {
      const at = line.indexOf("=");
      return [line.slice(0, at), line.slice(at + 1)];
    })
  );

  // Merged: the service carries a dozen variables and several secrets, and an
  // update naming only these would take the rest away.
  config.RuntimeEnvironmentSecrets = {
    ...config.RuntimeEnvironmentSecrets,
    ...added,
  };
  config.RuntimeEnvironmentVariables = {
    ...config.RuntimeEnvironmentVariables,
    VERCEL_TEAM_ID: process.env.VERCEL_TEAM_ID,
    VERCEL_PROJECT_ID: process.env.VERCEL_PROJECT_ID,
  };

  process.stdout.write(JSON.stringify({
    AuthenticationConfiguration: current.AuthenticationConfiguration,
    AutoDeploymentsEnabled: current.AutoDeploymentsEnabled,
    ImageRepository: image,
  }));
' <<<"${CURRENT}")"

echo "==> Updating ${SERVICE}"
aws apprunner update-service --service-arn "${SERVICE_ARN}" \
  --source-configuration "${UPDATED}" --region "${REGION}" >/dev/null

echo "==> Done. The service redeploys itself."
