(function (root) {
  const timers = new WeakMap();
  const ICONS = {
    success: "✓",
    error: "✕",
    warning: "⚠"
  };

  function resolveTarget(target) {
    return typeof target === "string" ? document.getElementById(target) : target;
  }

  function clear(target) {
    const element = resolveTarget(target);
    if (!element) return;
    const timer = timers.get(element);
    if (timer) window.clearTimeout(timer);
    timers.delete(element);
    element.hidden = true;
    element.textContent = "";
    element.removeAttribute("data-feedback-type");
  }

  function show(target, message, type = "success", options = {}) {
    const element = resolveTarget(target);
    if (!element) return false;
    const normalizedType = Object.prototype.hasOwnProperty.call(ICONS, type) ? type : "success";
    const previousTimer = timers.get(element);
    if (previousTimer) window.clearTimeout(previousTimer);

    element.className = `action-feedback action-feedback--${normalizedType}`;
    element.dataset.feedbackType = normalizedType;
    const icon = document.createElement("span");
    icon.className = "action-feedback__icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = ICONS[normalizedType];
    const text = document.createElement("span");
    text.textContent = String(message || "");
    element.replaceChildren(icon, text);
    element.hidden = false;

    const duration = options.duration ?? (normalizedType === "success" ? 5000 : 0);
    if (duration > 0) {
      timers.set(element, window.setTimeout(() => clear(element), duration));
    } else {
      timers.delete(element);
    }
    return true;
  }

  root.ActionFeedback = { show, clear };
})(window);
