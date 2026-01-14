---
name: multi-brand-mobile
description: "WHAT: Multi-brand React Native architecture with useBrandedScreen and useBrandedRenderer hooks. WHEN: implementing brand-specific screens, rendering brand UI, working with brand assets. KEYWORDS: brand, BrandCategory, useBrandedScreen, useBrandedRenderer, multi-brand, Factor, YourCompany, AppConfig, mobile."
---

# Multi-Brand System (Mobile)

## Core Principles

**Use `useBrandedScreen` and `useBrandedRenderer` hooks for all brand-specific rendering.** These hooks provide type-safe component selection based on the current brand or brand category from AppConfig.

**Always use BrandCategory for grouping brand logic.** Brand categories (RTE, WLMealKit, MealKit) enable shared behavior across related brands without duplicating code.

**Why**: The multi-brand mobile architecture allows a single React Native codebase to support multiple product brands (YourCompany, Factor, EveryPlate, GreenChef, ChefsPlate, YouFoodz, GoodChop, PetTable, VDS) with brand-specific experiences while maintaining shared infrastructure.

## When to Use This Skill

Use these patterns when:

- Implementing brand-specific screen components
- Rendering brand-specific UI elements inline
- Working with brand-specific assets or images
- Configuring brand categories for shared logic
- Setting up brand configuration via AppConfig
- Generating brand-specific asset maps
- Implementing brand-aware navigation
- Creating brand-specific tracking or analytics

## Brand System Overview

### Available Brands

The codebase supports 9 brands defined in `src/libs/system-country/Brand.ts`:

```typescript
export enum Brand {
  greenchef = 'greenchef',
  everyplate = 'everyplate',
  yourcompany = 'yourcompany',
  factor = 'factor',
  chefsplate = 'chefsplate',
  goodchop = 'goodchop',
  youfoodz = 'youfoodz',
  petstable = 'petstable',
  vds = 'vds',
}

export const REMOTE_BRANDS = {
  [Brand.yourcompany]: 'BRAND_YOURCOMPANY',
  [Brand.everyplate]: 'BRAND_EVERYPLATE',
  [Brand.chefsplate]: 'BRAND_CHEFS_PLATE',
  [Brand.greenchef]: 'BRAND_GREEN_CHEF',
  [Brand.factor]: 'BRAND_FACTOR75',
  [Brand.youfoodz]: 'BRAND_YOUFOODZ',
};
```

**Why**: Enum ensures type safety and prevents typos. REMOTE_BRANDS maps local brand names to backend identifiers for API communication.

**Production Example**: `git-resources/shared-mobile-modules/src/libs/system-country/Brand.ts:1`

### Brand Categories

Brands are organized into 3 categories for shared logic in `src/libs/brand-variants/brandCategoryMap.ts`:

```typescript
export enum BrandCategory {
  /**
   * @context Ready-to-Eat brands (e.g. Factor, YouFoodz).
   */
  RTE = 'RTE',

  /**
   * @context White-Label Meal Kit brands (e.g. ChefsPlate, EveryPlate, GreenChef).
   */
  WLMealKit = 'WLMealKit',

  /**
   * @context All Meal Kit brands (includes both White-Label Meal Kit and YourCompany).
   */
  MealKit = 'MealKit',
}

export const brandCategoryMap: Record<BrandCategory, Brand[]> = {
  [BrandCategory.RTE]: [Brand.factor, Brand.youfoodz],
  [BrandCategory.WLMealKit]: [
    Brand.chefsplate,
    Brand.everyplate,
    Brand.greenchef,
  ],
  [BrandCategory.MealKit]: [
    Brand.chefsplate,
    Brand.everyplate,
    Brand.greenchef,
    Brand.yourcompany,
  ],
};
```

**Why**: Brand categories enable code reuse across similar brands. For example, all MealKit brands can share recipe selection screens.

**Production Example**: `git-resources/shared-mobile-modules/src/libs/brand-variants/brandCategoryMap.ts:1`

### Brand-to-Country Mappings

The UNIVERSE maps each brand to its available countries (as SystemCountry codes) in `src/libs/system-country/BrandGalaxies.ts`:

```typescript
export type Universe = Record<Brand, Record<string, SystemCountry>>;

export const UNIVERSE: Universe = {
  [Brand.yourcompany]: {
    US: SystemCountry.US,
    AT: SystemCountry.AT,
    AU: SystemCountry.AU,
    // ... 19 countries total
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
  // ... other brands
  [Brand.vds]: {},
};
```

**Why**: SystemCountry uses ISO-like codes to uniquely identify each brand-country combination. This enables backend routing based on SystemCountry.

**Production Example**: `git-resources/shared-mobile-modules/src/libs/system-country/BrandGalaxies.ts:6`

## Brand-Specific Rendering

### useBrandedScreen Hook

Use `useBrandedScreen` when you need to swap entire screen components based on brand:

```typescript
import { useBrandedScreen } from '@libs/brand-variants';
import { Brand, BrandCategory } from '@libs/system-country';
import { HomefrontScreen } from './screens/Homefront';
import { RTEHomeScreen } from './screens/RTEHome';

const HomeScreenRouter = () => {
  const { ScreenComponent, params } = useBrandedScreen<
    undefined,
    HomefrontScreenProps
  >({
    config: {
      // Exact brand match
      [Brand.yourcompany]: HomefrontScreen,

      // Brand category match
      [BrandCategory.RTE]: {
        component: RTEHomeScreen,
        overrideParams: { showBanner: false },
      },

      // Default fallback
      default: HomefrontScreen,
    },
    globalParams: { showBanner: true },
  });

  return <ScreenComponent {...params} />;
};
```

**Why**: `useBrandedScreen` automatically resolves the current brand from AppConfigDataAccess and merges global params with brand-specific overrides. Use when layout, logic, or flow differs significantly between brands.

**When to use**:
- Full screen component swaps
- Different navigation flows per brand
- Significantly different UX per brand

**When NOT to use**:
- Small component variations (use `useBrandedRenderer`)
- Inline JSX with custom props (use `useBrandedRenderer`)

**Production Example**: `git-resources/shared-mobile-modules/src/libs/brand-variants/use-branded-screen/useBrandedScreen.ts:54`

### useBrandedRenderer Hook

Use `useBrandedRenderer` when you need to render brand-specific components inline:

```typescript
import { useBrandedRenderer } from '@libs/brand-variants';
import { Brand, BrandCategory } from '@libs/system-country';
import { YourCompanyHeader } from './components/YourCompanyHeader';
import { RTEHeader } from './components/RTEHeader';
import { DefaultHeader } from './components/DefaultHeader';

const HeaderContainer = () => {
  const BrandedHeader = useBrandedRenderer({
    [Brand.yourcompany]: () => (
      <YourCompanyHeader showLogo={true} color="green" />
    ),
    [Brand.factor]: () => (
      <RTEHeader showPromo={true} />
    ),
    [BrandCategory.RTE]: () => (
      <RTEHeader showPromo={false} />
    ),
    default: () => (
      <DefaultHeader />
    ),
  });

  return (
    <View>
      {BrandedHeader}
      <Content />
    </View>
  );
};
```

**Why**: `useBrandedRenderer` returns JSX directly and allows passing custom props to each brand variant. Use when components don't share a common prop interface.

**When to use**:
- Inline component rendering
- Different props per brand variant
- Brand-specific component composition

**When NOT to use**:
- Full screen changes (use `useBrandedScreen`)
- Shared prop interfaces across brands

**Production Example**: `git-resources/shared-mobile-modules/src/libs/brand-variants/use-branded-renderer/useBrandedRenderer.ts:45`

### Brand Resolution Order

Both hooks use the same resolution priority:

1. **Direct brand match** - Checks if current brand has exact config entry
2. **Brand category match** - Checks if current brand belongs to any configured category
3. **Default fallback** - Uses `default` entry

```typescript
// Resolution example for Factor brand:

// 1. Direct match - Factor is Brand.factor
config[Brand.factor]  // ✅ If exists, use this

// 2. Category match - Factor is in BrandCategory.RTE
config[BrandCategory.RTE]  // ✅ If direct match not found, use this

// 3. Default fallback
config.default  // ✅ If no matches, use this
```

**Why**: Priority ensures most specific configuration wins while enabling shared logic through categories.

## AppConfig Integration

### Brand Configuration

The current brand is stored in AppConfig and accessed via AppConfigDataAccess:

```typescript
import { AppConfigDataAccess } from '@data-access/native';

const MyComponent = () => {
  const { data: brand } = AppConfigDataAccess.queries.useBrandState();

  if (brand === Brand.factor) {
    return <FactorContent />;
  }

  return <DefaultContent />;
};
```

**Why**: Centralized brand state ensures all components reference the same brand value and react to brand changes.

**Production Example**: `git-resources/shared-mobile-modules/src/libs/brand-variants/use-branded-screen/useBrandedScreen.ts:64`

### Expo Configuration

Brand is configured at build time via `app.config.ts`:

```typescript
// apps/expo-app/app.config.ts
export default ({ config }: ConfigContext): ExpoConfig => {
  return {
    // ... other config
    extra: {
      brandName: process.env.BRAND_NAME || 'yourcompany',
      brandColors: {
        primary: getBrandColor('primary'),
        secondary: getBrandColor('secondary'),
        background: getBrandColor('background'),
      },
    },
  };
};

// Access in app via useBrandConfig hook
import { useBrandConfig } from '@hooks/useBrandConfig';

const MyComponent = () => {
  const { brandName, colors } = useBrandConfig();

  return (
    <View style={{ backgroundColor: colors.primary }}>
      <Text>{brandName}</Text>
    </View>
  );
};
```

**Why**: Build-time configuration enables brand-specific app builds with different bundle IDs, icons, and splash screens.

**Production Example**: `git-resources/shared-mobile-modules/apps/expo-app/src/hooks/useBrandConfig.ts:13`

## Brand Assets

### Brand Asset Generation

Generate brand-specific asset maps using plop scripts:

```bash
# Generate brand assets map
./plop/scripts/generate_brand_assets.sh

# Build brand assets map (manual)
node plop/scripts/build_brand_assets_map.cjs
```

**Why**: Automated asset generation ensures all brands have required images and maintains consistency across brand variants.

**Production Example**: `git-resources/shared-mobile-modules/plop/scripts/generate_brand_assets.sh:1`

### Brand-Specific Images

Use brand asset maps for images:

```typescript
// src/libs/error-boundary/fallback-ui/brandErrorBoundaryImages.ts
import { Brand } from '@libs/system-country';

export const brandErrorBoundaryImages: Record<Brand, string> = {
  [Brand.yourcompany]: require('@assets/images/yourcompany/error.png'),
  [Brand.factor]: require('@assets/images/factor/error.png'),
  [Brand.everyplate]: require('@assets/images/everyplate/error.png'),
  // ... other brands
  [Brand.vds]: require('@assets/images/default/error.png'),
};

// Usage
import { AppConfigDataAccess } from '@data-access/native';
import { brandErrorBoundaryImages } from './brandErrorBoundaryImages';

const ErrorScreen = () => {
  const { data: brand } = AppConfigDataAccess.queries.useBrandState();
  const errorImage = brand ? brandErrorBoundaryImages[brand] : null;

  return <Image source={errorImage} />;
};
```

**Why**: Centralized asset maps ensure all brands have required images and prevent missing asset errors.

**Production Example**: `git-resources/shared-mobile-modules/src/libs/error-boundary/fallback-ui/brandErrorBoundaryImages.ts:1`

## Brand-Specific Features

### Brand-Specific Tracking

Add brand context to analytics:

```typescript
// src/features/factor-form-entrypoint/hooks/useSubBrandTracking.ts
import { AppConfigDataAccess } from '@data-access/native';
import { Brand } from '@libs/system-country';

const useSubBrandTracking = () => {
  const { data: brand } = AppConfigDataAccess.queries.useBrandState();

  const trackEvent = (eventName: string, properties: object) => {
    track({
      event: eventName,
      properties: {
        ...properties,
        brand: brand || Brand.yourcompany,
        isSubBrand: brand === Brand.factor,
      },
    });
  };

  return { trackEvent };
};
```

**Why**: Brand-aware tracking enables brand-specific analytics and A/B testing.

**Production Example**: `git-resources/shared-mobile-modules/src/features/factor-form-entrypoint/hooks/useSubBrandTracking.ts:1`

### Dynamic Screen Features

Use brand categories for feature configuration:

```typescript
// src/features/dynamic-screen-feature/widgets/benefits-carousel-widget/brandBenefitCarouselAssetsMap.ts
import { Brand, BrandCategory } from '@libs/system-country';
import { brandCategoryMap } from '@libs/brand-variants';

export const getBenefitsForBrand = (brand: Brand): Benefit[] => {
  // Check if RTE brand
  if (brandCategoryMap[BrandCategory.RTE].includes(brand)) {
    return [
      { title: 'Ready to Eat', icon: 'meal' },
      { title: 'No Cooking', icon: 'clock' },
    ];
  }

  // Check if MealKit brand
  if (brandCategoryMap[BrandCategory.MealKit].includes(brand)) {
    return [
      { title: 'Fresh Ingredients', icon: 'fresh' },
      { title: 'Easy Recipes', icon: 'recipe' },
    ];
  }

  return [];
};
```

**Why**: Brand categories enable feature configuration without hardcoding brand checks.

**Production Example**: `git-resources/shared-mobile-modules/src/features/dynamic-screen-feature/widgets/benefits-carousel-widget/brandBenefitCarouselAssetsMap.ts:1`

## Common Mistakes to Avoid

❌ **Don't access brand directly from Constants**:

```typescript
// ❌ Wrong - Not reactive to brand changes
import Constants from 'expo-constants';
const brand = Constants.expoConfig?.extra?.brandName;
```

✅ **Do use AppConfigDataAccess**:

```typescript
// ✅ Correct - Reactive and type-safe
import { AppConfigDataAccess } from '@data-access/native';
const { data: brand } = AppConfigDataAccess.queries.useBrandState();
```

❌ **Don't use hardcoded brand strings**:

```typescript
// ❌ Wrong - No type safety
if (brand === 'factor') {
  return <FactorScreen />;
}
```

✅ **Do use Brand enum**:

```typescript
// ✅ Correct - Type-safe
import { Brand } from '@libs/system-country';
if (brand === Brand.factor) {
  return <FactorScreen />;
}
```

❌ **Don't duplicate logic for similar brands**:

```typescript
// ❌ Wrong - Duplicated logic
if (brand === Brand.factor || brand === Brand.youfoodz) {
  return <RTEScreen />;
}
```

✅ **Do use BrandCategory**:

```typescript
// ✅ Correct - Grouped by category
import { brandCategoryMap, BrandCategory } from '@libs/brand-variants';
if (brandCategoryMap[BrandCategory.RTE].includes(brand)) {
  return <RTEScreen />;
}
```

❌ **Don't use useBrandedScreen for inline rendering**:

```typescript
// ❌ Wrong - Overhead for inline component
const { ScreenComponent } = useBrandedScreen({
  config: {
    [Brand.yourcompany]: () => <SmallIcon />,
    default: () => <SmallIcon />,
  },
});
return <View>{ScreenComponent}</View>;
```

✅ **Do use useBrandedRenderer for inline**:

```typescript
// ✅ Correct - Designed for inline rendering
const BrandedIcon = useBrandedRenderer({
  [Brand.yourcompany]: () => <YourCompanyIcon size={20} />,
  default: () => <DefaultIcon size={20} />,
});
return <View>{BrandedIcon}</View>;
```

❌ **Don't forget default fallback**:

```typescript
// ❌ Wrong - Will crash for unhandled brands
const BrandedComponent = useBrandedRenderer({
  [Brand.yourcompany]: () => <YourCompanyComponent />,
  [Brand.factor]: () => <FactorComponent />,
  // Missing default
});
```

✅ **Do always include default**:

```typescript
// ✅ Correct - Graceful fallback
const BrandedComponent = useBrandedRenderer({
  [Brand.yourcompany]: () => <YourCompanyComponent />,
  [Brand.factor]: () => <FactorComponent />,
  default: () => <DefaultComponent />, // Required
});
```

## Quick Reference

**Import brand types:**
```typescript
import { Brand, BrandCategory } from '@libs/system-country';
import { brandCategoryMap } from '@libs/brand-variants';
import { AppConfigDataAccess } from '@data-access/native';
```

**Get current brand:**
```typescript
const { data: brand } = AppConfigDataAccess.queries.useBrandState();
```

**Use branded screen:**
```typescript
const { ScreenComponent, params } = useBrandedScreen<ParamsType, PropsType>({
  config: {
    [Brand.yourcompany]: MyScreen,
    [BrandCategory.RTE]: { component: RTEScreen, overrideParams: { foo: 'bar' } },
    default: DefaultScreen,
  },
  globalParams: { shared: 'value' },
});
return <ScreenComponent {...params} />;
```

**Use branded renderer:**
```typescript
const BrandedComponent = useBrandedRenderer({
  [Brand.yourcompany]: () => <YourCompanyComponent prop="value" />,
  [BrandCategory.RTE]: () => <RTEComponent />,
  default: () => <DefaultComponent />,
});
return <View>{BrandedComponent}</View>;
```

**Check brand category:**
```typescript
const isRTE = brandCategoryMap[BrandCategory.RTE].includes(brand);
const isMealKit = brandCategoryMap[BrandCategory.MealKit].includes(brand);
```

**Available Brands:**
- `Brand.yourcompany` - YourCompany (MealKit category, 19 countries)
- `Brand.factor` - Factor (RTE category, 7 countries)
- `Brand.everyplate` - EveryPlate (WLMealKit category, US + AU)
- `Brand.greenchef` - GreenChef (WLMealKit category, US + GB + NL)
- `Brand.chefsplate` - ChefsPlate (WLMealKit category, CA)
- `Brand.youfoodz` - YouFoodz (RTE category, AU)
- `Brand.goodchop` - GoodChop (US)
- `Brand.petstable` - PetTable (US)
- `Brand.vds` - VDS (no countries configured)

**Brand Categories:**
- `BrandCategory.RTE` - Ready-to-Eat (Factor, YouFoodz)
- `BrandCategory.WLMealKit` - White-Label Meal Kits (EveryPlate, GreenChef, ChefsPlate)
- `BrandCategory.MealKit` - All Meal Kits (WLMealKit + YourCompany)

**Key Directories:**
- `src/libs/system-country/` - Brand enums and mappings
- `src/libs/brand-variants/` - Brand rendering hooks
- `src/features/*/` - Feature-specific brand logic
- `plop/scripts/` - Brand asset generation

**Key Hooks:**
- `useBrandedScreen` - Swap entire screens by brand
- `useBrandedRenderer` - Render brand-specific components inline
- `AppConfigDataAccess.queries.useBrandState()` - Get current brand
- `useBrandConfig()` - Get build-time brand configuration

For production examples with complete code implementations and unit tests, see [references/examples.md](references/examples.md).
