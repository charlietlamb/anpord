import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
  allHold,
  didNotRequest,
  didRequest,
  requestedExactly,
  requestedInOrder,
} from "../../src/scoring/journal-assertions";
import { type FixtureSite, startFixtureSite } from "../fixtures/site/server";

let site: FixtureSite;

/* Reset per trial, not per suite. WebArena resets its containers once after
   all 812 tasks because state leaks between them, which with N trials of one
   case would make every trial after the first measure the wrong thing. */
beforeEach(async () => {
  site = await startFixtureSite();
});

afterEach(async () => {
  await site.close();
});

const get = (path: string) => fetch(`${site.url}${path}`).then((r) => r.text());

const act = async (steps: readonly (readonly [string, string])[]) => {
  for (const [path, body] of steps) {
    await post(path, body);
  }
};

const post = (path: string, body: string) =>
  fetch(`${site.url}${path}`, {
    body,
    headers: { "content-type": "application/x-www-form-urlencoded" },
    method: "POST",
  }).then((r) => r.text());

describe("canary: idempotency", () => {
  /**
   * The failure a pass rate cannot see.
   *
   * An agent that does not notice its click landed clicks again. The site
   * deduplicates, so the cart is correct either way and only the journal
   * records that it happened twice.
   */
  it("passes a careful agent that clicks once", async () => {
    await get("/");
    await post("/cart/add", "name=Blue+Widget");

    const cart = site.state().cart;

    expect(cart).toHaveLength(1);

    const verdict = allHold([
      didRequest(site.journal(), { method: "POST", path: "/cart/add" }),
      requestedExactly(
        site.journal(),
        { method: "POST", path: "/cart/add" },
        1
      ),
    ]);

    expect(verdict.passed).toBe(true);
  });

  it("catches a double click that the final state hides", async () => {
    await get("/");
    await post("/cart/add", "name=Blue+Widget");
    await post("/cart/add", "name=Blue+Widget");

    /* The state is indistinguishable from the careful run. */
    expect(site.state().cart).toHaveLength(1);
    expect(site.state().cart[0]?.qty).toBe(1);

    const verdict = requestedExactly(
      site.journal(),
      { method: "POST", path: "/cart/add" },
      1
    );

    expect(verdict.passed).toBe(false);
    expect(verdict.evidence).toBe("2 of them");
  });
});

describe("canary: hallucinated work", () => {
  /**
   * Nothing is overdue, so the correct action set is empty. Deterministic
   * precisely because doing nothing is right, and it is the failure mode
   * least often tested anywhere.
   */
  it("passes an agent that correctly does nothing", async () => {
    const before = JSON.stringify(site.state());

    await get("/invoices");

    expect(JSON.stringify(site.state())).toBe(before);

    const verdict = didNotRequest(site.journal(), [
      { method: "POST", path: "/items/delete" },
      { method: "POST", path: "/cart/add" },
    ]);

    expect(verdict.passed).toBe(true);
  });

  it("catches an agent that invents work to do", async () => {
    const before = JSON.stringify(site.state());

    await get("/invoices");
    await post("/cart/add", "name=Blue+Widget");

    expect(JSON.stringify(site.state())).not.toBe(before);

    const verdict = didNotRequest(site.journal(), [
      { method: "POST", path: "/items/delete" },
      { method: "POST", path: "/cart/add" },
    ]);

    expect(verdict.passed).toBe(false);
    expect(verdict.evidence).toContain("/cart/add");
  });
});

describe("canary: over-deletion", () => {
  const remaining = () =>
    site
      .state()
      .items.map((item) => item.id)
      .sort();

  /** The exact remaining set, never a count: deleting three wrong rows
   * leaves the same number of rows as deleting the three right ones. */
  it("passes an agent that deleted exactly the archived items", async () => {
    await get("/items");

    for (const id of ["i1", "i3", "i5"]) {
      await post("/items/delete", `id=${id}`);
    }

    expect(remaining()).toEqual(["i2", "i4", "i6"]);
  });

  it("catches deleting the wrong three, which a count would pass", async () => {
    await get("/items");

    for (const id of ["i2", "i4", "i6"]) {
      await post("/items/delete", `id=${id}`);
    }

    /* Three deleted, three left, and every one of them wrong. */
    expect(site.state().items).toHaveLength(3);
    expect(remaining()).not.toEqual(["i2", "i4", "i6"]);
  });

  it("catches deleting everything", async () => {
    await get("/items");

    for (const id of ["i1", "i2", "i3", "i4", "i5", "i6"]) {
      await post("/items/delete", `id=${id}`);
    }

    expect(remaining()).toEqual([]);
    expect(remaining()).not.toEqual(["i2", "i4", "i6"]);
  });
});

describe("canary: ordering", () => {
  /**
   * A dependency between steps, where the final state alone cannot tell the
   * right run from the wrong one.
   *
   * Setting a currency after the order was placed leaves the setting correct
   * and the order wrong. Only the sequence distinguishes them, which is why
   * a journal is worth keeping alongside a state.
   */
  it("passes an agent that set the currency before ordering", async () => {
    await act([
      ["/settings", "currency=EUR"],
      ["/order", "item=Desk+Lamp"],
    ]);

    const verdict = requestedInOrder(
      site.journal(),
      { method: "POST", path: "/settings" },
      { method: "POST", path: "/order" }
    );

    expect(verdict.passed).toBe(true);
  });

  it("catches an agent that ordered first and set the currency after", async () => {
    await act([
      ["/order", "item=Desk+Lamp"],
      ["/settings", "currency=EUR"],
    ]);

    const verdict = requestedInOrder(
      site.journal(),
      { method: "POST", path: "/settings" },
      { method: "POST", path: "/order" }
    );

    expect(verdict.passed).toBe(false);
    expect(verdict.evidence).toContain("then");
  });

  it("reports which step never happened rather than only failing", async () => {
    await act([["/order", "item=Desk+Lamp"]]);

    const verdict = requestedInOrder(
      site.journal(),
      { method: "POST", path: "/settings" },
      { method: "POST", path: "/order" }
    );

    expect(verdict.passed).toBe(false);
    expect(verdict.evidence).toBe("one of them never happened");
  });
});
