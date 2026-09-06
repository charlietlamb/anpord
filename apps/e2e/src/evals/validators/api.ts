import type { Validator } from "anpord";
import { item } from "../fixtures/catalog";

export const validateApi: Validator = async ({ api, answer }) => {
  const calls = await api.calls("catalog");
  const missing = calls.findIndex(
    ({ path, status, matched }) =>
      matched && path === "/items/missing" && status === 404
  );
  const retrieved = calls
    .slice(missing + 1)
    .some(
      ({ path, status, error }) =>
        path === `/items/${item.id}` && status === 200 && error === null
    );
  console.info(
    "Catalog HTTP requests",
    calls.map(({ method, path, status }) => ({ method, path, status }))
  );
  return {
    passed: missing >= 0 && retrieved && (await answer()).includes(item.name),
    message: "Retrieve the fixture over HTTP after a missing-item response.",
  };
};
