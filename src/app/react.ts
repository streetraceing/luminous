import type * as ReactRuntime from "react";

export type ReactRef<T> = ReactRuntime.MutableRefObject<T>;

export function getReact(): typeof ReactRuntime {
  return Spicetify.React as typeof ReactRuntime;
}

export function useEffect(): typeof ReactRuntime.useEffect {
  return getReact().useEffect;
}

export function useMemo(): typeof ReactRuntime.useMemo {
  return getReact().useMemo;
}

export function useRef(): typeof ReactRuntime.useRef {
  return getReact().useRef;
}

export function useState(): typeof ReactRuntime.useState {
  return getReact().useState;
}
