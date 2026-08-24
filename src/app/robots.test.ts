import { describe, expect, it } from "vitest";

import robots from "./robots";

describe("robots", () => {
  it("allows the public link preview image endpoint", () => {
    expect(robots().rules).toEqual({
      userAgent: "*",
      allow: ["/", "/api/link-preview-image"],
      disallow: "/api/",
    });
  });

  it("publishes a sitemap URL without a duplicate slash", () => {
    expect(robots().sitemap).toBe("http://localhost:3000/sitemap.xml");
  });
});
