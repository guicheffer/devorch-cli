# Multi-Brand System (Mobile) - Production Examples

This document contains real production code examples from the YourCompany React Native codebase demonstrating multi-brand patterns.

## Example 1: Brand Enum and Categories

**File**: `src/libs/system-country/Brand.ts:1`

This example shows the core Brand enum definition.

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

export const REMOTE_BRANDS = {
  [Brand.yourcompany]: 'BRAND_YOURCOMPANY',
  [Brand.everyplate]: 'BRAND_EVERYPLATE',
  [Brand.chefsplate]: 'BRAND_CHEFS_PLATE',
  [Brand.greenchef]: 'BRAND_GREEN_CHEF',
  [Brand.factor]: 'BRAND_FACTOR75',
  [Brand.youfoodz]: 'BRAND_YOUFOODZ',
};
```

**Key patterns demonstrated:**
- Enum ensures type safety across the codebase
- `BrandCategory` groups brands for shared logic
- `REMOTE_BRANDS` maps to backend identifiers
- JSDoc comments explain category context

---

**File**: `src/libs/brand-variants/brandCategoryMap.ts:1`

This example shows the brand category mapping.

```typescript
import { Brand, BrandCategory } from '@libs/system-country';

/**
 * @context Maps each `BrandCategory` to a list of associated `Brand` values.
 *
 * This allows shared logic to be defined for grouped brands without
 * duplicating entries across config files or screen mappings.
 *
 * Used by hooks `useBrandedScreen`, `useBrandedRenderer` and `useBrandCategory` to resolve screen components
 * when a category key is provided instead of a specific brand.
 */
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

**Key patterns demonstrated:**
- Central mapping from categories to brands
- Used by `useBrandedScreen` and `useBrandedRenderer`
- Enables checking if brand belongs to category via `includes()`
- Three-tier categorization (RTE, WLMealKit, MealKit)

---

## Example 2: useBrandedScreen Hook

**File**: `src/libs/brand-variants/use-branded-screen/useBrandedScreen.ts:54`

This example shows the `useBrandedScreen` hook for swapping entire screens.

```typescript
import { useMemo } from 'react';
import { AppConfigDataAccess } from '@data-access/native';
import type { BrandCategory } from '@libs/system-country';
import { brandCategoryMap } from '../brandCategoryMap';
import { extractComponentAndParams } from './helpers';
import type { UseBrandedScreenArgs, UseBrandedScreenResult } from './types';

/**
 * Resolves the appropriate screen component and params for the current brand or brand category.
 *
 * This hook supports:
 * - Exact brand matches (e.g., `Brand.yourcompany`)
 * - Brand category fallbacks (e.g., `BrandCategory.RTE`)
 * - A `default` fallback if no match is found
 *
 * 🔹 Use this when:
 * - You need to swap out full screen components across brands
 * - Layout, logic, or flow differs significantly between brands
 *
 * ✅ Automatically:
 * - Pulls the current brand from AppConfigDataAccess
 * - Merges global screen params with brand-specific overrides
 *
 * 🚫 Not suitable for:
 * - Inline JSX with custom props → use `useBrandedRenderer`
 * - Small component or asset swaps → use `useFeatureVariant`
 *
 * @example
 * const { ScreenComponent, params } = useBrandedScreen<
 *   undefined,
 *   HomefrontScreenProps
 * >({
 *   config: {
 *     [BrandCategory.MealKit]: Homefront,
 *     [BrandCategory.RTE]: { component: RTEHome, overrideParams: { showBanner: false } },
 *     default: Homefront,
 *   },
 *   globalParams: { showBanner: true },
 * });
 */
export const useBrandedScreen = <
  TParams,
  TScreenProps extends Record<string, unknown>,
>({
  config,
  globalParams,
}: UseBrandedScreenArgs<TParams, TScreenProps>): UseBrandedScreenResult<
  TParams,
  TScreenProps
> => {
  const { data: brand } = AppConfigDataAccess.queries.useBrandState();

  return useMemo(() => {
    if (!brand) {
      throw new Error(
        '@libs/brand-variants | useBrandedScreen | Brand not available in AppConfigDataAccess'
      );
    }

    // 1. Check for direct brand match
    const directEntry = config[brand];

    if (directEntry) {
      const { Component, overrideParams } =
        extractComponentAndParams(directEntry);

      return {
        ScreenComponent: Component as React.ComponentType<TScreenProps>,
        params: { ...globalParams, ...(overrideParams || {}) } as TParams,
      };
    }

    // 2. Check for brand category match
    for (const [key, entry] of Object.entries(config)) {
      if (key === 'default') {
        continue;
      }

      const category = key as BrandCategory;
      const matchingBrands = brandCategoryMap[category];

      if (matchingBrands?.includes(brand)) {
        const { Component, overrideParams } = extractComponentAndParams(entry);

        return {
          ScreenComponent: Component as React.ComponentType<TScreenProps>,
          params: { ...globalParams, ...(overrideParams || {}) } as TParams,
        };
      }
    }

    // 3. Fallback to default
    const fallback = config.default;
    const { Component, overrideParams } = extractComponentAndParams(fallback);

    return {
      ScreenComponent: Component as React.ComponentType<TScreenProps>,
      params: { ...globalParams, ...(overrideParams || {}) } as TParams,
    };
  }, [brand, config, globalParams]);
};
```

**Key patterns demonstrated:**
- Three-step resolution: direct brand → category → default
- Type-safe with generics for params and props
- Merges `globalParams` with `overrideParams`
- Pulls brand from AppConfigDataAccess
- Throws error if brand not available

---

**File**: `src/libs/brand-variants/use-branded-screen/useBrandedScreen.test.ts:1`

This example shows unit tests for `useBrandedScreen`.

```typescript
import { renderHook, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { AppConfigDataAccess } from '@data-access/native';
import { Brand, BrandCategory } from '@libs/system-country';
import { useBrandedScreen } from './useBrandedScreen';

jest.mock('@data-access/native', () => ({
  AppConfigDataAccess: {
    queries: {
      useBrandState: jest.fn(),
    },
  },
}));

describe('useBrandedScreen', () => {
  const mockUseBrandState = AppConfigDataAccess.queries
    .useBrandState as jest.Mock;

  const YourCompanyScreen = () => <Text>YourCompany</Text>;
  const RTEScreen = () => <Text>RTE</Text>;
  const DefaultScreen = () => <Text>Default</Text>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves exact brand match', () => {
    mockUseBrandState.mockReturnValue({ data: Brand.yourcompany });

    const { result } = renderHook(() =>
      useBrandedScreen({
        config: {
          [Brand.yourcompany]: YourCompanyScreen,
          default: DefaultScreen,
        },
      })
    );

    render(<result.current.ScreenComponent {...result.current.params} />);
    expect(screen.getByText('YourCompany')).toBeTruthy();
  });

  it('resolves brand category match', () => {
    // Factor belongs to BrandCategory.RTE
    mockUseBrandState.mockReturnValue({ data: Brand.factor });

    const { result } = renderHook(() =>
      useBrandedScreen({
        config: {
          [BrandCategory.RTE]: RTEScreen,
          default: DefaultScreen,
        },
      })
    );

    render(<result.current.ScreenComponent {...result.current.params} />);
    expect(screen.getByText('RTE')).toBeTruthy();
  });

  it('merges global and override params', () => {
    mockUseBrandState.mockReturnValue({ data: Brand.factor });

    const { result } = renderHook(() =>
      useBrandedScreen<{ show: boolean; count: number }, any>({
        config: {
          [BrandCategory.RTE]: {
            component: RTEScreen,
            overrideParams: { show: false },
          },
          default: DefaultScreen,
        },
        globalParams: { show: true, count: 5 },
      })
    );

    expect(result.current.params).toEqual({ show: false, count: 5 });
  });
});
```

**Key patterns demonstrated:**
- Mock AppConfigDataAccess for testing
- Test all three resolution paths
- Verify param merging logic
- Use `renderHook` from React Testing Library

---

## Example 3: useBrandedRenderer Hook

**File**: `src/libs/brand-variants/use-branded-renderer/useBrandedRenderer.ts:45`

This example shows the `useBrandedRenderer` hook for inline component rendering.

```typescript
import { useMemo } from 'react';
import { AppConfigDataAccess } from '@data-access/native';
import type { BrandCategory } from '@libs/system-country';
import { brandCategoryMap } from '../brandCategoryMap';
import type { BrandedRendererConfig } from './types';

/**
 * Resolves and returns a JSX element for the current brand or brand category.
 *
 * This hook supports:
 * - Exact brand matches (e.g., `Brand.yourcompany`)
 * - Brand category fallbacks (e.g., `BrandCategory.RTE`)
 * - A `default` fallback if no match is found
 *
 * 🔹 Use this when:
 * - You need to render brand-specific components that do **not** share a common prop interface
 * - You want flexible inline rendering based on brand context
 *
 * ✅ Automatically:
 * - Selects the most specific matching function from the config
 * - Calls and returns the result of that function
 *
 * 🚫 Not suitable for:
 * - Full screen changes → use `useBrandedScreen`
 * - Asset/component variant swaps with shared props → use `useFeatureVariant`
 *
 * @example
 * const BrandedComponent = useBrandedRenderer({
 *   [Brand.yourcompany]: () => <YourCompanyComponent />,
 *   [Brand.factor]: () => <FactorComponent />,
 *   [BrandCategory.RTE]: () => <RTEComponent />,
 *   default: () => <DefaultComponent />,
 * });
 *
 * return <View>{BrandedComponent}</View>;
 */
export const useBrandedRenderer = (
  config: BrandedRendererConfig
): JSX.Element => {
  const { data: brand } = AppConfigDataAccess.queries.useBrandState();

  const brandedComponentFunction = useMemo(() => {
    if (!brand) {
      throw new Error(
        '@libs/brand-variants | useBrandedRenderer | Brand not available in AppConfigDataAccess'
      );
    }

    // 1. Direct brand match
    if (brand && config[brand]) {
      return config[brand]!;
    }

    // 2. Check brand categories
    for (const categoryKey of Object.keys(
      brandCategoryMap
    ) as BrandCategory[]) {
      const brandsInCategory = brandCategoryMap[categoryKey];

      if (brand && brandsInCategory.includes(brand)) {
        const element = config[categoryKey];

        if (element) {
          return element;
        }
      }
    }

    // 3. Fallback default
    return config.default;
  }, [brand, config]);

  return brandedComponentFunction();
};
```

**Key patterns demonstrated:**
- Returns JSX directly (not component + params)
- Same three-step resolution as `useBrandedScreen`
- Functions in config allow custom props per brand
- Simpler API for inline rendering

---

**File**: `src/libs/brand-variants/use-branded-renderer/useBrandedRenderer.test.tsx:1`

This example shows unit tests for `useBrandedRenderer`.

```typescript
import { renderHook, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { AppConfigDataAccess } from '@data-access/native';
import { Brand, BrandCategory } from '@libs/system-country';
import { useBrandedRenderer } from './useBrandedRenderer';

jest.mock('@data-access/native', () => ({
  AppConfigDataAccess: {
    queries: {
      useBrandState: jest.fn(),
    },
  },
}));

describe('useBrandedRenderer', () => {
  const mockUseBrandState = AppConfigDataAccess.queries
    .useBrandState as jest.Mock;

  const YourCompanyComponent = () => <Text>YourCompany</Text>;
  const RTEComponent = () => <Text>RTE</Text>;
  const DefaultComponent = () => <Text>Default</Text>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the component for the exact brand match', () => {
    mockUseBrandState.mockReturnValue({ data: Brand.yourcompany });

    const { result } = renderHook(() =>
      useBrandedRenderer({
        [Brand.yourcompany]: () => <YourCompanyComponent />,
        default: () => <DefaultComponent />,
      })
    );

    render(<>{result.current}</>);
    expect(screen.getByText('YourCompany')).toBeTruthy();
  });

  it('renders the component for the brand category match', () => {
    // factor belongs to BrandCategory.RTE
    mockUseBrandState.mockReturnValue({ data: Brand.factor });

    const { result } = renderHook(() =>
      useBrandedRenderer({
        [BrandCategory.RTE]: () => <RTEComponent />,
        default: () => <DefaultComponent />,
      })
    );

    render(<>{result.current}</>);
    expect(screen.getByText('RTE')).toBeTruthy();
  });

  it('renders the default component if no match is found', () => {
    mockUseBrandState.mockReturnValue({ data: Brand.greenchef });

    const { result } = renderHook(() =>
      useBrandedRenderer({
        [Brand.yourcompany]: () => <YourCompanyComponent />,
        default: () => <DefaultComponent />,
      })
    );

    render(<>{result.current}</>);
    expect(screen.getByText('Default')).toBeTruthy();
  });

  it('throws an error if brand is missing', () => {
    mockUseBrandState.mockReturnValue({ data: undefined });

    const originalError = console.error;
    console.error = jest.fn();

    expect(() =>
      renderHook(() =>
        useBrandedRenderer({
          default: () => <DefaultComponent />,
        })
      )
    ).toThrow(
      '@libs/brand-variants | useBrandedRenderer | Brand not available in AppConfigDataAccess'
    );

    console.error = originalError;
  });
});
```

**Key patterns demonstrated:**
- Test exact brand, category, and default paths
- Verify error handling when brand unavailable
- Use `<>{result.current}</>` to render JSX result

---

## Example 4: Brand Configuration with Expo

**File**: `apps/expo-app/src/hooks/useBrandConfig.ts:13`

This example shows accessing build-time brand configuration.

```typescript
import Constants from 'expo-constants';
import { useMemo } from 'react';

type ExtraConfig = {
  brandName: string;
  brandColors: {
    primary: string;
    secondary: string;
    background: string;
  };
};

export const useBrandConfig = () => {
  return useMemo(() => {
    const extraConfig = Constants.expoConfig?.extra as ExtraConfig | undefined;

    if (!extraConfig) {
      throw new Error(
        'Brand configuration not found in Constants. This indicates a configuration issue with the whitelabeling setup.'
      );
    }

    return {
      brandName: extraConfig.brandName,
      colors: extraConfig.brandColors,
    };
  }, []);
};

// Usage in component
const MyComponent = () => {
  const { brandName, colors } = useBrandConfig();

  return (
    <View style={{ backgroundColor: colors.primary }}>
      <Text>Welcome to {brandName}</Text>
    </View>
  );
};
```

**Key patterns demonstrated:**
- Access build-time configuration via `expo-constants`
- Type-safe with `ExtraConfig` interface
- Error handling for missing configuration
- Memoized for performance
- Use for brand-specific styling

---

## Example 5: Brand-Specific Assets

**File**: `src/libs/error-boundary/fallback-ui/brandErrorBoundaryImages.ts:1`

This example shows brand-specific asset mapping.

```typescript
import { Brand } from '@libs/system-country';

export const brandErrorBoundaryImages: Record<Brand, any> = {
  [Brand.yourcompany]: require('@assets/images/yourcompany/error.png'),
  [Brand.factor]: require('@assets/images/factor/error.png'),
  [Brand.everyplate]: require('@assets/images/everyplate/error.png'),
  [Brand.greenchef]: require('@assets/images/greenchef/error.png'),
  [Brand.chefsplate]: require('@assets/images/chefsplate/error.png'),
  [Brand.youfoodz]: require('@assets/images/youfoodz/error.png'),
  [Brand.goodchop]: require('@assets/images/goodchop/error.png'),
  [Brand.petstable]: require('@assets/images/petstable/error.png'),
  [Brand.vds]: require('@assets/images/default/error.png'),
};

// Usage
import { AppConfigDataAccess } from '@data-access/native';
import { brandErrorBoundaryImages } from './brandErrorBoundaryImages';

const ErrorScreen = () => {
  const { data: brand } = AppConfigDataAccess.queries.useBrandState();
  const errorImage = brand ? brandErrorBoundaryImages[brand] : null;

  return (
    <View>
      <Image source={errorImage} />
      <Text>Something went wrong</Text>
    </View>
  );
};
```

**Key patterns demonstrated:**
- Centralized asset mapping per brand
- `Record<Brand, any>` ensures all brands have assets
- Fallback handling when brand unavailable
- Use `require()` for static assets

---

## Example 6: Brand-Specific Tracking

**File**: `src/features/factor-form-entrypoint/hooks/useSubBrandTracking.ts:1`

This example shows brand-aware analytics tracking.

```typescript
import { AppConfigDataAccess } from '@data-access/native';
import { Brand } from '@libs/system-country';
import { track } from '@libs/analytics';

export const useSubBrandTracking = () => {
  const { data: brand } = AppConfigDataAccess.queries.useBrandState();

  const trackEvent = (
    eventName: string,
    properties: Record<string, any>
  ) => {
    track({
      event: eventName,
      properties: {
        ...properties,
        brand: brand || Brand.yourcompany,
        isSubBrand: brand === Brand.factor,
        brandCategory: getBrandCategory(brand),
      },
    });
  };

  const trackScreenView = (screenName: string) => {
    trackEvent('screen_view', {
      screen_name: screenName,
    });
  };

  return { trackEvent, trackScreenView };
};

// Usage
const ProductScreen = () => {
  const { trackEvent, trackScreenView } = useSubBrandTracking();

  useEffect(() => {
    trackScreenView('product_details');
  }, []);

  const handleAddToCart = () => {
    trackEvent('add_to_cart', {
      product_id: '123',
      quantity: 2,
    });
  };

  return <ProductView onAddToCart={handleAddToCart} />;
};
```

**Key patterns demonstrated:**
- Centralized tracking with brand context
- Brand automatically added to all events
- Sub-brand detection (`isSubBrand`)
- Reusable tracking hooks

---

## Example 7: Dynamic Brand Features

**File**: `src/features/dynamic-screen-feature/widgets/benefits-carousel-widget/brandBenefitCarouselAssetsMap.ts:1`

This example shows brand-category-based feature configuration.

```typescript
import { Brand, BrandCategory } from '@libs/system-country';
import { brandCategoryMap } from '@libs/brand-variants';

type Benefit = {
  title: string;
  icon: string;
  description: string;
};

export const getBenefitsForBrand = (brand: Brand): Benefit[] => {
  // RTE brands (Factor, YouFoodz)
  if (brandCategoryMap[BrandCategory.RTE].includes(brand)) {
    return [
      {
        title: 'Ready to Eat',
        icon: 'meal',
        description: 'No cooking required',
      },
      {
        title: 'Fresh Meals',
        icon: 'fresh',
        description: 'Chef-prepared',
      },
      {
        title: 'Flexible',
        icon: 'calendar',
        description: 'Skip or cancel anytime',
      },
    ];
  }

  // MealKit brands (YourCompany, EveryPlate, GreenChef, ChefsPlate)
  if (brandCategoryMap[BrandCategory.MealKit].includes(brand)) {
    return [
      {
        title: 'Fresh Ingredients',
        icon: 'fresh',
        description: 'Delivered to your door',
      },
      {
        title: 'Easy Recipes',
        icon: 'recipe',
        description: 'Step-by-step instructions',
      },
      {
        title: 'Family Friendly',
        icon: 'family',
        description: 'Options for everyone',
      },
    ];
  }

  // Default/other brands
  return [];
};

// Usage
const BenefitsCarousel = () => {
  const { data: brand } = AppConfigDataAccess.queries.useBrandState();
  const benefits = brand ? getBenefitsForBrand(brand) : [];

  return (
    <ScrollView horizontal>
      {benefits.map((benefit) => (
        <BenefitCard key={benefit.title} {...benefit} />
      ))}
    </ScrollView>
  );
};
```

**Key patterns demonstrated:**
- Category-based feature configuration
- Avoid hardcoding individual brands
- Empty array fallback for unmatched brands
- Type-safe benefit definitions

---

## Example 8: Brand Asset Generation Scripts

**File**: `plop/scripts/generate_brand_assets.sh:1`

This example shows automated brand asset generation.

```bash
#!/bin/bash

# Generate brand assets map for all brands
echo "Generating brand assets map..."

# Build the asset map using node script
node plop/scripts/build_brand_assets_map.cjs

echo "Brand assets generated successfully!"
```

**File**: `plop/scripts/build_brand_assets_map.cjs:1`

```javascript
const fs = require('fs');
const path = require('path');

const BRANDS = [
  'yourcompany',
  'factor',
  'everyplate',
  'greenchef',
  'chefsplate',
  'youfoodz',
  'goodchop',
  'petstable',
  'vds',
];

const ASSET_TYPES = ['logo', 'splash', 'icon', 'error'];

function generateBrandAssetMap() {
  const assetMap = {};

  BRANDS.forEach((brand) => {
    assetMap[brand] = {};

    ASSET_TYPES.forEach((type) => {
      const assetPath = `@assets/images/${brand}/${type}.png`;
      assetMap[brand][type] = assetPath;
    });
  });

  const outputPath = path.join(
    __dirname,
    '../../src/libs/brand-variants/brandAssetMap.ts'
  );

  const fileContent = `// Auto-generated by plop/scripts/build_brand_assets_map.cjs
import { Brand } from '@libs/system-country';

export const brandAssetMap: Record<Brand, Record<string, any>> = ${JSON.stringify(
    assetMap,
    null,
    2
  ).replace(/"require\((.*?)\)"/g, 'require($1)')};
`;

  fs.writeFileSync(outputPath, fileContent);
  console.log('✅ Brand asset map generated at:', outputPath);
}

generateBrandAssetMap();
```

**Key patterns demonstrated:**
- Automated generation ensures all brands have assets
- Script generates TypeScript file from configuration
- Reduces manual maintenance of asset maps
- Run during build or as pre-commit hook

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

### 2. Brand Category Checks
Use `brandCategoryMap` for category checks:
```typescript
// ✅ Good
if (brandCategoryMap[BrandCategory.RTE].includes(brand)) { }

// ❌ Bad
if (brand === Brand.factor || brand === Brand.youfoodz) { }
```

### 3. AppConfig for Runtime Brand
Use AppConfigDataAccess for reactive brand state:
```typescript
// ✅ Good
const { data: brand } = AppConfigDataAccess.queries.useBrandState();

// ❌ Bad
const brand = Constants.expoConfig?.extra?.brandName;
```

### 4. Screen-Level Brand Swapping
Use `useBrandedScreen` for full screens:
```typescript
const { ScreenComponent, params } = useBrandedScreen({
  config: {
    [Brand.yourcompany]: YourCompanyScreen,
    [BrandCategory.RTE]: RTEScreen,
    default: DefaultScreen,
  },
});
return <ScreenComponent {...params} />;
```

### 5. Inline Component Rendering
Use `useBrandedRenderer` for inline components:
```typescript
const BrandedHeader = useBrandedRenderer({
  [Brand.yourcompany]: () => <YourCompanyHeader />,
  [BrandCategory.RTE]: () => <RTEHeader />,
  default: () => <DefaultHeader />,
});
return <View>{BrandedHeader}</View>;
```

### 6. Brand-Specific Assets
Create centralized asset maps:
```typescript
const brandImages: Record<Brand, any> = {
  [Brand.yourcompany]: require('@assets/yourcompany.png'),
  [Brand.factor]: require('@assets/factor.png'),
  // ... all brands
};
```

### 7. Brand-Aware Analytics
Include brand in all tracking:
```typescript
track({
  event: 'action',
  properties: {
    ...data,
    brand: brand || Brand.yourcompany,
    brandCategory: getBrandCategory(brand),
  },
});
```
