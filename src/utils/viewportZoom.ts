import { Platform } from 'react-native';

const DEFAULT_VIEWPORT = 'width=device-width, initial-scale=1, shrink-to-fit=no';
const LOCKED_VIEWPORT =
  'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, shrink-to-fit=no';

/**
 * Prevents mobile browsers (especially iOS Safari) from pinch/input zoom while a
 * full-screen overlay such as chat is open. Restores the prior viewport on cleanup.
 */
export function lockViewportZoom(): () => void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return () => {};
  }

  const meta = document.querySelector('meta[name="viewport"]');
  if (meta === null) {
    return () => {};
  }

  const previous = meta.getAttribute('content');
  meta.setAttribute('content', LOCKED_VIEWPORT);

  // If the page was already zoomed (e.g. from a prior input focus), reset scroll
  // position so fixed chrome (header, input bar) aligns with the layout viewport.
  window.scrollTo(0, 0);

  return () => {
    meta.setAttribute('content', previous ?? DEFAULT_VIEWPORT);
    window.scrollTo(0, 0);
  };
}
