#!/usr/bin/env bash
# Builds the server image, pushes it to ECR and points an App Runner service at
# it. Safe to re-run: every step either creates its resource or reuses it, so a
# second run is a deploy rather than a duplicate.
set -euo pipefail

REGION="${AWS_REGION:-us-east-2}"
REPO="${ECR_REPO:-anpord-server}"
SERVICE="${APPRUNNER_SERVICE:-anpord-server}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
REGISTRY="${ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com"
IMAGE="${REGISTRY}/${REPO}:latest"

echo "==> Account ${ACCOUNT}, region ${REGION}"

aws ecr describe-repositories --repository-names "${REPO}" --region "${REGION}" >/dev/null 2>&1 ||
  aws ecr create-repository \
    --repository-name "${REPO}" \
    --region "${REGION}" \
    --image-scanning-configuration scanOnPush=true >/dev/null

# Untagged layers from previous deploys cost storage and are never pulled.
aws ecr put-lifecycle-policy \
  --repository-name "${REPO}" \
  --region "${REGION}" \
  --lifecycle-policy-text '{"rules":[{"rulePriority":1,"description":"Expire untagged","selection":{"tagStatus":"untagged","countType":"sinceImagePushed","countUnit":"days","countNumber":1},"action":{"type":"expire"}}]}' >/dev/null

aws ecr get-login-password --region "${REGION}" |
  docker login --username AWS --password-stdin "${REGISTRY}" >/dev/null

echo "==> Building (linux/amd64)"
docker build --platform linux/amd64 -f "${ROOT}/apps/server/Dockerfile" -t "${IMAGE}" "${ROOT}"

echo "==> Pushing ${IMAGE}"
docker push "${IMAGE}"

SERVICE_ARN="$(aws apprunner list-services --region "${REGION}" \
  --query "ServiceSummaryList[?ServiceName=='${SERVICE}'].ServiceArn | [0]" --output text)"

if [ "${SERVICE_ARN}" = "None" ] || [ -z "${SERVICE_ARN}" ]; then
  echo "==> Creating App Runner service"
  echo "    Needs an access role so App Runner may pull from ECR, and the"
  echo "    runtime environment variables. See DEPLOY.md."
  exit 1
fi

echo "==> Deploying to ${SERVICE_ARN}"
aws apprunner start-deployment --service-arn "${SERVICE_ARN}" --region "${REGION}" >/dev/null

aws apprunner describe-service --service-arn "${SERVICE_ARN}" --region "${REGION}" \
  --query 'Service.ServiceUrl' --output text
