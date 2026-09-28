import { useSyncExternalStore } from "react";
import { getState, subscribe, type PersistState } from "./storage";

/** 订阅盲品训练的全局持久化状态。 */
export function useBlindStore(): PersistState {
  return useSyncExternalStore(subscribe, getState, getState);
}
