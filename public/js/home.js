(() => {
	const quickBidButtons = Array.from(
		document.querySelectorAll(".auction-bid-panel__quick-bid")
	).filter((button) => button instanceof HTMLButtonElement);
	const itemCardLink = document.querySelector(".auction-item-card");
	const placeBidButton = document.querySelector(".auction-bid-panel__cta");
	const customBidInput = document.getElementById("customBidAmount");
	const currentBidAmount = document.getElementById("currentBidAmount");
	let bidAmountAnimationFrameId = null;
	let bidAmountHighlightTimeoutId = null;

	if (
		quickBidButtons.length === 0 ||
		!(placeBidButton instanceof HTMLButtonElement) ||
		!(customBidInput instanceof HTMLInputElement) ||
		!(currentBidAmount instanceof HTMLElement)
	) {
		return;
	}

	const formatCurrency = (value) => new Intl.NumberFormat("nl-NL", {
		style: "currency",
		currency: "EUR",
		maximumFractionDigits: 0
	}).format(value);

	const minimumCustomBid = 10;
	let isNavigatingToItem = false;

	const parseCurrency = (value) => {
		const digits = value.replace(/[^\d]/g, "");
		return digits ? Number.parseInt(digits, 10) : 0;
	};

	const setCustomBidInvalidState = (invalid) => {
		customBidInput.setAttribute("aria-invalid", invalid ? "true" : "false");
	};

	const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	const pageTransitionDurationMs = prefersReducedMotion ? 0 : 180;

	const highlightCurrentBidAmount = () => {
		if (bidAmountHighlightTimeoutId !== null) {
			window.clearTimeout(bidAmountHighlightTimeoutId);
			bidAmountHighlightTimeoutId = null;
		}

		currentBidAmount.classList.remove("auction-bid-panel__amount--updating");
		void currentBidAmount.offsetWidth;
		currentBidAmount.classList.add("auction-bid-panel__amount--updating");

		bidAmountHighlightTimeoutId = window.setTimeout(() => {
			currentBidAmount.classList.remove("auction-bid-panel__amount--updating");
			bidAmountHighlightTimeoutId = null;
		}, 1300);
	};

	const animateCurrentBidAmount = (fromValue, toValue) => {
		if (bidAmountAnimationFrameId !== null) {
			window.cancelAnimationFrame(bidAmountAnimationFrameId);
			bidAmountAnimationFrameId = null;
		}

		if (prefersReducedMotion || toValue <= fromValue) {
			currentBidAmount.textContent = formatCurrency(toValue);
			return;
		}

		const durationMs = 850;
		let startTime = null;

		const step = (timestamp) => {
			if (startTime === null) {
				startTime = timestamp;
			}

			const elapsed = timestamp - startTime;
			const progress = Math.min(elapsed / durationMs, 1);
			const easedProgress = 1 - Math.pow(1 - progress, 3);
			const value = Math.round(fromValue + (toValue - fromValue) * easedProgress);

			currentBidAmount.textContent = formatCurrency(value);

			if (progress < 1) {
				bidAmountAnimationFrameId = window.requestAnimationFrame(step);
				return;
			}

			currentBidAmount.textContent = formatCurrency(toValue);
			bidAmountAnimationFrameId = null;
		};

		bidAmountAnimationFrameId = window.requestAnimationFrame(step);
	};

	const getSelectedButton = () => quickBidButtons.find(
		(button) => button.getAttribute("aria-pressed") === "true"
	) || null;

	const getCustomIncrement = () => {
		const rawValue = customBidInput.value.trim();
		if (!rawValue) {
			setCustomBidInvalidState(false);
			return 0;
		}

		const parsedValue = Number.parseInt(rawValue, 10);
		if (Number.isNaN(parsedValue) || parsedValue < minimumCustomBid) {
			setCustomBidInvalidState(true);
			return 0;
		}

		setCustomBidInvalidState(false);
		return parsedValue;
	};

	const getActiveIncrement = () => {
		const selectedButton = getSelectedButton();
		if (selectedButton) {
			const value = selectedButton.dataset.bidValue;
			return value ? Number.parseInt(value, 10) : 0;
		}

		return getCustomIncrement();
	};

	const getCurrentBidValue = () => parseCurrency(currentBidAmount.textContent || "");

	const syncPlaceBidButton = () => {
		placeBidButton.disabled = getActiveIncrement() <= 0;
	};

	const setSelectedButton = (selectedButton) => {
		for (const button of quickBidButtons) {
			const isSelected = button === selectedButton;
			button.setAttribute("aria-pressed", isSelected ? "true" : "false");
		}

		syncPlaceBidButton();
	};

	for (const button of quickBidButtons) {
		button.addEventListener("click", () => {
			const isSelected = button.getAttribute("aria-pressed") === "true";
			customBidInput.value = "";
			setCustomBidInvalidState(false);
			setSelectedButton(isSelected ? null : button);
		});
	}

	if (itemCardLink instanceof HTMLAnchorElement) {
		itemCardLink.addEventListener("click", (event) => {
			if (
				event.defaultPrevented ||
				event.button !== 0 ||
				event.metaKey ||
				event.ctrlKey ||
				event.shiftKey ||
				event.altKey ||
				itemCardLink.target === "_blank" ||
				isNavigatingToItem
			) {
				return;
			}

			event.preventDefault();
			isNavigatingToItem = true;
			document.body.classList.add("auction-home--navigating");

			window.setTimeout(() => {
				window.location.href = itemCardLink.href;
			}, pageTransitionDurationMs);
		});
	}

	customBidInput.addEventListener("input", () => {
		setSelectedButton(null);
		syncPlaceBidButton();
	});

	const clearBidControls = () => {
		setSelectedButton(null);
		customBidInput.value = "";
		setCustomBidInvalidState(false);
		syncPlaceBidButton();
	};

	const cancelBidAnimations = () => {
		if (bidAmountHighlightTimeoutId !== null) {
			window.clearTimeout(bidAmountHighlightTimeoutId);
			bidAmountHighlightTimeoutId = null;
		}

		if (bidAmountAnimationFrameId !== null) {
			window.cancelAnimationFrame(bidAmountAnimationFrameId);
			bidAmountAnimationFrameId = null;
		}
	};

	window.homeBidPage = {
		placeBidButton,
		formatCurrency,
		getActiveIncrement,
		getCurrentBidValue,
		setCurrentBidValue: (value) => {
			currentBidAmount.textContent = formatCurrency(value);
		},
		highlightCurrentBidAmount,
		animateCurrentBidAmount,
		clearBidControls,
		cancelBidAnimations
	};

	setSelectedButton(null);
	setCustomBidInvalidState(false);
})();