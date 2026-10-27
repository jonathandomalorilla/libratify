export const pageHead = (title: string, description: string) => () => ({
  meta: [
    { title: `${title} — Libratify` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} — Libratify` },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ],
});
