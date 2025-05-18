// src/components/TiptapEditor/extensions/CustomImage.ts
import { Image as BaseImage } from "@tiptap/extension-image";

const CustomImage = BaseImage.extend({
  name: "customImage",

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) => element.getAttribute("src"),
        renderHTML: (attributes) => {
          return {
            src: attributes.src,
          };
        },
      },
      alt: {
        default: null,
        parseHTML: (element) => element.getAttribute("alt"),
        renderHTML: (attributes) => {
          return {
            alt: attributes.alt,
          };
        },
      },
      title: {
        default: null,
        parseHTML: (element) => element.getAttribute("title"),
        renderHTML: (attributes) => {
          return {
            title: attributes.title,
          };
        },
      },
    };
  },
});

export default CustomImage;
