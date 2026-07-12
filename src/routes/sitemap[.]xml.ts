import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { URDU_LETTERS } from "@/lib/urdu";

const BASE_URL = "";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const routes = [
          { path: "/", priority: "1.0", changefreq: "weekly" },
          { path: "/browse", priority: "0.9", changefreq: "weekly" },
          { path: "/search", priority: "0.7", changefreq: "monthly" },
          { path: "/play", priority: "0.9", changefreq: "weekly" },
          ...URDU_LETTERS.flatMap(l => [
            { path: `/letter/start/${l}`, priority: "0.6", changefreq: "weekly" },
            { path: `/letter/end/${l}`, priority: "0.6", changefreq: "weekly" },
          ]),
        ];
        const body = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...routes.map(r =>
            `  <url><loc>${BASE_URL}${r.path}</loc><changefreq>${r.changefreq}</changefreq><priority>${r.priority}</priority></url>`),
          `</urlset>`,
        ].join("\n");
        return new Response(body, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
