export type Unit = "bytes" | "count" | "ms" | "rps" | "ratio" | "score";

type Better = "higher" | "lower";

export interface Spread {
  readonly max: number;
  readonly min: number;
  readonly p95: number;
  readonly samples: number;
}

export interface Metric {
  readonly better: Better;
  readonly informational?: true;
  readonly spread?: Spread;
  readonly unit: Unit;
  readonly value: number;
}

export type Metrics = Readonly<Record<string, Metric>>;

export interface SuiteResult {
  readonly metrics: Metrics;
  readonly settings: Readonly<Record<string, unknown>>;
  readonly suite: string;
}

export interface ResultFile {
  readonly commit: string;
  readonly host: string;
  readonly recordedAt: string;
  readonly suites: readonly SuiteResult[];
  readonly version: 1;
}

const BETTER_BY_UNIT: Readonly<Record<Unit, Better>> = {
  bytes: "lower",
  count: "lower",
  ms: "lower",
  ratio: "lower",
  rps: "higher",
  score: "higher",
};

export const metric = (unit: Unit, value: number, spread?: Spread): Metric => ({
  better: BETTER_BY_UNIT[unit],
  unit,
  value,
  ...(spread === undefined ? {} : { spread }),
});

export const informational = (value: Metric): Metric => ({
  ...value,
  informational: true,
});

export const flatten = (file: ResultFile): Metrics =>
  Object.fromEntries(
    file.suites.flatMap((result) =>
      Object.entries(result.metrics).map(
        ([name, value]) => [`${result.suite}.${name}`, value] as const
      )
    )
  );
