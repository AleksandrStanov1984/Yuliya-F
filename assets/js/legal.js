'use strict';

document.addEventListener('DOMContentLoaded', async () => {
  const root = document.getElementById('legal-content');

  if (!root) {
    return;
  }

  try {
    const [businessResponse, legalResponse] = await Promise.all([
      fetch('data/business.json'),
      fetch('data/impressum.json')
    ]);

    if (!businessResponse.ok || !legalResponse.ok) {
      throw new Error('Legal data could not be loaded.');
    }

    const business = await businessResponse.json();
    const legal = await legalResponse.json();
    const sections = legal.sections || {};

    const escapeHtml = (value = '') =>
      String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');

    const value = (data) =>
      data === null || data === undefined ? '' : escapeHtml(data);

    const field = (label, data, className = '') => `
      <div class="legal-field ${className}">
        <span class="legal-field__label">${escapeHtml(label)}</span>
        <span class="legal-field__value">${value(data)}</span>
      </div>
    `;

    const section = (id, title, body) => `
      <section class="legal-section" id="${id}">
        <h2>${escapeHtml(title)}</h2>
        <div class="legal-section__body">
          ${body}
        </div>
      </section>
    `;

    const paragraph = (text) =>
      text ? `<p>${escapeHtml(text)}</p>` : '';

    const paragraphs = (items = []) =>
      items.map(paragraph).join('');

    const addressText = [
      business.street,
      [business.postalCode, business.city].filter(Boolean).join(' '),
      business.country
    ].filter(Boolean).join(', ');

    const mapsUrl = addressText
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressText)}`
      : '';

    const phoneHref = business.phone
      ? `tel:${String(business.phone).replace(/[^\d+]/g, '')}`
      : '';

    const emailHref = business.email
      ? `mailto:${business.email}`
      : '';

    const instagramHref = business.instagram || '';

    root.innerHTML = [

      section(
        'anbieter',
        sections.anbieter?.title || 'Angaben gemäß § 5 DDG',
        `
          ${field('Inhaberin', business.owner)}
          ${field('Unternehmen', business.studio)}
          ${field('Rechtsform', business.legalForm)}
        `
      ),

      section(
        'anschrift',
        sections.anschrift?.title || 'Anschrift',
        `
          <div class="legal-contact-row">
            <span class="legal-contact-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M12 21s7-6.1 7-12A7 7 0 1 0 5 9c0 5.9 7 12 7 12Z"/>
                <circle cx="12" cy="9" r="2.3"/>
              </svg>
            </span>

            ${
              mapsUrl
                ? `<a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" class="legal-contact-link">
                    ${value(business.street)}<br>
                    ${value(business.postalCode)} ${value(business.city)}<br>
                    ${value(business.country)}
                   </a>`
                : `<span class="legal-contact-link legal-contact-link--empty"></span>`
            }
          </div>
        `
      ),

      section(
        'kontakt',
        sections.kontakt?.title || 'Kontakt',
        `
          ${field(
            'Telefon',
            business.phone
              ? `<a href="${phoneHref}">${value(business.phone)}</a>`
              : '',
            'legal-field--html'
          )}

          ${field(
            'E-Mail',
            business.email
              ? `<a href="${emailHref}">${value(business.email)}</a>`
              : '',
            'legal-field--html'
          )}
        `
      ),

      section(
        'instagram',
        sections.instagram?.title || 'Instagram',
        `
          ${field(
            'Instagram-Account',
            instagramHref
              ? `<a href="${escapeHtml(instagramHref)}" target="_blank" rel="noopener noreferrer">${escapeHtml(instagramHref)}</a>`
              : '',
            'legal-field--html'
          )}
          <p>Dieses Impressum gilt auch für den Instagram-Account.</p>
        `
      ),

      section(
        'beruf',
        sections.beruf?.title || 'Berufsbezeichnung und berufsrechtliche Regelungen',
        `
          ${field('Berufsbezeichnung', business.profession)}
          ${field('Verliehen in', sections.beruf?.awardedIn)}
          ${paragraph(sections.beruf?.regulation)}
        `
      ),

      section(
        'aufsicht',
        sections.aufsicht?.title || 'Zuständige Aufsichtsbehörde',
        `
          ${field('Behörde', sections.aufsicht?.name)}
          ${field('Abteilung', sections.aufsicht?.department)}
          ${field('Straße', sections.aufsicht?.street)}
          ${field(
            'Ort',
            [sections.aufsicht?.postalCode, sections.aufsicht?.city]
              .filter(Boolean)
              .join(' ')
          )}
        `
      ),

      section(
        'umsatzsteuer',
        sections.umsatzsteuer?.title || 'Umsatzsteuer-ID / Steuerliche Hinweise',
        `
          ${field('USt-IdNr.', business.vatId)}
          ${
            business.smallBusiness
              ? paragraph(sections.umsatzsteuer?.smallBusinessText)
              : ''
          }
        `
      ),

      section(
        'versicherung',
        sections.versicherung?.title || 'Berufshaftpflichtversicherung',
        `
          ${field('Versicherer', business.liabilityInsurance?.provider)}
          ${field('Anschrift', business.liabilityInsurance?.address)}
          ${field('Geltungsbereich', business.liabilityInsurance?.coverage)}
        `
      ),

      section(
        'streitbeilegung',
        sections.streitbeilegung?.title || 'Verbraucherstreitbeilegung / Universalschlichtungsstelle',
        paragraph(sections.streitbeilegung?.text)
      ),

      section(
        'haftung-inhalte',
        sections.haftungInhalte?.title || 'Haftung für Inhalte',
        paragraphs(sections.haftungInhalte?.paragraphs)
      ),

      section(
        'haftung-links',
        sections.haftungLinks?.title || 'Haftung für Links',
        paragraphs(sections.haftungLinks?.paragraphs)
      ),

      section(
        'urheberrecht',
        sections.urheberrecht?.title || 'Urheberrecht',
        `
          ${paragraphs(sections.urheberrecht?.paragraphs)}
          <p class="legal-updated">Stand: ${value(legal.updated)}</p>
        `
      )

    ].join('');

    /*
     * Fields intentionally stay visible even when their value is empty.
     * This lets missing business data be added later only in business.json.
     */
    root.querySelectorAll('.legal-field--html .legal-field__value')
      .forEach((element) => {
        const raw = element.textContent;
        if (!raw.trim()) {
          return;
        }

        const parent = element.closest('.legal-field');

        if (!parent) {
          return;
        }
      });

    /*
     * Restore trusted links generated above.
     * field() escapes regular values, so clickable contact fields are
     * handled separately here.
     */
    const contactSection = root.querySelector('#kontakt .legal-section__body');

    if (contactSection) {
      contactSection.innerHTML = `
        <div class="legal-field">
          <span class="legal-field__label">Telefon</span>
          <span class="legal-field__value">
            ${business.phone ? `<a href="${phoneHref}">${value(business.phone)}</a>` : ''}
          </span>
        </div>

        <div class="legal-field">
          <span class="legal-field__label">E-Mail</span>
          <span class="legal-field__value">
            ${business.email ? `<a href="${emailHref}">${value(business.email)}</a>` : ''}
          </span>
        </div>
      `;
    }

    const instagramSection = root.querySelector('#instagram .legal-section__body');

    if (instagramSection) {
      instagramSection.innerHTML = `
        <div class="legal-field">
          <span class="legal-field__label">Instagram-Account</span>
          <span class="legal-field__value">
            ${
              instagramHref
                ? `<a href="${escapeHtml(instagramHref)}" target="_blank" rel="noopener noreferrer">${escapeHtml(instagramHref)}</a>`
                : ''
            }
          </span>
        </div>

        <p>Dieses Impressum gilt auch für den Instagram-Account.</p>
      `;
    }

  } catch (error) {
    console.error(error);

    root.innerHTML = `
      <div class="legal-error">
        Die rechtlichen Informationen konnten nicht geladen werden.
      </div>
    `;
  }
});
