---
name: multi-brand-web
description: "WHAT: Multi-brand web architecture with BrandFamily and SystemCountry mappings. WHEN: implementing brand-specific UI, cross-brand navigation, sub-brand functionality. KEYWORDS: brand, BrandFamily, SystemCountry, SubBrand, multi-brand, xbrands, Factor, YourCompany, web."
---

# Multi-Brand System (Web)

## Core Principles

**Use the Brand enum and UNIVERSE mapping for all brand-related logic.** The web codebase supports 8 brands organized into 4 brand families, each with specific countries (SystemCountry) mapped through the UNIVERSE configuration.

**Always use BrandFamily for grouping brand logic.** Brand families enable shared behavior across related brands without duplicating code for each individual brand.

**Why**: The multi-brand system allows a single codebase to support multiple product brands (YourCompany, Factor, EveryPlate, GreenChef, ChefsPlate, GoodChop, YouFoodz, PetTable) with brand-specific experiences while maintaining shared infrastructure.

## When to Use This Skill

Use these patterns when:

- Implementing brand-specific UI components or features
- Configuring brand-to-country mappings
- Working with cross-brand navigation (xbrands features)
- Setting up sub-brand functionality (e.g., FactorForm)
- Determining brand family for shared logic
- Handling brand-specific routing or URLs
- Implementing brand-specific tracking or analytics
- Working with brand-specific assets or themes
- Testing or developing features for specific brands locally

## Accessing Different Brands

### Local Development

When developing locally, you can access different brands using cookies or headers. The system uses a middleware that resolves the SystemCountry (and therefore the brand) from three sources in priority order:

1. **`x-country` header** - Highest priority
2. **`hf_system_country` cookie** - Medium priority
3. **`SYSTEM_COUNTRY` environment variable** - Lowest priority (defaults to `US`)

**Setting the cookie in browser DevTools:**

```javascript
// Open browser console and set cookie
document.cookie = 'hf_system_country=FJ; path=/'; // Factor US
document.cookie = 'hf_system_country=ER; path=/'; // EveryPlate US
document.cookie = 'hf_system_country=CG; path=/'; // GreenChef US
document.cookie = 'hf_system_country=DE; path=/'; // YourCompany Germany
// ... etc
```

**Setting via HTTP headers (for API testing):**

```bash
# Using curl
curl -H "x-country: FJ" http://localhost:3000

# Using fetch in browser
fetch('/api/endpoint', {
  headers: { 'x-country': 'FJ' }
})
```

**Setting via environment variable:**

```bash
# In .env.local or shell
SYSTEM_COUNTRY=FJ npm run dev
```

**Why**: The middleware (`app/libs/system-country/getSystemCountryMiddleware.ssr-middleware.ts`) determines which brand to render based on SystemCountry, which is derived from the domain in production or from cookies/headers in local development.

**Production Example**: `git-resources/web/app/libs/system-country/getSystemCountryMiddleware.ssr-middleware.ts:46`

### Production Domain Mapping

In production, the brand is automatically determined by the domain name:

| Domain | SystemCountry | Brand |
|--------|---------------|-------|
| `yourcompany.com` | `US` | YourCompany US |
| `yourcompany.de` | `DE` | YourCompany Germany |
| `yourcompany.co.uk` | `GB` | YourCompany UK |
| `factor75.com` | `FJ` | Factor US |
| `factormeals.ca` | `CF` | Factor Canada |
| `everyplate.com` | `ER` | EveryPlate US |
| `greenchef.com` | `CG` | GreenChef US |
| `chefsplate.com` | `CK` | ChefsPlate Canada |
| `goodchop.com` | `MR` | GoodChop US |
| `youfoodz.com` | `YE` | YouFoodz Australia |
| `thepetstable.com` | `KN` | PetTable US |

**Why**: The domain-to-SystemCountry mapping is generated from `BASE_URL_MAP` in `app/libs/system-country/baseURLMapping.ts` and used by the Vercel middleware implementation.

**Production Example**: `git-resources/web/app/libs/system-country/utils.ts:45`

### SystemCountry Reference

Quick reference for common SystemCountry codes used in development:

**YourCompany:**
- `US`, `AT`, `AU`, `BE`, `CA`, `CH`, `DE`, `DK`, `ES`, `FR`, `IE`, `IT`, `JP`, `LU`, `NL`, `NO`, `NZ`, `SE`, `GB`

**Factor:**
- `FJ` (US), `CF` (Canada), `TK` (Denmark), `TO` (Belgium), `TT` (Netherlands), `TV` (Sweden), `TZ` (Germany)

**EveryPlate:**
- `ER` (US), `AO` (Australia)

**GreenChef:**
- `CG` (US), `GN` (UK), `GQ` (Netherlands)

**ChefsPlate:**
- `CK` (Canada)

**GoodChop:**
- `MR` (US)

**YouFoodz:**
- `YE` (Australia)

**PetTable:**
- `KN` (US)

## Brand System Overview

### Available Brands

The codebase supports 8 brands defined in `app/libs/system-country/Brand.ts`:

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
```

**Why**: Enum ensures type safety and prevents typos when referencing brands throughout the codebase.

**Production Example**: `git-resources/web/app/libs/system-country/Brand.ts:1`

### Brand Families

Brands are organized into 4 families for shared logic in `app/libs/system-country/brandFamily.ts`:

```typescript
export enum BrandFamily {
  YourCompany = 'HF',           // YourCompany main brand
  WhiteLabelMealKits = 'WLMK', // GreenChef, EveryPlate, ChefsPlate
  ReadyToEat = 'RTE',          // Factor, YouFoodz
  NewVentures = 'NV',          // GoodChop, PetTable
}

export const brandFamilyMap: Record<Brand, BrandFamily> = {
  [Brand.yourcompany]: BrandFamily.YourCompany,
  [Brand.everyplate]: BrandFamily.WhiteLabelMealKits,
  [Brand.chefsplate]: BrandFamily.WhiteLabelMealKits,
  [Brand.greenchef]: BrandFamily.WhiteLabelMealKits,
  [Brand.factor]: BrandFamily.ReadyToEat,
  [Brand.youfoodz]: BrandFamily.ReadyToEat,
  [Brand.goodchop]: BrandFamily.NewVentures,
  [Brand.petstable]: BrandFamily.NewVentures,
};
```

**Why**: Brand families enable code reuse across similar brands. For example, all WhiteLabelMealKits can share menu selection logic.

**Production Example**: `git-resources/web/app/libs/system-country/brandFamily.ts:3`

## Brand-to-Country Mappings

### UNIVERSE Configuration

The UNIVERSE maps each brand to its available countries (as SystemCountry codes) in `app/libs/system-country/brandCountries.ts`:

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

**Why**: SystemCountry uses ISO-like codes to uniquely identify each brand-country combination. This enables a single backend to serve multiple brands by routing based on SystemCountry.

**Production Example**: `git-resources/web/app/libs/system-country/brandCountries.ts:61`

### Using Brand-Country Helpers

Get countries for a brand or find brand from SystemCountry:

```typescript
import {
  getCountriesFromBrand,
  getCurrentBrandFromSystemCountry,
  getRealCountryFromSystemCountry,
} from '@/libs/system-country/brandCountries';

// Get all countries for a brand
const factorCountries = getCountriesFromBrand(Brand.factor);
// Returns: { US: 'FJ', CA: 'CF', DK: 'TK', BE: 'TO', NL: 'TT', SE: 'TV', DE: 'TZ' }

// Get brand from SystemCountry
const brand = getCurrentBrandFromSystemCountry(SystemCountry.FJ);
// Returns: Brand.factor

// Get real country code from SystemCountry
const realCountry = getRealCountryFromSystemCountry(SystemCountry.FJ);
// Returns: 'US'
```

**Why**: These helpers abstract the UNIVERSE structure and provide type-safe access to brand-country mappings.

**Production Example**: `git-resources/web/app/libs/system-country/brandCountries.ts:126`

## Sub-Brands

### SubBrand System

Sub-brands represent supplementary product lines within a main brand:

```typescript
// app/libs/sub-brand/types.ts
export enum SubBrand {
  factorform = 'factorform', // Factor's supplement line
}

export enum AccountType {
  meals = 'meals',
  supplements = 'supplements',
}

export type SubscriptionType = 'Meals' | 'Supplements';
```

**Why**: Sub-brands allow brands like Factor to offer related product categories (meals + supplements) with separate ordering flows while sharing customer accounts.

**Production Example**: `git-resources/web/app/libs/sub-brand/types.ts:1`

### Sub-Brand Components and Pages

Sub-brand features live in dedicated directories:

```
app/spaces/whitelabel/modules/whitelabel-web/packages/
├── libraries/
│   └── sub-brand/           # Sub-brand utilities and hooks
├── components/
│   ├── sub-brand-settings/  # Settings pages
│   ├── sub-brand-checkout/  # Checkout flows
│   ├── sub-brand-dashboard/ # Customer dashboard
│   ├── sub-brand-product/   # Product pages
│   └── sub-brand-shared/    # Shared components
└── pages/
    └── factorform/          # FactorForm pages
```

**Why**: Isolated directory structure keeps sub-brand code maintainable and prevents coupling with main brand logic.

**Production Example**: `git-resources/web/app/spaces/whitelabel/modules/whitelabel-web/packages/`

### Sub-Brand Hooks

Use sub-brand hooks for type-safe sub-brand logic:

```typescript
import {
  useSubBrand,
  useSubBrandHomepage,
  useSubBrandProductsPage,
  isSubBrandSubscription,
  getIsSubBrandSlug,
} from '@/libs/sub-brand';

// Check if on sub-brand context
const subBrand = useSubBrand(); // Returns SubBrand.factorform or undefined

// Check subscription type
const isSubBrand = isSubBrandSubscription(subscription);

// Check URL slug
const isSubBrandRoute = getIsSubBrandSlug(slug);
```

**Why**: Centralized hooks ensure consistent sub-brand detection across the application.

**Production Example**: `git-resources/web/app/libs/sub-brand/index.ts:1`

## Cross-Brand Features

### XBrands Sign-Up Banner

The xbrands feature enables cross-brand customer acquisition:

```typescript
// app/features/xbrands-sign-up-banner-feature/XbrandsSignUpBannerFeature.tsx
export type XbrandsSignUpBannerFeatureProps = {
  email: string;
  targetCountry: SystemCountry; // The brand/country to sign up for
  content: {
    title: string;
    description: string;
    ctaLabel: string;
    backgroundImage: string;
    smallBackgroundImage: string;
  };
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
  const launchTargetSite = useTargetSiteLauncher(targetCountry);

  const onCTAClick = () => {
    // Track event
    push({ event: 'SignUpPasswordless_xBrandsHFBannerClick' });

    // Launch target brand site with passwordless sign-up
    launchTargetSite({ email });
  };

  return (
    <Box>
      <Text>{content.title}</Text>
      <Text>{content.description}</Text>
      <Button onClick={onCTAClick}>{content.ctaLabel}</Button>
    </Box>
  );
};
```

**Why**: XBrands enables YourCompany to promote Factor (or other brands) to existing customers, increasing cross-brand acquisition.

**Production Example**: `git-resources/web/app/features/xbrands-sign-up-banner-feature/XbrandsSignUpBannerFeature.tsx:40`

### Cross-Brand Navigation

Configure brand-specific URLs for cross-promotion:

```typescript
// app/spaces/welcome/modules/cross-brand/configs/brand-urls/useBrandURLsConfiguration.ts
import { useBrandURLsConfiguration } from '@/spaces/welcome/modules/cross-brand/configs/brand-urls';

const BrandPromotionComponent = () => {
  const { getTargetBrandUrl } = useBrandURLsConfiguration();

  const factorUrl = getTargetBrandUrl({
    targetBrand: Brand.factor,
    targetCountry: 'US',
    email: 'user@example.com',
  });

  return <a href={factorUrl}>Try Factor</a>;
};
```

**Why**: Centralized URL configuration ensures correct cross-brand navigation across all features.

**Production Example**: `git-resources/web/app/spaces/welcome/modules/cross-brand/configs/brand-urls/index.ts:1`

## Brand-Specific Features

### Brand-Specific Components

Use brand checks for conditional rendering:

```typescript
import Brand from '@/libs/system-country/Brand';
import { brandFamilyMap, BrandFamily } from '@/libs/system-country/brandFamily';

const MenuComponent = ({ brand }: { brand: Brand }) => {
  const brandFamily = brandFamilyMap[brand];

  // Brand-specific rendering
  if (brand === Brand.factor) {
    return <FactorMenu />;
  }

  // Family-specific rendering
  if (brandFamily === BrandFamily.WhiteLabelMealKits) {
    return <MealKitMenu />;
  }

  // Default rendering
  return <YourCompanyMenu />;
};
```

**Why**: Brand checks enable customized experiences while maintaining shared code for common functionality.

### Brand-Specific Routing

Use brand context in route guards:

```typescript
// app/spaces/whitelabel/modules/whitelabel-web/packages/libraries/router/src/pageGuards/sub-brand/SubBrandSignupGuard.tsx
import { getIsSubBrandSlug } from '@/libs/sub-brand';

export const SubBrandSignupGuard = ({ slug }: { slug: string }) => {
  const isSubBrand = getIsSubBrandSlug(slug);

  if (!isSubBrand) {
    return <Navigate to="/main-brand" />;
  }

  return <SubBrandSignup />;
};
```

**Why**: Route guards ensure users only access brand-appropriate pages.

**Production Example**: `git-resources/web/app/spaces/whitelabel/modules/whitelabel-web/packages/libraries/router/src/pageGuards/sub-brand/SubBrandSignupGuard.tsx:1`

### Multi-Brand Delivery Options

Handle brand-specific delivery configurations:

```typescript
// app/features/edit-delivery-window-feature/utils/multiBrandDeliveryOptions.ts
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
    default:
      return {
        allowWeeklyDelivery: true,
        allowCustomSchedule: false,
        minDaysAdvance: 7,
      };
  }
};
```

**Why**: Centralized brand configuration prevents duplication and ensures consistency across features.

**Production Example**: `git-resources/web/app/features/edit-delivery-window-feature/utils/multiBrandDeliveryOptions.ts:1`

## Common Mistakes to Avoid

❌ **Don't hardcode brand strings**:

```typescript
// ❌ Wrong - No type safety
const isFactor = brand === 'factor';
```

✅ **Do use Brand enum**:

```typescript
// ✅ Correct - Type-safe
import Brand from '@/libs/system-country/Brand';
const isFactor = brand === Brand.factor;
```

❌ **Don't duplicate logic for similar brands**:

```typescript
// ❌ Wrong - Duplicated logic
if (brand === Brand.everyplate || brand === Brand.greenchef || brand === Brand.chefsplate) {
  return <MealKitMenu />;
}
```

✅ **Do use BrandFamily**:

```typescript
// ✅ Correct - Grouped by family
import { brandFamilyMap, BrandFamily } from '@/libs/system-country/brandFamily';
if (brandFamilyMap[brand] === BrandFamily.WhiteLabelMealKits) {
  return <MealKitMenu />;
}
```

❌ **Don't bypass UNIVERSE for brand-country mappings**:

```typescript
// ❌ Wrong - Hardcoded mapping
const factorCountries = ['US', 'CA', 'DK'];
```

✅ **Do use UNIVERSE helpers**:

```typescript
// ✅ Correct - Single source of truth
import { getCountriesFromBrand } from '@/libs/system-country/brandCountries';
const factorCountries = getCountriesFromBrand(Brand.factor);
```

❌ **Don't mix sub-brand and main brand logic**:

```typescript
// ❌ Wrong - Unclear separation
if (brand === Brand.factor) {
  // Handles both meals and supplements
  return <FactorComponent />;
}
```

✅ **Do separate sub-brand logic**:

```typescript
// ✅ Correct - Clear separation
import { useSubBrand } from '@/libs/sub-brand';

const subBrand = useSubBrand();
if (brand === Brand.factor && !subBrand) {
  return <FactorMeals />;
}
if (subBrand === SubBrand.factorform) {
  return <FactorFormSupplements />;
}
```

## Quick Reference

**Import brand types:**
```typescript
import Brand from '@/libs/system-country/Brand';
import { BrandFamily, brandFamilyMap } from '@/libs/system-country/brandFamily';
import { getCurrentBrandFromSystemCountry } from '@/libs/system-country/brandCountries';
```

**Check brand:**
```typescript
const isFactor = brand === Brand.factor;
const isRTE = brandFamilyMap[brand] === BrandFamily.ReadyToEat;
```

**Work with sub-brands:**
```typescript
import { useSubBrand, SubBrand } from '@/libs/sub-brand';
const subBrand = useSubBrand();
const isFactorForm = subBrand === SubBrand.factorform;
```

**Get brand from SystemCountry:**
```typescript
import { getCurrentBrandFromSystemCountry } from '@/libs/system-country/brandCountries';
const brand = getCurrentBrandFromSystemCountry(SystemCountry.FJ); // Returns Brand.factor
```

**Available Brands:**
- `Brand.yourcompany` - YourCompany (HF family, 19 countries)
- `Brand.factor` - Factor (RTE family, 7 countries)
- `Brand.everyplate` - EveryPlate (WLMK family, US + AU)
- `Brand.greenchef` - GreenChef (WLMK family, US + GB + NL)
- `Brand.chefsplate` - ChefsPlate (WLMK family, CA)
- `Brand.youfoodz` - YouFoodz (RTE family, AU)
- `Brand.goodchop` - GoodChop (NV family, US)
- `Brand.petstable` - PetTable (NV family, US)

**Brand Families:**
- `BrandFamily.YourCompany` - YourCompany main brand
- `BrandFamily.WhiteLabelMealKits` - EveryPlate, GreenChef, ChefsPlate
- `BrandFamily.ReadyToEat` - Factor, YouFoodz
- `BrandFamily.NewVentures` - GoodChop, PetTable

**Key Directories:**
- `app/libs/system-country/` - Brand enums and mappings
- `app/libs/sub-brand/` - Sub-brand utilities
- `app/features/xbrands-*` - Cross-brand features
- `app/spaces/whitelabel/modules/whitelabel-web/packages/components/sub-brand-*` - Sub-brand components

For production examples with complete code implementations, see [references/examples.md](references/examples.md).
