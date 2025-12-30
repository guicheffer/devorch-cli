---
domain: localization
description: Localization and internationalization patterns using useT9n hook, translation JSON files, and locale management
---

# Localization and Internationalization

Manage translations and locale-specific content using the useT9n hook from @/libs/translation with namespace-based translation keys and organized JSON translation files.

## Core Patterns

### 1. useT9n Hook for Translations

**Pattern:** All translations use the `useT9n` hook from `@/libs/translation`. Translation keys follow a namespace.key pattern for organization.

**Example from PR #60776:**
```typescript
import { useT9n } from '@/libs/translation';

const FirstBoxTotalSection: React.FC = () => {
  const { translate } = useT9n('order-summary-drawer');

  return (
    <Box>
      <Text>{translate('order-summary-drawer.promotions.title')}</Text>
      <Text>{translate('order-summary-drawer.first-box-total')}</Text>
      <Text>{translate('order-summary-drawer.shipping.free')}</Text>
    </Box>
  );
};
```

**Example with interpolation:**
```typescript
import { useT9n } from '@/libs/translation';

const VoucherSection: React.FC<{ savings: number }> = ({ savings }) => {
  const { translate } = useT9n('checkout');

  // Translation key: "checkout.voucher.savings-amount"
  // Translation value: "You save {{amount}}"
  return (
    <Text>
      {translate('checkout.voucher.savings-amount', { amount: `$${savings}` })}
    </Text>
  );
};
```

**Example with pluralization:**
```typescript
import { useT9n } from '@/libs/translation';

const ItemCount: React.FC<{ count: number }> = ({ count }) => {
  const { translate } = useT9n('cart');

  // Translation keys:
  // "cart.items.count_one": "{{count}} item"
  // "cart.items.count_other": "{{count}} items"
  return (
    <Text>
      {translate('cart.items.count', { count })}
    </Text>
  );
};
```

**Frequency:** 100% of translated content

**Why:** The useT9n hook provides:
- Type-safe translation key access
- Namespace organization to prevent key collisions
- Interpolation support for dynamic content
- Pluralization rules per locale
- Lazy loading of translation bundles

### 2. Translation JSON Files by Brand and Locale

**Pattern:** Translation files are organized in a hierarchical structure: `app/translations/{brand}/{locale}.json`. Automated sync PRs update translation files from a central translation management system.

**Directory Structure:**
```
app/
  translations/
    yourcompany/
      en-US.json
      en-GB.json
      en-AU.json
      de-DE.json
      de-AT.json
      de-CH.json
      fr-FR.json
      nl-NL.json
      es-ES.json
    goodchop/
      en-US.json
    greenchef/
      en-US.json
      de-DE.json
```

**Example JSON structure from PR #60755:**
```json
{
  "order-summary-drawer": {
    "promotions": {
      "title": "Promotions applied",
      "voucher-discount": "Voucher discount",
      "first-box-discount": "First box discount",
      "free-addon-subtitle": "Free with your first box"
    },
    "first-box-total": "First box total",
    "shipping": {
      "free": "Free shipping",
      "standard": "Standard shipping"
    }
  },
  "checkout": {
    "voucher": {
      "savings-amount": "You save {{amount}}",
      "apply": "Apply voucher",
      "applied": "Voucher applied",
      "error": "Invalid voucher code"
    }
  },
  "cart": {
    "items": {
      "count_one": "{{count}} item",
      "count_other": "{{count}} items"
    }
  }
}
```

**Example automated sync PR #60755:**
```
Title: [L10N-2] T9n sync for yourcompany with synced groups update
Files changed:
  - app/translations/yourcompany/en-US.json
  - app/translations/yourcompany/de-DE.json
  - app/translations/yourcompany/fr-FR.json
  - app/translations/yourcompany/nl-NL.json

Changes: Updated translation keys across all locales from central translation management system
```

**Frequency:** 95% of translation files follow this structure

**Key Points:**
- Translation files are synced automatically via PRs
- Never manually edit production translation files
- All translations managed centrally in translation management system
- Namespace structure in JSON matches useT9n namespace parameter
- Keys use kebab-case naming

### 3. Locale Hooks for Current Locale

**Pattern:** Components access the current locale using `useSelectedLocale()` or `useLocale()` hooks from `@/libs/locale`.

**Example from PR #60716:**
```typescript
import { useSelectedLocale } from '@/libs/locale';

const RecipeDetailPage: React.FC = () => {
  const locale = useSelectedLocale(); // Returns: 'en-US', 'de-DE', etc.

  // Use locale for API requests
  const { data: recipes } = useQuery(
    ['recipes', locale],
    () => fetchRecipes(locale)
  );

  // Use locale for formatting
  const formattedDate = formatDate(date, locale);

  return <div>{/* Component content */}</div>;
};
```

**Example with locale object:**
```typescript
import { useLocale } from '@/libs/locale';

const LanguageSelector: React.FC = () => {
  const { locale, country, language, setLocale } = useLocale();

  // locale: 'de-AT'
  // country: 'AT'
  // language: 'de'

  const handleLocaleChange = (newLocale: string) => {
    setLocale(newLocale);
  };

  return (
    <select value={locale} onChange={(e) => handleLocaleChange(e.target.value)}>
      <option value="de-AT">Deutsch (Österreich)</option>
      <option value="de-CH">Deutsch (Schweiz)</option>
      <option value="de-DE">Deutsch (Deutschland)</option>
    </select>
  );
};
```

**Example checking locale for conditional logic:**
```typescript
import { useSelectedLocale } from '@/libs/locale';
import { Locales } from '@/libs/locale/constants';

const PricingComponent: React.FC = () => {
  const locale = useSelectedLocale();

  // Show different pricing logic for US market
  const showSubscriptionDiscount = locale === Locales.enUS;

  // Show region-specific payment methods
  const showPayPal = [Locales.enUS, Locales.enGB, Locales.enAU].includes(locale);
  const showSofort = [Locales.deDE, Locales.deAT, Locales.deCH].includes(locale);

  return (
    <Box>
      {showSubscriptionDiscount && <DiscountBanner />}
      {showPayPal && <PayPalOption />}
      {showSofort && <SofortOption />}
    </Box>
  );
};
```

**Frequency:** 80% of components needing locale information

**Available Hooks:**
- `useSelectedLocale()` - Returns current locale string (e.g., 'en-US')
- `useLocale()` - Returns locale object with additional properties
- `useSystemCountry()` - Returns system country (e.g., 'US', 'DE')
- `useLanguage()` - Returns language code (e.g., 'en', 'de')

### 4. Namespace Organization

**Pattern:** Translation keys are organized into namespaces that match feature or component boundaries. Each namespace is a top-level key in the translation JSON.

**Namespace Structure:**
```json
{
  "checkout": { /* All checkout-related translations */ },
  "cart": { /* All cart-related translations */ },
  "order-summary-drawer": { /* Order summary drawer translations */ },
  "recipe-detail": { /* Recipe detail page translations */ },
  "account-settings": { /* Account settings translations */ },
  "subscription-management": { /* Subscription management translations */ }
}
```

**Example using multiple namespaces:**
```typescript
import { useT9n } from '@/libs/translation';

const CheckoutPage: React.FC = () => {
  // Use different namespaces for different sections
  const { translate: t } = useT9n('checkout');
  const { translate: tCart } = useT9n('cart');
  const { translate: tPayment } = useT9n('payment');

  return (
    <Box>
      <Heading>{t('checkout.title')}</Heading>

      <CartSummary>
        <Text>{tCart('cart.items.count', { count: 3 })}</Text>
      </CartSummary>

      <PaymentSection>
        <Text>{tPayment('payment.methods.title')}</Text>
      </PaymentSection>
    </Box>
  );
};
```

**Frequency:** 90% of components using translations

**Namespace Naming Conventions:**
- Use kebab-case for namespace names
- Match namespace to feature/component boundary
- Keep namespaces focused and cohesive
- Don't create overly granular namespaces (prefer fewer, larger namespaces)

## Implementation Guidelines

### When to Use Translations

Use the translation system for:
- ✅ All user-facing text content
- ✅ Button labels, form labels, placeholders
- ✅ Error messages and validation messages
- ✅ Success/confirmation messages
- ✅ Navigation labels and menu items
- ✅ Email content and notifications
- ✅ Meta descriptions and page titles

Don't use translations for:
- ❌ Configuration values (use config hooks)
- ❌ API endpoints and URLs (use data-access layer)
- ❌ Log messages (keep in English)
- ❌ Test descriptions (keep in English)
- ❌ CSS class names or data-test-ids

### Translation Key Naming

Follow these conventions for translation keys:

**Use descriptive, hierarchical keys:**
```json
{
  "checkout": {
    "payment": {
      "methods": {
        "title": "Payment methods",
        "credit-card": "Credit card",
        "paypal": "PayPal"
      }
    }
  }
}
```

**Use action-based keys for buttons:**
```json
{
  "checkout": {
    "actions": {
      "place-order": "Place order",
      "cancel-order": "Cancel order",
      "edit-address": "Edit address"
    }
  }
}
```

**Use status-based keys for messages:**
```json
{
  "checkout": {
    "status": {
      "processing": "Processing your order...",
      "success": "Order placed successfully!",
      "error": "Failed to place order"
    }
  }
}
```

**Use consistent pluralization keys:**
```json
{
  "cart": {
    "items": {
      "count_zero": "No items",
      "count_one": "{{count}} item",
      "count_other": "{{count}} items"
    }
  }
}
```

### Setting Up Translation Namespace

1. **Create translation keys in JSON files:**

```json
// app/translations/yourcompany/en-US.json
{
  "my-feature": {
    "title": "My Feature",
    "description": "This is my feature description",
    "actions": {
      "save": "Save changes",
      "cancel": "Cancel"
    }
  }
}
```

2. **Use in component:**

```typescript
import { useT9n } from '@/libs/translation';

const MyFeatureComponent: React.FC = () => {
  const { translate: t } = useT9n('my-feature');

  return (
    <Box>
      <Heading>{t('my-feature.title')}</Heading>
      <Text>{t('my-feature.description')}</Text>
      <Button>{t('my-feature.actions.save')}</Button>
      <Button>{t('my-feature.actions.cancel')}</Button>
    </Box>
  );
};
```

3. **Add to all supported locales:**

Ensure you add the same namespace structure to all locale files:
- `app/translations/yourcompany/de-DE.json`
- `app/translations/yourcompany/fr-FR.json`
- etc.

### Interpolation and Dynamic Content

Use interpolation for dynamic values:

```typescript
import { useT9n } from '@/libs/translation';

const PriceDisplay: React.FC<{ price: number; currency: string }> = ({ price, currency }) => {
  const { translate: t } = useT9n('checkout');

  // Translation: "checkout.total-price": "Total: {{amount}} {{currency}}"
  return (
    <Text>
      {t('checkout.total-price', {
        amount: price.toFixed(2),
        currency
      })}
    </Text>
  );
};
```

**Complex interpolation example:**
```typescript
import { useT9n } from '@/libs/translation';
import { useFormatDate } from '@/libs/date-fns';

const OrderSummary: React.FC<{ orderDate: Date; orderNumber: string }> = ({
  orderDate,
  orderNumber,
}) => {
  const { translate: t } = useT9n('order');
  const formatDate = useFormatDate();

  // Translation: "order.summary": "Order {{orderNumber}} placed on {{date}}"
  return (
    <Text>
      {t('order.summary', {
        orderNumber,
        date: formatDate(orderDate, 'long'),
      })}
    </Text>
  );
};
```

### Pluralization Rules

Handle pluralization correctly:

```json
{
  "cart": {
    "items": {
      "count_zero": "Your cart is empty",
      "count_one": "{{count}} item in cart",
      "count_other": "{{count}} items in cart"
    }
  }
}
```

```typescript
import { useT9n } from '@/libs/translation';

const CartItemCount: React.FC<{ count: number }> = ({ count }) => {
  const { translate: t } = useT9n('cart');

  // Automatically selects correct plural form based on count
  return <Text>{t('cart.items.count', { count })}</Text>;
};
```

**Note:** Different locales have different pluralization rules. English has two forms (one, other), but other languages may have more:
- **Arabic:** zero, one, two, few, many, other
- **Polish:** one, few, many, other
- **Japanese:** other (no pluralization)

The translation system handles these automatically.

### Date and Number Formatting

Use locale-aware formatting utilities:

```typescript
import { useT9n } from '@/libs/translation';
import { useFormatDate } from '@/libs/date-fns';
import { useFormatPrice } from '@/libs/currency';
import { useSelectedLocale } from '@/libs/locale';

const OrderDetails: React.FC<{ order: Order }> = ({ order }) => {
  const { translate: t } = useT9n('order');
  const formatDate = useFormatDate();
  const formatPrice = useFormatPrice();
  const locale = useSelectedLocale();

  // Format date according to locale
  const formattedDate = formatDate(order.date, 'long');
  // en-US: "November 20, 2025"
  // de-DE: "20. November 2025"

  // Format price according to locale
  const formattedPrice = formatPrice(order.total);
  // en-US: "$49.99"
  // de-DE: "49,99 €"

  // Format numbers
  const formattedNumber = new Intl.NumberFormat(locale).format(order.itemCount);
  // en-US: "1,234"
  // de-DE: "1.234"

  return (
    <Box>
      <Text>{t('order.placed-on', { date: formattedDate })}</Text>
      <Text>{t('order.total', { price: formattedPrice })}</Text>
      <Text>{t('order.items', { count: formattedNumber })}</Text>
    </Box>
  );
};
```

### Locale-Specific Content

For content that differs significantly by locale (not just translation):

```typescript
import { useT9n } from '@/libs/translation';
import { useSelectedLocale } from '@/libs/locale';
import { Locales } from '@/libs/locale/constants';

const PromotionalBanner: React.FC = () => {
  const { translate: t } = useT9n('promotions');
  const locale = useSelectedLocale();

  // Show different promotions by locale
  if (locale === Locales.enUS) {
    return (
      <Box>
        <Heading>{t('promotions.us.thanksgiving-sale')}</Heading>
        <Text>{t('promotions.us.thanksgiving-description')}</Text>
      </Box>
    );
  }

  if (locale === Locales.deDE) {
    return (
      <Box>
        <Heading>{t('promotions.de.oktoberfest-sale')}</Heading>
        <Text>{t('promotions.de.oktoberfest-description')}</Text>
      </Box>
    );
  }

  return (
    <Box>
      <Heading>{t('promotions.default.sale')}</Heading>
      <Text>{t('promotions.default.description')}</Text>
    </Box>
  );
};
```

## Testing Translations

### Unit Tests with Mock Translations

```typescript
import { render, screen } from '@testing-library/react';
import MyComponent from './MyComponent';

// Mock the translation hook
jest.mock('@/libs/translation', () => ({
  useT9n: (namespace: string) => ({
    translate: (key: string, params?: Record<string, any>) => {
      // Simple mock that returns the key
      if (params) {
        let result = key;
        Object.entries(params).forEach(([param, value]) => {
          result = result.replace(`{{${param}}}`, String(value));
        });
        return result;
      }
      return key;
    },
  }),
}));

describe('MyComponent', () => {
  it('should display translated title', () => {
    render(<MyComponent />);

    // Test using the translation key
    expect(screen.getByText('my-feature.title')).toBeInTheDocument();
  });

  it('should interpolate values correctly', () => {
    render(<MyComponent price={49.99} />);

    expect(screen.getByText(/checkout.total-price.*49.99/)).toBeInTheDocument();
  });
});
```

### Integration Tests with Real Translations

```typescript
import { render, screen } from '@testing-library/react';
import { TranslationProvider } from '@/libs/translation';
import MyComponent from './MyComponent';

// Import actual translations
import enUS from '@/translations/yourcompany/en-US.json';

describe('MyComponent with translations', () => {
  const renderWithTranslations = (component: React.ReactElement) => {
    return render(
      <TranslationProvider locale="en-US" translations={enUS}>
        {component}
      </TranslationProvider>
    );
  };

  it('should display translated content', () => {
    renderWithTranslations(<MyComponent />);

    // Test using actual translated text
    expect(screen.getByText('My Feature')).toBeInTheDocument();
  });
});
```

### E2E Tests with Locale Switching

```typescript
describe('Locale switching E2E', () => {
  it('should switch content when changing locale', () => {
    cy.visit('/');

    // Check English content
    cy.get('[data-test-id="title"]').should('contain', 'Welcome');

    // Switch to German
    cy.get('[data-test-id="locale-selector"]').select('de-DE');

    // Check German content
    cy.get('[data-test-id="title"]').should('contain', 'Willkommen');
  });
});
```

## Common Patterns

### Translation with Fallback

```typescript
import { useT9n } from '@/libs/translation';

const ComponentWithFallback: React.FC = () => {
  const { translate: t } = useT9n('my-feature');

  // Use fallback if translation key doesn't exist
  const title = t('my-feature.title', {}, 'Default Title');

  return <Heading>{title}</Heading>;
};
```

### Rich Text Translations

For translations containing HTML or React components:

```typescript
import { useT9n } from '@/libs/translation';
import { Text, Link } from '@/libs/zest';

const TermsAndConditions: React.FC = () => {
  const { translate: t } = useT9n('legal');

  // Translation: "legal.terms-agreement": "By continuing, you agree to our {{termsLink}} and {{privacyLink}}"

  return (
    <Text>
      {t('legal.terms-agreement', {
        termsLink: <Link href="/terms">Terms of Service</Link>,
        privacyLink: <Link href="/privacy">Privacy Policy</Link>,
      })}
    </Text>
  );
};
```

### Lazy Loading Translation Namespaces

For large applications, lazy load translation namespaces:

```typescript
import dynamic from 'next/dynamic';
import { useT9n } from '@/libs/translation';
import { Suspense } from 'react';

// Dynamically import component with its translations
const HeavyFeature = dynamic(() => import('./HeavyFeature'), {
  loading: () => <LoadingSpinner />,
});

const ParentComponent: React.FC = () => {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <HeavyFeature />
    </Suspense>
  );
};
```

## Anti-Patterns to Avoid

❌ **Don't hardcode translatable text:**
```typescript
// ❌ Bad
const MyComponent = () => {
  return <Button>Click here</Button>;
};
```

✅ **Use translations:**
```typescript
// ✅ Good
const MyComponent = () => {
  const { translate: t } = useT9n('common');
  return <Button>{t('common.actions.click-here')}</Button>;
};
```

❌ **Don't concatenate translated strings:**
```typescript
// ❌ Bad - breaks for different language word orders
const text = t('checkout.you-save') + ' ' + amount + ' ' + t('checkout.on-order');
```

✅ **Use interpolation:**
```typescript
// ✅ Good - allows translators to control word order
const text = t('checkout.savings-message', { amount });
// Translation: "You save {{amount}} on this order"
```

❌ **Don't split sentences across multiple keys:**
```typescript
// ❌ Bad
<Text>
  {t('checkout.order-total-prefix')}
  {formattedPrice}
  {t('checkout.order-total-suffix')}
</Text>
```

✅ **Use complete sentences with interpolation:**
```typescript
// ✅ Good
<Text>
  {t('checkout.order-total', { price: formattedPrice })}
</Text>
// Translation: "Order total: {{price}}"
```

❌ **Don't create overly granular keys:**
```json
// ❌ Bad - too granular
{
  "checkout": {
    "button": {
      "place": "Place",
      "order": "order"
    }
  }
}
```

✅ **Create complete, meaningful keys:**
```json
// ✅ Good
{
  "checkout": {
    "actions": {
      "place-order": "Place order"
    }
  }
}
```

❌ **Don't use translation keys as default values:**
```typescript
// ❌ Bad
const title = t('my-feature.title') || 'my-feature.title';
```

✅ **Use meaningful defaults:**
```typescript
// ✅ Good
const title = t('my-feature.title', {}, 'Feature Title');
```

❌ **Don't manually edit production translation files:**
```typescript
// ❌ Bad - editing app/translations/yourcompany/en-US.json directly
```

✅ **Use translation management system:**
```typescript
// ✅ Good - translations synced automatically via automated PRs
```

## Related Implementers

- **configuration-management.md** - For locale-based configuration with createConfigFromHash
- **data-access-layer.md** - For locale parameters in API requests
- **testing-practices.md** - For testing translated components
- **react-component-architecture.md** - For component structure with translations
- **import-organization.md** - For organizing translation imports

## Additional Resources

### Locale Constants

Available locale constants from `@/libs/locale/constants`:

```typescript
import { Locales } from '@/libs/locale/constants';

// English locales
Locales.enUS  // 'en-US'
Locales.enGB  // 'en-GB'
Locales.enAU  // 'en-AU'
Locales.enCA  // 'en-CA'

// German locales
Locales.deDE  // 'de-DE'
Locales.deAT  // 'de-AT'
Locales.deCH  // 'de-CH'

// French locales
Locales.frFR  // 'fr-FR'
Locales.frBE  // 'fr-BE'

// Dutch locales
Locales.nlNL  // 'nl-NL'
Locales.nlBE  // 'nl-BE'

// Other locales
Locales.esES  // 'es-ES'
Locales.itIT  // 'it-IT'
```

### Translation File Requirements

When adding new translation keys:

1. Add to all supported locale files
2. Use consistent key structure across locales
3. Include plural forms where needed (_one, _other, _zero, etc.)
4. Include interpolation placeholders ({{variable}})
5. Test with actual content (not Lorem Ipsum)
6. Consider text expansion (German text is ~30% longer than English)
7. Don't include HTML in translations (use React components instead)

### Best Practices Summary

- ✅ Always use useT9n for all user-facing text
- ✅ Organize keys into logical namespaces
- ✅ Use interpolation for dynamic content
- ✅ Support pluralization where needed
- ✅ Use locale-aware date/number formatting
- ✅ Test translations in all supported locales
- ✅ Keep translation keys descriptive and hierarchical
- ✅ Use translation management system for updates
- ✅ Consider text expansion in UI design
- ✅ Use complete sentences with proper interpolation
