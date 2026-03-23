(() => {
  const initAuctionCountdown = (onEnded) => {
    const daysElement = document.getElementById("countdownDays");
    const hoursElement = document.getElementById("countdownHours");
    const minutesElement = document.getElementById("countdownMinutes");
    const secondsElement = document.getElementById("countdownSeconds");

    if (
      !(daysElement instanceof HTMLElement) ||
      !(hoursElement instanceof HTMLElement) ||
      !(minutesElement instanceof HTMLElement) ||
      !(secondsElement instanceof HTMLElement)
    ) {
      return;
    }

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const now = new Date();
    const targetDate = new Date(now.getFullYear(), 2, 27, 13, 0, 0, 0);
    if (targetDate.getTime() <= now.getTime()) {
      targetDate.setFullYear(targetDate.getFullYear() + 1);
    }
    const targetTime = targetDate.getTime();

    const animateTick = (element, nextValue) => {
      if (element.textContent === nextValue) {
        return;
      }

      element.textContent = nextValue;

      if (prefersReducedMotion) {
        return;
      }

      element.classList.remove("auction-countdown__value--tick");
      void element.offsetWidth;
      element.classList.add("auction-countdown__value--tick");
    };

    const formatUnit = (value) => String(value).padStart(2, "0");
    let timerIntervalId = null;

    const renderCountdown = () => {
      const remainingMs = Math.max(targetTime - Date.now(), 0);
      const remainingSeconds = Math.floor(remainingMs / 1000);

      const days = Math.floor(remainingSeconds / 86400);
      const hours = Math.floor((remainingSeconds % 86400) / 3600);
      const minutes = Math.floor((remainingSeconds % 3600) / 60);
      const seconds = remainingSeconds % 60;

      animateTick(daysElement, formatUnit(days));
      animateTick(hoursElement, formatUnit(hours));
      animateTick(minutesElement, formatUnit(minutes));
      animateTick(secondsElement, formatUnit(seconds));

      if (remainingMs <= 0) {
        if (timerIntervalId !== null) {
          window.clearInterval(timerIntervalId);
        }
        if (typeof onEnded === "function") {
          onEnded();
        }
      }
    };

    renderCountdown();
    timerIntervalId = window.setInterval(renderCountdown, 1000);
  };

  const quickBidButtons = Array.from(
    document.querySelectorAll(".auction-bid-panel__quick-bid"),
  ).filter((button) => button instanceof HTMLButtonElement);
  const bidPanel = document.querySelector(".auction-bid-panel");
  const bidActions = document.querySelector(".auction-bid-panel__actions");
  const bidCustom = document.querySelector(".auction-bid-panel__custom");
  const itemCardLink = document.querySelector(".auction-item-card");
  const placeBidButton = document.querySelector(".auction-bid-panel__cta");
  const customBidInput = document.getElementById("customBidAmount");
  const currentBidAmount = document.getElementById("currentBidAmount");
  const currentBidPanel = document.getElementById("currentBidPanel");
  const currentBidLabel = currentBidPanel?.querySelector(".auction-bid-panel__label");
  let bidAmountAnimationFrameId = null;
  let bidAmountHighlightTimeoutId = null;
  let biddingEndedAmount = null;
  let isBiddingClosed = false;
  let hasReceivedFirstBidState = false;
  const currentBidListeners = [];
  const changedAudio = new Audio("/audio/changed.mp3");
  changedAudio.preload = "auto";
  changedAudio.volume = 0.7;

  if (
    quickBidButtons.length === 0 ||
    !(bidPanel instanceof HTMLElement) ||
    !(placeBidButton instanceof HTMLButtonElement) ||
    !(customBidInput instanceof HTMLInputElement) ||
    !(currentBidAmount instanceof HTMLElement) ||
    !(currentBidPanel instanceof HTMLElement) ||
    !(currentBidLabel instanceof HTMLElement)
  ) {
    return;
  }

  const formatCurrency = (value) =>
    new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
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

  const closeBidding = () => {
    if (isBiddingClosed) {
      return;
    }

    isBiddingClosed = true;

    if (bidActions instanceof HTMLElement) {
      bidActions.remove();
    }

    if (bidCustom instanceof HTMLElement) {
      bidCustom.remove();
    }

    if (placeBidButton instanceof HTMLButtonElement) {
      placeBidButton.remove();
    }

    const endedBlock = document.createElement("div");
    endedBlock.className = "auction-bid-panel__ended";
    endedBlock.innerHTML = "<p class=\"auction-bid-panel__ended-title\">Bidding has ended</p>";
    bidPanel.appendChild(endedBlock);

    biddingEndedAmount = endedBlock.querySelector("#biddingEndedAmount");
    if (biddingEndedAmount instanceof HTMLElement) {
      biddingEndedAmount.textContent = currentBidAmount.textContent || "€ 0";
    }
  };

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
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

  const setHighestBidderIndicator = (isCurrentHighestBidder) => {
    const isLeading = Boolean(isCurrentHighestBidder);

    currentBidPanel.classList.toggle(
      "auction-bid-panel__current--leading",
      isLeading,
    );

    currentBidLabel.textContent = isLeading
      ? "Current highest bid (You)"
      : "Current highest bid";
  };

  const notifyCurrentBidChanged = (value) => {
    for (const listener of currentBidListeners) {
      try {
        listener(value);
      } catch (error) {
        // Ignore listener errors to keep updates flowing for other listeners.
      }
    }
  };

  const animateCurrentBidAmount = (fromValue, toValue) => {
    if (bidAmountAnimationFrameId !== null) {
      window.cancelAnimationFrame(bidAmountAnimationFrameId);
      bidAmountAnimationFrameId = null;
    }

    if (prefersReducedMotion || toValue <= fromValue) {
      currentBidAmount.textContent = formatCurrency(toValue);
      notifyCurrentBidChanged(toValue);
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
      const value = Math.round(
        fromValue + (toValue - fromValue) * easedProgress,
      );

      currentBidAmount.textContent = formatCurrency(value);

      if (progress < 1) {
        bidAmountAnimationFrameId = window.requestAnimationFrame(step);
        return;
      }

      currentBidAmount.textContent = formatCurrency(toValue);
      bidAmountAnimationFrameId = null;
      notifyCurrentBidChanged(toValue);
    };

    bidAmountAnimationFrameId = window.requestAnimationFrame(step);
  };

  const getSelectedButton = () =>
    quickBidButtons.find(
      (button) => button.getAttribute("aria-pressed") === "true",
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

  const getCurrentBidValue = () =>
    parseCurrency(currentBidAmount.textContent || "");

  const syncPlaceBidButton = () => {
    if (isBiddingClosed) {
      placeBidButton.disabled = true;
      return;
    }

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
      notifyCurrentBidChanged(value);
    },
    highlightCurrentBidAmount,
    animateCurrentBidAmount,
    setHighestBidderIndicator,
    clearBidControls,
    cancelBidAnimations,
    subscribeToCurrentBid: (listener) => {
      if (typeof listener !== "function") {
        return () => {};
      }

      currentBidListeners.push(listener);
      return () => {
        const index = currentBidListeners.indexOf(listener);
        if (index >= 0) {
          currentBidListeners.splice(index, 1);
        }
      };
    },
  };

  const applyIncomingHighestBid = (nextValue) => {
    if (!Number.isFinite(nextValue) || nextValue <= 0) {
      return;
    }

    const currentValue = getCurrentBidValue();
    const shouldPlayChangeSound = hasReceivedFirstBidState;

    if (!hasReceivedFirstBidState) {
      hasReceivedFirstBidState = true;
    }

    if (nextValue === currentValue) {
      return;
    }

    if (shouldPlayChangeSound) {
      const bidModal = document.getElementById("bidConfirmModal");
      const isBidModalOpen = bidModal instanceof HTMLElement && !bidModal.hidden;

      if (!isBidModalOpen) {
        changedAudio.currentTime = 0;
        void changedAudio.play().catch(() => {
          // Ignore autoplay rejections when browser blocks non-user-gesture playback.
        });
      }
    }

    highlightCurrentBidAmount();
    animateCurrentBidAmount(currentValue, nextValue);

    if (biddingEndedAmount instanceof HTMLElement) {
      biddingEndedAmount.textContent = formatCurrency(nextValue);
    }
  };

  const startBidStream = () => {
    const pollCurrentBidState = async () => {
      try {
        const response = await fetch("/api/bids/current", {
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          return;
        }

        const payload = await response.json();
        const value = typeof payload?.currentHighestBid === "number"
          ? payload.currentHighestBid
          : Number(payload?.currentHighestBid);
        applyIncomingHighestBid(value);
        setHighestBidderIndicator(Boolean(payload?.isCurrentHighestBidder));
      } catch (error) {
        // Ignore transient poll failures.
      }
    };

    if (!("EventSource" in window)) {
      void pollCurrentBidState();
      window.setInterval(() => {
        void pollCurrentBidState();
      }, 2500);
      return;
    }

    const eventSource = new EventSource("/api/bids/stream");

    eventSource.addEventListener("highestBid", (event) => {
      try {
        const payload = JSON.parse(event.data);
        const value = typeof payload?.currentHighestBid === "number"
          ? payload.currentHighestBid
          : Number(payload?.currentHighestBid);
        applyIncomingHighestBid(value);
        setHighestBidderIndicator(Boolean(payload?.isCurrentHighestBidder));
      } catch (error) {
        // Ignore malformed stream events.
      }
    });

    eventSource.onerror = () => {
      // Let EventSource handle reconnect automatically.
    };

    void pollCurrentBidState();
  };

  setSelectedButton(null);
  setCustomBidInvalidState(false);
  initAuctionCountdown(closeBidding);
  startBidStream();
})();
