import { createContext, useContext, useEffect, useState } from "react";

export const KeyboardHeightContext = createContext(0);

export function KeyboardHeightProvider({ children }) {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (!window.visualViewport) return;
    const update = () => {
      const kbHeight = Math.max(
        0,
        window.innerHeight - window.visualViewport.height - window.visualViewport.offsetTop
      );
      setKeyboardHeight(kbHeight);
      document.documentElement.style.setProperty("--vkb-height", `${kbHeight}px`);
    };
    window.visualViewport.addEventListener("resize", update);
    window.visualViewport.addEventListener("scroll", update);
    return () => {
      window.visualViewport.removeEventListener("resize", update);
      window.visualViewport.removeEventListener("scroll", update);
    };
  }, []);

  return (
    <KeyboardHeightContext.Provider value={keyboardHeight}>
      {children}
    </KeyboardHeightContext.Provider>
  );
}

export function useKeyboardHeight() {
  return useContext(KeyboardHeightContext);
}