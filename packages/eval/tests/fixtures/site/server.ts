import { createServer, type Server } from "node:http";

interface SiteState {
  readonly cart: { name: string; qty: number }[];
  readonly items: { archived: boolean; id: string }[];
  readonly reviewed: string[];
}

interface JournalEntry {
  readonly body: string | null;
  readonly method: string;
  readonly path: string;
}

export interface FixtureSite {
  readonly close: () => Promise<void>;
  readonly journal: () => readonly JournalEntry[];
  readonly reset: () => void;
  readonly state: () => SiteState;
  readonly url: string;
}

const START: SiteState = {
  cart: [],
  items: [
    { archived: true, id: "i1" },
    { archived: false, id: "i2" },
    { archived: true, id: "i3" },
    { archived: false, id: "i4" },
    { archived: true, id: "i5" },
    { archived: false, id: "i6" },
  ],
  reviewed: [],
};

const page = (body: string) =>
  `<!doctype html><html><head><title>Acme</title></head><body>${body}</body></html>`;

const home = () =>
  page(`<h1>Acme</h1>
    <a href="/cart">Cart</a> <a href="/items">Items</a> <a href="/invoices">Invoices</a>
    <form method="POST" action="/cart/add">
      <input type="hidden" name="name" value="Blue Widget">
      <button type="submit">Add Blue Widget to cart</button>
    </form>`);

const items = (state: SiteState) =>
  page(
    `<h1>Items</h1><ul>${state.items
      .map(
        (item) =>
          `<li>${item.id}${item.archived ? " (archived)" : ""}
          <form method="POST" action="/items/delete">
            <input type="hidden" name="id" value="${item.id}">
            <button type="submit">Delete ${item.id}</button>
          </form></li>`
      )
      .join("")}</ul>`
  );

/**
 * A site that records what was done to it.
 *
 * The server is the oracle rather than the screen: a verifier reads the
 * journal and the state, so a browser side effect becomes filesystem state
 * and the scoring model does not change. It is also the half WebArena lacks,
 * and where over-action and duplicate submissions become visible at all.
 */
export const startFixtureSite = (): Promise<FixtureSite> => {
  let state: SiteState = structuredClone(START);
  let journal: JournalEntry[] = [];

  /* The oracle endpoints, kept apart from the site itself so the site reads
     as a site and the oracle reads as an oracle. */
  const oracle = (path: string) => {
    if (path === "/__state") {
      return { body: JSON.stringify(state), type: "application/json" };
    }

    if (path === "/__journal") {
      return { body: JSON.stringify(journal), type: "application/json" };
    }

    state = structuredClone(START);
    journal = [];

    return { body: "{}", type: "application/json" };
  };

  const mutate = (
    method: string,
    path: string,
    body: string
  ): { readonly body: string; readonly type: string } | null => {
    if (method === "POST" && path === "/cart/add") {
      const name = new URLSearchParams(body).get("name") ?? "unknown";
      const existing = state.cart.find((line) => line.name === name);

      /* Deduplicated on purpose. A second click leaves the cart correct and
         only the journal shows it happened, which is the whole point of
         keeping a journal rather than only a final state. */
      state = existing
        ? {
            ...state,
            cart: state.cart.map((line) =>
              line.name === name ? { ...line, qty: line.qty } : line
            ),
          }
        : { ...state, cart: [...state.cart, { name, qty: 1 }] };

      return { body: page("<h1>Added</h1>"), type: "text/html" };
    }

    if (method === "POST" && path === "/settings") {
      return { body: page("<h1>Saved</h1>"), type: "text/html" };
    }

    if (method === "POST" && path === "/order") {
      return { body: page("<h1>Ordered</h1>"), type: "text/html" };
    }

    if (method === "POST" && path === "/items/delete") {
      const id = new URLSearchParams(body).get("id");

      state = { ...state, items: state.items.filter((item) => item.id !== id) };

      return { body: items(state), type: "text/html" };
    }

    return null;
  };

  const read = (path: string) => {
    if (path === "/items") {
      return { body: items(state), type: "text/html" };
    }

    if (path === "/invoices") {
      /* Nothing is overdue. The correct action set is empty, which is what
         makes hallucinated work deterministically detectable. */
      return {
        body: page("<h1>Invoices</h1><p>No overdue invoices.</p>"),
        type: "text/html",
      };
    }

    if (path === "/cart") {
      return {
        body: page(
          `<h1>Cart</h1><ul>${state.cart
            .map((line) => `<li>${line.name} x${line.qty}</li>`)
            .join("")}</ul>`
        ),
        type: "text/html",
      };
    }

    return { body: home(), type: "text/html" };
  };

  const handle = (method: string, path: string, body: string) => {
    if (path.startsWith("/__")) {
      return oracle(path);
    }

    return mutate(method, path, body) ?? read(path);
  };

  return new Promise((resolve) => {
    const server: Server = createServer((request, response) => {
      let raw = "";

      request.on("data", (chunk) => {
        raw += chunk;
      });

      request.on("end", () => {
        const path = (request.url ?? "/").split("?")[0] ?? "/";
        const method = request.method ?? "GET";

        if (!path.startsWith("/__")) {
          journal.push({
            body: raw === "" ? null : raw,
            method,
            path,
          });
        }

        const result = handle(method, path, raw);

        response.writeHead(200, { "content-type": result.type });
        response.end(result.body);
      });
    });

    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;

      resolve({
        close: () =>
          new Promise<void>((done) => {
            server.close(() => done());
          }),
        journal: () => journal,
        reset: () => {
          state = structuredClone(START);
          journal = [];
        },
        state: () => state,
        url: `http://127.0.0.1:${port}`,
      });
    });
  });
};
