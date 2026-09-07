BEGIN;

CREATE TEMP TABLE eval_task (id integer PRIMARY KEY, validator_config jsonb);
INSERT INTO eval_task VALUES
  (1, '{"kind":"judged","name":"check","checks":[],"judges":[{"name":"first","rubric":"Be accurate"},{"name":"second","prompt":"Be concise"}],"sourceFiles":[{"path":"judge.ts","content":"rubric: original snapshot"}]}'),
  (2, NULL),
  (3, '{"name":"code","source":"rubric: unchanged source"}'),
  (4, '{"kind":"judged","judges":[]}'),
  (5, '{"kind":"judged","judges":[{"rubric":"old","prompt":"new"}]}');

CREATE TEMP TABLE original AS SELECT * FROM eval_task;

\ir ../drizzle/0044_judge_prompt.sql

DO $$
BEGIN
  IF (SELECT validator_config #>> '{judges,0,prompt}' FROM eval_task WHERE id = 1) IS DISTINCT FROM 'Be accurate' THEN
    RAISE EXCEPTION 'Missing migrated prompt';
  END IF;
  IF (SELECT validator_config #>> '{judges,1,prompt}' FROM eval_task WHERE id = 1) IS DISTINCT FROM 'Be concise' THEN
    RAISE EXCEPTION 'Changed an existing prompt or judge order';
  END IF;
  IF EXISTS (SELECT 1 FROM eval_task WHERE validator_config @? '$.judges[*].rubric') THEN
    RAISE EXCEPTION 'Legacy judge field remains';
  END IF;
  IF (SELECT validator_config #>> '{judges,0,prompt}' FROM eval_task WHERE id = 5) IS DISTINCT FROM 'new' THEN
    RAISE EXCEPTION 'Overwrote an existing prompt';
  END IF;
  IF EXISTS (
    SELECT 1 FROM eval_task JOIN original USING (id)
    WHERE (eval_task.id IN (2, 3, 4) AND eval_task.validator_config IS DISTINCT FROM original.validator_config)
      OR eval_task.validator_config -> 'sourceFiles' IS DISTINCT FROM original.validator_config -> 'sourceFiles'
  ) THEN
    RAISE EXCEPTION 'Changed unrelated data or original source snapshots';
  END IF;
END $$;

CREATE TEMP TABLE migrated AS SELECT * FROM eval_task;

\ir ../drizzle/0044_judge_prompt.sql

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM eval_task JOIN migrated USING (id)
    WHERE eval_task.validator_config IS DISTINCT FROM migrated.validator_config
  ) THEN
    RAISE EXCEPTION 'Migration is not idempotent';
  END IF;
END $$;

ROLLBACK;
