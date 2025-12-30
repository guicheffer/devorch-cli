## Component Tree

Generate a visual tree diagram showing the component hierarchy. This provides a quick overview of the screen structure.

### Tree Format

```
[ScreenName]
├── [ComponentName]
│   ├── ScrollView (horizontal)
│   ├── Pressable "Label"
│   └── ChildComponent[]
│       ├── Text (description)
│       └── Icon [IconName]
└── [AnotherComponent]
    └── Button "CTA Text"
```

### Notation

| Symbol | Meaning |
|--------|---------|
| `ComponentName[]` | Array/list of repeated components |
| `"Label"` | Static text content |
| `(description)` | Purpose/role of element |
| `[IconName]` | Specific icon used |

### Construction Rules

**Include:**
- Named custom components (ProductCard, WeekNavigation, etc.)
- Zest components (Button, Text, Icon, Card, ImageCloudinary, Badge, etc.)
- Key structural elements when semantically meaningful (ScrollView, FlatList)

**Skip:**
- Plain View/Box wrappers used just for layout
- Container elements without semantic meaning
- Intermediate layout divs

### Example

For a storefront screen:

```
StorefrontScreen
├── WeekNavigation
│   ├── ScrollView (horizontal)
│   ├── Pressable "Past Orders"
│   └── WeekItem[]
│       ├── Text (day)
│       └── Text (date)
├── Categories
│   └── ScrollView (horizontal)
│       └── TabItem[]
│           └── Text (label)
├── Filters
│   ├── Pressable (sort)
│   │   └── Icon [SortFilled16]
│   └── TagFilter[]
├── FlatList
│   └── ProductCard[]
│       ├── ImageCloudinary
│       ├── Pressable (add button)
│       │   └── Icon [PlusOutline16]
│       ├── Text (title)
│       ├── Text (subtitle)
│       └── Text (price)
└── StickyFooter
    ├── Pressable (cart)
    │   ├── Icon [CartOutline24]
    │   └── Badge
    └── Button "Checkout"
```
