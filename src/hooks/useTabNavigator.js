/**
 * @deprecated
 * Functionality moved to lib/NavigationManager.jsx (NavigationManagerProvider).
 * All exports are re-exported from the unified module for backward compat.
 */
export {
  useTabNavigator,
  resolveTabForPath,
  getLastTabPath,
  pushTabPath,
  popTabPath,
  resetTabStack,
  TAB_ROOTS,
} from "@/lib/NavigationManager";