import { Children, isValidElement, type ReactNode } from "react";

export function getReactNodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (isValidElement<{ children?: ReactNode }>(node)) {
    return getReactNodeText(node.props.children);
  }

  return Children.toArray(node).map(getReactNodeText).join("");
}
