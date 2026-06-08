import { Platform } from 'react-native';

const DEFAULT_VIEWPORT = 'width=device-width, initial-scale=1, shrink-to-fit=no';
const LOCKED_VIEWPORT =
  'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, shrink-to-fit=no';

function getViewportMeta(): HTMLMetaElement | null {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return null;
  }
  return document.querySelector('meta[name="viewport"]');
}

/**
 * Prevents mobile browsers (especially iOS Safari) from pinch/input zoom while a
 * full-screen overlay such as chat is open. Restores the prior viewport on cleanup.
 */
export function lockViewportZoom(): () => void {
  const meta = getViewportMeta();
  if (meta === null) {
    return () => {};
  }

  const previous = meta.getAttribute('content');
  meta.setAttribute('content', LOCKED_VIEWPORT);
  window.scrollTo(0, 0);

  return () => {
    meta.setAttribute('content', previous ?? DEFAULT_VIEWPORT);
    window.scrollTo(0, 0);
  };
}

/**
 * Call in a TextInput's onFocus handler (web only).
 *
 * iOS Safari zooms in on the visual viewport when a text input is focused,
 * even when `maximum-scale=1` is set, because it briefly resets the scale to
 * fit the element. Temporarily removing and re-setting `maximum-scale=1` right
 * as focus lands forces the browser to recompute at 1×. We also `scrollTo(0,0)`
 * to undo any offset introduced by the zoom.
 */
export function preventInputZoomOnFocus(): void {
  const meta = getViewportMeta();
  if (meta === null) return;
  // Briefly remove maximum-scale restriction then immediately re-add it.
  // This kicks the browser's zoom-to-fit logic and resets the visual viewport.
  meta.setAttribute(
    'content',
    'width=device-width, initial-scale=1, shrink-to-fit=no',
  );
  requestAnimationFrame(() => {
    meta.setAttribute('content', LOCKED_VIEWPORT);
    window.scrollTo(0, 0);
  });
}

/**
 * Call in a TextInput's onBlur handler (web only).
 *
 * After the on-screen keyboard hides, the visual viewport may remain offset.
 * A short delay gives the keyboard-hide animation time to finish before we
 * reset the scroll position.
 */
export function resetScrollOnBlur(): void {
  const meta = getViewportMeta();
  if (meta === null) return;
  setTimeout(() => {
    meta.setAttribute('content', LOCKED_VIEWPORT);
    window.scrollTo(0, 0);
  }, 100);
}
