import { createContext, useContext } from "react";

/**
 * What a signed-out visitor was trying to do, said back to them: "save this
 * site", "save this collection".
 */
export type AskSignIn = (subject?: string) => void;

/**
 * The dialog itself lives in components/SignInPrompt; this half is here so a
 * page can call it without importing the component and breaking fast refresh.
 */
export const SignInPromptContext = createContext<AskSignIn>(() => {});

/**
 * Ask for a sign-in from anywhere: `const ask = useSignInPrompt(); … ask("save
 * this site")`. Anything that only works with an account should use this
 * instead of its own link, so the same popup explains all of them.
 */
export function useSignInPrompt(): AskSignIn {
  return useContext(SignInPromptContext);
}
