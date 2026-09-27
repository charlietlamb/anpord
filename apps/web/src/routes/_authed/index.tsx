import { createFileRoute } from "@tanstack/react-router";
import { preloadable } from "@/lib/preloadable";
import { ssrModulePreloads } from "@/lib/ssr-module-preloads";

const HomePage = preloadable(() =>
  import("@/components/home/home-page").then((module) => module.HomePage)
);

export const Route = createFileRoute("/_authed/")({
  ssr: false,
  loader: async ({ context }) => {
    if (context.authenticated) {
      await HomePage.preload();
    }
  },
  head: ({ match }) => ({
    links: match.context.authenticated
      ? ssrModulePreloads("src/components/home/home-page.tsx")
      : [],
  }),
  component: Home,
  staticData: { title: "Home" },
});

function Home() {
  return <HomePage.Component />;
}
