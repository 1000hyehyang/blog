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
        <div className={styles.toolbar} aria-hidden="true">
          {Array.from({ length: 13 }, (_, index) => (
            <Bone key={index} width="2.15rem" height="2.25rem" />
          ))}
        </div>
      </WriterHeader>
      <div className={styles.canvas} aria-hidden="true">
        <div className={styles.composition}>
          <div className={styles.category}>
            <Bone height="2.75rem" />
          </div>
          <div className={styles.titleField}>
            <Bone width="75%" height="3.75rem" />
          </div>
          <EditorBodySkeleton />
          <div className={styles.tags}>
            <Bone width="8rem" height="2.75rem" />
          </div>
        </div>
      </div>
      <footer className={styles.bottomBar}>
        <Bone width="8rem" />
        <div className={styles.bottomActions} aria-hidden="true">
          <Bone width="7rem" height="3rem" />
          <Bone width="7rem" height="3rem" />
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
