import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: [
      "src/components/image-group.tsx",
      "src/components/image-viewer.tsx",
      "src/components/markdown.tsx",
      "src/features/post/link-preview-favicon.tsx",
      "src/features/post/link-preview-image.tsx",
      "src/features/write/image-editor.tsx",
      "src/features/write/image-layout-dialog.tsx",
      "src/features/write/writer-controls.tsx",
    ],
    rules: { "@next/next/no-img-element": "off" },
  },
  { rules: { "no-empty": ["error", { allowEmptyCatch: true }] } },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
