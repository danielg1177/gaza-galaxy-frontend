/**
 * Web-compatible replacements for React Native's Alert.alert.
 *
 * React Native Web maps Alert.alert to window.confirm/window.alert, but the
 * button onPress callbacks are not reliably fired across all browsers.
 * These utilities use the browser APIs directly.
 */

/** Show an informational message. Equivalent to a single-button Alert. */
export function showAlert(title: string, message?: string): void {
  window.alert(message ? `${title}\n\n${message}` : title);
}

/**
 * Show a confirmation dialog. Calls onConfirm only if the user clicks OK.
 * Equivalent to a two-button Alert with a cancel and a destructive button.
 */
export function showConfirm(
  title: string,
  message: string,
  onConfirm: () => void,
): void {
  if (window.confirm(`${title}\n\n${message}`)) {
    onConfirm();
  }
}
