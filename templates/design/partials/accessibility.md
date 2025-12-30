## Accessibility Requirements

All components MUST include:
- `testID` for testing
- `altText` for icons
- `accessibilityLabel` for interactive elements
- `accessibilityRole` for semantic elements (tab, button)
- `accessibilityState` for selection states

**Examples:**

```tsx
<Pressable
  testID="product-card-123"
  accessibilityLabel="Cheesy Spinach-Stuffed Turkey Breasts, $8.99 per serving"
  accessibilityRole="button"
/>

<Icon icon={PlusOutline16} altText="Add to cart" />

<Pressable
  accessibilityRole="tab"
  accessibilityState={{ selected: isSelected }}
/>
```
