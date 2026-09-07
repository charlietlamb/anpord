UPDATE "eval_task"
SET "validator_config" = jsonb_set(
  "validator_config",
  '{judges}',
  (
    SELECT jsonb_agg(
      CASE WHEN judge ? 'rubric'
        THEN (judge - 'rubric') || jsonb_build_object(
          'prompt', COALESCE(judge -> 'prompt', judge -> 'rubric')
        )
        ELSE judge
      END ORDER BY position
    )
    FROM jsonb_array_elements("validator_config" -> 'judges')
      WITH ORDINALITY AS judges(judge, position)
  )
)
WHERE "validator_config" ->> 'kind' = 'judged'
  AND "validator_config" @? '$.judges[*].rubric';
