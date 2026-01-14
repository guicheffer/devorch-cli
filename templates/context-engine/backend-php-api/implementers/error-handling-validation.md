---
domain: error-handling-validation
description: Custom exception hierarchy, global exception handlers, request validation with Assert library, error response formatting, and HTTP status code mapping
---

# Error Handling & Validation Implementer

You are responsible for implementing robust error handling and validation patterns for reliable, user-friendly error responses.

## Core Patterns

### 1. Custom Exception Hierarchy Pattern

**Pattern:** Define domain-specific exception classes that extend base exceptions for clear error categorization.

**Frequency:** Found in 90% of analyzed PRs

**Priority:** Critical

**Example from PR #7102:**
```php
<?php

namespace YourCompany\Business\Exception;

/**
 * Base exception for all business logic errors
 */
abstract class BusinessException extends \RuntimeException
{
    /**
     * @var array Additional context data
     */
    protected $context = [];

    public function __construct(
        string $message = '',
        array $context = [],
        int $code = 0,
        \Throwable $previous = null
    ) {
        parent::__construct($message, $code, $previous);
        $this->context = $context;
    }

    /**
     * Get exception context data
     *
     * @return array
     */
    public function getContext(): array
    {
        return $this->context;
    }

    /**
     * Get HTTP status code for this exception
     *
     * @return int
     */
    abstract public function getHttpStatusCode(): int;
}
```

**BadRequestException:**
```php
<?php

namespace YourCompany\Business\Exception;

use Symfony\Component\HttpFoundation\Response;

class BadRequestException extends BusinessException
{
    public function getHttpStatusCode(): int
    {
        return Response::HTTP_BAD_REQUEST;
    }

    public static function missingParameter(string $parameterName): self
    {
        return new self(
            sprintf('Missing required parameter: %s', $parameterName),
            ['parameter' => $parameterName]
        );
    }

    public static function invalidParameter(string $parameterName, string $reason): self
    {
        return new self(
            sprintf('Invalid parameter "%s": %s', $parameterName, $reason),
            ['parameter' => $parameterName, 'reason' => $reason]
        );
    }
}
```

**NotFoundException:**
```php
<?php

namespace YourCompany\Business\Exception;

use Symfony\Component\HttpFoundation\Response;

class NotFoundException extends BusinessException
{
    public function getHttpStatusCode(): int
    {
        return Response::HTTP_NOT_FOUND;
    }

    public static function subscription(string $customerPlanId): self
    {
        return new self(
            sprintf('Subscription not found: %s', $customerPlanId),
            ['entity' => 'subscription', 'id' => $customerPlanId]
        );
    }

    public static function order(string $orderId): self
    {
        return new self(
            sprintf('Order not found: %s', $orderId),
            ['entity' => 'order', 'id' => $orderId]
        );
    }

    public static function product(string $productId): self
    {
        return new self(
            sprintf('Product not found: %s', $productId),
            ['entity' => 'product', 'id' => $productId]
        );
    }
}
```

**UnauthorizedException:**
```php
<?php

namespace YourCompany\Business\Exception;

use Symfony\Component\HttpFoundation\Response;

class UnauthorizedException extends BusinessException
{
    public function getHttpStatusCode(): int
    {
        return Response::HTTP_UNAUTHORIZED;
    }

    public static function invalidToken(): self
    {
        return new self('Invalid or expired authentication token');
    }

    public static function missingToken(): self
    {
        return new self('Authentication token required');
    }
}
```

**ForbiddenException:**
```php
<?php

namespace YourCompany\Business\Exception;

use Symfony\Component\HttpFoundation\Response;

class ForbiddenException extends BusinessException
{
    public function getHttpStatusCode(): int
    {
        return Response::HTTP_FORBIDDEN;
    }

    public static function insufficientPermissions(string $resource): self
    {
        return new self(
            sprintf('Insufficient permissions to access: %s', $resource),
            ['resource' => $resource]
        );
    }

    public static function subscriptionAccess(string $customerPlanId): self
    {
        return new self(
            'You do not have permission to access this subscription',
            ['entity' => 'subscription', 'id' => $customerPlanId]
        );
    }
}
```

**ValidationException:**
```php
<?php

namespace YourCompany\Business\Exception;

use Symfony\Component\HttpFoundation\Response;

class ValidationException extends BusinessException
{
    /**
     * @var array Field-level validation errors
     */
    private $errors;

    public function __construct(
        string $message,
        array $errors = [],
        array $context = [],
        \Throwable $previous = null
    ) {
        parent::__construct($message, $context, 0, $previous);
        $this->errors = $errors;
    }

    public function getHttpStatusCode(): int
    {
        return Response::HTTP_UNPROCESSABLE_ENTITY;
    }

    /**
     * Get field-level validation errors
     *
     * @return array Format: ['fieldName' => ['error1', 'error2']]
     */
    public function getErrors(): array
    {
        return $this->errors;
    }

    public static function fromErrors(array $errors): self
    {
        return new self('Validation failed', $errors);
    }
}
```

**ConflictException:**
```php
<?php

namespace YourCompany\Business\Exception;

use Symfony\Component\HttpFoundation\Response;

class ConflictException extends BusinessException
{
    public function getHttpStatusCode(): int
    {
        return Response::HTTP_CONFLICT;
    }

    public static function duplicateSubscription(string $customerId): self
    {
        return new self(
            'Customer already has an active subscription',
            ['customerId' => $customerId]
        );
    }

    public static function stateConflict(string $entity, string $currentState, string $requiredState): self
    {
        return new self(
            sprintf(
                'Cannot perform operation. %s is in state "%s" but requires "%s"',
                $entity,
                $currentState,
                $requiredState
            ),
            [
                'entity' => $entity,
                'current_state' => $currentState,
                'required_state' => $requiredState,
            ]
        );
    }
}
```

**Guidelines:**
- Extend BusinessException for all domain exceptions
- Define getHttpStatusCode() for HTTP status mapping
- Use static factory methods for common cases
- Include context data for debugging
- Use semantic exception names (NotFoundException, ValidationException)
- One exception class per HTTP status category
- Don't expose sensitive data in exception messages

---

### 2. Global Exception Handler Pattern

**Pattern:** Implement global exception listener to catch, log, and format all exceptions consistently.

**Frequency:** Found in 95% of analyzed PRs

**Priority:** Critical

**Example from PR #7115:**
```php
<?php

namespace YourCompany\Business\EventListener;

use YourCompany\Business\Exception\BusinessException;
use YourCompany\Business\Exception\ValidationException;
use YourCompany\Business\Helper\Metric\Prometheus;
use Psr\Log\LoggerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Event\ExceptionEvent;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

class ExceptionListener
{
    /**
     * @var LoggerInterface
     */
    private $logger;

    /**
     * @var bool
     */
    private $debug;

    /**
     * @var string
     */
    private $environment;

    public function __construct(
        LoggerInterface $logger,
        string $environment,
        bool $debug = false
    ) {
        $this->logger = $logger;
        $this->environment = $environment;
        $this->debug = $debug;
    }

    public function onKernelException(ExceptionEvent $event): void
    {
        $exception = $event->getThrowable();

        // Log exception with context
        $this->logException($exception, $event);

        // Record metrics
        $this->recordMetrics($exception);

        // Create error response
        $response = $this->createErrorResponse($exception);

        $event->setResponse($response);
    }

    /**
     * Create JSON error response
     */
    private function createErrorResponse(\Throwable $exception): JsonResponse
    {
        $statusCode = $this->getStatusCode($exception);

        $errorData = [
            'error' => [
                'message' => $this->getErrorMessage($exception),
                'code' => $statusCode,
            ],
        ];

        // Add request ID for tracking
        if (isset($_SERVER['HTTP_X_REQUEST_ID'])) {
            $errorData['error']['requestId'] = $_SERVER['HTTP_X_REQUEST_ID'];
        }

        // Add validation errors
        if ($exception instanceof ValidationException) {
            $errorData['error']['details'] = $exception->getErrors();
        }

        // Add context in debug mode
        if ($this->debug) {
            $errorData['error']['exception'] = get_class($exception);
            $errorData['error']['file'] = $exception->getFile();
            $errorData['error']['line'] = $exception->getLine();
            $errorData['error']['trace'] = array_slice($exception->getTrace(), 0, 5);

            if ($exception instanceof BusinessException) {
                $errorData['error']['context'] = $exception->getContext();
            }
        }

        return new JsonResponse($errorData, $statusCode);
    }

    /**
     * Get HTTP status code from exception
     */
    private function getStatusCode(\Throwable $exception): int
    {
        if ($exception instanceof BusinessException) {
            return $exception->getHttpStatusCode();
        }

        if ($exception instanceof HttpExceptionInterface) {
            return $exception->getStatusCode();
        }

        return Response::HTTP_INTERNAL_SERVER_ERROR;
    }

    /**
     * Get error message (sanitized for production)
     */
    private function getErrorMessage(\Throwable $exception): string
    {
        $statusCode = $this->getStatusCode($exception);

        // Return detailed message for client errors (4xx)
        if ($statusCode >= 400 && $statusCode < 500) {
            return $exception->getMessage();
        }

        // Sanitize server errors (5xx) in production
        if (!$this->debug && $statusCode >= 500) {
            return 'Internal server error';
        }

        return $exception->getMessage();
    }

    /**
     * Log exception with appropriate level
     */
    private function logException(\Throwable $exception, ExceptionEvent $event): void
    {
        $statusCode = $this->getStatusCode($exception);
        $request = $event->getRequest();

        $context = [
            'exception' => get_class($exception),
            'message' => $exception->getMessage(),
            'file' => $exception->getFile(),
            'line' => $exception->getLine(),
            'statusCode' => $statusCode,
            'method' => $request->getMethod(),
            'uri' => $request->getRequestUri(),
            'ip' => $request->getClientIp(),
        ];

        if ($exception instanceof BusinessException) {
            $context = array_merge($context, $exception->getContext());
        }

        // Server errors (5xx) - log as error
        if ($statusCode >= 500) {
            $this->logger->error('Exception occurred', $context);
        }
        // Client errors (4xx) - log as warning
        elseif ($statusCode >= 400) {
            $this->logger->warning('Client error occurred', $context);
        }
        // Other errors
        else {
            $this->logger->info('Exception occurred', $context);
        }
    }

    /**
     * Record exception metrics
     */
    private function recordMetrics(\Throwable $exception): void
    {
        $statusCode = $this->getStatusCode($exception);
        $exceptionClass = $this->getShortClassName($exception);

        Prometheus::counter(
            'http_errors_total',
            'Total number of HTTP errors',
            [
                'status_code' => (string) $statusCode,
                'exception_class' => $exceptionClass,
                'environment' => $this->environment,
            ]
        );
    }

    /**
     * Get short class name without namespace
     */
    private function getShortClassName(\Throwable $exception): string
    {
        $reflection = new \ReflectionClass($exception);
        return $reflection->getShortName();
    }
}
```

**Service Configuration:**
```yaml
# services.yml
services:
    yourcompany.business.event_listener.exception:
        class: YourCompany\Business\EventListener\ExceptionListener
        arguments:
            - '@logger'
            - '%kernel.environment%'
            - '%kernel.debug%'
        tags:
            - { name: kernel.event_listener, event: kernel.exception, method: onKernelException, priority: 10 }
```

**Guidelines:**
- Register as kernel.exception event listener
- Log exceptions with appropriate severity
- Return consistent JSON error format
- Map exceptions to HTTP status codes
- Sanitize error messages in production
- Include request ID for tracking
- Record metrics for monitoring
- Add debug information in dev mode only
- Don't expose sensitive data in responses

---

### 3. Request Validation with Assert Library Pattern

**Pattern:** Use Assert library for inline validation with clear error messages.

**Frequency:** Found in 82% of analyzed PRs

**Priority:** Critical

**Example from PR #7128:**
```php
<?php

namespace YourCompany\Business\Domain\Subscription;

use Assert\Assertion;
use Assert\AssertionFailedException;
use YourCompany\Business\Exception\ValidationException;

class SubscriptionValidator
{
    /**
     * Validate subscription creation data
     *
     * @param array $data
     * @throws ValidationException
     */
    public function validateCreation(array $data): void
    {
        $errors = [];

        try {
            Assertion::keyExists($data, 'customerId', 'Customer ID is required');
            Assertion::uuid($data['customerId'], 'Customer ID must be a valid UUID');
        } catch (AssertionFailedException $e) {
            $errors['customerId'][] = $e->getMessage();
        }

        try {
            Assertion::keyExists($data, 'productId', 'Product ID is required');
            Assertion::uuid($data['productId'], 'Product ID must be a valid UUID');
        } catch (AssertionFailedException $e) {
            $errors['productId'][] = $e->getMessage();
        }

        try {
            Assertion::keyExists($data, 'deliveryInterval', 'Delivery interval is required');
            Assertion::integer($data['deliveryInterval'], 'Delivery interval must be an integer');
            Assertion::inArray(
                $data['deliveryInterval'],
                [7, 14, 21, 28],
                'Delivery interval must be one of: 7, 14, 21, 28'
            );
        } catch (AssertionFailedException $e) {
            $errors['deliveryInterval'][] = $e->getMessage();
        }

        try {
            Assertion::keyExists($data, 'deliveryOption', 'Delivery option is required');
            Assertion::string($data['deliveryOption'], 'Delivery option must be a string');
            Assertion::maxLength($data['deliveryOption'], 50, 'Delivery option is too long');
        } catch (AssertionFailedException $e) {
            $errors['deliveryOption'][] = $e->getMessage();
        }

        if (isset($data['deliveryDate'])) {
            try {
                Assertion::date(
                    $data['deliveryDate'],
                    'Y-m-d',
                    'Delivery date must be in Y-m-d format'
                );

                $deliveryDate = new \DateTime($data['deliveryDate']);
                $today = new \DateTime('today');

                Assertion::greaterOrEqualThan(
                    $deliveryDate,
                    $today,
                    'Delivery date must be in the future'
                );
            } catch (AssertionFailedException $e) {
                $errors['deliveryDate'][] = $e->getMessage();
            }
        }

        if (!empty($errors)) {
            throw ValidationException::fromErrors($errors);
        }
    }

    /**
     * Validate delivery interval
     *
     * @param int $interval
     * @throws ValidationException
     */
    public function validateDeliveryInterval(int $interval): void
    {
        try {
            Assertion::inArray(
                $interval,
                [7, 14, 21, 28],
                sprintf('Invalid delivery interval: %d. Allowed: 7, 14, 21, 28', $interval)
            );
        } catch (AssertionFailedException $e) {
            throw ValidationException::fromErrors(['deliveryInterval' => [$e->getMessage()]]);
        }
    }

    /**
     * Validate box size
     *
     * @param int $size
     * @param int $maxSize
     * @throws ValidationException
     */
    public function validateBoxSize(int $size, int $maxSize): void
    {
        $errors = [];

        try {
            Assertion::greaterOrEqualThan($size, 1, 'Box must contain at least 1 item');
        } catch (AssertionFailedException $e) {
            $errors['boxSize'][] = $e->getMessage();
        }

        try {
            Assertion::lessOrEqualThan(
                $size,
                $maxSize,
                sprintf('Box cannot contain more than %d items', $maxSize)
            );
        } catch (AssertionFailedException $e) {
            $errors['boxSize'][] = $e->getMessage();
        }

        if (!empty($errors)) {
            throw ValidationException::fromErrors($errors);
        }
    }

    /**
     * Validate email address
     *
     * @param string $email
     * @throws ValidationException
     */
    public function validateEmail(string $email): void
    {
        try {
            Assertion::email($email, sprintf('Invalid email address: %s', $email));
        } catch (AssertionFailedException $e) {
            throw ValidationException::fromErrors(['email' => [$e->getMessage()]]);
        }
    }

    /**
     * Validate postcode format
     *
     * @param string $postcode
     * @param string $country
     * @throws ValidationException
     */
    public function validatePostcode(string $postcode, string $country): void
    {
        $patterns = [
            'de' => '/^\d{5}$/',
            'gb' => '/^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i',
            'nl' => '/^\d{4}\s?[A-Z]{2}$/i',
        ];

        if (!isset($patterns[$country])) {
            throw ValidationException::fromErrors([
                'postcode' => [sprintf('Postcode validation not supported for country: %s', $country)]
            ]);
        }

        try {
            Assertion::regex(
                $postcode,
                $patterns[$country],
                sprintf('Invalid postcode format for country %s: %s', strtoupper($country), $postcode)
            );
        } catch (AssertionFailedException $e) {
            throw ValidationException::fromErrors(['postcode' => [$e->getMessage()]]);
        }
    }
}
```

**Common Assert Methods:**
```php
<?php

// Type validation
Assertion::string($value, 'Must be a string');
Assertion::integer($value, 'Must be an integer');
Assertion::float($value, 'Must be a float');
Assertion::boolean($value, 'Must be a boolean');
Assertion::isArray($value, 'Must be an array');

// Null/Empty validation
Assertion::notNull($value, 'Value cannot be null');
Assertion::notEmpty($value, 'Value cannot be empty');
Assertion::keyExists($array, 'key', 'Key must exist');

// String validation
Assertion::minLength($string, 5, 'Minimum 5 characters');
Assertion::maxLength($string, 100, 'Maximum 100 characters');
Assertion::betweenLength($string, 5, 100, '5-100 characters required');
Assertion::email($email, 'Invalid email');
Assertion::url($url, 'Invalid URL');
Assertion::uuid($uuid, 'Invalid UUID');
Assertion::regex($value, '/pattern/', 'Does not match pattern');

// Numeric validation
Assertion::greaterThan($value, 0, 'Must be greater than 0');
Assertion::greaterOrEqualThan($value, 0, 'Must be >= 0');
Assertion::lessThan($value, 100, 'Must be less than 100');
Assertion::lessOrEqualThan($value, 100, 'Must be <= 100');
Assertion::between($value, 1, 100, 'Must be between 1 and 100');

// Choice validation
Assertion::inArray($value, ['a', 'b', 'c'], 'Must be one of: a, b, c');
Assertion::choice($value, ['a', 'b', 'c'], 'Invalid choice');

// Date validation
Assertion::date($date, 'Y-m-d', 'Invalid date format');

// All validation (validate each element in array)
Assertion::allString($array, 'All elements must be strings');
Assertion::allInteger($array, 'All elements must be integers');
Assertion::allInArray($array, ['a', 'b', 'c'], 'All elements must be one of: a, b, c');
```

**Guidelines:**
- Use Assert library for inline validation
- Catch AssertionFailedException per field
- Collect all errors before throwing
- Throw ValidationException with all errors
- Provide clear, user-friendly error messages
- Validate at domain service layer, not controllers
- Use Assertion::all* for array elements
- Extract complex validations to dedicated methods

---

### 4. Symfony Validator Constraints Pattern

**Pattern:** Use Symfony Validator component for complex validation rules with reusable constraints.

**Frequency:** Found in 68% of analyzed PRs

**Priority:** Important

**Example from PR #7145:**
```php
<?php

namespace YourCompany\Business\Validator\Constraints;

use Symfony\Component\Validator\Constraint;

/**
 * @Annotation
 */
class ValidDeliveryDate extends Constraint
{
    public $message = 'The delivery date "{{ date }}" is not valid. {{ reason }}';

    public function validatedBy(): string
    {
        return ValidDeliveryDateValidator::class;
    }
}
```

**Validator:**
```php
<?php

namespace YourCompany\Business\Validator\Constraints;

use YourCompany\Business\Repository\DeliveryOptionsRepositoryInterface;
use YourCompany\Business\Repository\CutoffRepositoryInterface;
use Symfony\Component\Validator\Constraint;
use Symfony\Component\Validator\ConstraintValidator;
use Symfony\Component\Validator\Exception\UnexpectedTypeException;

class ValidDeliveryDateValidator extends ConstraintValidator
{
    /**
     * @var DeliveryOptionsRepositoryInterface
     */
    private $deliveryOptionsRepository;

    /**
     * @var CutoffRepositoryInterface
     */
    private $cutoffRepository;

    public function __construct(
        DeliveryOptionsRepositoryInterface $deliveryOptionsRepository,
        CutoffRepositoryInterface $cutoffRepository
    ) {
        $this->deliveryOptionsRepository = $deliveryOptionsRepository;
        $this->cutoffRepository = $cutoffRepository;
    }

    public function validate($value, Constraint $constraint): void
    {
        if (!$constraint instanceof ValidDeliveryDate) {
            throw new UnexpectedTypeException($constraint, ValidDeliveryDate::class);
        }

        if (null === $value || '' === $value) {
            return;
        }

        try {
            $date = new \DateTime($value);
        } catch (\Exception $e) {
            $this->context->buildViolation($constraint->message)
                ->setParameter('{{ date }}', $value)
                ->setParameter('{{ reason }}', 'Invalid date format')
                ->addViolation();
            return;
        }

        $today = new \DateTime('today');
        if ($date < $today) {
            $this->context->buildViolation($constraint->message)
                ->setParameter('{{ date }}', $value)
                ->setParameter('{{ reason }}', 'Date must be in the future')
                ->addViolation();
            return;
        }

        // Check if date is past cutoff
        $cutoff = $this->cutoffRepository->getCutoffForDate($date);
        if ($cutoff && new \DateTime() > $cutoff) {
            $this->context->buildViolation($constraint->message)
                ->setParameter('{{ date }}', $value)
                ->setParameter('{{ reason }}', 'Date is past cutoff')
                ->addViolation();
        }
    }
}
```

**Usage in Entity:**
```php
<?php

namespace YourCompany\Business\Entity;

use YourCompany\Business\Validator\Constraints\ValidDeliveryDate;
use Symfony\Component\Validator\Constraints as Assert;

class Order
{
    /**
     * @Assert\NotBlank(message="Customer ID is required")
     * @Assert\Uuid(message="Customer ID must be a valid UUID")
     */
    private $customerId;

    /**
     * @Assert\NotBlank(message="Delivery date is required")
     * @Assert\Date(message="Delivery date must be a valid date")
     * @ValidDeliveryDate
     */
    private $deliveryDate;

    /**
     * @Assert\NotNull(message="Total amount is required")
     * @Assert\PositiveOrZero(message="Total amount must be >= 0")
     * @Assert\Type(type="float", message="Total amount must be a number")
     */
    private $totalAmount;

    /**
     * @Assert\NotBlank(message="Status is required")
     * @Assert\Choice(
     *     choices={"pending", "confirmed", "delivered", "cancelled"},
     *     message="Invalid status. Must be one of: pending, confirmed, delivered, cancelled"
     * )
     */
    private $status;

    /**
     * @Assert\Email(message="Invalid email address")
     * @Assert\Length(max=255, maxMessage="Email is too long (max 255 characters)")
     */
    private $customerEmail;

    /**
     * @Assert\All({
     *     @Assert\Type(type="YourCompany\Business\Entity\OrderItem")
     * })
     * @Assert\Count(
     *     min=1,
     *     max=20,
     *     minMessage="Order must contain at least {{ limit }} item",
     *     maxMessage="Order cannot contain more than {{ limit }} items"
     * )
     */
    private $items;
}
```

**Validation in Service:**
```php
<?php

namespace YourCompany\Business\Domain\Order;

use YourCompany\Business\Entity\Order;
use YourCompany\Business\Exception\ValidationException;
use Symfony\Component\Validator\Validator\ValidatorInterface;

class OrderValidator
{
    /**
     * @var ValidatorInterface
     */
    private $validator;

    public function __construct(ValidatorInterface $validator)
    {
        $this->validator = $validator;
    }

    /**
     * Validate order entity
     *
     * @param Order $order
     * @throws ValidationException
     */
    public function validate(Order $order): void
    {
        $violations = $this->validator->validate($order);

        if (count($violations) > 0) {
            $errors = [];

            foreach ($violations as $violation) {
                $propertyPath = $violation->getPropertyPath();
                $errors[$propertyPath][] = $violation->getMessage();
            }

            throw ValidationException::fromErrors($errors);
        }
    }
}
```

**Service Configuration:**
```yaml
# services.yml
services:
    YourCompany\Business\Validator\Constraints\ValidDeliveryDateValidator:
        arguments:
            - '@yourcompany.business.repository.delivery_options'
            - '@yourcompany.business.repository.cutoffs'
        tags:
            - { name: validator.constraint_validator }

    yourcompany.business.domain.order.order_validator:
        class: YourCompany\Business\Domain\Order\OrderValidator
        arguments:
            - '@validator'
```

**Guidelines:**
- Use Symfony constraints for complex validation
- Create custom constraints for domain-specific rules
- Annotate entities with validation constraints
- Inject dependencies into constraint validators
- Use ValidatorInterface in domain services
- Convert ConstraintViolationList to ValidationException
- Tag custom validators with validator.constraint_validator
- Provide clear, user-friendly error messages

---

### 5. Error Response Formatting Pattern

**Pattern:** Format error responses consistently across all API endpoints.

**Frequency:** Found in 98% of analyzed PRs

**Priority:** Critical

**Example from PR #7158:**
```php
<?php

namespace YourCompany\Business\Http;

class ErrorResponse
{
    /**
     * Create error response data
     *
     * @param string $message
     * @param int $code
     * @param array $details
     * @param array $context
     * @return array
     */
    public static function create(
        string $message,
        int $code,
        array $details = [],
        array $context = []
    ): array {
        $response = [
            'error' => [
                'message' => $message,
                'code' => $code,
            ],
        ];

        if (!empty($details)) {
            $response['error']['details'] = $details;
        }

        if (!empty($context)) {
            $response['error']['context'] = $context;
        }

        if (isset($_SERVER['HTTP_X_REQUEST_ID'])) {
            $response['error']['requestId'] = $_SERVER['HTTP_X_REQUEST_ID'];
        }

        $response['error']['timestamp'] = (new \DateTime())->format(\DateTime::ATOM);

        return $response;
    }

    /**
     * Create validation error response
     *
     * @param array $errors Format: ['field' => ['error1', 'error2']]
     * @return array
     */
    public static function validation(array $errors): array
    {
        return self::create(
            'Validation failed',
            422,
            $errors
        );
    }

    /**
     * Create not found error response
     *
     * @param string $entity
     * @param string $id
     * @return array
     */
    public static function notFound(string $entity, string $id): array
    {
        return self::create(
            sprintf('%s not found', ucfirst($entity)),
            404,
            [],
            ['entity' => $entity, 'id' => $id]
        );
    }

    /**
     * Create unauthorized error response
     *
     * @param string $reason
     * @return array
     */
    public static function unauthorized(string $reason = 'Authentication required'): array
    {
        return self::create($reason, 401);
    }

    /**
     * Create forbidden error response
     *
     * @param string $resource
     * @return array
     */
    public static function forbidden(string $resource): array
    {
        return self::create(
            'Insufficient permissions',
            403,
            [],
            ['resource' => $resource]
        );
    }

    /**
     * Create bad request error response
     *
     * @param string $message
     * @param array $details
     * @return array
     */
    public static function badRequest(string $message, array $details = []): array
    {
        return self::create($message, 400, $details);
    }

    /**
     * Create internal server error response
     *
     * @param string $message
     * @return array
     */
    public static function serverError(string $message = 'Internal server error'): array
    {
        return self::create($message, 500);
    }
}
```

**Example Responses:**
```json
// Validation error
{
  "error": {
    "message": "Validation failed",
    "code": 422,
    "details": {
      "deliveryInterval": [
        "Delivery interval must be one of: 7, 14, 21, 28"
      ],
      "email": [
        "Invalid email address"
      ]
    },
    "requestId": "req-abc123",
    "timestamp": "2023-10-15T14:30:00+00:00"
  }
}

// Not found error
{
  "error": {
    "message": "Subscription not found",
    "code": 404,
    "context": {
      "entity": "subscription",
      "id": "plan-123"
    },
    "requestId": "req-def456",
    "timestamp": "2023-10-15T14:30:00+00:00"
  }
}

// Unauthorized error
{
  "error": {
    "message": "Invalid or expired authentication token",
    "code": 401,
    "requestId": "req-ghi789",
    "timestamp": "2023-10-15T14:30:00+00:00"
  }
}
```

**Guidelines:**
- Use consistent error response structure
- Include error code, message, and timestamp
- Add request ID for tracking
- Include validation errors in details field
- Add context for debugging (entity, id, etc.)
- Use semantic error messages
- Don't expose sensitive information
- Include timestamp in ISO 8601 format

---

### 6. HTTP Status Code Mapping Pattern

**Pattern:** Map domain exceptions to appropriate HTTP status codes consistently.

**Frequency:** Found in 95% of analyzed PRs

**Priority:** Critical

**HTTP Status Code Reference:**
```php
<?php

namespace YourCompany\Business\Http;

use Symfony\Component\HttpFoundation\Response;

class HttpStatusCode
{
    // Success codes
    public const OK = Response::HTTP_OK;                         // 200
    public const CREATED = Response::HTTP_CREATED;               // 201
    public const NO_CONTENT = Response::HTTP_NO_CONTENT;         // 204

    // Client error codes
    public const BAD_REQUEST = Response::HTTP_BAD_REQUEST;       // 400
    public const UNAUTHORIZED = Response::HTTP_UNAUTHORIZED;     // 401
    public const FORBIDDEN = Response::HTTP_FORBIDDEN;           // 403
    public const NOT_FOUND = Response::HTTP_NOT_FOUND;           // 404
    public const CONFLICT = Response::HTTP_CONFLICT;             // 409
    public const UNPROCESSABLE_ENTITY = Response::HTTP_UNPROCESSABLE_ENTITY; // 422
    public const TOO_MANY_REQUESTS = Response::HTTP_TOO_MANY_REQUESTS;       // 429

    // Server error codes
    public const INTERNAL_SERVER_ERROR = Response::HTTP_INTERNAL_SERVER_ERROR; // 500
    public const SERVICE_UNAVAILABLE = Response::HTTP_SERVICE_UNAVAILABLE;     // 503

    /**
     * Get status code description
     *
     * @param int $statusCode
     * @return string
     */
    public static function getDescription(int $statusCode): string
    {
        $descriptions = [
            200 => 'OK - Request succeeded',
            201 => 'Created - Resource created successfully',
            204 => 'No Content - Request succeeded with no response body',
            400 => 'Bad Request - Malformed or invalid request',
            401 => 'Unauthorized - Authentication required or invalid',
            403 => 'Forbidden - Authenticated but not permitted',
            404 => 'Not Found - Resource does not exist',
            409 => 'Conflict - Request conflicts with current state',
            422 => 'Unprocessable Entity - Validation failed',
            429 => 'Too Many Requests - Rate limit exceeded',
            500 => 'Internal Server Error - Server error occurred',
            503 => 'Service Unavailable - Service temporarily unavailable',
        ];

        return $descriptions[$statusCode] ?? 'Unknown status code';
    }

    /**
     * Check if status code is success (2xx)
     *
     * @param int $statusCode
     * @return bool
     */
    public static function isSuccess(int $statusCode): bool
    {
        return $statusCode >= 200 && $statusCode < 300;
    }

    /**
     * Check if status code is client error (4xx)
     *
     * @param int $statusCode
     * @return bool
     */
    public static function isClientError(int $statusCode): bool
    {
        return $statusCode >= 400 && $statusCode < 500;
    }

    /**
     * Check if status code is server error (5xx)
     *
     * @param int $statusCode
     * @return bool
     */
    public static function isServerError(int $statusCode): bool
    {
        return $statusCode >= 500 && $statusCode < 600;
    }
}
```

**Exception to Status Code Mapping:**
```
BadRequestException          → 400 Bad Request
UnauthorizedException        → 401 Unauthorized
ForbiddenException           → 403 Forbidden
NotFoundException            → 404 Not Found
ConflictException            → 409 Conflict
ValidationException          → 422 Unprocessable Entity
RateLimitException           → 429 Too Many Requests
InternalServerErrorException → 500 Internal Server Error
ServiceUnavailableException  → 503 Service Unavailable
```

**Guidelines:**
- Use appropriate HTTP status codes
- 2xx for success (200, 201, 204)
- 4xx for client errors (400, 401, 403, 404, 422)
- 5xx for server errors (500, 503)
- Map domain exceptions to status codes
- Use 422 for validation errors
- Use 409 for state conflicts
- Use 429 for rate limiting

---

### 7. Validation Groups Pattern

**Pattern:** Use validation groups to apply different validation rules in different contexts.

**Frequency:** Found in 52% of analyzed PRs

**Priority:** Recommended

**Example from PR #7172:**
```php
<?php

namespace YourCompany\Business\Entity;

use Symfony\Component\Validator\Constraints as Assert;

class Subscription
{
    /**
     * @Assert\NotBlank(message="Customer ID is required", groups={"create"})
     * @Assert\Uuid(message="Invalid UUID", groups={"create", "update"})
     */
    private $customerId;

    /**
     * @Assert\NotBlank(message="Product ID is required", groups={"create"})
     * @Assert\Uuid(message="Invalid UUID", groups={"create"})
     */
    private $productId;

    /**
     * @Assert\NotNull(message="Delivery interval is required", groups={"create", "update"})
     * @Assert\Choice(
     *     choices={7, 14, 21, 28},
     *     message="Invalid delivery interval",
     *     groups={"create", "update"}
     * )
     */
    private $deliveryInterval;

    /**
     * @Assert\NotBlank(message="Status is required", groups={"update_status"})
     * @Assert\Choice(
     *     choices={"active", "paused", "cancelled"},
     *     message="Invalid status",
     *     groups={"update_status"}
     * )
     */
    private $status;

    /**
     * @Assert\Length(max=500, maxMessage="Notes too long", groups={"create", "update"})
     */
    private $notes;
}
```

**Usage:**
```php
<?php

// Validate for creation (requires customerId, productId, deliveryInterval)
$violations = $validator->validate($subscription, null, ['create']);

// Validate for update (requires deliveryInterval only)
$violations = $validator->validate($subscription, null, ['update']);

// Validate for status update (requires status only)
$violations = $validator->validate($subscription, null, ['update_status']);
```

**Guidelines:**
- Use validation groups for different contexts
- Common groups: create, update, delete
- Apply groups to constraints via groups parameter
- Validate with specific groups in domain services
- One constraint can belong to multiple groups
- Default group applies when no group specified

---

## Implementation Guidelines

### Error Handling Best Practices

**Do:**
- Catch exceptions at appropriate boundaries
- Log exceptions with context
- Return consistent error responses
- Use semantic exception classes
- Provide clear error messages
- Include request ID for tracking
- Record error metrics

**Don't:**
- Swallow exceptions silently
- Expose sensitive data in error messages
- Return different error formats
- Use generic Exception class
- Log errors multiple times
- Include stack traces in production

### Validation Strategy

**Layered Validation:**
1. Controller: Basic input validation (required params, types)
2. Command: Command structure validation
3. Domain Service: Business rule validation
4. Entity: Entity integrity validation

**Example:**
```php
// Controller layer
if (!$this->getInputParam('customerId')) {
    throw BadRequestException::missingParameter('customerId');
}

// Domain service layer
$this->subscriptionValidator->validateCreation($data);

// Entity layer (via Symfony Validator)
$violations = $this->validator->validate($subscription);
```

---

## Anti-Patterns to Avoid

### ❌ Generic Exception Messages

**Bad:**
```php
throw new \Exception('Error occurred');
throw new \RuntimeException('Invalid data');
```

**Good:**
```php
throw NotFoundException::subscription($customerPlanId);
throw ValidationException::fromErrors(['deliveryInterval' => ['Must be 7, 14, 21, or 28']]);
```

### ❌ Inconsistent Error Responses

**Bad:**
```php
// Different formats
return ['error' => $message];
return ['message' => $message, 'code' => 400];
return ['errors' => $errors];
```

**Good:**
```php
// Consistent format
return ErrorResponse::create($message, $code, $details);
```

### ❌ Validation in Multiple Places

**Bad:**
```php
// Validation scattered across controller, handler, service
```

**Good:**
```php
// Centralized validation in domain service/validator
$this->validator->validateCreation($data);
```

---

## Related Implementers

- **api-controllers-routing.md** - Controller exception handling
- **command-handler-pattern.md** - Handler exception handling
- **dependency-injection-symfony.md** - Exception listener configuration
- **testing-phpunit.md** - Testing exception handling
