#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-check}"
REGION="${AWS_REGION:-us-east-2}"
SERVICE="${APPRUNNER_SERVICE:-anpord-server}"

CPU="512"
MEMORY="1024"
MIN_INSTANCES="2"
MAX_INSTANCES="4"
MAX_CONCURRENCY="80"
INSTANCE_ROLE="AppRunnerAnpordInstanceRole"
HEALTH_PATH="/api/livez"
HEALTH="Protocol=HTTP,Path=${HEALTH_PATH},Interval=5,Timeout=4,HealthyThreshold=1,UnhealthyThreshold=3"

ARN="$(aws apprunner list-services --region "${REGION}" \
  --query "ServiceSummaryList[?ServiceName=='${SERVICE}'].ServiceArn | [0]" --output text)"
ROLE="arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/${INSTANCE_ROLE}"

shape() {
  aws apprunner describe-service --service-arn "${ARN}" --region "${REGION}" \
    --query 'Service.[InstanceConfiguration.Cpu,InstanceConfiguration.Memory,InstanceConfiguration.InstanceRoleArn,AutoScalingConfigurationSummary.AutoScalingConfigurationName,HealthCheckConfiguration.Protocol,HealthCheckConfiguration.Path,HealthCheckConfiguration.Interval,HealthCheckConfiguration.Timeout,HealthCheckConfiguration.HealthyThreshold,HealthCheckConfiguration.UnhealthyThreshold]' \
    --output text
}

WANTED="$(printf '%s\t%s\t%s\t%s\tHTTP\t%s\t5\t4\t1\t3' "${CPU}" "${MEMORY}" "${ROLE}" "${SERVICE}" "${HEALTH_PATH}")"
CURRENT="$(shape)"

if [ "${MODE}" = "check" ]; then
  if [ "${CURRENT}" = "${WANTED}" ]; then
    echo "${SERVICE} runs ${CPU} CPU, ${MEMORY} MB, ${MIN_INSTANCES} to ${MAX_INSTANCES} instances, as expected."
    exit 0
  fi
  echo "${SERVICE} has drifted from its expected shape."
  echo "  now:      ${CURRENT}"
  echo "  expected: ${WANTED}"
  echo "Run scripts/apprunner-shape.sh apply with operator credentials, then deploy again."
  exit 1
fi

SCALING="$(aws apprunner list-auto-scaling-configurations --region "${REGION}" \
  --auto-scaling-configuration-name "${SERVICE}" --latest-only \
  --query 'AutoScalingConfigurationSummaryList[0].AutoScalingConfigurationArn' --output text)"
LIMITS="$(aws apprunner describe-auto-scaling-configuration --region "${REGION}" \
  --auto-scaling-configuration-arn "${SCALING}" \
  --query 'AutoScalingConfiguration.[MinSize,MaxSize,MaxConcurrency]' --output text 2>/dev/null || true)"
if [ "${LIMITS}" != "$(printf '%s\t%s\t%s' "${MIN_INSTANCES}" "${MAX_INSTANCES}" "${MAX_CONCURRENCY}")" ]; then
  SCALING="$(aws apprunner create-auto-scaling-configuration --region "${REGION}" \
    --auto-scaling-configuration-name "${SERVICE}" \
    --min-size "${MIN_INSTANCES}" --max-size "${MAX_INSTANCES}" --max-concurrency "${MAX_CONCURRENCY}" \
    --query 'AutoScalingConfiguration.AutoScalingConfigurationArn' --output text)"
fi

aws apprunner update-service --service-arn "${ARN}" --region "${REGION}" \
  --instance-configuration "Cpu=${CPU},Memory=${MEMORY},InstanceRoleArn=${ROLE}" \
  --auto-scaling-configuration-arn "${SCALING}" \
  --health-check-configuration "${HEALTH}" >/dev/null

until [ "$(aws apprunner describe-service --service-arn "${ARN}" --region "${REGION}" \
  --query 'Service.Status' --output text)" = "RUNNING" ]; do
  sleep 10
done
echo "${SERVICE} now runs ${CPU} CPU, ${MEMORY} MB, ${MIN_INSTANCES} to ${MAX_INSTANCES} instances."
