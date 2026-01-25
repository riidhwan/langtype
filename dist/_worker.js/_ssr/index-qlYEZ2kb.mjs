import { j as jsxRuntimeExports } from "../_chunks/_libs/react.mjs";
import { L as Link } from "../_chunks/_libs/@tanstack/react-router.mjs";
import { R as Route$1 } from "./router-DU9EaVdG.mjs";
import "node:process";
import "../_libs/tiny-warning.mjs";
import "../_chunks/_libs/@tanstack/router-core.mjs";
import "../_libs/cookie-es.mjs";
import "../_chunks/_libs/@tanstack/history.mjs";
import "../_libs/tiny-invariant.mjs";
import "../_libs/seroval.mjs";
import "../_libs/unenv.mjs";
import "../_libs/seroval-plugins.mjs";
import "node:stream/web";
import "node:stream";
import "../_libs/react-dom.mjs";
import "../_libs/isbot.mjs";
function Home() {
  const collections = Route$1.useLoaderData();
  return /* @__PURE__ */ jsxRuntimeExports.jsx("main", { className: "flex min-h-screen flex-col items-center justify-center p-4 md:p-24 bg-background", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-full max-w-4xl", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "text-center mb-12", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-4xl font-bold tracking-tight mb-4", children: "LangType" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xl text-muted-foreground", children: "Select a collection to start practicing." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6", children: collections.map((collection) => /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/collections/$id", params: {
      id: collection.id
    }, className: "block group", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border rounded-lg p-6 h-full transition-all hover:border-primary hover:shadow-md bg-card", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold mb-2 group-hover:text-primary transition-colors", children: collection.title }),
      collection.description && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-muted-foreground", children: collection.description })
    ] }) }, collection.id)) })
  ] }) });
}
export {
  Home as component
};
