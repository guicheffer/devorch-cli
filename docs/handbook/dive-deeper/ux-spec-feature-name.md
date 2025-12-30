# UX Spec: [Feature Name]

**DOCUMENT STATUS**: [DRAFT | REVIEW | FINAL]

## 1. Metadata

* **Feature Name**: [e.g., New User Checkout Flow]
* **Version**: 1.0
* **Owner(s)**: [Product Manager], [UX Designer], [Engineer]
* **Last Updated**: [Date]
* **Related Docs**:
    * **PRD**: [Link to prd.md]
    * **Research**: [Link to research-insights.md]
    * **Figma File**: [Link to Figma file]

## 2. Overview & Goal

* **What is the primary goal of this feature from a user's perspective?**
    * *Example: To provide a clear, intuitive, and secure process for users to complete their purchase, minimizing friction and cart abandonment.*

## 3. High-Level User Flow

*This section should outline the main steps in the user's journey. It sets the stage for the detailed breakdown below.*

1.  **Cart & Review**: User reviews the items in their cart.
2.  **Information**: User provides or confirms their shipping address.
3.  **Shipping**: User selects their preferred delivery date and method.
4.  **Payment**: User enters payment information and confirms the order.
5.  **Confirmation**: User sees a confirmation of their successful purchase.

## 4. Screen-by-Screen Specification

*This is the core of the spec. Repeat this section for every screen or state in the flow.*

---

### 4.1. Screen: [Screen Name, e.g., Cart & Review]

* **Figma Frame**: [Link to the specific Figma frame or page for this screen]

#### User Actions & Business Rules:
* **Primary Action**: User clicks "Proceed to Checkout" to move to the next step.
* **Business Rule**: The order summary should recalculate in real-time if the user adjusts item quantity.

#### UI Elements:
* **Items List**: A list of items with product image, name, quantity, and individual price.
* **Quantity Selector**: Allows user to adjust item quantity.
* **Promo Code Field**: A text input field to enter a discount code.
* **Order Summary**: A summary block including Subtotal, Shipping (e.g., "Calculated at next step"), and Estimated Total.
* **Call to Action**: A prominent "Proceed to Checkout" button.

---

### 4.2. Screen: [Screen Name, e.g., Information]

* **Figma Frame**: [Link to the specific Figma frame or page for this screen]

#### User Actions & Business Rules:
* **Primary Action**: User fills the form and clicks "Continue to Shipping".
* **Business Rule**: If the user is logged in, their saved shipping information must be pre-filled.

#### UI Elements:
* **Progress Indicator**: Highlights the current "Information" step.
* **Email Input**: A mandatory field for the user's email address.
* **Shipping Address Form**: A form with fields for Full Name, Country, Address, City, Postal Code. Address field should have auto-suggest enabled.
* **Call to Action**: A "Continue to Shipping" button.

---
## 5. Error Handling & Edge Cases

*This table defines how the UI should respond to specific error conditions. Be as explicit as possible.*

| Trigger (User Action) | Condition | UI Response (with microcopy) |
| :--- | :--- | :--- |
| Enters invalid email | Non-standard email format. | Adaptive error message: "Please enter a valid email address." |
| Fills a form field incorrectly | Form validation fails. | Inline error message directly under the invalid field. |
| Payment is declined | Card expired, insufficient funds, etc. | Prominent error message: "Your payment was declined. Please try a different payment method or contact your bank." |
| Promo code is invalid | Incorrect or expired code. | Inline error message: "This promo code is invalid or expired." |

## 6. Mobile & Responsive Considerations

* **Layout**: The primary layout for small screens should be a single-column, accordion-style flow.
* **Keyboard**: Form inputs must trigger the appropriate keyboard type (e.g., numeric for card number, email for email field).
* **Tap Targets**: Buttons and other interactive elements must be sized for easy tapping (e.g., minimum 44x44px).

## 7. Accessibility (A11y) Notes

* **Tab Order**: Define the logical tab order for all form fields and interactive elements.
* **Screen Reader Text**: All icons and non-descriptive buttons must have clear `aria-label` text.
* **Focus States**: All interactive elements must have a clear and visible focus state.
```
