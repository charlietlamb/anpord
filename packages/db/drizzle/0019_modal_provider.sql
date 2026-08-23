ALTER TABLE "eval_cell" DROP CONSTRAINT "eval_cell_provider_check";
ALTER TABLE "eval_cell" ADD CONSTRAINT "eval_cell_provider_check" CHECK (provider in ('e2b','daytona','upstash','modal','local'));
ALTER TABLE "eval_trial" DROP CONSTRAINT "eval_trial_provider_check";
ALTER TABLE "eval_trial" ADD CONSTRAINT "eval_trial_provider_check" CHECK (provider in ('e2b','daytona','upstash','modal','local'));
