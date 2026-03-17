(() => {
	const backLink = document.querySelector(".auction-item-detail__back-link");
	if (!(backLink instanceof HTMLAnchorElement)) {
		return;
	}

	const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	const transitionDurationMs = prefersReducedMotion ? 0 : 180;
	let isNavigating = false;

	backLink.addEventListener("click", (event) => {
		if (
			event.defaultPrevented ||
			event.button !== 0 ||
			event.metaKey ||
			event.ctrlKey ||
			event.shiftKey ||
			event.altKey ||
			backLink.target === "_blank" ||
			isNavigating
		) {
			return;
		}

		event.preventDefault();
		isNavigating = true;
		document.body.classList.add("auction-item--navigating");

		window.setTimeout(() => {
			window.location.href = backLink.href;
		}, transitionDurationMs);
	});
})();
