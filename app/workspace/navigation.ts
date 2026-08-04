/**
 * Return true only for an unmodified primary (left) click.
 * Modifier clicks and non-left buttons must keep native <a>/<Link> behavior
 * (new tab, new window, download managers, etc.).
 */
export function shouldInterceptClientNavigation(
  event: Pick<MouseEvent, "button" | "metaKey" | "ctrlKey" | "shiftKey" | "altKey">,
) {
  return event.button === 0
    && !event.metaKey
    && !event.ctrlKey
    && !event.shiftKey
    && !event.altKey;
}
