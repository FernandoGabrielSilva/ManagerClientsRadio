/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: "https://rayssemanager.vercel.app",
  generateRobotsTxt: true,
  sitemapSize: 5000,
  exclude: [
    "/dashboard",
    "/dashboard/*",
    "/calendar",
    "/calendar/*",
    "/clients",
    "/clients/*",
    "/contracts",
    "/contracts/*",
    "/settings",
    "/settings/*",
    "/admin",
    "/admin/*",
    "/login",
    "/register",
    "/api/*",
  ],
  robotsTxtOptions: {
    policies: [
      { userAgent: "*", allow: "/", disallow: ["/api/", "/dashboard", "/settings"] },
    ],
  },
};