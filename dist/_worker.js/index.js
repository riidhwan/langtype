globalThis.__nitro_main__ = import.meta.url;
import { d as defineLazyEventHandler, H as H3Core, a as HTTPError, t as toRequest } from "./_libs/h3.mjs";
import { a as FastResponse } from "./_libs/srvx.mjs";
import "./_libs/rou3.mjs";
function lazyService(loader) {
  let promise, mod;
  return {
    fetch(req) {
      if (mod) {
        return mod.fetch(req);
      }
      if (!promise) {
        promise = loader().then((_mod) => mod = _mod.default || _mod);
      }
      return promise.then((mod2) => mod2.fetch(req));
    }
  };
}
const services = {
  ["ssr"]: lazyService(() => import("./_ssr/index.mjs"))
};
globalThis.__nitro_vite_envs__ = services;
const errorHandler$1 = (error, event) => {
  const res = defaultHandler(error, event);
  return new FastResponse(typeof res.body === "string" ? res.body : JSON.stringify(res.body, null, 2), res);
};
function defaultHandler(error, event, opts) {
  const isSensitive = error.unhandled;
  const status = error.status || 500;
  const url = event.url || new URL(event.req.url);
  if (status === 404) {
    const baseURL = "/";
    if (/^\/[^/]/.test(baseURL) && !url.pathname.startsWith(baseURL)) {
      const redirectTo = `${baseURL}${url.pathname.slice(1)}${url.search}`;
      return {
        status: 302,
        statusText: "Found",
        headers: { location: redirectTo },
        body: `Redirecting...`
      };
    }
  }
  if (isSensitive && !opts?.silent) {
    const tags = [error.unhandled && "[unhandled]"].filter(Boolean).join(" ");
    console.error(`[request error] ${tags} [${event.req.method}] ${url}
`, error);
  }
  const headers2 = {
    "content-type": "application/json",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "no-referrer",
    "content-security-policy": "script-src 'none'; frame-ancestors 'none';"
  };
  if (status === 404 || !event.res.headers.has("cache-control")) {
    headers2["cache-control"] = "no-cache";
  }
  const body = {
    error: true,
    url: url.href,
    status,
    statusText: error.statusText,
    message: isSensitive ? "Server Error" : error.message,
    data: isSensitive ? void 0 : error.data
  };
  return {
    status,
    statusText: error.statusText,
    headers: headers2,
    body
  };
}
const errorHandlers = [errorHandler$1];
async function errorHandler(error, event) {
  for (const handler of errorHandlers) {
    try {
      const response = await handler(error, event, { defaultHandler });
      if (response) {
        return response;
      }
    } catch (error2) {
      console.error(error2);
    }
  }
}
const headers = ((m) => function headersRouteRule(event) {
  for (const [key, value] of Object.entries(m.options || {})) {
    event.res.headers.set(key, value);
  }
});
const findRouteRules = /* @__PURE__ */ (() => {
  const $0 = [{ name: "headers", route: "/assets/**", handler: headers, options: { "cache-control": "public, max-age=31536000, immutable" } }];
  return (m, p) => {
    let r = [];
    if (p.charCodeAt(p.length - 1) === 47) p = p.slice(0, -1) || "/";
    let s = p.split("/");
    s.length - 1;
    if (s[1] === "assets") {
      r.unshift({ data: $0, params: { "_": s.slice(2).join("/") } });
    }
    return r;
  };
})();
const _lazy_pGDIJm = defineLazyEventHandler(() => Promise.resolve().then(function() {
  return ssrRenderer$1;
}));
const findRoute = /* @__PURE__ */ (() => {
  const data = { route: "/**", handler: _lazy_pGDIJm };
  return ((_m, p) => {
    return { data, params: { "_": p.slice(1) } };
  });
})();
const APP_ID = "default";
function useNitroApp() {
  let instance = useNitroApp._instance;
  if (instance) {
    return instance;
  }
  instance = useNitroApp._instance = createNitroApp();
  globalThis.__nitro__ = globalThis.__nitro__ || {};
  globalThis.__nitro__[APP_ID] = instance;
  return instance;
}
function createNitroApp() {
  const hooks = void 0;
  const captureError = (error, errorCtx) => {
    if (errorCtx?.event) {
      const errors = errorCtx.event.req.context?.nitro?.errors;
      if (errors) {
        errors.push({
          error,
          context: errorCtx
        });
      }
    }
  };
  const h3App = createH3App({ onError(error, event) {
    return errorHandler(error, event);
  } });
  let appHandler = (req) => {
    req.context ||= {};
    req.context.nitro = req.context.nitro || { errors: [] };
    return h3App.fetch(req);
  };
  const app = {
    fetch: appHandler,
    h3: h3App,
    hooks,
    captureError
  };
  return app;
}
function createH3App(config) {
  const h3App = new H3Core(config);
  h3App["~findRoute"] = (event) => findRoute(event.req.method, event.url.pathname);
  {
    h3App["~getMiddleware"] = (event, route) => {
      const pathname = event.url.pathname;
      const method = event.req.method;
      const middleware = [];
      {
        const routeRules = getRouteRules(method, pathname);
        event.context.routeRules = routeRules?.routeRules;
        if (routeRules?.routeRuleMiddleware.length) {
          middleware.push(...routeRules.routeRuleMiddleware);
        }
      }
      if (route?.data?.middleware?.length) {
        middleware.push(...route.data.middleware);
      }
      return middleware;
    };
  }
  return h3App;
}
function getRouteRules(method, pathname) {
  const m = findRouteRules(method, pathname);
  if (!m?.length) {
    return { routeRuleMiddleware: [] };
  }
  const routeRules = {};
  for (const layer of m) {
    for (const rule of layer.data) {
      const currentRule = routeRules[rule.name];
      if (currentRule) {
        if (rule.options === false) {
          delete routeRules[rule.name];
          continue;
        }
        if (typeof currentRule.options === "object" && typeof rule.options === "object") {
          currentRule.options = {
            ...currentRule.options,
            ...rule.options
          };
        } else {
          currentRule.options = rule.options;
        }
        currentRule.route = rule.route;
        currentRule.params = {
          ...currentRule.params,
          ...layer.params
        };
      } else if (rule.options !== false) {
        routeRules[rule.name] = {
          ...rule,
          params: layer.params
        };
      }
    }
  }
  const middleware = [];
  for (const rule of Object.values(routeRules)) {
    if (rule.options === false || !rule.handler) {
      continue;
    }
    middleware.push(rule.handler(rule));
  }
  return {
    routeRules,
    routeRuleMiddleware: middleware
  };
}
const assets = {
  "/file.svg": {
    "type": "image/svg+xml",
    "etag": '"187-+zgO7/6H1QtZc4NmTAKYKWTQ0ow"',
    "mtime": "2026-01-25T15:57:03.344Z",
    "size": 391,
    "path": "../file.svg"
  },
  "/globe.svg": {
    "type": "image/svg+xml",
    "etag": '"40b-LrojsBpGczu4Qj5tOOv19+lavsU"',
    "mtime": "2026-01-25T15:57:03.344Z",
    "size": 1035,
    "path": "../globe.svg"
  },
  "/next.svg": {
    "type": "image/svg+xml",
    "etag": '"55f-Pz6VYiYSuYnFvWoDKZowjG88fms"',
    "mtime": "2026-01-25T15:57:03.344Z",
    "size": 1375,
    "path": "../next.svg"
  },
  "/vercel.svg": {
    "type": "image/svg+xml",
    "etag": '"80-zruIUtWMiIa+PpBRomlX9Cu4Lxo"',
    "mtime": "2026-01-25T15:57:03.344Z",
    "size": 128,
    "path": "../vercel.svg"
  },
  "/window.svg": {
    "type": "image/svg+xml",
    "etag": '"181-VMSODapsqjF/4bTEGQB/2T6Ujbk"',
    "mtime": "2026-01-25T15:57:03.344Z",
    "size": 385,
    "path": "../window.svg"
  },
  "/assets/collections._id-DEvsIsfd.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": '"733e-EYevV2Q0xiJNJrPzLxIeOl0ZWLU"',
    "mtime": "2026-01-25T15:57:03.547Z",
    "size": 29502,
    "path": "../assets/collections._id-DEvsIsfd.js"
  },
  "/assets/globals-DHPgPcup.css": {
    "type": "text/css; charset=utf-8",
    "etag": '"343f-Fb85SvKKjk8QI0cOEoD/oKX4/tA"',
    "mtime": "2026-01-25T15:57:03.547Z",
    "size": 13375,
    "path": "../assets/globals-DHPgPcup.css"
  },
  "/assets/index-CKM57X84.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": '"414-n3mGzWIX+Ahljnba1rdi7+D6L+c"',
    "mtime": "2026-01-25T15:57:03.547Z",
    "size": 1044,
    "path": "../assets/index-CKM57X84.js"
  },
  "/assets/main-BWkafnua.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": '"4f5ec-OcgPtc77Z0GWyn2l9VLnTqTgw0U"',
    "mtime": "2026-01-25T15:57:03.547Z",
    "size": 325100,
    "path": "../assets/main-BWkafnua.js"
  }
};
const publicAssetBases = {};
function isPublicAssetURL(id = "") {
  if (assets[id]) {
    return true;
  }
  for (const base in publicAssetBases) {
    if (id.startsWith(base)) {
      return true;
    }
  }
  return false;
}
function augmentReq(cfReq, ctx) {
  const req = cfReq;
  req.ip = cfReq.headers.get("cf-connecting-ip") || void 0;
  req.runtime ??= { name: "cloudflare" };
  req.runtime.cloudflare = {
    ...req.runtime.cloudflare,
    ...ctx
  };
  req.waitUntil = ctx.context?.waitUntil.bind(ctx.context);
}
const nitroApp = useNitroApp();
const cloudflarePages = {
  async fetch(cfReq, env, context) {
    augmentReq(cfReq, {
      env,
      context
    });
    const url = new URL(cfReq.url);
    if (env.ASSETS && isPublicAssetURL(url.pathname)) {
      return env.ASSETS.fetch(cfReq);
    }
    return nitroApp.fetch(cfReq);
  },
  scheduled(event, env, context) {
  }
};
function fetchViteEnv(viteEnvName, input, init) {
  const envs = globalThis.__nitro_vite_envs__ || {};
  const viteEnv = envs[viteEnvName];
  if (!viteEnv) {
    throw HTTPError.status(404);
  }
  return Promise.resolve(viteEnv.fetch(toRequest(input, init)));
}
function ssrRenderer({ req }) {
  return fetchViteEnv("ssr", req);
}
const ssrRenderer$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: ssrRenderer
}, Symbol.toStringTag, { value: "Module" }));
export {
  cloudflarePages as default
};
