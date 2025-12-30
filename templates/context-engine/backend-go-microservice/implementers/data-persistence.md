---
domain: data-persistence
description: MongoDB data persistence patterns using repository pattern, transactions, and aggregations
---

# Data Persistence Implementer

This implementer defines patterns for data persistence using MongoDB, including repository pattern, transactions, indexes, and aggregation pipelines.

## Core Patterns

### Repository Pattern

Implement clean data access layer using repository pattern:

```go
type UserRepository interface {
    Create(ctx context.Context, user *User) error
    FindByID(ctx context.Context, id string) (*User, error)
    FindByEmail(ctx context.Context, email string) (*User, error)
    Update(ctx context.Context, user *User) error
    Delete(ctx context.Context, id string) error
    List(ctx context.Context, opts ListOptions) ([]*User, error)
    Count(ctx context.Context, filter interface{}) (int64, error)
}

type userRepository struct {
    collection *mongo.Collection
    logger     *zap.Logger
}

func NewUserRepository(db *mongo.Database, logger *zap.Logger) UserRepository {
    return &userRepository{
        collection: db.Collection("users"),
        logger:     logger,
    }
}

func (r *userRepository) Create(ctx context.Context, user *User) error {
    user.CreatedAt = time.Now()
    user.UpdatedAt = time.Now()

    result, err := r.collection.InsertOne(ctx, user)
    if err != nil {
        if mongo.IsDuplicateKeyError(err) {
            return ErrDuplicateUser
        }
        r.logger.Error("failed to create user",
            zap.Error(err),
            zap.String("email", user.Email),
        )
        return fmt.Errorf("create user: %w", err)
    }

    user.ID = result.InsertedID.(primitive.ObjectID).Hex()
    return nil
}

func (r *userRepository) FindByID(ctx context.Context, id string) (*User, error) {
    objectID, err := primitive.ObjectIDFromHex(id)
    if err != nil {
        return nil, ErrInvalidUserID
    }

    var user User
    err = r.collection.FindOne(ctx, bson.M{"_id": objectID}).Decode(&user)
    if err != nil {
        if err == mongo.ErrNoDocuments {
            return nil, ErrUserNotFound
        }
        r.logger.Error("failed to find user by id",
            zap.Error(err),
            zap.String("user_id", id),
        )
        return nil, fmt.Errorf("find user by id: %w", err)
    }

    return &user, nil
}

func (r *userRepository) FindByEmail(ctx context.Context, email string) (*User, error) {
    var user User
    err := r.collection.FindOne(ctx, bson.M{"email": email}).Decode(&user)
    if err != nil {
        if err == mongo.ErrNoDocuments {
            return nil, ErrUserNotFound
        }
        return nil, fmt.Errorf("find user by email: %w", err)
    }

    return &user, nil
}

func (r *userRepository) Update(ctx context.Context, user *User) error {
    objectID, err := primitive.ObjectIDFromHex(user.ID)
    if err != nil {
        return ErrInvalidUserID
    }

    user.UpdatedAt = time.Now()

    update := bson.M{
        "$set": bson.M{
            "email":       user.Email,
            "username":    user.Username,
            "profile":     user.Profile,
            "updated_at":  user.UpdatedAt,
        },
    }

    result, err := r.collection.UpdateOne(ctx,
        bson.M{"_id": objectID},
        update,
    )
    if err != nil {
        r.logger.Error("failed to update user",
            zap.Error(err),
            zap.String("user_id", user.ID),
        )
        return fmt.Errorf("update user: %w", err)
    }

    if result.MatchedCount == 0 {
        return ErrUserNotFound
    }

    return nil
}

func (r *userRepository) Delete(ctx context.Context, id string) error {
    objectID, err := primitive.ObjectIDFromHex(id)
    if err != nil {
        return ErrInvalidUserID
    }

    result, err := r.collection.DeleteOne(ctx, bson.M{"_id": objectID})
    if err != nil {
        r.logger.Error("failed to delete user",
            zap.Error(err),
            zap.String("user_id", id),
        )
        return fmt.Errorf("delete user: %w", err)
    }

    if result.DeletedCount == 0 {
        return ErrUserNotFound
    }

    return nil
}

type ListOptions struct {
    Filter   interface{}
    Sort     bson.D
    Limit    int64
    Skip     int64
}

func (r *userRepository) List(ctx context.Context, opts ListOptions) ([]*User, error) {
    findOptions := options.Find()

    if opts.Sort != nil {
        findOptions.SetSort(opts.Sort)
    }
    if opts.Limit > 0 {
        findOptions.SetLimit(opts.Limit)
    }
    if opts.Skip > 0 {
        findOptions.SetSkip(opts.Skip)
    }

    cursor, err := r.collection.Find(ctx, opts.Filter, findOptions)
    if err != nil {
        r.logger.Error("failed to list users", zap.Error(err))
        return nil, fmt.Errorf("list users: %w", err)
    }
    defer cursor.Close(ctx)

    var users []*User
    if err := cursor.All(ctx, &users); err != nil {
        return nil, fmt.Errorf("decode users: %w", err)
    }

    return users, nil
}

func (r *userRepository) Count(ctx context.Context, filter interface{}) (int64, error) {
    count, err := r.collection.CountDocuments(ctx, filter)
    if err != nil {
        return 0, fmt.Errorf("count users: %w", err)
    }
    return count, nil
}
```

### Transactions

Use MongoDB transactions for multi-document operations:

```go
type OrderRepository struct {
    client          *mongo.Client
    ordersCol       *mongo.Collection
    inventoryCol    *mongo.Collection
    paymentsCol     *mongo.Collection
}

func (r *OrderRepository) PlaceOrder(ctx context.Context, order *Order) error {
    session, err := r.client.StartSession()
    if err != nil {
        return fmt.Errorf("start session: %w", err)
    }
    defer session.EndSession(ctx)

    callback := func(sessCtx mongo.SessionContext) (interface{}, error) {
        // 1. Create order
        order.CreatedAt = time.Now()
        order.Status = OrderStatusPending

        result, err := r.ordersCol.InsertOne(sessCtx, order)
        if err != nil {
            return nil, fmt.Errorf("insert order: %w", err)
        }
        order.ID = result.InsertedID.(primitive.ObjectID).Hex()

        // 2. Reserve inventory
        for _, item := range order.Items {
            filter := bson.M{
                "product_id": item.ProductID,
                "available": bson.M{"$gte": item.Quantity},
            }

            update := bson.M{
                "$inc": bson.M{
                    "available": -item.Quantity,
                    "reserved":  item.Quantity,
                },
            }

            result, err := r.inventoryCol.UpdateOne(sessCtx, filter, update)
            if err != nil {
                return nil, fmt.Errorf("reserve inventory: %w", err)
            }

            if result.MatchedCount == 0 {
                return nil, ErrInsufficientInventory
            }
        }

        // 3. Create payment record
        payment := &Payment{
            OrderID:    order.ID,
            Amount:     order.TotalAmount,
            Status:     PaymentStatusPending,
            CreatedAt:  time.Now(),
        }

        if _, err := r.paymentsCol.InsertOne(sessCtx, payment); err != nil {
            return nil, fmt.Errorf("create payment: %w", err)
        }

        return order, nil
    }

    // Execute transaction with retry
    result, err := session.WithTransaction(ctx, callback,
        options.Transaction().
            SetReadConcern(readconcern.Snapshot()).
            SetWriteConcern(writeconcern.New(writeconcern.WMajority())),
    )
    if err != nil {
        return fmt.Errorf("transaction failed: %w", err)
    }

    return nil
}

// Optimistic locking with version field
func (r *OrderRepository) UpdateStatus(ctx context.Context, orderID string, newStatus OrderStatus) error {
    objectID, err := primitive.ObjectIDFromHex(orderID)
    if err != nil {
        return ErrInvalidOrderID
    }

    // Fetch current version
    var order Order
    err = r.ordersCol.FindOne(ctx, bson.M{"_id": objectID}).Decode(&order)
    if err != nil {
        if err == mongo.ErrNoDocuments {
            return ErrOrderNotFound
        }
        return err
    }

    // Update with version check
    filter := bson.M{
        "_id":     objectID,
        "version": order.Version,
    }

    update := bson.M{
        "$set": bson.M{
            "status":     newStatus,
            "updated_at": time.Now(),
        },
        "$inc": bson.M{
            "version": 1,
        },
    }

    result, err := r.ordersCol.UpdateOne(ctx, filter, update)
    if err != nil {
        return err
    }

    if result.MatchedCount == 0 {
        return ErrConcurrentModification
    }

    return nil
}
```

### Indexes

Define and manage indexes for performance:

```go
type IndexManager struct {
    db     *mongo.Database
    logger *zap.Logger
}

func NewIndexManager(db *mongo.Database, logger *zap.Logger) *IndexManager {
    return &IndexManager{db: db, logger: logger}
}

func (m *IndexManager) EnsureIndexes(ctx context.Context) error {
    indexes := map[string][]mongo.IndexModel{
        "users": {
            {
                Keys: bson.D{{Key: "email", Value: 1}},
                Options: options.Index().
                    SetUnique(true).
                    SetName("email_unique"),
            },
            {
                Keys: bson.D{{Key: "username", Value: 1}},
                Options: options.Index().
                    SetUnique(true).
                    SetName("username_unique"),
            },
            {
                Keys: bson.D{
                    {Key: "status", Value: 1},
                    {Key: "created_at", Value: -1},
                },
                Options: options.Index().SetName("status_created_at"),
            },
        },
        "orders": {
            {
                Keys: bson.D{{Key: "customer_id", Value: 1}},
                Options: options.Index().SetName("customer_id"),
            },
            {
                Keys: bson.D{
                    {Key: "status", Value: 1},
                    {Key: "created_at", Value: -1},
                },
                Options: options.Index().SetName("status_created_at"),
            },
            {
                Keys: bson.D{{Key: "created_at", Value: 1}},
                Options: options.Index().
                    SetExpireAfterSeconds(90 * 24 * 60 * 60). // 90 days TTL
                    SetName("created_at_ttl"),
            },
        },
        "products": {
            {
                Keys: bson.D{{Key: "sku", Value: 1}},
                Options: options.Index().
                    SetUnique(true).
                    SetName("sku_unique"),
            },
            {
                Keys: bson.D{{Key: "name", Value: "text"}},
                Options: options.Index().SetName("name_text"),
            },
            {
                Keys: bson.D{
                    {Key: "category", Value: 1},
                    {Key: "price", Value: 1},
                },
                Options: options.Index().SetName("category_price"),
            },
        },
    }

    for collectionName, indexModels := range indexes {
        collection := m.db.Collection(collectionName)

        m.logger.Info("creating indexes",
            zap.String("collection", collectionName),
            zap.Int("count", len(indexModels)),
        )

        names, err := collection.Indexes().CreateMany(ctx, indexModels)
        if err != nil {
            return fmt.Errorf("create indexes for %s: %w", collectionName, err)
        }

        m.logger.Info("indexes created",
            zap.String("collection", collectionName),
            zap.Strings("names", names),
        )
    }

    return nil
}

// Geospatial index
func (m *IndexManager) CreateGeospatialIndexes(ctx context.Context) error {
    storesCol := m.db.Collection("stores")

    indexModel := mongo.IndexModel{
        Keys: bson.D{{Key: "location", Value: "2dsphere"}},
        Options: options.Index().SetName("location_2dsphere"),
    }

    _, err := storesCol.Indexes().CreateOne(ctx, indexModel)
    return err
}
```

### Aggregation Pipelines

Use aggregation framework for complex queries:

```go
type OrderAnalytics struct {
    repo *OrderRepository
}

type SalesReport struct {
    Period      string  `bson:"_id"`
    TotalOrders int     `bson:"total_orders"`
    TotalRevenue int64  `bson:"total_revenue"`
    AvgOrderValue float64 `bson:"avg_order_value"`
}

func (a *OrderAnalytics) GetSalesReport(ctx context.Context, startDate, endDate time.Time) ([]SalesReport, error) {
    pipeline := mongo.Pipeline{
        // Match date range
        {{Key: "$match", Value: bson.M{
            "created_at": bson.M{
                "$gte": startDate,
                "$lte": endDate,
            },
            "status": bson.M{"$in": []OrderStatus{
                OrderStatusConfirmed,
                OrderStatusShipped,
                OrderStatusDelivered,
            }},
        }}},

        // Group by date
        {{Key: "$group", Value: bson.M{
            "_id": bson.M{
                "$dateToString": bson.M{
                    "format": "%Y-%m-%d",
                    "date":   "$created_at",
                },
            },
            "total_orders": bson.M{"$sum": 1},
            "total_revenue": bson.M{"$sum": "$total_amount.amount"},
            "avg_order_value": bson.M{"$avg": "$total_amount.amount"},
        }}},

        // Sort by date
        {{Key: "$sort", Value: bson.D{{Key: "_id", Value: 1}}}},
    }

    cursor, err := a.repo.ordersCol.Aggregate(ctx, pipeline)
    if err != nil {
        return nil, fmt.Errorf("aggregate sales report: %w", err)
    }
    defer cursor.Close(ctx)

    var reports []SalesReport
    if err := cursor.All(ctx, &reports); err != nil {
        return nil, fmt.Errorf("decode sales report: %w", err)
    }

    return reports, nil
}

type CustomerStats struct {
    CustomerID      string  `bson:"_id"`
    TotalOrders     int     `bson:"total_orders"`
    TotalSpent      int64   `bson:"total_spent"`
    AvgOrderValue   float64 `bson:"avg_order_value"`
    FirstOrderDate  time.Time `bson:"first_order_date"`
    LastOrderDate   time.Time `bson:"last_order_date"`
}

func (a *OrderAnalytics) GetCustomerStats(ctx context.Context, customerID string) (*CustomerStats, error) {
    pipeline := mongo.Pipeline{
        {{Key: "$match", Value: bson.M{"customer_id": customerID}}},
        {{Key: "$group", Value: bson.M{
            "_id":              "$customer_id",
            "total_orders":     bson.M{"$sum": 1},
            "total_spent":      bson.M{"$sum": "$total_amount.amount"},
            "avg_order_value":  bson.M{"$avg": "$total_amount.amount"},
            "first_order_date": bson.M{"$min": "$created_at"},
            "last_order_date":  bson.M{"$max": "$created_at"},
        }}},
    }

    cursor, err := a.repo.ordersCol.Aggregate(ctx, pipeline)
    if err != nil {
        return nil, err
    }
    defer cursor.Close(ctx)

    var stats CustomerStats
    if cursor.Next(ctx) {
        if err := cursor.Decode(&stats); err != nil {
            return nil, err
        }
    } else {
        return nil, ErrCustomerNotFound
    }

    return &stats, nil
}

// Complex aggregation with lookup (join)
type OrderWithCustomer struct {
    Order    Order    `bson:"order"`
    Customer Customer `bson:"customer"`
}

func (a *OrderAnalytics) GetOrdersWithCustomers(ctx context.Context) ([]OrderWithCustomer, error) {
    pipeline := mongo.Pipeline{
        {{Key: "$lookup", Value: bson.M{
            "from":         "customers",
            "localField":   "customer_id",
            "foreignField": "_id",
            "as":           "customer",
        }}},
        {{Key: "$unwind", Value: "$customer"}},
        {{Key: "$project", Value: bson.M{
            "order": bson.M{
                "id":           "$_id",
                "customer_id":  "$customer_id",
                "total_amount": "$total_amount",
                "status":       "$status",
                "created_at":   "$created_at",
            },
            "customer": bson.M{
                "id":       "$customer._id",
                "email":    "$customer.email",
                "username": "$customer.username",
            },
        }}},
    }

    cursor, err := a.repo.ordersCol.Aggregate(ctx, pipeline)
    if err != nil {
        return nil, err
    }
    defer cursor.Close(ctx)

    var results []OrderWithCustomer
    if err := cursor.All(ctx, &results); err != nil {
        return nil, err
    }

    return results, nil
}
```

### Change Streams

Monitor real-time changes using change streams:

```go
type ChangeStreamWatcher struct {
    collection *mongo.Collection
    logger     *zap.Logger
}

func (w *ChangeStreamWatcher) WatchOrders(ctx context.Context, handler func(*OrderChangeEvent)) error {
    pipeline := mongo.Pipeline{
        {{Key: "$match", Value: bson.M{
            "operationType": bson.M{"$in": []string{"insert", "update"}},
        }}},
    }

    opts := options.ChangeStream().SetFullDocument(options.UpdateLookup)
    stream, err := w.collection.Watch(ctx, pipeline, opts)
    if err != nil {
        return fmt.Errorf("watch orders: %w", err)
    }
    defer stream.Close(ctx)

    w.logger.Info("watching order changes")

    for stream.Next(ctx) {
        var event struct {
            OperationType string `bson:"operationType"`
            FullDocument  Order  `bson:"fullDocument"`
            DocumentKey   struct {
                ID primitive.ObjectID `bson:"_id"`
            } `bson:"documentKey"`
        }

        if err := stream.Decode(&event); err != nil {
            w.logger.Error("failed to decode change event", zap.Error(err))
            continue
        }

        changeEvent := &OrderChangeEvent{
            OperationType: event.OperationType,
            Order:         &event.FullDocument,
        }

        handler(changeEvent)
    }

    if err := stream.Err(); err != nil {
        return fmt.Errorf("change stream error: %w", err)
    }

    return nil
}
```

## Implementation Guidelines

### Repository Design

1. **Interface-first**: Define repository interfaces before implementations
2. **Domain-focused**: Repository methods should match domain operations
3. **Error handling**: Return domain-specific errors, not database errors
4. **Context propagation**: Always accept context as first parameter
5. **Testing**: Use repository interfaces for easy mocking

### Transaction Management

1. **Use transactions** for multi-document operations requiring consistency
2. **Keep transactions short**: Minimize time holding locks
3. **Retry logic**: Handle transient transaction errors
4. **Read/write concerns**: Configure appropriate consistency levels
5. **Session management**: Always close sessions in defer blocks

### Index Strategy

1. **Query patterns**: Create indexes based on actual query patterns
2. **Compound indexes**: Order fields by equality, sort, range
3. **Unique indexes**: Enforce uniqueness at database level
4. **TTL indexes**: Automatic document expiration for time-based data
5. **Monitor performance**: Use explain plans to verify index usage

## Anti-Patterns to Avoid

### Don't Return Database Types

```go
// Bad: Exposing MongoDB types
func (r *repository) Find(ctx context.Context, id string) (*primitive.ObjectID, error) {
    // ...
}

// Good: Use domain types
func (r *repository) Find(ctx context.Context, id string) (*User, error) {
    // ...
}
```

### Don't Ignore Errors

```go
// Bad
cursor.Close(ctx)

// Good
defer func() {
    if err := cursor.Close(ctx); err != nil {
        logger.Error("failed to close cursor", zap.Error(err))
    }
}()
```

### Don't Use String Concatenation for Queries

```go
// Bad: Potential injection
filter := bson.M{"email": email}

// Good: Always use parameterized queries (BSON does this by default)
filter := bson.M{"email": email}
```

### Don't Forget Timeouts

```go
// Bad: No timeout
cursor, err := collection.Find(context.Background(), filter)

// Good: Always use timeouts
ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
defer cancel()
cursor, err := collection.Find(ctx, filter)
```

## Related Implementers

- **domain-modeling.md**: Domain entities being persisted
- **error-handling.md**: Error handling in repositories
- **testing.md**: Testing repository implementations
- **logging-observability.md**: Tracing database operations
