#!/usr/bin/env bash
# Puts the GitHub App's credentials on the running App Runner service, so the
# codebase settings stop answering "No GitHub app is registered for this
# deployment". Safe to re-run: the secret is created or updated, and the
# service configuration is merged rather than replaced.
set -euo pipefail

REGION="${AWS_REGION:-us-east-2}"
SERVICE="${APPRUNNER_SERVICE:-anpord-server}"
KEY_PATH="${GITHUB_APP_PRIVATE_KEY_PATH:-.secrets/github-app.pem}"
SECRET="anpord/server/GITHUB_APP_PRIVATE_KEY"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

APP_ID="${GITHUB_APP_ID:-4744741}"
APP_SLUG="${GITHUB_APP_SLUG:-anpord}"

[ -f "${ROOT}/${KEY_PATH}" ] || {
  echo "No private key at ${KEY_PATH}" >&2
  exit 1
}

ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
echo "==> Account ${ACCOUNT}, region ${REGION}"

# The key is a secret; the id and slug are not, and go on the service directly.
if aws secretsmanager describe-secret --secret-id "${SECRET}" --region "${REGION}" >/dev/null 2>&1; then
  echo "==> Updating ${SECRET}"
  aws secretsmanager put-secret-value \
    --secret-id "${SECRET}" \
    --secret-string "file://${ROOT}/${KEY_PATH}" \
    --region "${REGION}" >/dev/null
else
  echo "==> Creating ${SECRET}"
  aws secretsmanager create-secret \
    --name "${SECRET}" \
    --secret-string "file://${ROOT}/${KEY_PATH}" \
    --region "${REGION}" >/dev/null
fi

SECRET_ARN="$(aws secretsmanager describe-secret \
  --secret-id "${SECRET}" --region "${REGION}" --query ARN --output text)"

SERVICE_ARN="$(aws apprunner list-services --region "${REGION}" \
  --query "ServiceSummaryList[?ServiceName=='${SERVICE}'].ServiceArn | [0]" \
  --output text)"

[ "${SERVICE_ARN}" != "None" ] || {
  echo "No App Runner service named ${SERVICE}" >&2
  exit 1
}

echo "==> Reading current configuration"
CURRENT="$(aws apprunner describe-service --service-arn "${SERVICE_ARN}" \
  --region "${REGION}" --query 'Service.SourceConfiguration' --output json)"

# Merged rather than replaced: the service already carries a dozen variables
# and a --source-configuration that omitted them would take them away.
UPDATED="$(SECRET_ARN="${SECRET_ARN}" APP_ID="${APP_ID}" APP_SLUG="${APP_SLUG}" \
  node -e '
    const current = JSON.parse(require("node:fs").readFileSync(0, "utf8"));
    const image = current.ImageRepository;
    const config = (image.ImageConfiguration ??= {});

    config.RuntimeEnvironmentVariables = {
      ...config.RuntimeEnvironmentVariables,
      GITHUB_APP_ID: process.env.APP_ID,
      GITHUB_APP_SLUG: process.env.APP_SLUG,
    };
    config.RuntimeEnvironmentSecrets = {
      ...config.RuntimeEnvironmentSecrets,
      GITHUB_APP_PRIVATE_KEY: process.env.SECRET_ARN,
    };

    process.stdout.write(JSON.stringify({
      AuthenticationConfiguration: current.AuthenticationConfiguration,
      AutoDeploymentsEnabled: current.AutoDeploymentsEnabled,
      ImageRepository: image,
    }));
  ' <<<"${CURRENT}")"

echo "==> Updating ${SERVICE}"
aws apprunner update-service \
  --service-arn "${SERVICE_ARN}" \
  --source-configuration "${UPDATED}" \
  --region "${REGION}" >/dev/null

echo "==> Done. The service redeploys itself; watch it with:"
echo "    aws apprunner describe-service --service-arn ${SERVICE_ARN} --region ${REGION} --query 'Service.Status'"
