import { describe, expect, it } from "vitest";

import { createExcerpt, resolveExcerpt } from "./content/excerpt";
import { formatDate, toBodyHeadingLevel, toSlug } from "./content";

describe("게시글 콘텐츠 유틸리티", () => {
  it("Markdown 문법을 제외한 요약을 생성한다", () => {
    expect(createExcerpt("## 제목\n[링크](https://example.com) **내용**")).toBe(
      "제목 링크 내용",
    );
  });

  it("이스케이프된 물결표를 보여 주고 기존 글의 잘못된 요약도 바로잡는다", () => {
    const body = "첫 문장 \\~ 물결과 ~~삭제~~ 내용";
    const expected = "첫 문장 ~ 물결과 삭제 내용";
    expect(createExcerpt(body)).toBe(expected);
    expect(resolveExcerpt("첫 문장 \\ 물결과 삭제 내용", body, "")).toBe(
      expected,
    );
    expect(resolveExcerpt("직접 쓴 요약", body, "")).toBe("직접 쓴 요약");
  });

  it("일반 문장 기호와 이스케이프 문자를 보존한다", () => {
    const body = "C# front-end x_y 2*3 \\*별표\\* \\#해시 \\~물결";
    expect(createExcerpt(body)).toBe("C# front-end x_y 2*3 *별표* #해시 ~물결");
    expect(
      resolveExcerpt("C front end x y 2 3 \\ 별표\\ \\ 해시 \\ 물결", body, ""),
    ).toBe("C# front-end x_y 2*3 *별표* #해시 ~물결");
  });

  it("목록과 표의 글자를 읽고 코드 블록과 이미지는 제외한다", () => {
    expect(
      createExcerpt(
        "- 첫 항목\n- 둘째 항목\n\n| 열 A | 열 B |\n| --- | --- |\n| 값 1 | 값 2 |\n\n~~~js\nconst hidden = 1\n~~~\n\n![사진](https://example.com/a.png)",
      ),
    ).toBe("첫 항목 둘째 항목 열 A 열 B 값 1 값 2");
  });

  it("밑줄 표기만 제거하고 C++와 이스케이프된 기호 및 코드 내용은 보존한다", () => {
    expect(
      createExcerpt("++밑줄++ C++ \\+\\+그대로\\+\\+ `++code++` ++**강조**++"),
    ).toBe("밑줄 C++ ++그대로++ ++code++ 강조");
  });

  it("요약 길이 제한에서 이모지를 잘라 깨뜨리지 않는다", () => {
    expect(createExcerpt("a👩‍💻b", 2)).toBe("a👩‍💻…");
  });

  it("HTML 엔티티를 화면에 보이는 문자로 바꾼다", () => {
    expect(createExcerpt("A &amp; B &copy; &#169; &nbsp;끝")).toBe(
      "A & B © © 끝",
    );
    expect(createExcerpt("`&copy;` 그대로")).toBe("&copy; 그대로");
  });

  it("카테고리 이름을 URL slug로 변환한다", () => {
    expect(toSlug("Web Development")).toBe("web-development");
  });

  it("본문 헤딩을 페이지 제목보다 한 단계 낮춰 렌더링한다", () => {
    expect(toBodyHeadingLevel(1)).toBe(2);
    expect(toBodyHeadingLevel(3)).toBe(4);
    expect(toBodyHeadingLevel(6)).toBe(6);
  });

  it("날짜를 Asia/Seoul 기준으로 표현한다", () => {
    expect(formatDate("2026-07-22T00:00:00Z", "en-US")).toBe("Jul 22, 2026");
    expect(formatDate("2026-07-22T15:00:00Z", "en-US")).toBe("Jul 23, 2026");
  });
});
