#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-}"
case "${MODE}" in
  check | apply) ;;
  *)
    echo "Usage: scripts/apprunner-shape.sh check|apply" >&2
    exit 2
    ;;
esac

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
WANTED="$(printf '%s\t%s\t%s\tHTTP\t%s\t5\t4\t1\t3\t%s\t%s\t%s' \
  "${CPU}" "${MEMORY}" "${ROLE}" "${HEALTH_PATH}" "${MIN_INSTANCES}" "${MAX_INSTANCES}" "${MAX_CONCURRENCY}")"

limits_of() {
  aws apprunner describe-auto-scaling-configuration --region "${REGION}" \
    --auto-scaling-configuration-arn "$1" \
    --query 'AutoScalingConfiguration.[MinSize,MaxSize,MaxConcurrency]' --output text
}

current() {
  local service scaling
  service="$(aws apprunner describe-service --service-arn "${ARN}" --region "${REGION}" \
    --query 'Service.[InstanceConfiguration.Cpu,InstanceConfiguration.Memory,InstanceConfiguration.InstanceRoleArn,HealthCheckConfiguration.Protocol,HealthCheckConfiguration.Path,HealthCheckConfiguration.Interval,HealthCheckConfiguration.Timeout,HealthCheckConfiguration.HealthyThreshold,HealthCheckConfiguration.UnhealthyThreshold]' \
    --output text)"
  scaling="$(aws apprunner describe-service --service-arn "${ARN}" --region "${REGION}" \
    --query 'Service.AutoScalingConfigurationSummary.AutoScalingConfigurationArn' --output text)"
  printf '%s\t%s' "${service}" "$(limits_of "${scaling}")"
}

matches() {
  local now
  now="$(current)"
  [ "${now}" = "${WANTED}" ] && return 0
  echo "${SERVICE} has drifted from its expected shape."
  echo "  now:      ${now}"
  echo "  expected: ${WANTED}"
  return 1
}

settle() {
  local status
  for _ in $(seq 1 60); do
    status="$(aws apprunner describe-service --service-arn "${ARN}" --region "${REGION}" \
      --query 'Service.Status' --output text)"
    case "${status}" in
      RUNNING) return 0 ;;
      OPERATION_IN_PROGRESS) sleep 10 ;;
      *)
        echo "${SERVICE} is ${status}; stopping." >&2
        return 1
        ;;
    esac
  done
  echo "${SERVICE} did not settle within 10 minutes." >&2
  return 1
}

SUMMARY="${SERVICE} runs ${CPU} CPU, ${MEMORY} MB, ${MIN_INSTANCES} to ${MAX_INSTANCES} instances."

if matches; then
  echo "${SUMMARY}"
  exit 0
fi

if [ "${MODE}" = "check" ]; then
  echo "Run scripts/apprunner-shape.sh apply with operator credentials, then deploy again."
  exit 1
fi

SCALING="$(aws apprunner list-auto-scaling-configurations --region "${REGION}" \
  --auto-scaling-configuration-name "${SERVICE}" --latest-only \
  --query 'AutoScalingConfigurationSummaryList[0].AutoScalingConfigurationArn' --output text)"
if [ "${SCALING}" = "None" ] || [ "$(limits_of "${SCALING}")" != "$(printf '%s\t%s\t%s' "${MIN_INSTANCES}" "${MAX_INSTANCES}" "${MAX_CONCURRENCY}")" ]; then
  SCALING="$(aws apprunner create-auto-scaling-configuration --region "${REGION}" \
    --auto-scaling-configuration-name "${SERVICE}" \
    --min-size "${MIN_INSTANCES}" --max-size "${MAX_INSTANCES}" --max-concurrency "${MAX_CONCURRENCY}" \
    --query 'AutoScalingConfiguration.AutoScalingConfigurationArn' --output text)"
fi

settle
aws apprunner update-service --service-arn "${ARN}" --region "${REGION}" \
  --instance-configuration "Cpu=${CPU},Memory=${MEMORY},InstanceRoleArn=${ROLE}" \
  --auto-scaling-configuration-arn "${SCALING}" \
  --health-check-configuration "${HEALTH}" >/dev/null
settle
matches
echo "${SUMMARY}"
