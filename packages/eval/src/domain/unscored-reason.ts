const TIMED_OUT = "The agent ran past its time limit";
const REASON_LIMIT = 120;

export const unscoredReasonOf = (failure: string | null) => {
  if (failure === null) {
    return "Not scored";
  }
  if (failure.startsWith(TIMED_OUT)) {
    return "Timed out";
  }
  return failure.split(":")[0].trim().slice(0, REASON_LIMIT) || "Not scored";
};
