---
domain: domain-modeling
description: Domain modeling patterns using Kotlin data classes, sealed classes, value objects, and immutable domain entities
---

# Domain Modeling with Kotlin

Build rich domain models using Kotlin's data classes, sealed classes, value objects, and extension functions to create type-safe, immutable domain entities with encapsulated business logic.

## Core Patterns

### 1. Data Classes for Entities

**Pattern:** Use Kotlin data classes to model domain entities with immutability and value equality.

**Example from PR #1267:**
```kotlin
// File: meal-selection-service-domain/src/main/kotlin/com/yourcompany/mealselection/domain/Cart.kt
package com.yourcompany.mealselection.domain

import java.time.Instant
import java.util.UUID

data class Cart(
    val id: UUID,
    val customerId: UUID,
    val items: List<CartItem>,
    val state: CartState,
    val createdAt: Instant,
    val updatedAt: Instant
) {
    init {
        require(items.size <= 50) { "Cart cannot contain more than 50 items" }
        require(customerId != UUID(0, 0)) { "Customer ID cannot be null UUID" }
    }

    fun addItem(item: CartItem): Cart {
        require(!isLocked()) { "Cannot modify locked cart" }
        require(!hasItem(item.recipeId)) { "Recipe already in cart" }

        return copy(
            items = items + item,
            updatedAt = Instant.now()
        )
    }

    fun removeItem(itemId: UUID): Cart {
        require(!isLocked()) { "Cannot modify locked cart" }
        require(hasItemWithId(itemId)) { "Item not found in cart" }

        return copy(
            items = items.filterNot { it.id == itemId },
            updatedAt = Instant.now()
        )
    }

    fun updateItemQuantity(itemId: UUID, quantity: Int): Cart {
        require(!isLocked()) { "Cannot modify locked cart" }
        require(quantity > 0) { "Quantity must be positive" }

        return copy(
            items = items.map { item ->
                if (item.id == itemId) item.copy(quantity = quantity)
                else item
            },
            updatedAt = Instant.now()
        )
    }

    fun lock(): Cart {
        require(state == CartState.ACTIVE) { "Can only lock active cart" }
        require(items.isNotEmpty()) { "Cannot lock empty cart" }

        return copy(
            state = CartState.LOCKED,
            updatedAt = Instant.now()
        )
    }

    fun complete(): Cart {
        require(state == CartState.LOCKED) { "Can only complete locked cart" }

        return copy(
            state = CartState.COMPLETED,
            updatedAt = Instant.now()
        )
    }

    fun totalAmount(): Money {
        return items.fold(Money.ZERO) { acc, item ->
            acc + (item.price * item.quantity)
        }
    }

    fun totalItems(): Int = items.sumOf { it.quantity }

    fun isLocked(): Boolean = state == CartState.LOCKED || state == CartState.COMPLETED

    private fun hasItem(recipeId: UUID): Boolean = items.any { it.recipeId == recipeId }

    private fun hasItemWithId(itemId: UUID): Boolean = items.any { it.id == itemId }
}

data class CartItem(
    val id: UUID,
    val recipeId: UUID,
    val recipeName: String,
    val quantity: Int,
    val price: Money
) {
    init {
        require(quantity > 0) { "Quantity must be positive" }
        require(quantity <= 10) { "Maximum quantity per item is 10" }
        require(recipeName.isNotBlank()) { "Recipe name cannot be blank" }
        require(price >= Money.ZERO) { "Price cannot be negative" }
    }

    fun withQuantity(newQuantity: Int): CartItem {
        require(newQuantity > 0) { "Quantity must be positive" }
        require(newQuantity <= 10) { "Maximum quantity per item is 10" }
        return copy(quantity = newQuantity)
    }

    fun totalPrice(): Money = price * quantity
}
```

**Frequency:** 64% of PRs implement or modify domain entities

**Why:** Data classes provide:
- Immutability by default with val properties
- Free implementations of equals(), hashCode(), toString()
- Copy method for creating modified instances
- Structural equality based on properties
- Readable, concise syntax

### 2. Sealed Classes for Domain States

**Pattern:** Use sealed classes to model finite state machines and domain state hierarchies with exhaustive when expressions.

**Example from PR #1265:**
```kotlin
// File: meal-selection-service-domain/src/main/kotlin/com/yourcompany/mealselection/domain/CartState.kt
package com.yourcompany.mealselection.domain

enum class CartState {
    ACTIVE,
    LOCKED,
    COMPLETED,
    CANCELLED
}

// File: meal-selection-service-domain/src/main/kotlin/com/yourcompany/mealselection/domain/Order.kt
package com.yourcompany.mealselection.domain

import java.time.Instant
import java.util.UUID

data class Order(
    val id: UUID,
    val cartId: UUID,
    val customerId: UUID,
    val items: List<OrderItem>,
    val state: OrderState,
    val totalAmount: Money,
    val placedAt: Instant,
    val updatedAt: Instant
) {
    fun confirm(confirmedAt: Instant): Order {
        require(state is OrderState.Pending) { "Can only confirm pending order" }

        return copy(
            state = OrderState.Confirmed(confirmedAt),
            updatedAt = Instant.now()
        )
    }

    fun ship(trackingNumber: String): Order {
        require(state is OrderState.Confirmed) { "Can only ship confirmed order" }

        return copy(
            state = OrderState.Shipped(
                trackingNumber = trackingNumber,
                shippedAt = Instant.now()
            ),
            updatedAt = Instant.now()
        )
    }

    fun deliver(): Order {
        require(state is OrderState.Shipped) { "Can only deliver shipped order" }

        return copy(
            state = OrderState.Delivered(deliveredAt = Instant.now()),
            updatedAt = Instant.now()
        )
    }

    fun cancel(reason: String): Order {
        require(canBeCancelled()) { "Order cannot be cancelled in current state" }

        return copy(
            state = OrderState.Cancelled(
                reason = reason,
                cancelledAt = Instant.now()
            ),
            updatedAt = Instant.now()
        )
    }

    fun canBeCancelled(): Boolean = when (state) {
        is OrderState.Pending, is OrderState.Confirmed -> true
        is OrderState.Shipped, is OrderState.Delivered, is OrderState.Cancelled -> false
    }

    fun isCompleted(): Boolean = state is OrderState.Delivered

    fun statusDescription(): String = when (val s = state) {
        is OrderState.Pending -> "Order is pending confirmation"
        is OrderState.Confirmed -> "Order confirmed at ${s.confirmedAt}"
        is OrderState.Shipped -> "Order shipped with tracking ${s.trackingNumber}"
        is OrderState.Delivered -> "Order delivered at ${s.deliveredAt}"
        is OrderState.Cancelled -> "Order cancelled: ${s.reason}"
    }
}

sealed interface OrderState {
    data object Pending : OrderState

    data class Confirmed(
        val confirmedAt: Instant
    ) : OrderState

    data class Shipped(
        val trackingNumber: String,
        val shippedAt: Instant
    ) : OrderState {
        init {
            require(trackingNumber.isNotBlank()) { "Tracking number cannot be blank" }
        }
    }

    data class Delivered(
        val deliveredAt: Instant
    ) : OrderState

    data class Cancelled(
        val reason: String,
        val cancelledAt: Instant
    ) : OrderState {
        init {
            require(reason.isNotBlank()) { "Cancellation reason cannot be blank" }
        }
    }
}

data class OrderItem(
    val id: UUID,
    val recipeId: UUID,
    val recipeName: String,
    val quantity: Int,
    val unitPrice: Money,
    val totalPrice: Money
) {
    init {
        require(quantity > 0) { "Quantity must be positive" }
        require(totalPrice == unitPrice * quantity) { "Total price must equal unit price * quantity" }
    }
}
```

**Example with Sealed Class Hierarchy:**
```kotlin
// File: meal-selection-service-domain/src/main/kotlin/com/yourcompany/mealselection/domain/Payment.kt
package com.yourcompany.mealselection.domain

import java.time.Instant
import java.util.UUID

data class Payment(
    val id: UUID,
    val orderId: UUID,
    val amount: Money,
    val method: PaymentMethod,
    val status: PaymentStatus,
    val createdAt: Instant,
    val updatedAt: Instant
) {
    fun process(): Payment {
        require(status is PaymentStatus.Pending) { "Can only process pending payment" }

        return copy(
            status = PaymentStatus.Processing(startedAt = Instant.now()),
            updatedAt = Instant.now()
        )
    }

    fun complete(transactionId: String): Payment {
        require(status is PaymentStatus.Processing) { "Can only complete processing payment" }

        return copy(
            status = PaymentStatus.Completed(
                transactionId = transactionId,
                completedAt = Instant.now()
            ),
            updatedAt = Instant.now()
        )
    }

    fun fail(errorCode: String, errorMessage: String): Payment {
        require(status is PaymentStatus.Processing) { "Can only fail processing payment" }

        return copy(
            status = PaymentStatus.Failed(
                errorCode = errorCode,
                errorMessage = errorMessage,
                failedAt = Instant.now()
            ),
            updatedAt = Instant.now()
        )
    }

    fun refund(): Payment {
        require(status is PaymentStatus.Completed) { "Can only refund completed payment" }

        return copy(
            status = PaymentStatus.Refunded(refundedAt = Instant.now()),
            updatedAt = Instant.now()
        )
    }
}

sealed interface PaymentStatus {
    data object Pending : PaymentStatus

    data class Processing(
        val startedAt: Instant
    ) : PaymentStatus

    data class Completed(
        val transactionId: String,
        val completedAt: Instant
    ) : PaymentStatus {
        init {
            require(transactionId.isNotBlank()) { "Transaction ID cannot be blank" }
        }
    }

    data class Failed(
        val errorCode: String,
        val errorMessage: String,
        val failedAt: Instant
    ) : PaymentStatus {
        init {
            require(errorCode.isNotBlank()) { "Error code cannot be blank" }
            require(errorMessage.isNotBlank()) { "Error message cannot be blank" }
        }
    }

    data class Refunded(
        val refundedAt: Instant
    ) : PaymentStatus
}

sealed interface PaymentMethod {
    data class CreditCard(
        val last4Digits: String,
        val expiryMonth: Int,
        val expiryYear: Int,
        val cardBrand: CardBrand
    ) : PaymentMethod {
        init {
            require(last4Digits.length == 4) { "Last 4 digits must be exactly 4 characters" }
            require(last4Digits.all { it.isDigit() }) { "Last 4 digits must be numeric" }
            require(expiryMonth in 1..12) { "Expiry month must be between 1 and 12" }
            require(expiryYear >= 2024) { "Card is expired" }
        }
    }

    data class BankTransfer(
        val bankName: String,
        val accountNumber: String
    ) : PaymentMethod {
        init {
            require(bankName.isNotBlank()) { "Bank name cannot be blank" }
            require(accountNumber.isNotBlank()) { "Account number cannot be blank" }
        }
    }

    data class DigitalWallet(
        val provider: WalletProvider,
        val accountId: String
    ) : PaymentMethod {
        init {
            require(accountId.isNotBlank()) { "Account ID cannot be blank" }
        }
    }
}

enum class CardBrand {
    VISA,
    MASTERCARD,
    AMEX,
    DISCOVER
}

enum class WalletProvider {
    PAYPAL,
    APPLE_PAY,
    GOOGLE_PAY
}
```

**Frequency:** 48% of PRs use sealed classes for state modeling

**Why:** Sealed classes provide:
- Exhaustive when expressions (compiler ensures all cases are handled)
- Type-safe state transitions
- Clear domain state hierarchy
- Better than enums when states carry different data
- IDE support for pattern matching

### 3. Value Objects with Inline Classes

**Pattern:** Model value objects using data classes and inline classes for type safety and domain clarity.

**Example from PR #1276:**
```kotlin
// File: meal-selection-service-domain/src/main/kotlin/com/yourcompany/mealselection/domain/Money.kt
package com.yourcompany.mealselection.domain

import java.math.BigDecimal
import java.math.RoundingMode

@JvmInline
value class Money(val amount: BigDecimal) {

    constructor(amount: Double) : this(BigDecimal.valueOf(amount).setScale(2, RoundingMode.HALF_UP))

    constructor(amount: String) : this(BigDecimal(amount).setScale(2, RoundingMode.HALF_UP))

    init {
        require(amount.scale() <= 2) { "Money can have at most 2 decimal places" }
        require(amount >= BigDecimal.ZERO) { "Money cannot be negative" }
    }

    operator fun plus(other: Money): Money = Money(amount + other.amount)

    operator fun minus(other: Money): Money {
        val result = amount - other.amount
        require(result >= BigDecimal.ZERO) { "Result cannot be negative" }
        return Money(result)
    }

    operator fun times(multiplier: Int): Money = Money(amount * BigDecimal(multiplier))

    operator fun times(multiplier: BigDecimal): Money = Money(amount * multiplier)

    operator fun div(divisor: Int): Money {
        require(divisor != 0) { "Cannot divide by zero" }
        return Money(amount / BigDecimal(divisor))
    }

    operator fun compareTo(other: Money): Int = amount.compareTo(other.amount)

    fun isZero(): Boolean = amount == BigDecimal.ZERO

    fun isPositive(): Boolean = amount > BigDecimal.ZERO

    fun format(): String = "$${amount.setScale(2, RoundingMode.HALF_UP)}"

    companion object {
        val ZERO = Money(BigDecimal.ZERO)
        val ONE = Money(BigDecimal.ONE)

        fun sum(amounts: List<Money>): Money {
            return amounts.fold(ZERO) { acc, money -> acc + money }
        }
    }
}

// File: meal-selection-service-domain/src/main/kotlin/com/yourcompany/mealselection/domain/Email.kt
package com.yourcompany.mealselection.domain

@JvmInline
value class Email(val value: String) {
    init {
        require(value.isNotBlank()) { "Email cannot be blank" }
        require(isValid(value)) { "Invalid email format: $value" }
    }

    fun domain(): String = value.substringAfter("@")

    fun localPart(): String = value.substringBefore("@")

    fun obfuscated(): String {
        val parts = value.split("@")
        val local = parts[0]
        val domain = parts[1]
        val obfuscatedLocal = if (local.length > 2) {
            "${local.take(2)}***"
        } else {
            "***"
        }
        return "$obfuscatedLocal@$domain"
    }

    companion object {
        private val EMAIL_REGEX = "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$".toRegex()

        fun isValid(email: String): Boolean = EMAIL_REGEX.matches(email)

        fun tryCreate(value: String): Email? = try {
            Email(value)
        } catch (e: IllegalArgumentException) {
            null
        }
    }
}

// File: meal-selection-service-domain/src/main/kotlin/com/yourcompany/mealselection/domain/PhoneNumber.kt
package com.yourcompany.mealselection.domain

@JvmInline
value class PhoneNumber(val value: String) {
    init {
        require(value.isNotBlank()) { "Phone number cannot be blank" }
        require(isValid(value)) { "Invalid phone number format: $value" }
    }

    fun formatted(): String {
        val digits = value.filter { it.isDigit() }
        return when {
            digits.length == 10 -> "(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6)}"
            digits.length == 11 && digits.startsWith("1") ->
                "+1 (${digits.substring(1, 4)}) ${digits.substring(4, 7)}-${digits.substring(7)}"
            else -> value
        }
    }

    companion object {
        private val PHONE_REGEX = "^\\+?[1-9]\\d{1,14}$".toRegex()

        fun isValid(phone: String): Boolean {
            val digitsOnly = phone.filter { it.isDigit() || it == '+' }
            return PHONE_REGEX.matches(digitsOnly)
        }
    }
}

// File: meal-selection-service-domain/src/main/kotlin/com/yourcompany/mealselection/domain/Address.kt
package com.yourcompany.mealselection.domain

data class Address(
    val street: String,
    val city: String,
    val state: String,
    val postalCode: PostalCode,
    val country: Country
) {
    init {
        require(street.isNotBlank()) { "Street cannot be blank" }
        require(city.isNotBlank()) { "City cannot be blank" }
        require(state.isNotBlank()) { "State cannot be blank" }
    }

    fun fullAddress(): String = "$street, $city, $state ${postalCode.value}, ${country.name}"

    fun isSameCity(other: Address): Boolean =
        city.equals(other.city, ignoreCase = true) && country == other.country
}

@JvmInline
value class PostalCode(val value: String) {
    init {
        require(value.isNotBlank()) { "Postal code cannot be blank" }
        require(value.length in 5..10) { "Postal code must be between 5 and 10 characters" }
    }
}

enum class Country(val isoCode: String, val displayName: String) {
    US("US", "United States"),
    CA("CA", "Canada"),
    GB("GB", "United Kingdom"),
    DE("DE", "Germany"),
    FR("FR", "France"),
    NL("NL", "Netherlands");

    companion object {
        fun fromIsoCode(code: String): Country? = entries.find { it.isoCode == code }
    }
}
```

**Frequency:** 52% of PRs implement or use value objects

**Why:** Value objects provide:
- Type safety (can't accidentally pass wrong type)
- Domain clarity (Money vs Double)
- Encapsulated validation
- No runtime overhead with inline classes
- Clear domain language

### 4. Extension Functions for Domain Logic

**Pattern:** Use extension functions to add domain behavior to entities and value objects without modifying the class.

**Example from PR #1274:**
```kotlin
// File: meal-selection-service-domain/src/main/kotlin/com/yourcompany/mealselection/domain/CartExtensions.kt
package com.yourcompany.mealselection.domain

import java.time.Instant
import java.time.temporal.ChronoUnit

// Cart extensions
fun Cart.isEmpty(): Boolean = items.isEmpty()

fun Cart.isNotEmpty(): Boolean = items.isNotEmpty()

fun Cart.hasRecipe(recipeId: UUID): Boolean = items.any { it.recipeId == recipeId }

fun Cart.getItemByRecipe(recipeId: UUID): CartItem? = items.find { it.recipeId == recipeId }

fun Cart.itemCount(): Int = items.size

fun Cart.age(): Long = ChronoUnit.DAYS.between(createdAt, Instant.now())

fun Cart.isStale(): Boolean = age() > 7

fun Cart.requiresShipping(): Boolean = items.any { it.requiresShipping() }

fun Cart.calculateShipping(shippingRate: Money): Money {
    return if (requiresShipping()) {
        shippingRate * items.count { it.requiresShipping() }
    } else {
        Money.ZERO
    }
}

fun Cart.withDiscount(discount: Discount): Cart {
    val discountedItems = items.map { item ->
        item.copy(price = discount.apply(item.price))
    }
    return copy(items = discountedItems, updatedAt = Instant.now())
}

fun Cart.clearItems(): Cart = copy(items = emptyList(), updatedAt = Instant.now())

// CartItem extensions
fun CartItem.requiresShipping(): Boolean =
    recipeName.contains("box", ignoreCase = true) ||
    recipeName.contains("kit", ignoreCase = true)

fun CartItem.isExpensive(): Boolean = price > Money(50.0)

fun CartItem.hasDiscount(originalPrice: Money): Boolean = price < originalPrice

// List<CartItem> extensions
fun List<CartItem>.totalAmount(): Money = fold(Money.ZERO) { acc, item -> acc + item.totalPrice() }

fun List<CartItem>.totalQuantity(): Int = sumOf { it.quantity }

fun List<CartItem>.averagePrice(): Money {
    if (isEmpty()) return Money.ZERO
    return totalAmount() / size
}

fun List<CartItem>.mostExpensive(): CartItem? = maxByOrNull { it.price }

fun List<CartItem>.cheapest(): CartItem? = minByOrNull { it.price }

fun List<CartItem>.filterByRecipe(recipeIds: Set<UUID>): List<CartItem> =
    filter { it.recipeId in recipeIds }

// Order extensions
fun Order.isRecent(): Boolean = ChronoUnit.HOURS.between(placedAt, Instant.now()) < 24

fun Order.canBeModified(): Boolean = state is OrderState.Pending

fun Order.requiresAction(): Boolean = when (state) {
    is OrderState.Pending -> true
    is OrderState.Confirmed -> true
    else -> false
}

fun Order.daysSincePlaced(): Long = ChronoUnit.DAYS.between(placedAt, Instant.now())

fun Order.isOverdue(): Boolean {
    return when (state) {
        is OrderState.Pending -> daysSincePlaced() > 1
        is OrderState.Confirmed -> daysSincePlaced() > 3
        is OrderState.Shipped -> daysSincePlaced() > 7
        else -> false
    }
}

// Money extensions
fun Money.percentage(percent: Int): Money {
    require(percent in 0..100) { "Percentage must be between 0 and 100" }
    return this * (BigDecimal(percent) / BigDecimal(100))
}

fun Money.addPercentage(percent: Int): Money = this + this.percentage(percent)

fun Money.subtractPercentage(percent: Int): Money = this - this.percentage(percent)

fun Money.split(ways: Int): List<Money> {
    require(ways > 0) { "Cannot split into zero or negative parts" }
    val baseAmount = this / ways
    val remainder = this - (baseAmount * ways)

    return List(ways) { index ->
        if (index == 0) baseAmount + remainder
        else baseAmount
    }
}

// Collection extensions for Money
fun Iterable<Money>.sum(): Money = fold(Money.ZERO) { acc, money -> acc + money }

fun Iterable<Money>.average(): Money {
    val list = this.toList()
    if (list.isEmpty()) return Money.ZERO
    return list.sum() / list.size
}

// Discount domain model
data class Discount(
    val id: UUID,
    val code: String,
    val type: DiscountType,
    val value: BigDecimal,
    val minOrderAmount: Money? = null,
    val maxDiscountAmount: Money? = null
) {
    init {
        require(code.isNotBlank()) { "Discount code cannot be blank" }
        require(value > BigDecimal.ZERO) { "Discount value must be positive" }

        when (type) {
            DiscountType.PERCENTAGE -> {
                require(value <= BigDecimal(100)) { "Percentage discount cannot exceed 100%" }
            }
            DiscountType.FIXED_AMOUNT -> {
                // No additional validation needed
            }
        }
    }

    fun apply(price: Money): Money {
        val discountAmount = when (type) {
            DiscountType.PERCENTAGE -> price.percentage(value.toInt())
            DiscountType.FIXED_AMOUNT -> Money(value)
        }

        val cappedDiscount = if (maxDiscountAmount != null && discountAmount > maxDiscountAmount) {
            maxDiscountAmount
        } else {
            discountAmount
        }

        return (price - cappedDiscount).coerceAtLeast(Money.ZERO)
    }

    fun canApplyTo(orderAmount: Money): Boolean {
        return minOrderAmount == null || orderAmount >= minOrderAmount
    }
}

enum class DiscountType {
    PERCENTAGE,
    FIXED_AMOUNT
}

private fun Money.coerceAtLeast(minimum: Money): Money {
    return if (this < minimum) minimum else this
}
```

**Frequency:** 36% of PRs add extension functions

**Why:** Extension functions provide:
- Non-invasive way to add behavior
- Keep domain classes focused
- Easy to organize related functions
- Improve readability with domain language
- Easy to test in isolation

### 5. Enum Classes for Type-Safe Constants

**Pattern:** Use enum classes for domain constants with associated data and behavior.

**Example from PR #1271:**
```kotlin
// File: meal-selection-service-domain/src/main/kotlin/com/yourcompany/mealselection/domain/Recipe.kt
package com.yourcompany.mealselection.domain

import java.time.Duration
import java.util.UUID

data class Recipe(
    val id: UUID,
    val name: String,
    val description: String,
    val difficulty: RecipeDifficulty,
    val prepTime: Duration,
    val cookTime: Duration,
    val servings: Int,
    val cuisine: Cuisine,
    val dietaryRestrictions: Set<DietaryRestriction>,
    val ingredients: List<Ingredient>,
    val tags: Set<RecipeTag>
) {
    init {
        require(name.isNotBlank()) { "Recipe name cannot be blank" }
        require(servings > 0) { "Servings must be positive" }
        require(prepTime.toMinutes() > 0) { "Prep time must be positive" }
        require(cookTime.toMinutes() > 0) { "Cook time must be positive" }
        require(ingredients.isNotEmpty()) { "Recipe must have at least one ingredient" }
    }

    fun totalTime(): Duration = prepTime + cookTime

    fun isQuick(): Boolean = totalTime() <= Duration.ofMinutes(30)

    fun isVegetarian(): Boolean = DietaryRestriction.VEGETARIAN in dietaryRestrictions

    fun isVegan(): Boolean = DietaryRestriction.VEGAN in dietaryRestrictions

    fun isGlutenFree(): Boolean = DietaryRestriction.GLUTEN_FREE in dietaryRestrictions

    fun matchesDietaryRestrictions(restrictions: Set<DietaryRestriction>): Boolean {
        return restrictions.all { it in dietaryRestrictions }
    }

    fun isEasyForBeginner(): Boolean = difficulty == RecipeDifficulty.EASY

    fun estimatedCalories(): Int = difficulty.baseCalories + (ingredients.size * 50)
}

enum class RecipeDifficulty(
    val displayName: String,
    val skillLevel: Int,
    val baseCalories: Int,
    val estimatedTime: Duration
) {
    EASY(
        displayName = "Easy",
        skillLevel = 1,
        baseCalories = 400,
        estimatedTime = Duration.ofMinutes(20)
    ),
    MEDIUM(
        displayName = "Medium",
        skillLevel = 2,
        baseCalories = 550,
        estimatedTime = Duration.ofMinutes(35)
    ),
    HARD(
        displayName = "Hard",
        skillLevel = 3,
        baseCalories = 700,
        estimatedTime = Duration.ofMinutes(50)
    ),
    EXPERT(
        displayName = "Expert",
        skillLevel = 4,
        baseCalories = 850,
        estimatedTime = Duration.ofMinutes(70)
    );

    fun isAccessibleForSkillLevel(userSkillLevel: Int): Boolean =
        userSkillLevel >= skillLevel

    fun recommendedFor(userSkillLevel: Int): Boolean =
        userSkillLevel == skillLevel || userSkillLevel == skillLevel + 1

    companion object {
        fun fromSkillLevel(level: Int): RecipeDifficulty? =
            entries.find { it.skillLevel == level }
    }
}

enum class Cuisine(val displayName: String, val origin: String) {
    ITALIAN("Italian", "Italy"),
    FRENCH("French", "France"),
    MEXICAN("Mexican", "Mexico"),
    CHINESE("Chinese", "China"),
    JAPANESE("Japanese", "Japan"),
    INDIAN("Indian", "India"),
    THAI("Thai", "Thailand"),
    MEDITERRANEAN("Mediterranean", "Mediterranean Region"),
    AMERICAN("American", "United States"),
    FUSION("Fusion", "Multiple");

    fun isAsian(): Boolean = this in listOf(CHINESE, JAPANESE, INDIAN, THAI)

    fun isEuropean(): Boolean = this in listOf(ITALIAN, FRENCH, MEDITERRANEAN)
}

enum class DietaryRestriction(
    val displayName: String,
    val description: String,
    val excludes: List<String>
) {
    VEGETARIAN(
        displayName = "Vegetarian",
        description = "No meat or fish",
        excludes = listOf("meat", "poultry", "fish", "seafood")
    ),
    VEGAN(
        displayName = "Vegan",
        description = "No animal products",
        excludes = listOf("meat", "poultry", "fish", "seafood", "dairy", "eggs", "honey")
    ),
    GLUTEN_FREE(
        displayName = "Gluten-Free",
        description = "No gluten-containing grains",
        excludes = listOf("wheat", "barley", "rye", "gluten")
    ),
    DAIRY_FREE(
        displayName = "Dairy-Free",
        description = "No dairy products",
        excludes = listOf("milk", "cheese", "butter", "cream", "yogurt")
    ),
    NUT_FREE(
        displayName = "Nut-Free",
        description = "No tree nuts or peanuts",
        excludes = listOf("almonds", "cashews", "walnuts", "peanuts", "pecans")
    ),
    KETO(
        displayName = "Keto",
        description = "Low carb, high fat",
        excludes = listOf("bread", "pasta", "rice", "sugar", "grains")
    ),
    PALEO(
        displayName = "Paleo",
        description = "Whole foods, no processed",
        excludes = listOf("grains", "legumes", "dairy", "processed foods")
    ),
    LOW_CARB(
        displayName = "Low Carb",
        description = "Limited carbohydrates",
        excludes = listOf("bread", "pasta", "rice", "sugar")
    );

    fun isCompatibleWith(other: DietaryRestriction): Boolean {
        // Vegan includes vegetarian
        if (this == VEGAN && other == VEGETARIAN) return true
        if (this == VEGETARIAN && other == VEGAN) return false

        // Vegan includes dairy-free
        if (this == VEGAN && other == DAIRY_FREE) return true

        return this == other
    }

    fun excludesIngredient(ingredient: String): Boolean {
        return excludes.any { excluded ->
            ingredient.contains(excluded, ignoreCase = true)
        }
    }

    companion object {
        fun findByDisplayName(name: String): DietaryRestriction? =
            entries.find { it.displayName.equals(name, ignoreCase = true) }
    }
}

enum class RecipeTag(val displayName: String) {
    QUICK("Quick & Easy"),
    HEALTHY("Healthy"),
    COMFORT_FOOD("Comfort Food"),
    ONE_POT("One Pot"),
    MEAL_PREP("Meal Prep Friendly"),
    FAMILY_FRIENDLY("Family Friendly"),
    DATE_NIGHT("Date Night"),
    BUDGET_FRIENDLY("Budget Friendly"),
    GOURMET("Gourmet"),
    SEASONAL("Seasonal"),
    SPICY("Spicy"),
    LOW_CALORIE("Low Calorie"),
    HIGH_PROTEIN("High Protein");

    companion object {
        fun fromString(tag: String): RecipeTag? =
            entries.find { it.name.equals(tag, ignoreCase = true) }
    }
}

data class Ingredient(
    val id: UUID,
    val name: String,
    val quantity: Double,
    val unit: MeasurementUnit,
    val category: IngredientCategory
) {
    init {
        require(name.isNotBlank()) { "Ingredient name cannot be blank" }
        require(quantity > 0) { "Ingredient quantity must be positive" }
    }

    fun displayQuantity(): String = "$quantity ${unit.displayName}"
}

enum class MeasurementUnit(val displayName: String, val abbreviation: String) {
    GRAM("gram", "g"),
    KILOGRAM("kilogram", "kg"),
    MILLILITER("milliliter", "ml"),
    LITER("liter", "l"),
    TEASPOON("teaspoon", "tsp"),
    TABLESPOON("tablespoon", "tbsp"),
    CUP("cup", "cup"),
    PIECE("piece", "pc"),
    OUNCE("ounce", "oz"),
    POUND("pound", "lb");

    fun toMetric(): MeasurementUnit = when (this) {
        OUNCE -> GRAM
        POUND -> KILOGRAM
        else -> this
    }
}

enum class IngredientCategory {
    PROTEIN,
    VEGETABLE,
    FRUIT,
    GRAIN,
    DAIRY,
    SPICE,
    CONDIMENT,
    OIL,
    OTHER
}
```

**Frequency:** 40% of PRs use enums for domain constants

**Why:** Enums provide:
- Type safety for fixed sets of values
- Associated data with each constant
- Behavior attached to enum values
- Exhaustive when expressions
- Better than string constants

### 6. Immutable Domain Models

**Pattern:** Design domain entities as immutable data structures with copy methods for modifications.

**Example from PR #1278:**
```kotlin
// File: meal-selection-service-domain/src/main/kotlin/com/yourcompany/mealselection/domain/Customer.kt
package com.yourcompany.mealselection.domain

import java.time.Instant
import java.time.LocalDate
import java.util.UUID

data class Customer(
    val id: UUID,
    val email: Email,
    val profile: CustomerProfile,
    val preferences: CustomerPreferences,
    val subscription: Subscription?,
    val createdAt: Instant,
    val updatedAt: Instant
) {
    fun updateProfile(
        firstName: String? = null,
        lastName: String? = null,
        phoneNumber: PhoneNumber? = null,
        address: Address? = null
    ): Customer {
        return copy(
            profile = profile.copy(
                firstName = firstName ?: profile.firstName,
                lastName = lastName ?: profile.lastName,
                phoneNumber = phoneNumber ?: profile.phoneNumber,
                address = address ?: profile.address
            ),
            updatedAt = Instant.now()
        )
    }

    fun updatePreferences(
        dietaryRestrictions: Set<DietaryRestriction>? = null,
        cuisinePreferences: Set<Cuisine>? = null,
        servingsPerMeal: Int? = null,
        mealsPerWeek: Int? = null
    ): Customer {
        return copy(
            preferences = preferences.copy(
                dietaryRestrictions = dietaryRestrictions ?: preferences.dietaryRestrictions,
                cuisinePreferences = cuisinePreferences ?: preferences.cuisinePreferences,
                servingsPerMeal = servingsPerMeal ?: preferences.servingsPerMeal,
                mealsPerWeek = mealsPerWeek ?: preferences.mealsPerWeek
            ),
            updatedAt = Instant.now()
        )
    }

    fun subscribe(plan: SubscriptionPlan, startDate: LocalDate): Customer {
        require(subscription == null || !subscription.isActive()) {
            "Customer already has active subscription"
        }

        return copy(
            subscription = Subscription(
                id = UUID.randomUUID(),
                plan = plan,
                status = SubscriptionStatus.ACTIVE,
                startDate = startDate,
                renewalDate = startDate.plusMonths(1),
                createdAt = Instant.now()
            ),
            updatedAt = Instant.now()
        )
    }

    fun cancelSubscription(): Customer {
        require(subscription != null && subscription.isActive()) {
            "No active subscription to cancel"
        }

        return copy(
            subscription = subscription.cancel(),
            updatedAt = Instant.now()
        )
    }

    fun isSubscribed(): Boolean = subscription?.isActive() == true

    fun fullName(): String = "${profile.firstName} ${profile.lastName}"
}

data class CustomerProfile(
    val firstName: String,
    val lastName: String,
    val phoneNumber: PhoneNumber,
    val address: Address
) {
    init {
        require(firstName.isNotBlank()) { "First name cannot be blank" }
        require(lastName.isNotBlank()) { "Last name cannot be blank" }
    }
}

data class CustomerPreferences(
    val dietaryRestrictions: Set<DietaryRestriction>,
    val cuisinePreferences: Set<Cuisine>,
    val servingsPerMeal: Int,
    val mealsPerWeek: Int
) {
    init {
        require(servingsPerMeal in 1..10) { "Servings per meal must be between 1 and 10" }
        require(mealsPerWeek in 1..7) { "Meals per week must be between 1 and 7" }
    }

    fun matchesRecipe(recipe: Recipe): Boolean {
        val hasDietaryMatch = dietaryRestrictions.isEmpty() ||
            recipe.matchesDietaryRestrictions(dietaryRestrictions)

        val hasCuisineMatch = cuisinePreferences.isEmpty() ||
            recipe.cuisine in cuisinePreferences

        return hasDietaryMatch && hasCuisineMatch
    }
}

data class Subscription(
    val id: UUID,
    val plan: SubscriptionPlan,
    val status: SubscriptionStatus,
    val startDate: LocalDate,
    val renewalDate: LocalDate,
    val cancelledAt: Instant? = null,
    val createdAt: Instant
) {
    fun isActive(): Boolean = status == SubscriptionStatus.ACTIVE

    fun isPaused(): Boolean = status == SubscriptionStatus.PAUSED

    fun cancel(): Subscription {
        require(isActive()) { "Can only cancel active subscription" }

        return copy(
            status = SubscriptionStatus.CANCELLED,
            cancelledAt = Instant.now()
        )
    }

    fun pause(): Subscription {
        require(isActive()) { "Can only pause active subscription" }

        return copy(status = SubscriptionStatus.PAUSED)
    }

    fun resume(): Subscription {
        require(isPaused()) { "Can only resume paused subscription" }

        return copy(status = SubscriptionStatus.ACTIVE)
    }

    fun renew(): Subscription {
        require(isActive()) { "Can only renew active subscription" }

        return copy(renewalDate = renewalDate.plusMonths(1))
    }

    fun upgrade(newPlan: SubscriptionPlan): Subscription {
        require(isActive()) { "Can only upgrade active subscription" }
        require(newPlan.price > plan.price) { "New plan must be more expensive" }

        return copy(plan = newPlan)
    }

    fun downgrade(newPlan: SubscriptionPlan): Subscription {
        require(isActive()) { "Can only downgrade active subscription" }
        require(newPlan.price < plan.price) { "New plan must be less expensive" }

        return copy(plan = newPlan)
    }
}

enum class SubscriptionStatus {
    ACTIVE,
    PAUSED,
    CANCELLED
}

data class SubscriptionPlan(
    val id: UUID,
    val name: String,
    val price: Money,
    val mealsPerWeek: Int,
    val servingsPerMeal: Int,
    val features: Set<PlanFeature>
) {
    init {
        require(name.isNotBlank()) { "Plan name cannot be blank" }
        require(mealsPerWeek in 2..7) { "Meals per week must be between 2 and 7" }
        require(servingsPerMeal in 2..6) { "Servings per meal must be between 2 and 6" }
    }

    fun pricePerMeal(): Money = price / mealsPerWeek

    fun pricePerServing(): Money = price / (mealsPerWeek * servingsPerMeal)

    fun hasFeature(feature: PlanFeature): Boolean = feature in features
}

enum class PlanFeature(val displayName: String) {
    FREE_SHIPPING("Free Shipping"),
    PREMIUM_RECIPES("Premium Recipes Access"),
    FLEXIBLE_DELIVERY("Flexible Delivery"),
    PRIORITY_SUPPORT("Priority Customer Support"),
    WINE_PAIRING("Wine Pairing Suggestions"),
    NUTRITION_TRACKING("Nutrition Tracking");
}
```

**Frequency:** 100% of domain entities are immutable

**Why:** Immutability provides:
- Thread safety without synchronization
- Easier reasoning about code
- No defensive copying needed
- Safe to share across threads
- Prevents accidental modifications

## Implementation Guidelines

### Domain Entity Design

**Keep Entities Focused:**
```kotlin
// ✅ Good - Focused entity with clear responsibility
data class Cart(
    val id: UUID,
    val customerId: UUID,
    val items: List<CartItem>,
    val state: CartState,
    val createdAt: Instant,
    val updatedAt: Instant
) {
    fun addItem(item: CartItem): Cart { ... }
    fun removeItem(itemId: UUID): Cart { ... }
    fun totalAmount(): Money { ... }
}

// ❌ Bad - Too many responsibilities
data class Cart(
    val id: UUID,
    val customerId: UUID,
    val items: List<CartItem>,
    val paymentInfo: PaymentInfo,  // Should be separate
    val shippingInfo: ShippingInfo, // Should be separate
    val discounts: List<Discount>,
    val notifications: List<Notification> // Should be separate
)
```

### Validation Strategies

**Use init Blocks for Invariants:**
```kotlin
// ✅ Good - Validation in init block
data class CartItem(
    val quantity: Int,
    val price: Money
) {
    init {
        require(quantity > 0) { "Quantity must be positive" }
        require(quantity <= 10) { "Maximum quantity is 10" }
        require(price >= Money.ZERO) { "Price cannot be negative" }
    }
}

// ✅ Good - Validation in methods
fun Cart.addItem(item: CartItem): Cart {
    require(!isLocked()) { "Cannot modify locked cart" }
    require(items.size < 50) { "Cart is full" }
    return copy(items = items + item)
}
```

### Testing Domain Models

**Unit Tests for Domain Logic:**
```kotlin
// File: meal-selection-service-domain/src/test/kotlin/com/yourcompany/mealselection/domain/CartTest.kt
package com.yourcompany.mealselection.domain

import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.collections.shouldHaveSize
import java.time.Instant
import java.util.UUID

class CartTest : DescribeSpec({
    describe("Cart creation") {
        it("should create a valid cart") {
            val cart = Cart(
                id = UUID.randomUUID(),
                customerId = UUID.randomUUID(),
                items = emptyList(),
                state = CartState.ACTIVE,
                createdAt = Instant.now(),
                updatedAt = Instant.now()
            )

            cart.items shouldHaveSize 0
            cart.state shouldBe CartState.ACTIVE
        }

        it("should reject null UUID customer") {
            shouldThrow<IllegalArgumentException> {
                Cart(
                    id = UUID.randomUUID(),
                    customerId = UUID(0, 0),
                    items = emptyList(),
                    state = CartState.ACTIVE,
                    createdAt = Instant.now(),
                    updatedAt = Instant.now()
                )
            }
        }
    }

    describe("Cart.addItem") {
        it("should add item to active cart") {
            val cart = createTestCart()
            val item = createTestItem()

            val updatedCart = cart.addItem(item)

            updatedCart.items shouldHaveSize 1
            updatedCart.items shouldContain item
        }

        it("should throw when adding item to locked cart") {
            val cart = createTestCart(state = CartState.LOCKED)
            val item = createTestItem()

            shouldThrow<IllegalArgumentException> {
                cart.addItem(item)
            }
        }

        it("should throw when adding duplicate recipe") {
            val item = createTestItem()
            val cart = createTestCart(items = listOf(item))

            shouldThrow<IllegalArgumentException> {
                cart.addItem(item)
            }
        }
    }

    describe("Cart.totalAmount") {
        it("should calculate total for empty cart") {
            val cart = createTestCart()
            cart.totalAmount() shouldBe Money.ZERO
        }

        it("should calculate total with items") {
            val item1 = createTestItem(price = Money(10.0), quantity = 2)
            val item2 = createTestItem(price = Money(15.0), quantity = 1)
            val cart = createTestCart(items = listOf(item1, item2))

            cart.totalAmount() shouldBe Money(35.0)
        }
    }

    describe("Money operations") {
        it("should add money correctly") {
            val result = Money(10.0) + Money(5.0)
            result shouldBe Money(15.0)
        }

        it("should multiply money by quantity") {
            val result = Money(10.50) * 3
            result shouldBe Money(31.50)
        }

        it("should throw on negative result") {
            shouldThrow<IllegalArgumentException> {
                Money(5.0) - Money(10.0)
            }
        }
    }
})

private fun createTestCart(
    id: UUID = UUID.randomUUID(),
    customerId: UUID = UUID.randomUUID(),
    items: List<CartItem> = emptyList(),
    state: CartState = CartState.ACTIVE
) = Cart(
    id = id,
    customerId = customerId,
    items = items,
    state = state,
    createdAt = Instant.now(),
    updatedAt = Instant.now()
)

private fun createTestItem(
    id: UUID = UUID.randomUUID(),
    recipeId: UUID = UUID.randomUUID(),
    recipeName: String = "Test Recipe",
    quantity: Int = 1,
    price: Money = Money(10.0)
) = CartItem(
    id = id,
    recipeId = recipeId,
    recipeName = recipeName,
    quantity = quantity,
    price = price
)
```

## Anti-Patterns to Avoid

❌ **Don't use mutable domain models:**
```kotlin
// ❌ Bad - Mutable properties
data class Cart(
    val id: UUID,
    var items: MutableList<CartItem>,  // Mutable!
    var state: CartState               // Mutable!
) {
    fun addItem(item: CartItem) {
        items.add(item)  // Direct mutation
    }
}
```

✅ **Use immutable models:**
```kotlin
// ✅ Good - Immutable with copy
data class Cart(
    val id: UUID,
    val items: List<CartItem>,
    val state: CartState
) {
    fun addItem(item: CartItem): Cart {
        return copy(items = items + item)
    }
}
```

❌ **Don't expose internals:**
```kotlin
// ❌ Bad - Exposing mutable collection
data class Cart(
    val items: MutableList<CartItem>
)

val cart = Cart(mutableListOf())
cart.items.add(item)  // Can be modified from outside!
```

✅ **Return immutable collections:**
```kotlin
// ✅ Good - Immutable list
data class Cart(
    val items: List<CartItem>  // Immutable List interface
)
```

❌ **Don't put infrastructure concerns in domain:**
```kotlin
// ❌ Bad - Database logic in domain
data class Cart(...) {
    fun save() {
        database.execute("INSERT INTO carts ...")
    }
}
```

✅ **Keep domain pure:**
```kotlin
// ✅ Good - Pure domain logic
data class Cart(...) {
    fun addItem(item: CartItem): Cart {
        // Pure business logic only
        return copy(items = items + item)
    }
}

// Infrastructure in repository
class CartRepository {
    suspend fun save(cart: Cart): Cart {
        // Database logic here
    }
}
```

## Related Implementers

- **gradle-multi-module.md** - Module structure for domain layer
- **rest-api.md** - DTO mapping from domain models
- **database-access.md** - Persistence of domain entities
- **testing.md** - Testing strategies for domain logic
- **error-handling.md** - Domain exceptions and validation
