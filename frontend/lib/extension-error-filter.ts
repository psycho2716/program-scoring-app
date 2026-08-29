/** Inline script run before React hydrates to ignore browser extension crashes in dev. */
export const extensionErrorFilterScript = `
(function () {
  function isExtensionSource(source) {
    return typeof source === "string" && source.indexOf("chrome-extension://") === 0;
  }

  function isExtensionStack(value) {
    return typeof value === "string" && value.indexOf("chrome-extension://") !== -1;
  }

  window.addEventListener(
    "error",
    function (event) {
      var fromExtension =
        isExtensionSource(event.filename) ||
        isExtensionStack(event.error && event.error.stack);

      if (fromExtension) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return false;
      }
    },
    true
  );

  window.addEventListener(
    "unhandledrejection",
    function (event) {
      var reason = event.reason;
      var stack = reason && reason.stack ? String(reason.stack) : "";

      if (isExtensionStack(stack)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true
  );
})();
`.trim();
