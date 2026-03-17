(() => {
  const homeBidPage = window.homeBidPage;
  if (!homeBidPage) {
    return;
  }

  const bidConfirmModal = document.getElementById("bidConfirmModal");
  const bidModalSurface = bidConfirmModal?.querySelector(".bid-modal__surface");
  const confirmContent = bidConfirmModal?.querySelector(
    ".bid-modal__content--confirm",
  );
  const loadingContent = bidConfirmModal?.querySelector(
    ".bid-modal__content--loading",
  );
  const successContent = bidConfirmModal?.querySelector(
    ".bid-modal__content--success",
  );
  const modalCurrentPrice = document.getElementById("modalCurrentPrice");
  const modalBidIncrement = document.getElementById("modalBidIncrement");
  const modalNewTotal = document.getElementById("modalNewTotal");
  const confirmBidButton = document.getElementById("confirmBidButton");
  const closeBidButton = bidConfirmModal?.querySelector("[data-bid-close]");
  const successAudio = new Audio("/audio/success.mp3");
  successAudio.preload = "auto";

  if (
    !(bidConfirmModal instanceof HTMLElement) ||
    !(bidModalSurface instanceof HTMLElement) ||
    !(confirmContent instanceof HTMLElement) ||
    !(loadingContent instanceof HTMLElement) ||
    !(successContent instanceof HTMLElement) ||
    !(modalCurrentPrice instanceof HTMLElement) ||
    !(modalBidIncrement instanceof HTMLElement) ||
    !(modalNewTotal instanceof HTMLElement) ||
    !(confirmBidButton instanceof HTMLButtonElement) ||
    !(closeBidButton instanceof HTMLButtonElement)
  ) {
    return;
  }

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const modalFadeDurationMs = prefersReducedMotion ? 0 : 220;
  let lastFocusedElement = null;
  let bidAcceptedTimeoutId = null;
  let bidLoadingTimeoutId = null;
  let bidModalFadeTimeoutId = null;
  let lockedScrollY = 0;

  const lockPageScroll = () => {
    lockedScrollY = window.scrollY;
    document.body.classList.add("auction-home--modal-open");
    document.body.style.top = `-${lockedScrollY}px`;
  };

  const unlockPageScroll = () => {
    document.body.classList.remove("auction-home--modal-open");
    document.body.style.top = "";
    window.scrollTo(0, lockedScrollY);
  };

  const isLockedModalState = () => {
    const state = bidModalSurface.dataset.bidModalState;
    return state === "loading" || state === "success";
  };

  const resetModalState = () => {
    if (bidModalFadeTimeoutId !== null) {
      window.clearTimeout(bidModalFadeTimeoutId);
      bidModalFadeTimeoutId = null;
    }

    if (bidLoadingTimeoutId !== null) {
      window.clearTimeout(bidLoadingTimeoutId);
      bidLoadingTimeoutId = null;
    }

    if (bidAcceptedTimeoutId !== null) {
      window.clearTimeout(bidAcceptedTimeoutId);
      bidAcceptedTimeoutId = null;
    }

    homeBidPage.cancelBidAnimations();

    bidModalSurface.dataset.bidModalState = "confirm";
    confirmContent.hidden = false;
    loadingContent.hidden = true;
    successContent.hidden = true;
    closeBidButton.disabled = false;
    confirmBidButton.disabled = false;
  };

  const updateModalSummary = () => {
    const currentValue = homeBidPage.getCurrentBidValue();
    const incrementValue = homeBidPage.getActiveIncrement();
    const newTotal = currentValue + incrementValue;

    modalCurrentPrice.textContent = homeBidPage.formatCurrency(currentValue);
    modalBidIncrement.textContent = homeBidPage.formatCurrency(incrementValue);
    modalNewTotal.textContent = homeBidPage.formatCurrency(newTotal);
  };

  const closeModal = () => {
    if (bidConfirmModal.hidden) {
      return;
    }

    if (modalFadeDurationMs === 0) {
      resetModalState();
      bidConfirmModal.hidden = true;
      unlockPageScroll();

      if (lastFocusedElement instanceof HTMLElement) {
        lastFocusedElement.focus();
      }

      return;
    }

    bidConfirmModal.classList.add("bid-modal--closing");
    bidModalFadeTimeoutId = window.setTimeout(() => {
      bidConfirmModal.classList.remove("bid-modal--closing");
      resetModalState();
      bidConfirmModal.hidden = true;
      unlockPageScroll();

      if (lastFocusedElement instanceof HTMLElement) {
        lastFocusedElement.focus();
      }

      bidModalFadeTimeoutId = null;
    }, modalFadeDurationMs);
  };

  const openModal = () => {
    if (homeBidPage.getActiveIncrement() <= 0) {
      return;
    }

    if (bidModalFadeTimeoutId !== null) {
      window.clearTimeout(bidModalFadeTimeoutId);
      bidModalFadeTimeoutId = null;
    }

    bidConfirmModal.classList.remove("bid-modal--closing");
    updateModalSummary();
    resetModalState();
    lastFocusedElement = document.activeElement;
    bidConfirmModal.hidden = false;
    lockPageScroll();
    confirmBidButton.focus();
  };

  homeBidPage.placeBidButton.addEventListener("click", () => {
    openModal();
  });

  closeBidButton.addEventListener("click", () => {
    if (isLockedModalState()) {
      return;
    }

    closeModal();
  });

  bidConfirmModal.addEventListener("click", (event) => {
    if (event.target === bidConfirmModal && !isLockedModalState()) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      !bidConfirmModal.hidden &&
      !isLockedModalState()
    ) {
      closeModal();
    }
  });

  confirmBidButton.addEventListener("click", () => {
    const currentValue = homeBidPage.getCurrentBidValue();
    const incrementValue = homeBidPage.getActiveIncrement();

    if (!incrementValue) {
      closeModal();
      return;
    }

    const newTotalValue = currentValue + incrementValue;
    homeBidPage.clearBidControls();
    bidModalSurface.dataset.bidModalState = "loading";
    confirmContent.hidden = true;
    loadingContent.hidden = false;
    successContent.hidden = true;
    closeBidButton.disabled = true;
    confirmBidButton.disabled = true;

    bidLoadingTimeoutId = window.setTimeout(() => {
      homeBidPage.highlightCurrentBidAmount();
      homeBidPage.animateCurrentBidAmount(currentValue, newTotalValue);
      bidModalSurface.dataset.bidModalState = "success";
      loadingContent.hidden = true;
      successContent.hidden = false;
      successAudio.currentTime = 0;
      void successAudio.play().catch(() => {
        // Ignore autoplay rejections when browser blocks non-user-gesture playback.
      });

      bidAcceptedTimeoutId = window.setTimeout(() => {
        closeModal();
      }, 2300);
    }, 2000);
  });
})();
