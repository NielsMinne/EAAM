(() => {
	const readCookie = (name) => {
		const target = `${name}=`;
		const parts = document.cookie ? document.cookie.split("; ") : [];

		for (const part of parts) {
			if (part.startsWith(target)) {
				return part.substring(target.length);
			}
		}

		return null;
	};

	const getRegistrationFromCookie = () => {
		try {
			const raw = readCookie("eaamRegistration");
			if (!raw) {
				return null;
			}

			const parsed = JSON.parse(decodeURIComponent(raw));
			if (!parsed || !parsed.firstName || !parsed.lastName || !parsed.email) {
				return null;
			}

			return parsed;
		} catch (error) {
			return null;
		}
	};

	if (getRegistrationFromCookie()) {
		window.location.replace("/home");
		return;
	}

	const form = document.getElementById("registerForm");
	const errorEl = document.getElementById("registerError");

	if (!(form instanceof HTMLFormElement) || !(errorEl instanceof HTMLElement)) {
		return;
	}

	const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

	const setFieldError = (input, message) => {
		input.setAttribute("aria-invalid", "true");
		errorEl.textContent = message;
		input.focus();
	};

	const clearFieldErrors = (inputs) => {
		for (const input of inputs) {
			input.removeAttribute("aria-invalid");
		}
		errorEl.textContent = "";
	};

	form.addEventListener("submit", (event) => {
		event.preventDefault();

		const firstNameInput = document.getElementById("firstName");
		const lastNameInput = document.getElementById("lastName");
		const emailInput = document.getElementById("email");

		if (
			!(firstNameInput instanceof HTMLInputElement) ||
			!(lastNameInput instanceof HTMLInputElement) ||
			!(emailInput instanceof HTMLInputElement)
		) {
			return;
		}

		const firstName = firstNameInput.value.trim();
		const lastName = lastNameInput.value.trim();
		const email = emailInput.value.trim();
		const inputs = [firstNameInput, lastNameInput, emailInput];

		clearFieldErrors(inputs);

		if (!firstName) {
			setFieldError(firstNameInput, "Please enter your first name.");
			return;
		}

		if (!lastName) {
			setFieldError(lastNameInput, "Please enter your last name.");
			return;
		}

		if (!email) {
			setFieldError(emailInput, "Please enter your email address.");
			return;
		}

		if (!isValidEmail(email)) {
			setFieldError(emailInput, "Please enter a valid email address (e.g. name@example.com).");
			return;
		}

		const payload = {
			firstName,
			lastName,
			email,
			createdAt: new Date().toISOString()
		};

		document.cookie =
			"eaamRegistration=" + encodeURIComponent(JSON.stringify(payload)) +
			"; max-age=172800; path=/; SameSite=Lax";

		window.location.href = "/home";
	});
})();
