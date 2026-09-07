import { expect, test } from "bun:test";
import { withApi } from "anpord/api";
import { getItem, items, listItems } from "./fixtures/catalog";
import { evidenceContext } from "./fixtures/evidence";
import { catalogApi } from "./mocks/api";
import { scenarios } from "./scenarios";
import { transports, validateCatalog } from "./validators/catalog";

for (const transport of transports) {
  for (const scenario of scenarios) {
    test(`${transport}/${scenario.name}: accepts evidence and rejects fabricated or malformed results`, async () => {
      const validate = validateCatalog(transport, scenario);
      const answer = JSON.stringify(scenario.expected);
      expect(
        await validate(evidenceContext(transport, scenario.requests, answer))
      ).toMatchObject({ passed: true });
      expect(
        await validate(evidenceContext(transport, [], answer))
      ).toMatchObject({ passed: false });
      for (const invalid of [
        '{"invented":true}',
        "not JSON",
        `\`\`\`json\n${answer}\n\`\`\``,
        JSON.stringify({ ...scenario.expected, extra: true }),
        JSON.stringify(getItem({ id: "tape" })),
      ]) {
        expect(
          await validate(evidenceContext(transport, scenario.requests, invalid))
        ).toMatchObject({ passed: false });
      }
      const other = transports.find((value) => value !== transport);
      if (!other) {
        throw new Error("Expected another transport");
      }
      expect(
        await validate(evidenceContext(other, scenario.requests, answer))
      ).toMatchObject({ passed: false });
      const context = evidenceContext(transport, scenario.requests, answer);
      const mixed = {
        ...context,
        [other]: evidenceContext(other, scenario.requests, answer)[other],
      };
      expect(await validate(mixed)).toMatchObject({ passed: false });
    });
  }
  test(`${transport}: recovery must happen after the missing-item error`, async () => {
    const scenario = scenarios.find(({ name }) => name === "recover-missing");
    if (!scenario) {
      throw new Error("Missing recovery scenario");
    }
    expect(
      await validateCatalog(
        transport,
        scenario
      )(
        evidenceContext(
          transport,
          [...scenario.requests].reverse(),
          JSON.stringify(scenario.expected)
        )
      )
    ).toMatchObject({ passed: false });
  });
}

test("HTTP scenarios accept real local-server journals", async () => {
  for (const scenario of scenarios) {
    await withApi({
      api: catalogApi,
      run: async ({ url, calls }) => {
        for (const request of scenario.requests) {
          const response = await fetch(
            `${url}/items${request.method === "get" ? `/${request.id}` : ""}`
          );
          expect(response.status).toBe(request.failed ? 404 : 200);
          await response.json();
        }
        const context = evidenceContext(
          "api",
          [],
          JSON.stringify(scenario.expected)
        );
        expect(
          await validateCatalog(
            "api",
            scenario
          )({
            ...context,
            api: { url: async () => url, calls: async () => calls() },
          })
        ).toMatchObject({ passed: true });
      },
    });
  }
});

test("fixtures have stable arithmetic and missing-item semantics", () => {
  expect(listItems().items).toHaveLength(4);
  expect(
    items.reduce((sum, item) => sum + item.priceCents * item.stock, 0)
  ).toBe(5947);
  expect(() => getItem({ id: "missing" })).toThrow("Unknown item: missing");
});

test("unexpected tool failures do not count as missing-item evidence", async () => {
  const scenario = scenarios.find(({ name }) => name === "report-missing");
  if (!scenario) {
    throw new Error("Missing negative scenario");
  }
  for (const transport of transports) {
    const context = evidenceContext(
      transport,
      scenario.requests,
      JSON.stringify(scenario.expected)
    );
    const calls = await context[transport].calls("inventory");
    expect(
      await validateCatalog(
        transport,
        scenario
      )({
        ...context,
        [transport]: {
          ...context[transport],
          calls: async () => calls.map((call) => ({ ...call, error: "Crash" })),
        },
      })
    ).toMatchObject({ passed: false });
  }
});
