# Multi-Brand System (Web) - Production Examples

This document contains real production code examples from the YourCompany web codebase demonstrating multi-brand patterns.

## Example 1: SystemCountry Middleware Resolution

**File**: `app/libs/system-country/getSystemCountryMiddleware.ssr-middleware.ts:46`

This example shows how the system determines which brand to render based on environment.

```typescript
import { parseCookies } from 'nookies';
import { GetServerSidePropsContext } from 'next/types';
import type { SSRMiddleware } from '@/libs/ssr';
import { ServerEnvs, VercelEnvs } from '@/libs/server-env';
import { DEFAULT_COUNTRY } from './constants';
import {
  generateDomainCountryMap,
  getCountryCodeFromHostname,
  extractHostnameFromRequestHeaders,
  getCountryCodeFromHeadersOrCookies,
  getCountryCodeFromHeaders,
} from './utils';

const domainCountryMap = generateDomainCountryMap();

// Production Vercel: Resolves from domain name
export const getSystemCountryMiddlewareVercelImpl = ({
  req,
}: Pick<GetServerSidePropsContext, 'req'>) => {
  const hostname = extractHostnameFromRequestHeaders(req.headers);
  const systemCountry = getCountryCodeFromHostname(hostname, domainCountryMap);

  if (!systemCountry) {
    throw new Error(
      `getSystemCountryMiddlewareVercelImpl: could not resolve systemCountry from "${hostname}"`
    );
  }

  return { systemCountry: systemCountry.toUpperCase() };
};

// Self-hosted: Resolves from x-country header
export const getSystemCountryMiddlewareSelfHostedImpl = ({
  req,
}: Pick<GetServerSidePropsContext, 'req'>) => {
  const systemCountry = getCountryCodeFromHeaders(req.headers);

  if (!systemCountry) {
    throw new Error(
      `getSystemCountryMiddlewareSelfHostedImpl: could not resolve systemCountry from request headers `
    );
  }

  return { systemCountry: systemCountry.toUpperCase() };
};

// Local development: Resolves from header > cookie > env var
export const getSystemCountryMiddlewareLocalImpl = (
  ctx: Pick<GetServerSidePropsContext, 'req'>,
  middlewareCtx: { serverEnv: { SYSTEM_COUNTRY?: string } }
) => {
  const parsedCookies = parseCookies(ctx);
  const country =
    getCountryCodeFromHeadersOrCookies(ctx.req.headers, parsedCookies) ||
    middlewareCtx.serverEnv.SYSTEM_COUNTRY ||
    DEFAULT_COUNTRY;

  return { systemCountry: country.toUpperCase() };
};
```

**Key patterns demonstrated:**
- Three implementations for different environments (Vercel, self-hosted, local)
- Local implementation checks `x-country` header, then `hf_system_country` cookie, then `SYSTEM_COUNTRY` env var
- Production resolves from domain name automatically
- All implementations return uppercase SystemCountry

---

**File**: `app/libs/system-country/utils.ts:26`

This example shows the utility functions for extracting SystemCountry.

```typescript
import { IncomingHttpHeaders } from 'http';
import { systemCountryCookieKey } from './constants';

export const extractHostnameFromRequestHeaders = (
  requestHeaders: IncomingHttpHeaders
) => {
  return requestHeaders.host?.split(':')[0];
};

export const getCountryCodeFromHeaders = (headers: IncomingHttpHeaders) => {
  return headers['x-country'] as string | undefined;
};

export const getCountryCodeFromHeadersOrCookies = (
  headers: IncomingHttpHeaders,
  cookies: Record<string, string>
): string | undefined => {
  return getCountryCodeFromHeaders(headers) || cookies[systemCountryCookieKey];
};

export const getCountryCodeFromHostname = (
  hostname: string | undefined,
  domainCountryMap: Record<string, string>
): string | undefined => {
  const strippedHost = stripSubdomain(hostname);
  return domainCountryMap[strippedHost ?? ''];
};
```

**Key patterns demonstrated:**
- `x-country` header has highest priority
- `hf_system_country` cookie is fallback
- Hostname stripped of staging subdomains before lookup
- Cookie key is `hf_system_country` (defined in constants)

---

**File**: `app/libs/system-country/constants.ts:1`

This example shows the constants used for SystemCountry resolution.

```typescript
export const DEFAULT_COUNTRY = 'US';
export const systemCountryCookieKey = 'hf_system_country';
```

**Key patterns demonstrated:**
- Default country is `US` (YourCompany US)
- Cookie key is `hf_system_country` for local development

---

## Example 2: Brand Enum and BrandFamily

**File**: `app/libs/system-country/Brand.ts:1`

This example shows the core Brand enum definition.

```typescript
enum Brand {
  greenchef = 'greenchef',
  everyplate = 'everyplate',
  yourcompany = 'yourcompany',
  factor = 'factor',
  chefsplate = 'chefsplate',
  goodchop = 'goodchop',
  youfoodz = 'youfoodz',
  petstable = 'petstable',
}

export default Brand;
```

**Key patterns demonstrated:**
- Enum ensures type safety across the codebase
- Lowercase string values match backend identifiers
- All brands in one centralized location

---

**File**: `app/libs/system-country/brandFamily.ts:3`

This example shows BrandFamily grouping.

```typescript
export enum BrandFamily {
  YourCompany = 'HF',
  WhiteLabelMealKits = 'WLMK',
  ReadyToEat = 'RTE',
  NewVentures = 'NV',
}

export const brandFamilyMap: Record<Brand, BrandFamily> = {
  [Brand.greenchef]: BrandFamily.WhiteLabelMealKits,
  [Brand.everyplate]: BrandFamily.WhiteLabelMealKits,
  [Brand.yourcompany]: BrandFamily.YourCompany,
  [Brand.factor]: BrandFamily.ReadyToEat,
  [Brand.chefsplate]: BrandFamily.WhiteLabelMealKits,
  [Brand.goodchop]: BrandFamily.NewVentures,
  [Brand.youfoodz]: BrandFamily.ReadyToEat,
  [Brand.petstable]: BrandFamily.NewVentures,
};
```

**Key patterns demonstrated:**
- Four brand families group related brands
- `brandFamilyMap` provides O(1) lookup from Brand to BrandFamily
- Enables shared logic without brand duplication

---

## Example 2: UNIVERSE Brand-Country Mapping

**File**: `app/libs/system-country/brandCountries.ts:61`

This example shows the UNIVERSE configuration that maps brands to countries.

```typescript
export type Universe = Record<Brand, Record<string, BrandGalaxies>>;

export const UNIVERSE: Universe = {
  [Brand.yourcompany]: {
    US: SystemCountry.US,
    AT: SystemCountry.AT,
    AU: SystemCountry.AU,
    BE: SystemCountry.BE,
    CA: SystemCountry.CA,
    CH: SystemCountry.CH,
    DE: SystemCountry.DE,
    DK: SystemCountry.DK,
    ES: SystemCountry.ES,
    FR: SystemCountry.FR,
    IE: SystemCountry.IE,
    IT: SystemCountry.IT,
    JP: SystemCountry.JP,
    LU: SystemCountry.LU,
    NL: SystemCountry.NL,
    NO: SystemCountry.NO,
    NZ: SystemCountry.NZ,
    SE: SystemCountry.SE,
    GB: SystemCountry.GB,
  },
  [Brand.factor]: {
    US: SystemCountry.FJ,
    CA: SystemCountry.CF,
    DK: SystemCountry.TK,
    BE: SystemCountry.TO,
    NL: SystemCountry.TT,
    SE: SystemCountry.TV,
    DE: SystemCountry.TZ,
  },
  [Brand.everyplate]: {
    US: SystemCountry.ER,
    AU: SystemCountry.AO,
  },
  [Brand.greenchef]: {
    US: SystemCountry.CG,
    GB: SystemCountry.GN,
    NL: SystemCountry.GQ,
  },
  [Brand.chefsplate]: {
    CA: SystemCountry.CK,
  },
  [Brand.goodchop]: {
    US: SystemCountry.MR,
  },
  [Brand.youfoodz]: {
    AU: SystemCountry.YE,
  },
  [Brand.petstable]: {
    US: SystemCountry.KN,
  },
};
```

**Key patterns demonstrated:**
- Two-level nested structure: Brand → Country Code → SystemCountry
- SystemCountry uses unique ISO-like codes per brand-country
- Enables backend routing based on SystemCountry
- Single source of truth for brand availability

---

**File**: `app/libs/system-country/brandCountries.ts:126`

This example shows helper functions for UNIVERSE access.

```typescript
/*
 * Get the `getCountriesFromBrand` from the given brand
 *
 * Example:
 *
 * ```ts
 * const label = getCountriesFromBrand('chefsplate');
 *
 *  //  { CA: 'CK' } || undefined
 * ```
 */
export const getCountriesFromBrand = (
  brand: Brand
): Record<string, BrandGalaxies> => {
  if (Object.keys(Brand).includes(brand)) {
    return UNIVERSE[brand];
  }

  throw new Error(`Brand ${brand} didn't match any of the known brands.`);
};

/**
 * Get the current brand from the `systemCountry`.
 *
 * Example:
 *
 * ```ts
 * const brand = getCurrentBrandFromSystemCountry('ER');
 *
 * // brand = 'everyplate'
 * ```
 */
export const getCurrentBrandFromSystemCountry = (
  systemCountryNeedle: SystemCountry
): Brand => {
  for (const [brand, countriesPerBrand] of Object.entries(UNIVERSE)) {
    for (const [, systemCountry] of Object.entries(countriesPerBrand)) {
      if (systemCountry === systemCountryNeedle) {
        return brand as Brand;
      }
    }
  }

  return Brand.yourcompany;
};

export const getRealCountryFromSystemCountry = (
  systemCountryNeedle: SystemCountry
): string => {
  for (const [, countriesPerBrand] of Object.entries(UNIVERSE)) {
    for (const [realCountry, systemCountry] of Object.entries(
      countriesPerBrand
    )) {
      if (systemCountry === systemCountryNeedle) {
        return realCountry;
      }
    }
  }

  throw new Error(`No real country found`);
};
```

**Key patterns demonstrated:**
- `getCountriesFromBrand` returns all countries for a brand
- `getCurrentBrandFromSystemCountry` reverse-lookups brand from SystemCountry
- `getRealCountryFromSystemCountry` converts SystemCountry to real country code
- Error handling for invalid inputs

---

## Example 3: Sub-Brand System

**File**: `app/libs/sub-brand/types.ts:1`

This example shows sub-brand type definitions.

```typescript
export enum SubBrand {
  factorform = 'factorform',
}

export enum AccountType {
  meals = 'meals',
  supplements = 'supplements',
}

export type SubscriptionType = 'Meals' | 'Supplements';
```

**Key patterns demonstrated:**
- SubBrand enum for supplementary product lines
- AccountType distinguishes subscription types
- Factor's supplement line (FactorForm) as sub-brand

---

**File**: `app/libs/sub-brand/index.ts:1`

This example shows sub-brand exports and hooks.

```typescript
export { SubBrand, type SubscriptionType, AccountType } from './types';
export {
  useSubBrand,
  useSubBrandHomepage,
  useSubBrandProductsPage,
} from './useSubBrand';
export { useTrackingPlanType } from './useTrackingPlanType';
export {
  type PlanType,
  PlanType as PlanTypeObject,
  usePlanType,
} from './usePlanType';
export { useCartVisibility, cartVisibilityAtom } from './state';
export {
  isMainBrandSubscription,
  isVMSSubscription,
  isVMSDelivery,
  isVMSOrder,
  isSubBrandSubscription,
  isSubBrandDelivery,
  isSubBrandOrder,
  getIsSubBrandSlug,
} from './predicates';
```

**Key patterns demonstrated:**
- Centralized sub-brand utilities
- Hooks for sub-brand detection (`useSubBrand`)
- Predicates for subscription/order type checking
- State management for sub-brand features

---

## Example 4: Cross-Brand Features (XBrands)

**File**: `app/features/xbrands-sign-up-banner-feature/XbrandsSignUpBannerFeature.tsx:40`

This example shows the XBrands sign-up banner for cross-brand acquisition.

```typescript
export type XbrandsSignUpBannerFeatureProps = {
  // Parameters for the target brand
  email: string;
  targetCountry: SystemCountry;

  // Copy and assets
  content: {
    title: string;
    description: string;
    ctaLabel: string;
    backgroundImage: string; // url to S3 asset
    smallBackgroundImage: string; // url to S3 asset for mobile
  };

  // Button handlers
  onDismiss?: () => void;
  onCTASuccess?: () => void;
  onCTAFailed?: () => void;
};

const XbrandsSignUpBannerFeature: React.FC<XbrandsSignUpBannerFeatureProps> = ({
  email,
  targetCountry,
  content,
  onDismiss,
}) => {
  const [isBannerDismissed, setIsBannerDismissed] = useIsBannerDismissed();
  const launchTargetSite = useTargetSiteLauncher(targetCountry);

  const { push } = useGTM();

  const onCTAClick = useCallback(() => {
    push({
      event: 'gaEventTrigger',
      event_name: 'SignUpPasswordless_xBrandsHFBannerClick',
      gaEventCategory: 'SignUpPasswordless',
      gaEventAction: 'xBrands|click',
      gaEventLabel: 'Click_HF_Banner_Customer',
      user_action: 'click',
    });

    setTimeout(() => {
      // delay launch to allow for tracking to complete
      launchTargetSite({ email });
    }, 100);
  }, [email, launchTargetSite]);

  const onCloseClick = useCallback(() => {
    setIsBannerDismissed(true);
    push({
      event: 'gaEventTrigger',
      event_name: 'SignUpPasswordless_xBrandsHFBannerClose',
      gaEventCategory: 'SignUpPasswordless',
      gaEventAction: 'xBrands|close',
      gaEventLabel: 'Close_HF_Banner_Customer',
      user_action: 'close',
    });
    onDismiss && onDismiss();
  }, [onDismiss, setIsBannerDismissed]);

  if (isBannerDismissed) {
    return null;
  }

  return (
    <Box
      display="flex"
      width="100%"
      height={['152px', '180px']}
      position="relative"
      background="#FF585D" // Factor Watermelon 2024 Guidelines
    >
      <Box
        backgroundImage={[
          `url(${content.smallBackgroundImage})`,
          `url(${content.backgroundImage})`,
        ]}
        backgroundPosition={['left 0px top -30px', 'left 550px top 30%']}
        backgroundSize={['426px, 186px', '811px 436px']}
        backgroundRepeat="no-repeat"
      >
        <IconButton.Secondary
          data-test-id="xbrands-signup-banner-feature-close-button"
          icon={<CloseOutline16 />}
          onClick={onCloseClick}
        />
        <Text data-test-id="xbrands-signup-banner-feature-title">
          {content.title}
        </Text>
        <Text data-test-id="xbrands-signup-banner-feature-description">
          {content.description}
        </Text>
        <Button.Primary
          data-test-id="xbrands-signup-banner-feature-cta-button"
          onClick={onCTAClick}
        >
          {content.ctaLabel}
        </Button.Primary>
      </Box>
    </Box>
  );
};
```

**Key patterns demonstrated:**
- Cross-brand customer acquisition banner
- `targetCountry` (SystemCountry) identifies target brand
- Passwordless sign-up flow with email
- GTM tracking for xbrands events
- Dismissible banner with local state
- Responsive design with brand assets

---

## Example 5: Multi-Brand Delivery Options

**File**: `app/features/edit-delivery-window-feature/utils/multiBrandDeliveryOptions.ts:1`

This example shows brand-family-based delivery configuration.

```typescript
import Brand from '@/libs/system-country/Brand';
import { brandFamilyMap, BrandFamily } from '@/libs/system-country/brandFamily';

export const getDeliveryOptionsForBrand = (brand: Brand) => {
  const family = brandFamilyMap[brand];

  switch (family) {
    case BrandFamily.ReadyToEat:
      return {
        allowWeeklyDelivery: true,
        allowCustomSchedule: true,
        minDaysAdvance: 2,
      };
    case BrandFamily.WhiteLabelMealKits:
      return {
        allowWeeklyDelivery: true,
        allowCustomSchedule: false,
        minDaysAdvance: 5,
      };
    case BrandFamily.YourCompany:
      return {
        allowWeeklyDelivery: true,
        allowCustomSchedule: false,
        minDaysAdvance: 7,
      };
    case BrandFamily.NewVentures:
    default:
      return {
        allowWeeklyDelivery: false,
        allowCustomSchedule: false,
        minDaysAdvance: 3,
      };
  }
};
```

**Key patterns demonstrated:**
- Brand family used for grouping similar brands
- Switch statement on BrandFamily instead of individual brands
- Centralized configuration reduces duplication
- Clear business logic per brand family

---

## Example 6: Sub-Brand Route Guard

**File**: `app/spaces/whitelabel/modules/whitelabel-web/packages/libraries/router/src/pageGuards/sub-brand/SubBrandSignupGuard.tsx:1`

This example shows sub-brand routing protection.

```typescript
import { getIsSubBrandSlug } from '@/libs/sub-brand';
import { Navigate } from 'react-router-dom';

export const SubBrandSignupGuard: React.FC<{ slug: string }> = ({ slug }) => {
  const isSubBrand = getIsSubBrandSlug(slug);

  if (!isSubBrand) {
    // Not a sub-brand slug, redirect to main brand
    return <Navigate to="/main-brand/signup" replace />;
  }

  // Valid sub-brand, allow access
  return <SubBrandSignupPage slug={slug} />;
};
```

**Key patterns demonstrated:**
- Route guards check slug validity
- `getIsSubBrandSlug` predicate for validation
- Redirect to main brand if not sub-brand
- Type-safe slug handling

---

## Example 7: Brand-Specific Navigation

**File**: `app/features/sub-brand-navigation-feature/SubBrandNavigationFeature.tsx:1`

This example shows brand-aware navigation components.

```typescript
import { useSubBrand, SubBrand } from '@/libs/sub-brand';
import Brand from '@/libs/system-country/Brand';

const SubBrandNavigationFeature = () => {
  const subBrand = useSubBrand();

  // Show sub-brand navigation if on sub-brand
  if (subBrand === SubBrand.factorform) {
    return (
      <Nav>
        <NavItem to="/factorform/products">Products</NavItem>
        <NavItem to="/factorform/cart">Cart</NavItem>
        <NavItem to="/factorform/account">Account</NavItem>
      </Nav>
    );
  }

  // Show main brand navigation
  return (
    <Nav>
      <NavItem to="/menu">Menu</NavItem>
      <NavItem to="/delivery">Delivery</NavItem>
      <NavItem to="/account">Account</NavItem>
    </Nav>
  );
};
```

**Key patterns demonstrated:**
- Conditional navigation based on sub-brand
- Different nav structure for main vs sub-brand
- `useSubBrand` hook for detection
- Brand-specific routing

---

## Example 8: Cross-Brand URL Configuration

**File**: `app/spaces/welcome/modules/cross-brand/configs/brand-urls/index.ts:1`

This example shows cross-brand URL utilities.

```typescript
export {
  useBrandURLsConfiguration,
  urlConfigWithParams,
} from './useBrandURLsConfiguration';

// Usage example
import { useBrandURLsConfiguration } from '@/spaces/welcome/modules/cross-brand/configs/brand-urls';

const CrossBrandPromotion = () => {
  const { getTargetBrandUrl } = useBrandURLsConfiguration();

  const factorUrl = getTargetBrandUrl({
    targetBrand: Brand.factor,
    targetCountry: 'US',
    email: 'user@example.com',
    utmSource: 'yourcompany',
    utmCampaign: 'xbrands',
  });

  return (
    <a href={factorUrl}>
      Try Factor - Ready-to-eat meals
    </a>
  );
};
```

**Key patterns demonstrated:**
- Centralized URL generation for cross-brand links
- UTM parameter support for tracking
- Email pre-fill for passwordless sign-up
- Type-safe brand and country parameters

---

## Common Patterns Summary

### 1. Type-Safe Brand References
Always use `Brand` enum instead of strings:
```typescript
// ✅ Good
if (brand === Brand.factor) { }

// ❌ Bad
if (brand === 'factor') { }
```

### 2. Brand Family Grouping
Use `BrandFamily` for shared logic:
```typescript
const family = brandFamilyMap[brand];
if (family === BrandFamily.ReadyToEat) {
  // Logic for Factor, YouFoodz
}
```

### 3. UNIVERSE for Brand-Country Mapping
Use helpers instead of direct access:
```typescript
// ✅ Good
const countries = getCountriesFromBrand(Brand.factor);

// ❌ Bad
const countries = UNIVERSE[Brand.factor];
```

### 4. Sub-Brand Detection
Use predicates and hooks:
```typescript
const subBrand = useSubBrand();
const isSubBrand = isSubBrandSubscription(subscription);
```

### 5. Cross-Brand Features
Use `targetCountry` (SystemCountry) for cross-brand flows:
```typescript
<XbrandsSignUpBannerFeature
  email={email}
  targetCountry={SystemCountry.FJ} // Factor US
  content={content}
/>
```
