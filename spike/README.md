# Trigger.dev spike

Throwaway. Answers whether Trigger.dev can run an eval trial, before
committing to it.

    cd spike/trigger
    npm install
    npx trigger.dev@latest login --profile anpord
    npx trigger.dev@latest dev --profile anpord

`slow-prepare` sleeps, then reports wall time against CPU time. A long
prepare only works if waiting does not spend the CPU budget maxDuration
counts.
