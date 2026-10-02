import { ArrowDownIcon, ArrowUpIcon } from "@phosphor-icons/react";
import type {
  EvalHomeRange,
  EvalHomeVerdict,
} from "@sphynx/schema/domain/eval-home";
import { HomeKpi } from "@/components/home/home-kpi";
import { HomePanel } from "@/components/home/home-panel";
import { Sparkline } from "@/components/home/sparkline";
import { VERDICT_TEXT } from "@/components/home/verdict-tone";
import { type HomeView, PERIOD } from "@/lib/evals/home-view";

const usd = new Intl.NumberFormat("en-US", {
  currency: "USD",
  style: "currency",
});

function DeltaNote({
  delta,
  period,
}: {
  readonly delta: number | null;
  readonly period: string;
}) {
  if (delta === null) {
    return <>No trend yet</>;
  }
  if (delta === 0) {
    return <>Flat {period}</>;
  }
  const Arrow = delta < 0 ? ArrowDownIcon : ArrowUpIcon;
  return (
    <>
      <Arrow aria-label={delta < 0 ? "down" : "up"} className="size-3" />
      {Math.abs(delta)} pts {period}
    </>
  );
}

export function HomeOverview({
  onVerdict,
  range,
  spendUsd,
  verdict,
  view,
}: {
  readonly onVerdict: (verdict: EvalHomeVerdict | null) => void;
  readonly range: EvalHomeRange;
  readonly spendUsd: number;
  readonly verdict: EvalHomeVerdict | null;
  readonly view: HomeView;
}) {
  const { tally } = view;
  const period = PERIOD[range];
  const toggle = (next: EvalHomeVerdict) => () =>
    onVerdict(verdict === next ? null : next);

  const kpis = [
    <HomeKpi
      chart={
        <Sparkline
          className="text-muted-foreground"
          height={22}
          rates={view.overall}
          width={64}
        />
      }
      key="rate"
      label="Pass rate"
      note={<DeltaNote delta={view.delta} period={period} />}
      value={tally.passRate === null ? "None" : `${tally.passRate}%`}
    />,
    <HomeKpi
      active={verdict === "passed"}
      key="passed"
      label="Passing"
      note={`of ${tally.total} evals`}
      onSelect={toggle("passed")}
      tone={VERDICT_TEXT.passed}
      value={String(tally.passing)}
    />,
    <HomeKpi
      active={verdict === "failed"}
      key="failed"
      label="Failing"
      note={`${view.newlyFailing} new`}
      onSelect={toggle("failed")}
      tone={VERDICT_TEXT.failed}
      value={String(tally.failing)}
    />,
    <HomeKpi
      active={verdict === "flaky"}
      key="flaky"
      label="Flaky"
      note="pass sometimes"
      onSelect={toggle("flaky")}
      tone={VERDICT_TEXT.flaky}
      value={String(tally.flaky)}
    />,
    <HomeKpi
      active={verdict === "unscored"}
      key="unscored"
      label="Not scored"
      note="void or timed out"
      onSelect={toggle("unscored")}
      tone={VERDICT_TEXT.unscored}
      value={String(tally.unscored)}
    />,
    <HomeKpi
      key="spend"
      label="Spend"
      note={period}
      value={usd.format(spendUsd)}
    />,
  ];

  return (
    <HomePanel title="Overview">
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:flex lg:items-stretch">
        {kpis.map((kpi) => (
          <div
            className="flex min-w-0 flex-1 lg:border-border lg:border-l lg:pl-5 lg:first:border-l-0 lg:first:pl-0"
            key={kpi.key}
          >
            {kpi}
          </div>
        ))}
      </div>
    </HomePanel>
  );
}
