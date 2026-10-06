import { useRef, useState } from "react";
import type { ButtonState } from "./stateful-button";

type Action = "publish" | "draft" | "delete";

export function useWriterFeedback() {
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState<{
    action: Action;
    state: ButtonState;
  } | null>(null);

  function start(action?: Action) {
    if (busyRef.current) return false;
    busyRef.current = true;
    setBusy(true);
    setMessage("");
    setFeedback(action ? { action, state: "loading" } : null);
    return true;
  }
  function finish() {
    busyRef.current = false;
    setBusy(false);
  }
  async function showSuccess(action: Action) {
    setFeedback({ action, state: "success" });
    await new Promise((resolve) => setTimeout(resolve, 450));
  }
  function buttonState(action: Action): ButtonState {
    return feedback?.action === action ? feedback.state : "idle";
  }

  return {
    busy,
    message,
    setMessage,
    setFeedback,
    start,
    finish,
    showSuccess,
    buttonState,
  };
}
