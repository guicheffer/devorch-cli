---
domain: observability
description: OpenTelemetry with SpanProvider, AttributesProvider, useTracer/useNetworkTracer hooks
---

# Observability Implementer

This implementer defines patterns for implementing observability in React Native applications using OpenTelemetry, including distributed tracing with SpanProvider, AttributesProvider for context propagation, and custom hooks for tracing user interactions and network requests.

## Core Patterns

### OpenTelemetry Configuration

Set up OpenTelemetry for React Native:

```typescript
// src/observability/config.ts
import { trace, context, SpanStatusCode, Span } from '@opentelemetry/api';
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

// Configure resource
const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: 'mobile-app',
  [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
  [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: __DEV__ ? 'development' : 'production',
});

// Configure exporter
const exporter = new OTLPTraceExporter({
  url: 'https://your-otel-collector/v1/traces',
  headers: {
    'x-api-key': 'your-api-key',
  },
});

// Configure provider
const provider = new WebTracerProvider({
  resource,
});

// Add batch processor
provider.addSpanProcessor(new BatchSpanProcessor(exporter));

// Register provider
provider.register();

// Register instrumentations
registerInstrumentations({
  instrumentations: [
    new XMLHttpRequestInstrumentation({
      propagateTraceHeaderCorsUrls: [/https:\/\/api\.example\.com/],
    }),
    new FetchInstrumentation({
      propagateTraceHeaderCorsUrls: [/https:\/\/api\.example\.com/],
    }),
  ],
});

export const tracer = trace.getTracer('mobile-app', '1.0.0');
```

### Span Provider Context

Create context for managing active spans:

```typescript
// src/observability/SpanProvider.tsx
import React, { createContext, useContext, useCallback, ReactNode } from 'react';
import { Span, SpanStatusCode, trace, context as otelContext } from '@opentelemetry/api';
import { tracer } from './config';

interface SpanContextValue {
  startSpan: (name: string, attributes?: Record<string, any>) => Span;
  endSpan: (span: Span, success?: boolean) => void;
  addSpanEvent: (span: Span, name: string, attributes?: Record<string, any>) => void;
  setSpanAttribute: (span: Span, key: string, value: any) => void;
  setSpanError: (span: Span, error: Error) => void;
}

const SpanContext = createContext<SpanContextValue | null>(null);

export const useSpanContext = () => {
  const context = useContext(SpanContext);
  if (!context) {
    throw new Error('useSpanContext must be used within SpanProvider');
  }
  return context;
};

interface SpanProviderProps {
  children: ReactNode;
}

export const SpanProvider: React.FC<SpanProviderProps> = ({ children }) => {
  const startSpan = useCallback((name: string, attributes?: Record<string, any>): Span => {
    const span = tracer.startSpan(name, {
      attributes: {
        ...attributes,
        timestamp: Date.now(),
      },
    });

    return span;
  }, []);

  const endSpan = useCallback((span: Span, success: boolean = true) => {
    if (success) {
      span.setStatus({ code: SpanStatusCode.OK });
    } else {
      span.setStatus({ code: SpanStatusCode.ERROR });
    }
    span.end();
  }, []);

  const addSpanEvent = useCallback(
    (span: Span, name: string, attributes?: Record<string, any>) => {
      span.addEvent(name, {
        ...attributes,
        timestamp: Date.now(),
      });
    },
    []
  );

  const setSpanAttribute = useCallback((span: Span, key: string, value: any) => {
    span.setAttribute(key, value);
  }, []);

  const setSpanError = useCallback((span: Span, error: Error) => {
    span.recordException(error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });
  }, []);

  const value: SpanContextValue = {
    startSpan,
    endSpan,
    addSpanEvent,
    setSpanAttribute,
    setSpanError,
  };

  return <SpanContext.Provider value={value}>{children}</SpanContext.Provider>;
};
```

### Attributes Provider

Manage global trace attributes:

```typescript
// src/observability/AttributesProvider.tsx
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface AttributesContextValue {
  attributes: Record<string, any>;
  setAttribute: (key: string, value: any) => void;
  setAttributes: (attrs: Record<string, any>) => void;
  removeAttribute: (key: string) => void;
  clearAttributes: () => void;
}

const AttributesContext = createContext<AttributesContextValue | null>(null);

export const useAttributes = () => {
  const context = useContext(AttributesContext);
  if (!context) {
    throw new Error('useAttributes must be used within AttributesProvider');
  }
  return context;
};

interface AttributesProviderProps {
  children: ReactNode;
  initialAttributes?: Record<string, any>;
}

export const AttributesProvider: React.FC<AttributesProviderProps> = ({
  children,
  initialAttributes = {},
}) => {
  const [attributes, setAttributesState] = useState<Record<string, any>>(initialAttributes);

  const setAttribute = useCallback((key: string, value: any) => {
    setAttributesState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setAttributes = useCallback((attrs: Record<string, any>) => {
    setAttributesState((prev) => ({ ...prev, ...attrs }));
  }, []);

  const removeAttribute = useCallback((key: string) => {
    setAttributesState((prev) => {
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const clearAttributes = useCallback(() => {
    setAttributesState({});
  }, []);

  const value: AttributesContextValue = {
    attributes,
    setAttribute,
    setAttributes,
    removeAttribute,
    clearAttributes,
  };

  return <AttributesContext.Provider value={value}>{children}</AttributesContext.Provider>;
};
```

### useTracer Hook

Create custom hook for tracing user interactions:

```typescript
// src/hooks/useTracer.ts
import { useCallback, useRef } from 'react';
import { Span } from '@opentelemetry/api';
import { useSpanContext } from '@/observability/SpanProvider';
import { useAttributes } from '@/observability/AttributesProvider';

/**
 * Hook for tracing user interactions and component lifecycle
 */
export function useTracer(componentName: string) {
  const { startSpan, endSpan, addSpanEvent, setSpanAttribute, setSpanError } = useSpanContext();
  const { attributes: globalAttributes } = useAttributes();
  const activeSpans = useRef<Map<string, Span>>(new Map());

  const trace = useCallback(
    async <T,>(
      operationName: string,
      operation: () => Promise<T> | T,
      attributes?: Record<string, any>
    ): Promise<T> => {
      const spanName = `${componentName}.${operationName}`;
      const span = startSpan(spanName, {
        ...globalAttributes,
        ...attributes,
        component: componentName,
        operation: operationName,
      });

      activeSpans.current.set(operationName, span);

      try {
        const result = await operation();
        endSpan(span, true);
        activeSpans.current.delete(operationName);
        return result;
      } catch (error) {
        setSpanError(span, error as Error);
        endSpan(span, false);
        activeSpans.current.delete(operationName);
        throw error;
      }
    },
    [componentName, startSpan, endSpan, setSpanError, globalAttributes]
  );

  const traceEvent = useCallback(
    (eventName: string, attributes?: Record<string, any>) => {
      const span = startSpan(`${componentName}.${eventName}`, {
        ...globalAttributes,
        ...attributes,
        component: componentName,
        event: eventName,
      });
      endSpan(span, true);
    },
    [componentName, startSpan, endSpan, globalAttributes]
  );

  const traceInteraction = useCallback(
    (interactionType: string, targetElement: string, attributes?: Record<string, any>) => {
      traceEvent(`user.${interactionType}`, {
        ...attributes,
        target: targetElement,
        interaction_type: interactionType,
      });
    },
    [traceEvent]
  );

  const addEvent = useCallback(
    (operationName: string, eventName: string, attributes?: Record<string, any>) => {
      const span = activeSpans.current.get(operationName);
      if (span) {
        addSpanEvent(span, eventName, attributes);
      }
    },
    [addSpanEvent]
  );

  const setAttribute = useCallback(
    (operationName: string, key: string, value: any) => {
      const span = activeSpans.current.get(operationName);
      if (span) {
        setSpanAttribute(span, key, value);
      }
    },
    [setSpanAttribute]
  );

  return {
    trace,
    traceEvent,
    traceInteraction,
    addEvent,
    setAttribute,
  };
}

// Usage example
// src/screens/ProfileScreen.tsx
import React, { useEffect } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { useTracer } from '@/hooks/useTracer';
import { useUser } from '@/api/hooks/useUsers';

export const ProfileScreen: React.FC<{ userId: string }> = ({ userId }) => {
  const { trace, traceInteraction } = useTracer('ProfileScreen');
  const { data: user, isLoading } = useUser(userId);

  useEffect(() => {
    trace('loadProfile', async () => {
      // Profile loading is traced automatically
    });
  }, [userId, trace]);

  const handleEditClick = () => {
    traceInteraction('click', 'editButton', { user_id: userId });
    // Handle edit
  };

  const handleFollowClick = async () => {
    await trace('followUser', async () => {
      // Follow user logic
    }, { user_id: userId });
  };

  return (
    <View>
      <Text>{user?.name}</Text>
      <TouchableOpacity onPress={handleEditClick}>
        <Text>Edit</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={handleFollowClick}>
        <Text>Follow</Text>
      </TouchableOpacity>
    </View>
  );
};
```

### useNetworkTracer Hook

Create hook for tracing network requests:

```typescript
// src/hooks/useNetworkTracer.ts
import { useCallback } from 'react';
import { useSpanContext } from '@/observability/SpanProvider';
import { useAttributes } from '@/observability/AttributesProvider';

interface NetworkRequestMetadata {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: any;
}

interface NetworkResponseMetadata {
  status: number;
  headers?: Record<string, string>;
  duration: number;
}

/**
 * Hook for tracing network requests and responses
 */
export function useNetworkTracer() {
  const { startSpan, endSpan, setSpanAttribute, setSpanError } = useSpanContext();
  const { attributes: globalAttributes } = useAttributes();

  const traceRequest = useCallback(
    async <T,>(
      request: NetworkRequestMetadata,
      executor: () => Promise<T>
    ): Promise<T> => {
      const span = startSpan('http.request', {
        ...globalAttributes,
        'http.method': request.method,
        'http.url': request.url,
        'http.target': new URL(request.url).pathname,
      });

      const startTime = Date.now();

      try {
        const response = await executor();
        const duration = Date.now() - startTime;

        setSpanAttribute(span, 'http.duration', duration);
        setSpanAttribute(span, 'http.status_code', 200);

        endSpan(span, true);
        return response;
      } catch (error) {
        const duration = Date.now() - startTime;
        setSpanAttribute(span, 'http.duration', duration);

        if (error instanceof Error) {
          setSpanError(span, error);
          setSpanAttribute(span, 'http.status_code', 500);
        }

        endSpan(span, false);
        throw error;
      }
    },
    [startSpan, endSpan, setSpanAttribute, setSpanError, globalAttributes]
  );

  const traceApiCall = useCallback(
    async <T,>(
      method: string,
      endpoint: string,
      body?: any
    ): Promise<T> => {
      return traceRequest(
        {
          method,
          url: endpoint,
          body,
        },
        async () => {
          // Your API call logic here
          const response = await fetch(endpoint, {
            method,
            body: body ? JSON.stringify(body) : undefined,
          });
          return response.json();
        }
      );
    },
    [traceRequest]
  );

  return {
    traceRequest,
    traceApiCall,
  };
}

// Integration with API client
// src/api/client.ts
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { tracer } from '@/observability/config';
import { SpanStatusCode } from '@opentelemetry/api';

export class TracedApiClient {
  private axios: AxiosInstance;

  constructor(baseURL: string) {
    this.axios = axios.create({ baseURL });

    // Request interceptor
    this.axios.interceptors.request.use((config) => {
      const span = tracer.startSpan('http.request', {
        'http.method': config.method?.toUpperCase(),
        'http.url': config.url,
        'http.target': config.url,
      });

      // Store span in request config
      (config as any).span = span;

      return config;
    });

    // Response interceptor
    this.axios.interceptors.response.use(
      (response) => {
        const span = (response.config as any).span;
        if (span) {
          span.setAttribute('http.status_code', response.status);
          span.setStatus({ code: SpanStatusCode.OK });
          span.end();
        }
        return response;
      },
      (error) => {
        const span = (error.config as any)?.span;
        if (span) {
          span.setAttribute('http.status_code', error.response?.status || 0);
          span.recordException(error);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error.message,
          });
          span.end();
        }
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axios.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axios.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axios.put<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axios.delete<T>(url, config);
    return response.data;
  }
}

export const api = new TracedApiClient('https://api.example.com');
```

### Screen Lifecycle Tracing

Trace screen lifecycle events:

```typescript
// src/hooks/useScreenTracing.ts
import { useEffect, useRef } from 'react';
import { useRoute } from '@react-navigation/native';
import { useTracer } from './useTracer';

/**
 * Hook to trace screen lifecycle (mount, unmount, focus, blur)
 */
export function useScreenTracing(screenName: string) {
  const { trace, traceEvent } = useTracer(screenName);
  const route = useRoute();
  const mountTime = useRef(Date.now());
  const focusTime = useRef<number | null>(null);

  useEffect(() => {
    // Screen mounted
    traceEvent('screen.mount', {
      screen_name: screenName,
      route_params: route.params,
    });

    return () => {
      // Screen unmounted
      const totalTime = Date.now() - mountTime.current;
      traceEvent('screen.unmount', {
        screen_name: screenName,
        total_time: totalTime,
      });
    };
  }, [screenName, route.params, traceEvent]);

  useEffect(() => {
    const unsubscribeFocus = route.addListener('focus', () => {
      focusTime.current = Date.now();
      traceEvent('screen.focus', {
        screen_name: screenName,
      });
    });

    const unsubscribeBlur = route.addListener('blur', () => {
      if (focusTime.current) {
        const focusDuration = Date.now() - focusTime.current;
        traceEvent('screen.blur', {
          screen_name: screenName,
          focus_duration: focusDuration,
        });
        focusTime.current = null;
      }
    });

    return () => {
      unsubscribeFocus();
      unsubscribeBlur();
    };
  }, [screenName, route, traceEvent]);
}
```

### Error Boundary with Tracing

Create error boundary that traces exceptions:

```typescript
// src/components/TracedErrorBoundary.tsx
import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { tracer } from '@/observability/config';
import { SpanStatusCode } from '@opentelemetry/api';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class TracedErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Trace the error
    const span = tracer.startSpan('error.boundary', {
      'error.type': error.name,
      'error.message': error.message,
      'error.stack': error.stack,
      'error.componentStack': errorInfo.componentStack,
    });

    span.recordException(error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });
    span.end();

    // Log to console in development
    if (__DEV__) {
      console.error('Error caught by boundary:', error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry);
      }

      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>{this.state.error.message}</Text>
          <TouchableOpacity style={styles.button} onPress={this.handleRetry}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  message: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

### Custom Metrics

Implement custom metrics collection:

```typescript
// src/observability/metrics.ts
import { Metrics } from '@opentelemetry/api-metrics';
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: 'mobile-app',
});

const exporter = new OTLPMetricExporter({
  url: 'https://your-otel-collector/v1/metrics',
});

const meterProvider = new MeterProvider({
  resource,
  readers: [
    new PeriodicExportingMetricReader({
      exporter,
      exportIntervalMillis: 60000, // Export every minute
    }),
  ],
});

const meter = meterProvider.getMeter('mobile-app');

// Define metrics
export const metrics = {
  screenLoadTime: meter.createHistogram('screen.load_time', {
    description: 'Time taken to load a screen',
    unit: 'ms',
  }),

  apiRequestDuration: meter.createHistogram('api.request.duration', {
    description: 'API request duration',
    unit: 'ms',
  }),

  errorCount: meter.createCounter('app.errors', {
    description: 'Number of errors',
  }),

  activeUsers: meter.createUpDownCounter('app.active_users', {
    description: 'Number of active users',
  }),

  memoryUsage: meter.createObservableGauge('app.memory_usage', {
    description: 'Memory usage in MB',
  }),
};

// src/hooks/useMetrics.ts
import { useCallback } from 'react';
import { metrics } from '@/observability/metrics';

export function useMetrics() {
  const recordScreenLoadTime = useCallback((screenName: string, duration: number) => {
    metrics.screenLoadTime.record(duration, {
      screen_name: screenName,
    });
  }, []);

  const recordApiRequest = useCallback((
    endpoint: string,
    method: string,
    duration: number,
    statusCode: number
  ) => {
    metrics.apiRequestDuration.record(duration, {
      endpoint,
      method,
      status_code: statusCode,
    });
  }, []);

  const incrementErrorCount = useCallback((errorType: string) => {
    metrics.errorCount.add(1, {
      error_type: errorType,
    });
  }, []);

  return {
    recordScreenLoadTime,
    recordApiRequest,
    incrementErrorCount,
  };
}
```

### Trace Context Propagation

Propagate trace context across async boundaries:

```typescript
// src/observability/contextPropagation.ts
import { context, trace, Context, Span } from '@opentelemetry/api';
import { tracer } from './config';

/**
 * Execute function with trace context
 */
export async function withTraceContext<T>(
  spanName: string,
  fn: (span: Span) => Promise<T>,
  attributes?: Record<string, any>
): Promise<T> {
  const span = tracer.startSpan(spanName, { attributes });
  const ctx = trace.setSpan(context.active(), span);

  try {
    const result = await context.with(ctx, () => fn(span));
    span.end();
    return result;
  } catch (error) {
    span.recordException(error as Error);
    span.end();
    throw error;
  }
}

/**
 * Get current trace ID
 */
export function getCurrentTraceId(): string | undefined {
  const span = trace.getSpan(context.active());
  return span?.spanContext().traceId;
}

/**
 * Get current span ID
 */
export function getCurrentSpanId(): string | undefined {
  const span = trace.getSpan(context.active());
  return span?.spanContext().spanId;
}

/**
 * Add attribute to current span
 */
export function addAttributeToCurrentSpan(key: string, value: any): void {
  const span = trace.getSpan(context.active());
  if (span) {
    span.setAttribute(key, value);
  }
}
```

## Implementation Guidelines

### Span Management

1. **Span Lifecycle**: Always end spans, even on errors
2. **Span Hierarchy**: Create child spans for sub-operations
3. **Attributes**: Add meaningful attributes to spans
4. **Events**: Use span events for important milestones
5. **Status Codes**: Set appropriate status codes

### Performance

1. **Sampling**: Configure sampling for high-volume traces
2. **Batching**: Use batch processors for efficient export
3. **Async Export**: Export traces asynchronously
4. **Resource Limits**: Set appropriate span limits
5. **Context Propagation**: Minimize context switches

### Data Quality

1. **Consistent Naming**: Use consistent span names
2. **Semantic Conventions**: Follow OpenTelemetry semantic conventions
3. **Attribute Cardinality**: Avoid high-cardinality attributes
4. **Error Recording**: Record exceptions with context
5. **Metadata**: Include relevant metadata in spans

### Integration

1. **Provider Setup**: Set up providers at app root
2. **Auto-instrumentation**: Use auto-instrumentation when available
3. **Manual Instrumentation**: Add manual spans for custom logic
4. **Network Tracing**: Trace all network requests
5. **Error Tracking**: Integrate with error tracking

## Anti-Patterns to Avoid

### Don't Forget to End Spans

```typescript
// Bad: Span never ends
const span = startSpan('operation');
await doSomething();

// Good: Always end spans
const span = startSpan('operation');
try {
  await doSomething();
  endSpan(span, true);
} catch (error) {
  setSpanError(span, error);
  endSpan(span, false);
  throw error;
}
```

### Don't Use High-Cardinality Attributes

```typescript
// Bad: High-cardinality attribute
span.setAttribute('user_id', userId); // Millions of possible values

// Good: Use low-cardinality attributes
span.setAttribute('user_type', userType); // Few possible values
```

### Don't Create Spans in Loops

```typescript
// Bad: Creating spans in loop
items.forEach((item) => {
  const span = startSpan('processItem');
  processItem(item);
  endSpan(span);
});

// Good: Single span for batch operation
const span = startSpan('processItems');
items.forEach((item) => {
  span.addEvent('item_processed', { item_id: item.id });
  processItem(item);
});
endSpan(span);
```

### Don't Ignore Context Propagation

```typescript
// Bad: Context not propagated
async function outer() {
  const span = startSpan('outer');
  await inner(); // Context lost
  endSpan(span);
}

// Good: Propagate context
async function outer() {
  await withTraceContext('outer', async (span) => {
    await inner(); // Context propagated
  });
}
```

### Don't Over-instrument

```typescript
// Bad: Too much instrumentation
const span1 = startSpan('trivialOperation');
const result = 1 + 1;
endSpan(span1);

// Good: Instrument meaningful operations
const span = startSpan('complexCalculation');
const result = performComplexCalculation();
endSpan(span);
```

## Related Implementers

- **analytics.md**: Analytics event tracking
- **performance-optimization.md**: Performance monitoring
- **data-fetching.md**: Tracing API requests
- **testing.md**: Testing observability
- **navigation.md**: Tracing navigation flows
