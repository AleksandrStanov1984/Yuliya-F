(async () => {
  try {
    const response = await fetch("data/business.json");

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const business = await response.json();

    const phone = document.getElementById("contact-phone");
    const phoneText = document.getElementById("phone-text");

    const email = document.getElementById("contact-email");
    const emailText = document.getElementById("email-text");

    const address = document.getElementById("contact-address");
    const addressLine1 = document.getElementById("address-line-1");
    const addressLine2 = document.getElementById("address-line-2");

    const copyright = document.getElementById("copyright");

    const phoneHref = business.phone.replace(/[^\d+]/g, "");

    phone.href = `tel:${phoneHref}`;
    phoneText.textContent = business.phone;

    email.href = `mailto:${business.email}`;
    emailText.textContent = business.email;

    const fullAddress = [
      business.street,
      business.postalCode,
      business.city,
      business.country
    ].filter(Boolean).join(", ");

    address.href =
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;

    addressLine1.textContent =
      `${business.postalCode} ${business.city}`;

    addressLine2.textContent =
      business.street;

    copyright.textContent =
      `© ${new Date().getFullYear()} ${business.studio}. Alle Rechte vorbehalten.`;

  } catch (error) {
    console.error("Business data could not be loaded:", error);
  }
})();
