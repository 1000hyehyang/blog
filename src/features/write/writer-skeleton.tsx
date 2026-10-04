import { WriterHeader } from "./writer-header";
import { siteConfig } from "@/config/site";
import styles from "./writer.module.css";

function Bone({
  width = "100%",
  height = "1rem",
}: {
  width?: string;
  height?: string;
}) {
  return <span className={styles.skeleton} style={{ width, height }} />;
}
export function EditorBodySkeleton() {
  return (
    <div
      className={styles.editorPlaceholder}
      aria-label="본문 편집기 불러오는 중"
    >
      <div className={styles.skeletonLines} aria-hidden="true">
        <Bone width="90%" />
        <Bone width="72%" />
        <Bone width="82%" />
      </div>
    </div>
  );
}
export function WriteSkeleton() {
  return (
    <div
      className={styles.writer}
      aria-busy="true"
      aria-label="글쓰기 화면 불러오는 중"
    >
      <WriterHeader>
        <div className={styles.toolbar} aria-hidden="true" inert>
          <button
            type="button"
            className={`${styles.skeleton} ${styles.skeletonControl}`}
            disabled
          />
          <span className={styles.fontLabel}>기본 서체</span>
          <span className={styles.separator} />
          {Array.from({ length: 11 }, (_, index) => (
            <button
              key={index}
              type="button"
              className={`${styles.skeleton} ${styles.skeletonControl}`}
              disabled
            />
          ))}
        </div>
      </WriterHeader>
      <div className={styles.canvas} aria-hidden="true" inert>
        <div className={styles.composition}>
          <div className={styles.categorySelectors}>
            <button
              type="button"
              className={`${styles.selectTrigger} ${styles.skeleton} ${styles.skeletonControl}`}
              disabled
            >
              {siteConfig.navigation[0].label}
            </button>
          </div>
          <label className={styles.titleField}>
            <textarea
              className={`${styles.skeleton} ${styles.skeletonControl}`}
              style={{ width: "75%" }}
              rows={1}
              placeholder=" "
              value=""
              readOnly
              tabIndex={-1}
            />
          </label>
          <div className={styles.editor}>
            <EditorBodySkeleton />
          </div>
          <div className={styles.tags}>
            <input
              className={`${styles.skeleton} ${styles.skeletonControl}`}
              style={{ maxWidth: "8rem" }}
              value=""
              readOnly
              tabIndex={-1}
            />
          </div>
        </div>
      </div>
      <footer className={styles.bottomBar}>
        <div className={styles.bottomActions} aria-hidden="true" inert>
          {["임시 저장", "완료"].map((label) => (
            <button
              key={label}
              type="button"
              className={`${styles.skeleton} ${styles.skeletonControl}`}
              disabled
            >
              {label}
            </button>
          ))}
        </div>
      </footer>
    </div>
  );
}
export function ManageSkeleton() {
  return (
    <div
      className={styles.writer}
      aria-busy="true"
      aria-label="글 관리 불러오는 중"
    >
      <WriterHeader />
      <section className={styles.management} aria-hidden="true">
        <div className={styles.managementHeading}>
          <Bone width="9rem" height="2.6rem" />
          <Bone width="8rem" height="2.75rem" />
        </div>
        <div className={styles.managementFilters}>
          <div className={styles.managementTabs}>
            <Bone width="10rem" height="2.75rem" />
          </div>
          <Bone width="9rem" height="2.75rem" />
          <Bone width="6rem" height="2.75rem" />
        </div>
        <ul className={styles.postList}>
          {Array.from({ length: 6 }, (_, index) => (
            <li key={index}>
              <div className={styles.postSummary} style={{ width: "75%" }}>
                <div className={styles.postMeta}>
                  <Bone width="12rem" />
                </div>
                <Bone width="90%" height="1.6rem" />
              </div>
              <Bone width="5.5rem" height="2.5rem" />
            </li>
          ))}
        </ul>
        <div className={styles.pagination}>
          <Bone width="8rem" height="2.75rem" />
        </div>
      </section>
    </div>
  );
}
export function LoginSkeleton() {
  return (
    <div
      className={`${styles.writer} ${styles.loginPage}`}
      aria-busy="true"
      aria-label="로그인 불러오는 중"
    >
      <div className={styles.login}>
        <h1 className={styles.loginBrand}>
          {siteConfig.shortName} <span>STUDIO</span>
        </h1>
        <div
          style={{ marginTop: "2rem" }}
          className={styles.otpSlots}
          aria-hidden="true"
        >
          {Array.from({ length: 7 }, (_, index) => (
            <span className={styles.skeleton} key={index} />
          ))}
        </div>
        <div className={styles.loginStatus} />
      </div>
    </div>
  );
}
