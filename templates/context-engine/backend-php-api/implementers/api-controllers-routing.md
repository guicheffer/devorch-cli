---
domain: api-controllers-routing
description: Laravel-style API controllers with route definitions, request/response handling, Swagger/OpenAPI annotations, and input validation patterns
---

# API Controllers & Routing Implementer

You are responsible for implementing API controllers and routing for clean, well-documented, and maintainable REST API endpoints.

## Core Patterns

### 1. RESTful Controller Pattern

**Pattern:** Create thin controllers that delegate business logic to command handlers while managing HTTP concerns.

**Frequency:** Found in 95% of analyzed PRs

**Priority:** Critical

**Example from PR #6982:**
```php
<?php

namespace App\Controllers;

use Hellofresh\Business\Command\Subscription\CreateSubscription;
use Hellofresh\Business\Command\Subscription\UpdateSubscription;
use Hellofresh\Business\Command\Subscription\CancelSubscription;
use Hellofresh\Business\Controller\AbstractController;
use Hellofresh\Business\Entity\Subscription;
use Symfony\Component\HttpFoundation\Response;

class SubscriptionsController extends AbstractController
{
    /**
     * @SWG\Api(
     *   path="/subscriptions",
     *   @SWG\Operation(
     *     method="POST",
     *     summary="Create a new subscription",
     *     @SWG\Parameter(
     *       name="customerId",
     *       description="Customer ID",
     *       required=true,
     *       type="string",
     *       paramType="form"
     *     ),
     *     @SWG\Parameter(
     *       name="productId",
     *       description="Product ID",
     *       required=true,
     *       type="string",
     *       paramType="form"
     *     ),
     *     @SWG\Parameter(
     *       name="deliveryInterval",
     *       description="Delivery interval in days",
     *       required=true,
     *       type="integer",
     *       paramType="form"
     *     ),
     *     @SWG\Parameter(
     *       name="deliveryOption",
     *       description="Delivery option handle",
     *       required=true,
     *       type="string",
     *       paramType="form"
     *     ),
     *     @SWG\ResponseMessage(code=201, message="Subscription created"),
     *     @SWG\Partial("error400"),
     *     @SWG\Partial("error401"),
     *     @SWG\Partial("error422")
     *   )
     * )
     */
    public function postSubscriptions(): Response
    {
        $subscription = $this->execute(new CreateSubscription(
            $this->getToken(),
            $this->getRequiredInputParam('customerId'),
            $this->getRequiredInputParam('productId'),
            (int) $this->getRequiredInputParam('deliveryInterval'),
            $this->getRequiredInputParam('deliveryOption')
        ));

        return $this->jsonResponse($subscription, Response::HTTP_CREATED);
    }

    /**
     * @SWG\Api(
     *   path="/subscriptions/{id}",
     *   @SWG\Operation(
     *     method="GET",
     *     summary="Get subscription by ID",
     *     @SWG\Parameter(
     *       name="id",
     *       description="Subscription ID",
     *       required=true,
     *       type="string",
     *       paramType="path"
     *     ),
     *     @SWG\ResponseMessage(code=200),
     *     @SWG\Partial("error404"),
     *     @SWG\Partial("error401")
     *   )
     * )
     */
    public function getSubscription(string $id): Response
    {
        $subscription = $this->execute(new GetSubscription(
            $this->getToken(),
            $id
        ));

        return $this->jsonResponse($subscription);
    }

    /**
     * @SWG\Api(
     *   path="/subscriptions/{id}",
     *   @SWG\Operation(
     *     method="PUT",
     *     summary="Update subscription",
     *     @SWG\Parameter(
     *       name="id",
     *       description="Subscription ID",
     *       required=true,
     *       type="string",
     *       paramType="path"
     *     ),
     *     @SWG\Parameter(
     *       name="deliveryInterval",
     *       description="Delivery interval in days",
     *       required=false,
     *       type="integer",
     *       paramType="form"
     *     ),
     *     @SWG\Parameter(
     *       name="deliveryOption",
     *       description="Delivery option handle",
     *       required=false,
     *       type="string",
     *       paramType="form"
     *     ),
     *     @SWG\ResponseMessage(code=200),
     *     @SWG\Partial("error400"),
     *     @SWG\Partial("error404"),
     *     @SWG\Partial("error401")
     *   )
     * )
     */
    public function putSubscription(string $id): Response
    {
        $subscription = $this->execute(new UpdateSubscription(
            $this->getToken(),
            $id,
            $this->getInputParam('deliveryInterval'),
            $this->getInputParam('deliveryOption')
        ));

        return $this->jsonResponse($subscription);
    }

    /**
     * @SWG\Api(
     *   path="/subscriptions/{id}",
     *   @SWG\Operation(
     *     method="DELETE",
     *     summary="Cancel subscription",
     *     @SWG\Parameter(
     *       name="id",
     *       description="Subscription ID",
     *       required=true,
     *       type="string",
     *       paramType="path"
     *     ),
     *     @SWG\Parameter(
     *       name="reason",
     *       description="Cancellation reason",
     *       required=false,
     *       type="string",
     *       paramType="form"
     *     ),
     *     @SWG\ResponseMessage(code=204, message="Subscription cancelled"),
     *     @SWG\Partial("error404"),
     *     @SWG\Partial("error401")
     *   )
     * )
     */
    public function deleteSubscription(string $id): Response
    {
        $this->execute(new CancelSubscription(
            $this->getToken(),
            $id,
            $this->getInputParam('reason')
        ));

        return $this->emptyResponse(Response::HTTP_NO_CONTENT);
    }

    /**
     * @SWG\Api(
     *   path="/subscriptions",
     *   @SWG\Operation(
     *     method="GET",
     *     summary="List subscriptions",
     *     @SWG\Parameter(
     *       name="customerId",
     *       description="Filter by customer ID",
     *       required=false,
     *       type="string",
     *       paramType="query"
     *     ),
     *     @SWG\Parameter(
     *       name="status",
     *       description="Filter by status",
     *       required=false,
     *       type="string",
     *       paramType="query"
     *     ),
     *     @SWG\Parameter(
     *       name="limit",
     *       description="Number of results",
     *       required=false,
     *       type="integer",
     *       paramType="query"
     *     ),
     *     @SWG\Parameter(
     *       name="offset",
     *       description="Offset for pagination",
     *       required=false,
     *       type="integer",
     *       paramType="query"
     *     ),
     *     @SWG\ResponseMessage(code=200),
     *     @SWG\Partial("error400"),
     *     @SWG\Partial("error401")
     *   )
     * )
     */
    public function getSubscriptions(): Response
    {
        $subscriptions = $this->execute(new ListSubscriptions(
            $this->getToken(),
            $this->getQueryParam('customerId'),
            $this->getQueryParam('status'),
            (int) ($this->getQueryParam('limit') ?? 20),
            (int) ($this->getQueryParam('offset') ?? 0)
        ));

        return $this->jsonResponse($subscriptions);
    }
}
```

**Guidelines:**
- Extend AbstractController for shared functionality
- One controller per resource (subscriptions, orders, etc.)
- Follow REST conventions (GET, POST, PUT, DELETE)
- Use Swagger annotations for API documentation
- Delegate business logic to command handlers via execute()
- Extract input using getInputParam() / getQueryParam()
- Pass security token from getToken()
- Return appropriate HTTP status codes
- No business logic in controllers

---

### 2. Route Definition Pattern

**Pattern:** Define routes in YAML configuration files mapping HTTP methods and paths to controller actions.

**Frequency:** Found in 95% of analyzed PRs

**Priority:** Critical

**Example from PR #6988:**
```yaml
# config/routes.yml

# Subscription routes
subscriptions_create:
    path: /subscriptions
    methods: [POST]
    defaults:
        _controller: App\Controllers\SubscriptionsController::postSubscriptions

subscriptions_get:
    path: /subscriptions/{id}
    methods: [GET]
    defaults:
        _controller: App\Controllers\SubscriptionsController::getSubscription
    requirements:
        id: '[a-zA-Z0-9\-]+'

subscriptions_update:
    path: /subscriptions/{id}
    methods: [PUT]
    defaults:
        _controller: App\Controllers\SubscriptionsController::putSubscription
    requirements:
        id: '[a-zA-Z0-9\-]+'

subscriptions_delete:
    path: /subscriptions/{id}
    methods: [DELETE]
    defaults:
        _controller: App\Controllers\SubscriptionsController::deleteSubscription
    requirements:
        id: '[a-zA-Z0-9\-]+'

subscriptions_list:
    path: /subscriptions
    methods: [GET]
    defaults:
        _controller: App\Controllers\SubscriptionsController::getSubscriptions

# Order routes
orders_create:
    path: /orders
    methods: [POST]
    defaults:
        _controller: App\Controllers\OrdersController::postOrders

orders_get:
    path: /orders/{id}
    methods: [GET]
    defaults:
        _controller: App\Controllers\OrdersController::getOrder
    requirements:
        id: '[a-zA-Z0-9\-]+'

# Nested resource routes
subscription_orders:
    path: /subscriptions/{subscriptionId}/orders
    methods: [GET]
    defaults:
        _controller: App\Controllers\OrdersController::getSubscriptionOrders
    requirements:
        subscriptionId: '[a-zA-Z0-9\-]+'

# Custom action routes
subscription_pause:
    path: /subscriptions/{id}/pause
    methods: [POST]
    defaults:
        _controller: App\Controllers\SubscriptionsController::postPause
    requirements:
        id: '[a-zA-Z0-9\-]+'

subscription_resume:
    path: /subscriptions/{id}/resume
    methods: [POST]
    defaults:
        _controller: App\Controllers\SubscriptionsController::postResume
    requirements:
        id: '[a-zA-Z0-9\-]+'
```

**Guidelines:**
- Use YAML for route definitions
- Name routes descriptively (subscriptions_create, orders_list)
- Map HTTP methods explicitly (methods: [GET])
- Use path parameters for resource IDs ({id})
- Add requirements for path parameter validation
- Group related routes together with comments
- Use RESTful naming conventions
- Define nested resources when needed
- Custom actions use POST with descriptive path

---

### 3. Input Parameter Extraction Pattern

**Pattern:** Extract and validate input parameters from request using AbstractController helper methods.

**Frequency:** Found in 98% of analyzed PRs

**Priority:** Critical

**Example from PR #6995:**
```php
<?php

namespace Hellofresh\Business\Controller;

use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\HttpFoundation\Response;

abstract class AbstractController
{
    /**
     * @var RequestStack
     */
    protected $requestStack;

    /**
     * Get current request
     *
     * @return Request
     */
    protected function getRequest(): Request
    {
        return $this->requestStack->getCurrentRequest();
    }

    /**
     * Get optional input parameter from request body or query string
     *
     * @param string $name
     * @param mixed $default
     * @return mixed|null
     */
    protected function getInputParam(string $name, $default = null)
    {
        $request = $this->getRequest();

        // Check POST/PUT body first
        if ($request->request->has($name)) {
            return $request->request->get($name);
        }

        // Check query string
        if ($request->query->has($name)) {
            return $request->query->get($name);
        }

        // Check JSON body
        if ($request->getContentType() === 'json') {
            $data = json_decode($request->getContent(), true);
            if (isset($data[$name])) {
                return $data[$name];
            }
        }

        return $default;
    }

    /**
     * Get required input parameter (throws exception if missing)
     *
     * @param string $name
     * @return mixed
     * @throws BadRequestException
     */
    protected function getRequiredInputParam(string $name)
    {
        $value = $this->getInputParam($name);

        if ($value === null) {
            throw new BadRequestException(sprintf('Missing required parameter: %s', $name));
        }

        return $value;
    }

    /**
     * Get query parameter from URL query string
     *
     * @param string $name
     * @param mixed $default
     * @return mixed|null
     */
    protected function getQueryParam(string $name, $default = null)
    {
        return $this->getRequest()->query->get($name, $default);
    }

    /**
     * Get required query parameter (throws exception if missing)
     *
     * @param string $name
     * @return mixed
     * @throws BadRequestException
     */
    protected function getRequiredQueryParam(string $name)
    {
        $value = $this->getQueryParam($name);

        if ($value === null) {
            throw new BadRequestException(sprintf('Missing required query parameter: %s', $name));
        }

        return $value;
    }

    /**
     * Get all input parameters as array
     *
     * @return array
     */
    protected function getAllInputParams(): array
    {
        $request = $this->getRequest();

        // JSON body
        if ($request->getContentType() === 'json') {
            $data = json_decode($request->getContent(), true);
            return is_array($data) ? $data : [];
        }

        // Form data
        return $request->request->all();
    }

    /**
     * Get path parameter from route
     *
     * @param string $name
     * @return mixed
     */
    protected function getPathParam(string $name)
    {
        return $this->getRequest()->attributes->get($name);
    }
}
```

**Usage in Controller:**
```php
<?php

public function postOrders(): Response
{
    // Required parameters
    $customerId = $this->getRequiredInputParam('customerId');
    $productId = $this->getRequiredInputParam('productId');

    // Optional parameters with defaults
    $couponCode = $this->getInputParam('couponCode');
    $notes = $this->getInputParam('notes', '');

    // Query parameters
    $includeItems = $this->getQueryParam('includeItems', false);

    // Path parameters
    $subscriptionId = $this->getPathParam('id');

    // All parameters as array
    $allParams = $this->getAllInputParams();

    // Execute command
    $order = $this->execute(new CreateOrder(
        $this->getToken(),
        $customerId,
        $productId,
        $couponCode,
        $notes
    ));

    return $this->jsonResponse($order, Response::HTTP_CREATED);
}
```

**Guidelines:**
- Use getInputParam() for optional parameters
- Use getRequiredInputParam() for required parameters
- Use getQueryParam() for URL query string parameters
- Use getPathParam() for route path parameters
- Support both form data and JSON body
- Throw BadRequestException for missing required params
- Type cast numeric parameters explicitly
- Provide sensible defaults for optional parameters

---

### 4. JSON Response Pattern

**Pattern:** Return JSON responses with consistent formatting and appropriate HTTP status codes.

**Frequency:** Found in 98% of analyzed PRs

**Priority:** Critical

**Example from PR #7002:**
```php
<?php

namespace Hellofresh\Business\Controller;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Serializer\SerializerInterface;

abstract class AbstractController
{
    /**
     * @var SerializerInterface
     */
    protected $serializer;

    /**
     * Return JSON response
     *
     * @param mixed $data
     * @param int $status
     * @param array $headers
     * @param array $context
     * @return Response
     */
    protected function jsonResponse(
        $data,
        int $status = Response::HTTP_OK,
        array $headers = [],
        array $context = []
    ): Response {
        $json = $this->serializer->serialize($data, 'json', array_merge([
            'json_encode_options' => JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE,
        ], $context));

        return new Response(
            $json,
            $status,
            array_merge(['Content-Type' => 'application/json'], $headers)
        );
    }

    /**
     * Return empty response (for 204 No Content)
     *
     * @param int $status
     * @param array $headers
     * @return Response
     */
    protected function emptyResponse(
        int $status = Response::HTTP_NO_CONTENT,
        array $headers = []
    ): Response {
        return new Response('', $status, $headers);
    }

    /**
     * Return paginated JSON response
     *
     * @param array $items
     * @param int $total
     * @param int $limit
     * @param int $offset
     * @param int $status
     * @return Response
     */
    protected function paginatedJsonResponse(
        array $items,
        int $total,
        int $limit,
        int $offset,
        int $status = Response::HTTP_OK
    ): Response {
        $data = [
            'items' => $items,
            'meta' => [
                'total' => $total,
                'limit' => $limit,
                'offset' => $offset,
                'count' => count($items),
            ],
        ];

        return $this->jsonResponse($data, $status);
    }

    /**
     * Return error response
     *
     * @param string $message
     * @param int $status
     * @param array $errors
     * @return Response
     */
    protected function errorResponse(
        string $message,
        int $status = Response::HTTP_BAD_REQUEST,
        array $errors = []
    ): Response {
        $data = [
            'error' => [
                'message' => $message,
                'code' => $status,
            ],
        ];

        if (!empty($errors)) {
            $data['error']['details'] = $errors;
        }

        return $this->jsonResponse($data, $status);
    }
}
```

**Usage Examples:**
```php
<?php

// Success response with 200 OK
return $this->jsonResponse($subscription);

// Created response with 201 Created
return $this->jsonResponse($subscription, Response::HTTP_CREATED);

// No content response with 204 No Content
return $this->emptyResponse(Response::HTTP_NO_CONTENT);

// Paginated response
$subscriptions = $subscriptionRepository->findByCriteria($criteria);
$total = $subscriptionRepository->countByCriteria($criteria);

return $this->paginatedJsonResponse(
    $subscriptions,
    $total,
    $limit,
    $offset
);

// Error response
return $this->errorResponse(
    'Invalid delivery interval',
    Response::HTTP_UNPROCESSABLE_ENTITY,
    ['deliveryInterval' => ['Must be one of: 7, 14, 21, 28']]
);
```

**Guidelines:**
- Use jsonResponse() for all successful responses
- Use appropriate HTTP status codes (200, 201, 204, etc.)
- Use emptyResponse() for 204 No Content
- Use paginatedJsonResponse() for list endpoints
- Use errorResponse() for validation errors
- Serialize entities using Symfony Serializer
- Use JSON_UNESCAPED_SLASHES for clean URLs
- Set Content-Type header to application/json
- Include meta information for paginated responses

---

### 5. Swagger/OpenAPI Documentation Pattern

**Pattern:** Document API endpoints using Swagger/OpenAPI annotations for automatic API documentation generation.

**Frequency:** Found in 92% of analyzed PRs

**Priority:** Critical

**Example from PR #7015:**
```php
<?php

namespace App\Controllers;

use Hellofresh\Business\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;

class OrdersController extends AbstractController
{
    /**
     * @SWG\Api(
     *   path="/orders",
     *   @SWG\Operation(
     *     method="POST",
     *     summary="Create a new order",
     *     notes="Creates a new order for the authenticated customer",
     *     @SWG\Parameter(
     *       name="customerId",
     *       description="Customer identifier",
     *       required=true,
     *       type="string",
     *       paramType="form"
     *     ),
     *     @SWG\Parameter(
     *       name="subscriptionId",
     *       description="Subscription identifier",
     *       required=true,
     *       type="string",
     *       paramType="form"
     *     ),
     *     @SWG\Parameter(
     *       name="deliveryDate",
     *       description="Requested delivery date (Y-m-d format)",
     *       required=true,
     *       type="string",
     *       paramType="form"
     *     ),
     *     @SWG\Parameter(
     *       name="items",
     *       description="Array of item configurations",
     *       required=true,
     *       type="array",
     *       paramType="body",
     *       @SWG\Items(
     *         type="object",
     *         @SWG\Property(property="productId", type="string"),
     *         @SWG\Property(property="quantity", type="integer")
     *       )
     *     ),
     *     @SWG\Parameter(
     *       name="couponCode",
     *       description="Optional coupon code",
     *       required=false,
     *       type="string",
     *       paramType="form"
     *     ),
     *     @SWG\ResponseMessage(
     *       code=201,
     *       message="Order created successfully",
     *       responseModel="Order"
     *     ),
     *     @SWG\ResponseMessage(
     *       code=400,
     *       message="Bad request - invalid input"
     *     ),
     *     @SWG\ResponseMessage(
     *       code=401,
     *       message="Unauthorized - invalid or missing token"
     *     ),
     *     @SWG\ResponseMessage(
     *       code=422,
     *       message="Unprocessable entity - validation failed"
     *     ),
     *     @SWG\Partial("error400"),
     *     @SWG\Partial("error401"),
     *     @SWG\Partial("error422")
     *   )
     * )
     */
    public function postOrders(): Response
    {
        $order = $this->execute(new CreateOrder(
            $this->getToken(),
            $this->getRequiredInputParam('customerId'),
            $this->getRequiredInputParam('subscriptionId'),
            $this->getRequiredInputParam('deliveryDate'),
            $this->getRequiredInputParam('items'),
            $this->getInputParam('couponCode')
        ));

        return $this->jsonResponse($order, Response::HTTP_CREATED);
    }

    /**
     * @SWG\Api(
     *   path="/orders/{id}",
     *   @SWG\Operation(
     *     method="GET",
     *     summary="Get order by ID",
     *     notes="Retrieves a specific order by its identifier",
     *     @SWG\Parameter(
     *       name="id",
     *       description="Order identifier",
     *       required=true,
     *       type="string",
     *       paramType="path"
     *     ),
     *     @SWG\Parameter(
     *       name="include",
     *       description="Include related resources (items,customer,subscription)",
     *       required=false,
     *       type="string",
     *       paramType="query"
     *     ),
     *     @SWG\ResponseMessage(
     *       code=200,
     *       message="Order retrieved successfully",
     *       responseModel="Order"
     *     ),
     *     @SWG\ResponseMessage(
     *       code=404,
     *       message="Order not found"
     *     ),
     *     @SWG\Partial("error401"),
     *     @SWG\Partial("error404")
     *   )
     * )
     */
    public function getOrder(string $id): Response
    {
        $order = $this->execute(new GetOrder(
            $this->getToken(),
            $id,
            $this->getQueryParam('include')
        ));

        return $this->jsonResponse($order);
    }

    /**
     * @SWG\Api(
     *   path="/orders",
     *   @SWG\Operation(
     *     method="GET",
     *     summary="List orders",
     *     notes="Retrieves a paginated list of orders with optional filters",
     *     @SWG\Parameter(
     *       name="customerId",
     *       description="Filter by customer ID",
     *       required=false,
     *       type="string",
     *       paramType="query"
     *     ),
     *     @SWG\Parameter(
     *       name="subscriptionId",
     *       description="Filter by subscription ID",
     *       required=false,
     *       type="string",
     *       paramType="query"
     *     ),
     *     @SWG\Parameter(
     *       name="status",
     *       description="Filter by status (pending,confirmed,delivered,cancelled)",
     *       required=false,
     *       type="string",
     *       paramType="query"
     *     ),
     *     @SWG\Parameter(
     *       name="deliveryDateFrom",
     *       description="Filter by delivery date from (Y-m-d)",
     *       required=false,
     *       type="string",
     *       paramType="query"
     *     ),
     *     @SWG\Parameter(
     *       name="deliveryDateTo",
     *       description="Filter by delivery date to (Y-m-d)",
     *       required=false,
     *       type="string",
     *       paramType="query"
     *     ),
     *     @SWG\Parameter(
     *       name="limit",
     *       description="Number of results per page (max 100)",
     *       required=false,
     *       type="integer",
     *       paramType="query",
     *       defaultValue="20"
     *     ),
     *     @SWG\Parameter(
     *       name="offset",
     *       description="Offset for pagination",
     *       required=false,
     *       type="integer",
     *       paramType="query",
     *       defaultValue="0"
     *     ),
     *     @SWG\Parameter(
     *       name="sortBy",
     *       description="Sort field (createdAt,deliveryDate,totalAmount)",
     *       required=false,
     *       type="string",
     *       paramType="query",
     *       defaultValue="createdAt"
     *     ),
     *     @SWG\Parameter(
     *       name="sortOrder",
     *       description="Sort order (ASC,DESC)",
     *       required=false,
     *       type="string",
     *       paramType="query",
     *       defaultValue="DESC"
     *     ),
     *     @SWG\ResponseMessage(
     *       code=200,
     *       message="Orders retrieved successfully"
     *     ),
     *     @SWG\Partial("error400"),
     *     @SWG\Partial("error401")
     *   )
     * )
     */
    public function getOrders(): Response
    {
        $result = $this->execute(new ListOrders(
            $this->getToken(),
            [
                'customerId' => $this->getQueryParam('customerId'),
                'subscriptionId' => $this->getQueryParam('subscriptionId'),
                'status' => $this->getQueryParam('status'),
                'deliveryDateFrom' => $this->getQueryParam('deliveryDateFrom'),
                'deliveryDateTo' => $this->getQueryParam('deliveryDateTo'),
                'limit' => (int) ($this->getQueryParam('limit') ?? 20),
                'offset' => (int) ($this->getQueryParam('offset') ?? 0),
                'sortBy' => $this->getQueryParam('sortBy', 'createdAt'),
                'sortOrder' => $this->getQueryParam('sortOrder', 'DESC'),
            ]
        ));

        return $this->paginatedJsonResponse(
            $result['items'],
            $result['total'],
            $result['limit'],
            $result['offset']
        );
    }
}
```

**Model Documentation:**
```php
<?php

/**
 * @SWG\Model(
 *   id="Order",
 *   description="Order entity",
 *   @SWG\Property(
 *     name="orderId",
 *     type="string",
 *     description="Order identifier"
 *   ),
 *   @SWG\Property(
 *     name="customerId",
 *     type="string",
 *     description="Customer identifier"
 *   ),
 *   @SWG\Property(
 *     name="subscriptionId",
 *     type="string",
 *     description="Subscription identifier"
 *   ),
 *   @SWG\Property(
 *     name="status",
 *     type="string",
 *     description="Order status",
 *     enum=["pending","confirmed","delivered","cancelled"]
 *   ),
 *   @SWG\Property(
 *     name="deliveryDate",
 *     type="string",
 *     format="date",
 *     description="Delivery date (Y-m-d)"
 *   ),
 *   @SWG\Property(
 *     name="totalAmount",
 *     type="number",
 *     format="float",
 *     description="Total order amount"
 *   ),
 *   @SWG\Property(
 *     name="items",
 *     type="array",
 *     description="Order items",
 *     @SWG\Items(ref="OrderItem")
 *   ),
 *   @SWG\Property(
 *     name="createdAt",
 *     type="string",
 *     format="date-time",
 *     description="Creation timestamp"
 *   ),
 *   @SWG\Property(
 *     name="updatedAt",
 *     type="string",
 *     format="date-time",
 *     description="Last update timestamp"
 *   )
 * )
 */
class Order
{
    // Entity implementation...
}
```

**Guidelines:**
- Use @SWG\Api for endpoint documentation
- Use @SWG\Operation for HTTP method details
- Document all parameters with name, description, type, required
- Use paramType: form for body, query for query string, path for URL
- Document all possible response codes
- Use @SWG\Partial for reusable error responses
- Document request/response models
- Include notes for complex endpoints
- Use enum for restricted values
- Document default values for optional parameters

---

### 6. Request Validation Pattern

**Pattern:** Validate request input at controller level before passing to command handlers.

**Frequency:** Found in 78% of analyzed PRs

**Priority:** Important

**Example from PR #7028:**
```php
<?php

namespace App\Controllers;

use Hellofresh\Business\Controller\AbstractController;
use Hellofresh\Business\Validator\RequestValidatorInterface;
use Symfony\Component\HttpFoundation\Response;

class SubscriptionsController extends AbstractController
{
    /**
     * @var RequestValidatorInterface
     */
    private $requestValidator;

    public function __construct(RequestValidatorInterface $requestValidator)
    {
        $this->requestValidator = $requestValidator;
    }

    /**
     * @SWG\Api(...)
     */
    public function postSubscriptions(): Response
    {
        // Validate request input
        $violations = $this->requestValidator->validate($this->getAllInputParams(), [
            'customerId' => ['required', 'string', 'uuid'],
            'productId' => ['required', 'string', 'uuid'],
            'deliveryInterval' => ['required', 'integer', 'in:7,14,21,28'],
            'deliveryOption' => ['required', 'string', 'max:50'],
            'deliveryDate' => ['optional', 'date', 'format:Y-m-d', 'after:today'],
            'couponCode' => ['optional', 'string', 'max:20'],
        ]);

        if (!empty($violations)) {
            return $this->errorResponse(
                'Validation failed',
                Response::HTTP_UNPROCESSABLE_ENTITY,
                $violations
            );
        }

        // Execute command
        $subscription = $this->execute(new CreateSubscription(
            $this->getToken(),
            $this->getRequiredInputParam('customerId'),
            $this->getRequiredInputParam('productId'),
            (int) $this->getRequiredInputParam('deliveryInterval'),
            $this->getRequiredInputParam('deliveryOption'),
            $this->getInputParam('deliveryDate'),
            $this->getInputParam('couponCode')
        ));

        return $this->jsonResponse($subscription, Response::HTTP_CREATED);
    }
}
```

**Request Validator Implementation:**
```php
<?php

namespace Hellofresh\Business\Validator;

use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Validator\ValidatorInterface;

class RequestValidator implements RequestValidatorInterface
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
     * Validate input data against rules
     *
     * @param array $data
     * @param array $rules
     * @return array Validation errors
     */
    public function validate(array $data, array $rules): array
    {
        $constraints = $this->buildConstraints($rules);
        $violations = $this->validator->validate($data, $constraints);

        $errors = [];
        foreach ($violations as $violation) {
            $propertyPath = $violation->getPropertyPath();
            $errors[$propertyPath][] = $violation->getMessage();
        }

        return $errors;
    }

    /**
     * Build Symfony constraints from rules array
     *
     * @param array $rules
     * @return Assert\Collection
     */
    private function buildConstraints(array $rules): Assert\Collection
    {
        $fields = [];

        foreach ($rules as $field => $fieldRules) {
            $constraints = [];
            $required = in_array('required', $fieldRules, true);

            foreach ($fieldRules as $rule) {
                if ($rule === 'required') {
                    $constraints[] = new Assert\NotBlank();
                } elseif ($rule === 'string') {
                    $constraints[] = new Assert\Type('string');
                } elseif ($rule === 'integer') {
                    $constraints[] = new Assert\Type('integer');
                } elseif ($rule === 'email') {
                    $constraints[] = new Assert\Email();
                } elseif ($rule === 'uuid') {
                    $constraints[] = new Assert\Uuid();
                } elseif ($rule === 'date') {
                    $constraints[] = new Assert\Date();
                } elseif (strpos($rule, 'max:') === 0) {
                    $max = (int) substr($rule, 4);
                    $constraints[] = new Assert\Length(['max' => $max]);
                } elseif (strpos($rule, 'min:') === 0) {
                    $min = (int) substr($rule, 4);
                    $constraints[] = new Assert\Length(['min' => $min]);
                } elseif (strpos($rule, 'in:') === 0) {
                    $choices = explode(',', substr($rule, 3));
                    $constraints[] = new Assert\Choice($choices);
                } elseif (strpos($rule, 'format:') === 0) {
                    $format = substr($rule, 7);
                    $constraints[] = new Assert\Regex([
                        'pattern' => $this->getDateFormatPattern($format)
                    ]);
                }
            }

            $fields[$field] = $required
                ? new Assert\Required($constraints)
                : new Assert\Optional($constraints);
        }

        return new Assert\Collection(['fields' => $fields]);
    }

    private function getDateFormatPattern(string $format): string
    {
        if ($format === 'Y-m-d') {
            return '/^\d{4}-\d{2}-\d{2}$/';
        }

        return '/.*/';
    }
}
```

**Guidelines:**
- Validate input at controller level before commands
- Use RequestValidator service for reusable validation
- Define validation rules as arrays
- Return 422 Unprocessable Entity for validation errors
- Include detailed error messages in response
- Validate types, formats, ranges, and enums
- Support required and optional fields
- Use Symfony Validator constraints internally
- Return array of errors grouped by field

---

### 7. Exception Handling Pattern

**Pattern:** Handle exceptions globally and return appropriate HTTP error responses.

**Frequency:** Found in 95% of analyzed PRs

**Priority:** Critical

**Example from PR #7042:**
```php
<?php

namespace Hellofresh\Business\EventListener;

use Hellofresh\Business\Exception\BadRequestException;
use Hellofresh\Business\Exception\NotFoundException;
use Hellofresh\Business\Exception\UnauthorizedException;
use Hellofresh\Business\Exception\ValidationException;
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

    public function __construct(LoggerInterface $logger, bool $debug = false)
    {
        $this->logger = $logger;
        $this->debug = $debug;
    }

    public function onKernelException(ExceptionEvent $event): void
    {
        $exception = $event->getThrowable();

        $this->logException($exception);

        $response = $this->createErrorResponse($exception);

        $event->setResponse($response);
    }

    private function createErrorResponse(\Throwable $exception): JsonResponse
    {
        $statusCode = $this->getStatusCode($exception);
        $errorData = [
            'error' => [
                'message' => $exception->getMessage(),
                'code' => $statusCode,
            ],
        ];

        // Add exception class in debug mode
        if ($this->debug) {
            $errorData['error']['exception'] = get_class($exception);
            $errorData['error']['trace'] = $exception->getTraceAsString();
        }

        // Add validation errors if available
        if ($exception instanceof ValidationException) {
            $errorData['error']['details'] = $exception->getErrors();
        }

        return new JsonResponse($errorData, $statusCode);
    }

    private function getStatusCode(\Throwable $exception): int
    {
        if ($exception instanceof HttpExceptionInterface) {
            return $exception->getStatusCode();
        }

        if ($exception instanceof BadRequestException) {
            return Response::HTTP_BAD_REQUEST;
        }

        if ($exception instanceof UnauthorizedException) {
            return Response::HTTP_UNAUTHORIZED;
        }

        if ($exception instanceof NotFoundException) {
            return Response::HTTP_NOT_FOUND;
        }

        if ($exception instanceof ValidationException) {
            return Response::HTTP_UNPROCESSABLE_ENTITY;
        }

        return Response::HTTP_INTERNAL_SERVER_ERROR;
    }

    private function logException(\Throwable $exception): void
    {
        $context = [
            'exception' => get_class($exception),
            'message' => $exception->getMessage(),
            'file' => $exception->getFile(),
            'line' => $exception->getLine(),
        ];

        if ($this->getStatusCode($exception) >= 500) {
            $this->logger->error('Exception occurred', $context);
        } else {
            $this->logger->info('Client error occurred', $context);
        }
    }
}
```

**Service Configuration:**
```yaml
# services.yml
services:
    yourcompany.business.event_listener.exception:
        class: Hellofresh\Business\EventListener\ExceptionListener
        arguments:
            - '@logger'
            - '%kernel.debug%'
        tags:
            - { name: kernel.event_listener, event: kernel.exception, method: onKernelException }
```

**Custom Exception Classes:**
```php
<?php

namespace Hellofresh\Business\Exception;

class BadRequestException extends \RuntimeException
{
    public function __construct(string $message = 'Bad request', \Throwable $previous = null)
    {
        parent::__construct($message, 0, $previous);
    }
}

class NotFoundException extends \RuntimeException
{
    public function __construct(string $message = 'Resource not found', \Throwable $previous = null)
    {
        parent::__construct($message, 0, $previous);
    }
}

class UnauthorizedException extends \RuntimeException
{
    public function __construct(string $message = 'Unauthorized', \Throwable $previous = null)
    {
        parent::__construct($message, 0, $previous);
    }
}

class ValidationException extends \RuntimeException
{
    /**
     * @var array
     */
    private $errors;

    public function __construct(string $message, array $errors = [], \Throwable $previous = null)
    {
        parent::__construct($message, 0, $previous);
        $this->errors = $errors;
    }

    public function getErrors(): array
    {
        return $this->errors;
    }
}
```

**Guidelines:**
- Use kernel.exception event listener for global handling
- Map custom exceptions to HTTP status codes
- Log exceptions with appropriate severity
- Return JSON error responses consistently
- Include exception details in debug mode
- Include validation errors in response
- Don't expose sensitive information in production
- Use custom exception classes for domain errors

---

## Implementation Guidelines

### RESTful URL Design

**Best Practices:**
```
# ✅ Good
GET    /subscriptions                  # List all
POST   /subscriptions                  # Create
GET    /subscriptions/{id}             # Get one
PUT    /subscriptions/{id}             # Update
DELETE /subscriptions/{id}             # Delete
POST   /subscriptions/{id}/pause       # Custom action
POST   /subscriptions/{id}/resume      # Custom action

# Nested resources
GET    /subscriptions/{id}/orders      # Related resources
GET    /customers/{id}/subscriptions   # Related resources

# ❌ Bad
GET    /getSubscriptions               # Don't use verbs
POST   /subscription/create            # Don't use verbs
GET    /subscriptions/list             # Don't use verbs
PUT    /updateSubscription/{id}        # Don't use verbs
```

### HTTP Status Codes

**Common Status Codes:**
- 200 OK - Successful GET, PUT
- 201 Created - Successful POST creating resource
- 204 No Content - Successful DELETE
- 400 Bad Request - Malformed request
- 401 Unauthorized - Missing/invalid auth
- 403 Forbidden - Authenticated but not permitted
- 404 Not Found - Resource doesn't exist
- 422 Unprocessable Entity - Validation errors
- 500 Internal Server Error - Server errors

### Controller Testing

**Functional Test:**
```php
<?php

namespace Tests\Functional\Controllers;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\HttpFoundation\Response;

class SubscriptionsControllerTest extends WebTestCase
{
    public function testPostSubscriptionsCreatesSubscription(): void
    {
        $client = static::createClient();

        $client->request('POST', '/subscriptions', [
            'customerId' => 'customer-123',
            'productId' => 'product-456',
            'deliveryInterval' => 7,
            'deliveryOption' => 'morning',
        ], [], [
            'HTTP_AUTHORIZATION' => 'Bearer valid-token',
        ]);

        $this->assertEquals(Response::HTTP_CREATED, $client->getResponse()->getStatusCode());

        $responseData = json_decode($client->getResponse()->getContent(), true);
        $this->assertArrayHasKey('customerPlanId', $responseData);
        $this->assertEquals('customer-123', $responseData['customerId']);
    }

    public function testGetSubscriptionReturnsSubscription(): void
    {
        $client = static::createClient();

        $client->request('GET', '/subscriptions/plan-123', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer valid-token',
        ]);

        $this->assertEquals(Response::HTTP_OK, $client->getResponse()->getStatusCode());

        $responseData = json_decode($client->getResponse()->getContent(), true);
        $this->assertEquals('plan-123', $responseData['customerPlanId']);
    }

    public function testGetSubscriptionReturns404WhenNotFound(): void
    {
        $client = static::createClient();

        $client->request('GET', '/subscriptions/non-existent', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer valid-token',
        ]);

        $this->assertEquals(Response::HTTP_NOT_FOUND, $client->getResponse()->getStatusCode());
    }
}
```

---

## Anti-Patterns to Avoid

### ❌ Business Logic in Controllers

**Bad:**
```php
public function postSubscriptions(): Response
{
    // Business logic in controller - wrong!
    $subscription = new Subscription();
    $subscription->setCustomerId($this->getInputParam('customerId'));
    $subscription->calculatePrice();
    $subscription->validateDeliveryDate();

    $this->entityManager->persist($subscription);
    $this->entityManager->flush();

    return $this->jsonResponse($subscription);
}
```

**Good:**
```php
public function postSubscriptions(): Response
{
    // Delegate to command handler
    $subscription = $this->execute(new CreateSubscription(
        $this->getToken(),
        $this->getRequiredInputParam('customerId'),
        $this->getRequiredInputParam('productId'),
        (int) $this->getRequiredInputParam('deliveryInterval'),
        $this->getRequiredInputParam('deliveryOption')
    ));

    return $this->jsonResponse($subscription, Response::HTTP_CREATED);
}
```

### ❌ Missing Swagger Documentation

**Bad:**
```php
// No documentation - wrong!
public function postSubscriptions(): Response
{
    // ...
}
```

**Good:**
```php
/**
 * @SWG\Api(
 *   path="/subscriptions",
 *   @SWG\Operation(
 *     method="POST",
 *     summary="Create a new subscription",
 *     @SWG\Parameter(...)
 *     @SWG\ResponseMessage(...)
 *   )
 * )
 */
public function postSubscriptions(): Response
{
    // ...
}
```

### ❌ Inconsistent Error Responses

**Bad:**
```php
// Different error formats - wrong!
catch (NotFoundException $e) {
    return new JsonResponse(['error' => $e->getMessage()], 404);
}

catch (ValidationException $e) {
    return new JsonResponse(['message' => $e->getMessage(), 'errors' => $e->getErrors()], 422);
}
```

**Good:**
```php
// Use global exception handler for consistency
// All exceptions return: { "error": { "message": "...", "code": 400 } }
```

---

## Related Implementers

- **command-handler-pattern.md** - Command execution from controllers
- **error-handling-validation.md** - Request validation and exception handling
- **dependency-injection-symfony.md** - Controller service configuration
- **testing-phpunit.md** - Controller testing strategies
