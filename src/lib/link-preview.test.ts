import { describe, expect, it } from "vitest";

import {
  getLinkPreviewImagePath,
  isBlockedHostname,
  isNonPublicIpAddress,
  parseExternalHttpUrl,
  parseLinkPreviewHtml,
} from "./link-preview";

describe("link preview image path", () => {
  it("encodes the source page URL as a same-origin request", () => {
    expect(
      getLinkPreviewImagePath("https://example.com/article?id=1&lang=ko"),
    ).toBe(
      "/api/link-preview-image?url=https%3A%2F%2Fexample.com%2Farticle%3Fid%3D1%26lang%3Dko",
    );
  });
});

describe("외부 링크 URL 검증", () => {
  it("공개 HTTP와 HTTPS URL만 허용한다", () => {
    expect(parseExternalHttpUrl("https://example.com/docs")?.href).toBe(
      "https://example.com/docs",
    );
    expect(parseExternalHttpUrl("http://example.com")?.href).toBe(
      "http://example.com/",
    );

    expect(parseExternalHttpUrl("/posts")).toBeNull();
    expect(parseExternalHttpUrl("javascript:alert(1)")).toBeNull();
    expect(parseExternalHttpUrl("https://user:secret@example.com")).toBeNull();
    expect(parseExternalHttpUrl("https://example.com:8080")).toBeNull();
    expect(parseExternalHttpUrl("https://example.com:80")).toBeNull();
  });

  it("로컬 호스트와 비공개·예약 IP 주소를 차단한다", () => {
    expect(isBlockedHostname("localhost")).toBe(true);
    expect(isBlockedHostname("api.service.internal")).toBe(true);
    expect(isBlockedHostname("example.com")).toBe(false);

    expect(isNonPublicIpAddress("127.0.0.1")).toBe(true);
    expect(isNonPublicIpAddress("10.0.0.1")).toBe(true);
    expect(isNonPublicIpAddress("169.254.169.254")).toBe(true);
    expect(isNonPublicIpAddress("192.168.0.1")).toBe(true);
    expect(isNonPublicIpAddress("::1")).toBe(true);
    expect(isNonPublicIpAddress("fc00::1")).toBe(true);
    expect(isNonPublicIpAddress("2001:db8::1")).toBe(true);
    expect(isNonPublicIpAddress("8.8.8.8")).toBe(false);
    expect(isNonPublicIpAddress("2606:4700:4700::1111")).toBe(false);

    expect(parseExternalHttpUrl("http://127.0.0.1/admin")).toBeNull();
    expect(parseExternalHttpUrl("http://[::1]/admin")).toBeNull();
  });
});

describe("링크 미리보기 HTML 파싱", () => {
  it("Open Graph 메타데이터와 상대 asset URL을 정규화한다", () => {
    const html = `
      <html>
        <head>
          <meta content="Example &amp; Blog" property="og:site_name">
          <meta content="노션형 &quot;북마크&quot; 카드" property="og:title">
          <meta name="description" content="  링크   설명입니다.  ">
          <meta property="og:image" content="/images/cover.png">
          <link href="/favicon.ico" rel="shortcut icon">
          <title>fallback title</title>
        </head>
      </html>
    `;

    expect(
      parseLinkPreviewHtml(html, new URL("https://example.com/articles/1")),
    ).toEqual({
      title: '노션형 "북마크" 카드',
      description: "링크 설명입니다.",
      image: "https://example.com/images/cover.png",
      icon: "https://example.com/favicon.ico",
      siteName: "Example & Blog",
    });
  });

  it("OG 제목이 없으면 title 태그를 사용하고 위험한 asset URL은 버린다", () => {
    const html = `
      <title>  Example <b>Title</b>  </title>
      <meta property="og:image" content="http://127.0.0.1/private.png">
      <link rel="icon" href="javascript:alert(1)">
    `;

    expect(parseLinkPreviewHtml(html, new URL("https://example.com"))).toEqual({
      title: "Example Title",
      description: undefined,
      image: undefined,
      icon: undefined,
      siteName: undefined,
    });
  });
});

describe("link preview image metadata", () => {
  it("prefers Open Graph images and skips unsafe image candidates", () => {
    const html = `
      <meta name="twitter:image" content="https://cdn.example.com/twitter.png">
      <meta property="og:image:secure_url" content="http://127.0.0.1/private.png">
      <meta property="og:image" content="/preferred.png">
    `;

    expect(
      parseLinkPreviewHtml(html, new URL("https://example.com/article")),
    ).toMatchObject({ image: "https://example.com/preferred.png" });
  });

  it("uses image_src and itemprop metadata as fallbacks", () => {
    const linkedImage = parseLinkPreviewHtml(
      '<link rel="image_src" href="/linked.png">',
      new URL("https://example.com/article"),
    );
    const itempropImage = parseLinkPreviewHtml(
      '<meta itemprop="image" content="/itemprop.png">',
      new URL("https://example.com/article"),
    );

    expect(linkedImage.image).toBe("https://example.com/linked.png");
    expect(itempropImage.image).toBe("https://example.com/itemprop.png");
  });
});

describe("link preview description fallback", () => {
  it("uses the first meaningful paragraph when description metadata is absent", () => {
    const html = `
      <html>
        <body>
          <p>Short</p>
          <p>For caching declaration, Spring&#8217;s caching abstraction provides annotations.</p>
        </body>
      </html>
    `;

    expect(
      parseLinkPreviewHtml(html, new URL("https://example.com/docs")),
    ).toMatchObject({
      description:
        "For caching declaration, Spring’s caching abstraction provides annotations.",
    });
  });
});
