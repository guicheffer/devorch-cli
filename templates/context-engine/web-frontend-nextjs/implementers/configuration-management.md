---
domain: configuration-management
description: Configuration management with typed config hooks, locale-based configs, and environment-specific settings
---

# Configuration Management

Manage configuration using custom hooks from whitelabel-libraries that provide typed configuration objects, organized by environment and locale.

## Core Patterns

### 1. Config Hooks from Whitelabel Libraries

**Pattern:** Configuration is accessed through custom hooks that provide typed configuration objects.

**Example from PR #60787:**
```typescript
import { useGlobalChatConfig } from '@/features/global-chat-feature/config';

const ChatBubble: React.FC = () => {
  const {
    colors: { bubbleBgColor, bubbleForeGroundColor, bubbleHoverColor },
    position,
    zIndex,
  } = useGlobalChatConfig();

  return (
    <Box
      backgroundColor={bubbleBgColor}
      color={bubbleForeGroundColor}
      _hover={{ backgroundColor: bubbleHoverColor }}
      position={position}
      zIndex={zIndex}
    >
      <ChatIcon />
    </Box>
  );
};
```

**Example from PR #60718:**
```typescript
import { useCheckoutConfig } from '../config';
import { useDeliveryOptionsConfig } from '@/whitelabel-libraries/config/deliveryOptions/useDeliveryOptionsConfig';

const DeliveryOptionsComponent: React.FC = () => {
  const { enableExpressDelivery, defaultCutoffHours } = useDeliveryOptionsConfig();
  const { paymentProviders } = useCheckoutConfig();

  // Use config values
  if (enableExpressDelivery) {
    // Show express delivery options
  }
};
```

**Frequency:** 100% of components needing configuration

**Why:** Typed config hooks provide:
- Type safety at compile time
- Centralized configuration management
- Easy testing with mock config providers
- Runtime validation

### 2. Locale-Based Configuration with createConfigFromHash

**Pattern:** Multi-locale configurations use `createConfigFromHash` utility to map locale keys to configuration objects.

**Example from PR #60798:**
```typescript
import { createConfigFromHash } from '@/whitelabel-libraries/config/utils';
import { Locales, type Locale } from '@/libs/locale';

interface ScriptsConfig {
  surveyId: number;
  callType: string;
  deploymentId: string;
  logoSrc: string;
}

const deploymentConfig = (config: ScriptsConfig) => ({
  ...config,
  enabled: true,
});

export const yourcompanyScriptsConfig = createConfigFromHash<ScriptsConfig, Locale>(
  'locale',
  {
    [Locales.deAT]: deploymentConfig({
      surveyId: 939,
      callType: 'de-AT CHATBOT',
      deploymentId: '396d0221-97bb-45d3-a1fd-f96c34fbd509',
      logoSrc: 'https://media.yourcompany.com/w_200/yourcompany_website/logo/Logo_square.png',
    }),
    [Locales.deCH]: deploymentConfig({
      surveyId: 940,
      callType: 'de-CH CHATBOT',
      deploymentId: '0bd2d421-4b25-48a0-9c04-d0207965862a',
      logoSrc: 'https://media.yourcompany.com/w_200/yourcompany_website/logo/Logo_square.png',
    }),
    [Locales.deDE]: deploymentConfig({
      surveyId: 938,
      callType: 'de-DE CHATBOT',
      deploymentId: '4e47c4a0-04fc-4a74-9e1a-7e3a80f7a4d3',
      logoSrc: 'https://media.yourcompany.com/w_200/yourcompany_website/logo/Logo_square.png',
    }),
  },
  defaultConfig, // Fallback config for unsupported locales
  { skipValidation: false }
);

// Usage with hook
export const useGlobalChatConfig = () => {
  const locale = useSelectedLocale();
  return yourcompanyScriptsConfig[locale] || yourcompanyScriptsConfig.default;
};
```

**Frequency:** 70% of multi-locale configurations

**Key Points:**
- Use `createConfigFromHash` for locale-keyed configurations
- Provide default/fallback config for unsupported locales
- Type the config with TypeScript interfaces
- Include validation unless explicitly skipped

### 3. Feature Configuration by Environment

**Pattern:** Configurations are organized by environment (live, stage, local) in separate files within feature directories.

**Directory Structure:**
```
app/features/global-chat-feature/
  config/
    live/
      yourcompany.ts          # Production config
      whitelabels.ts
    stage/
      yourcompany.ts          # Staging config
      whitelabels.ts
    local/
      yourcompany.ts          # Development config
    index.ts                 # Config selector
```

**Example from PR #60798:**
```typescript
// File: app/features/global-chat-feature/config/live/yourcompany.ts
export const yourcompanyScriptsConfig = createConfigFromHash<ScriptsConfig, Locale>(
  'locale',
  {
    [Locales.deAT]: deploymentConfig({
      deploymentId: '396d0221-97bb-45d3-a1fd-f96c34fbd509', // Live deployment ID
    }),
  },
  config
);

// File: app/features/global-chat-feature/config/stage/yourcompany.ts
export const yourcompanyScriptsConfig = createConfigFromHash<ScriptsConfig, Locale>(
  'locale',
  {
    [Locales.deAT]: deploymentConfig({
      deploymentId: 'staging-deployment-id', // Staging deployment ID
    }),
  },
  config
);

// File: app/features/global-chat-feature/config/index.ts
import { yourcompanyScriptsConfig as liveConfig } from './live/yourcompany';
import { yourcompanyScriptsConfig as stageConfig } from './stage/yourcompany';
import { yourcompanyScriptsConfig as localConfig } from './local/yourcompany';

const getConfigByEnvironment = () => {
  if (process.env.NEXT_PUBLIC_ENV === 'live') {
    return liveConfig;
  }
  if (process.env.NEXT_PUBLIC_ENV === 'stage') {
    return stageConfig;
  }
  return localConfig;
};

export const useGlobalChatConfig = () => {
  const locale = useSelectedLocale();
  const config = getConfigByEnvironment();
  return config[locale];
};
```

**Frequency:** 80% of environment-specific features

### 4. Type-Safe Configuration Objects

**Pattern:** Configuration objects have explicit TypeScript interfaces with all required fields.

**Example:**
```typescript
interface ChatConfig {
  // Feature toggles
  enabled: boolean;
  enableDirectToAgent: boolean;
  enableChatBubble: boolean;

  // Visual configuration
  colors: {
    bubbleBgColor: string;
    bubbleForeGroundColor: string;
    bubbleHoverColor: string;
  };
  position: {
    bottom: string;
    right: string;
  };
  zIndex: number;

  // Integration configuration
  deploymentId: string;
  surveyId: number;
  callType: string;
  logoSrc: string;

  // Timing configuration
  idleTimeoutMs: number;
  reconnectDelayMs: number;
}

// Validate at runtime with Zod or similar
import { z } from 'zod';

const ChatConfigSchema = z.object({
  enabled: z.boolean(),
  enableDirectToAgent: z.boolean(),
  colors: z.object({
    bubbleBgColor: z.string(),
    bubbleForeGroundColor: z.string(),
    bubbleHoverColor: z.string(),
  }),
  deploymentId: z.string().uuid(),
  // ... rest of schema
});

export type ChatConfig = z.infer<typeof ChatConfigSchema>;

// Validate config on load
export const validateConfig = (config: unknown): ChatConfig => {
  return ChatConfigSchema.parse(config);
};
```

**Frequency:** 85% of configuration objects

## Implementation Guidelines

### When to Use Config Hooks

Use configuration hooks for:
- ✅ Feature toggles and flags
- ✅ Third-party service credentials (deployment IDs, API keys)
- ✅ Visual styling that varies by brand/locale
- ✅ Timeout/retry configuration
- ✅ Multi-locale content (URLs, phone numbers, addresses)

Don't use config hooks for:
- ❌ Translations (use useT9n instead)
- ❌ Feature flags (use Statsig instead)
- ❌ User preferences (use state management)
- ❌ Runtime data (use data-access layer)

### File Organization

```
app/features/{feature-name}/
  config/
    live/              # Production configuration
      yourcompany.ts
      whitelabels.ts
    stage/             # Staging configuration
      yourcompany.ts
      whitelabels.ts
    local/             # Development configuration
      yourcompany.ts
    types.ts           # TypeScript interfaces
    index.ts           # Config hook export
    utils.ts           # Config utilities
```

### Creating a New Config Hook

1. **Define TypeScript interface:**
```typescript
// config/types.ts
export interface MyFeatureConfig {
  enabled: boolean;
  apiEndpoint: string;
  timeout: number;
}
```

2. **Create locale-based config:**
```typescript
// config/live/yourcompany.ts
import { createConfigFromHash } from '@/whitelabel-libraries/config/utils';
import type { MyFeatureConfig } from '../types';

export const myFeatureConfig = createConfigFromHash<MyFeatureConfig, Locale>(
  'locale',
  {
    [Locales.enUS]: {
      enabled: true,
      apiEndpoint: 'https://api.yourcompany.com/v1',
      timeout: 5000,
    },
    [Locales.deDE]: {
      enabled: true,
      apiEndpoint: 'https://api.yourcompany.de/v1',
      timeout: 5000,
    },
  },
  defaultConfig
);
```

3. **Create config hook:**
```typescript
// config/index.ts
import { useSelectedLocale } from '@/libs/locale';
import { myFeatureConfig as liveConfig } from './live/yourcompany';
import { myFeatureConfig as stageConfig } from './stage/yourcompany';

const getConfigByEnvironment = () => {
  if (process.env.NEXT_PUBLIC_ENV === 'live') return liveConfig;
  if (process.env.NEXT_PUBLIC_ENV === 'stage') return stageConfig;
  return liveConfig; // Default to live
};

export const useMyFeatureConfig = (): MyFeatureConfig => {
  const locale = useSelectedLocale();
  const config = getConfigByEnvironment();
  return config[locale];
};
```

4. **Use in components:**
```typescript
import { useMyFeatureConfig } from '@/features/my-feature/config';

const MyComponent: React.FC = () => {
  const { enabled, apiEndpoint, timeout } = useMyFeatureConfig();

  if (!enabled) {
    return null;
  }

  // Use config values
  const { data } = useQuery(
    ['myData'],
    () => fetchData(apiEndpoint),
    { staleTime: timeout }
  );

  return <div>{/* Component content */}</div>;
};
```

## Testing Configuration

### Unit Tests

```typescript
import { renderHook } from '@testing-library/react-hooks';
import { useMyFeatureConfig } from './config';

jest.mock('@/libs/locale', () => ({
  useSelectedLocale: jest.fn(() => 'en-US'),
}));

describe('useMyFeatureConfig', () => {
  it('should return config for current locale', () => {
    const { result } = renderHook(() => useMyFeatureConfig());

    expect(result.current).toEqual({
      enabled: true,
      apiEndpoint: 'https://api.yourcompany.com/v1',
      timeout: 5000,
    });
  });

  it('should return fallback config for unsupported locale', () => {
    jest.requireMock('@/libs/locale').useSelectedLocale.mockReturnValue('xx-XX');

    const { result } = renderHook(() => useMyFeatureConfig());

    expect(result.current).toEqual(defaultConfig);
  });
});
```

### Integration Tests

```typescript
import { render, screen } from '@testing-library/react';
import MyComponent from './MyComponent';

// Mock config module
jest.mock('./config', () => ({
  useMyFeatureConfig: jest.fn(() => ({
    enabled: true,
    apiEndpoint: 'https://test-api.com',
    timeout: 1000,
  })),
}));

describe('MyComponent with config', () => {
  it('should use config values', () => {
    render(<MyComponent />);
    // Test component behavior with mocked config
  });
});
```

## Anti-Patterns to Avoid

❌ **Don't hardcode configuration in components:**
```typescript
// ❌ Bad
const MyComponent = () => {
  const apiUrl = 'https://api.yourcompany.com/v1'; // Hardcoded
  const timeout = 5000; // Hardcoded
};
```

✅ **Use config hooks:**
```typescript
// ✅ Good
const MyComponent = () => {
  const { apiEndpoint, timeout } = useMyFeatureConfig();
};
```

❌ **Don't use environment variables directly in components:**
```typescript
// ❌ Bad
const MyComponent = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL; // Direct access
};
```

✅ **Encapsulate in config hooks:**
```typescript
// ✅ Good - in config file
const getApiUrl = () => {
  return process.env.NEXT_PUBLIC_API_URL || 'https://api.yourcompany.com';
};

// In component
const { apiEndpoint } = useMyFeatureConfig();
```

## Related Implementers

- **localization.md** - For translations and locale-specific content
- **feature-flags.md** - For Statsig-based feature flags
- **data-access-layer.md** - For API configuration in data-access modules
