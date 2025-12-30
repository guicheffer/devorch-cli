#Product Story: Premium Wine Subscription Funnel

## What are you building?

We're building a new Premium Wine Subscription funnel that allows customers to create personalized wine subscriptions based on their taste preferences, budget, and delivery frequency.

The problem: Our current wine subscription flow has a 65% drop-off rate at checkout because customers feel overwhelmed by too many choices upfront and unclear pricing. They want guidance but also
flexibility.

This is a complete redesign of our existing funnel, moving from a rigid "pick a preset box" model to a personalized, quiz-driven experience.

## Who is it for?

**Primary users**: New wine enthusiasts (ages 28-45) who want to explore wine but feel intimidated by traditional wine buying. They're willing to spend $60-120/month on a curated experience.

**Goals**:
- Discover wines they'll actually enjoy without risking bad purchases
- Learn about wine in a non-intimidating way
- Flexible delivery (pause, skip, or adjust frequency easily)

**Pain points**:
- Too many choices lead to decision paralysis
- Uncertainty about wine preferences ("I don't know what I like")
- Fear of commitment (worried about cancellation difficulty)
- Previous bad experiences with rigid subscription boxes

## What does it do?

**5 Essential Features**:

1. **Taste Profile Quiz** - 5-step interactive quiz (food preferences, past wines liked, sweetness scale, price range, adventure level) that builds a personalized taste profile

2. **Smart Recommendation Engine** - Shows 3 curated box options based on quiz results, with AI-powered wine descriptions ("Because you loved Malbec from Argentina..."), sommelier notes, and food pairing
suggestions

3. **Flexible Subscription Builder** - Choose delivery frequency (weekly, bi-weekly, monthly), bottles per box (3, 6, 12), and price tier ($60/$90/$120). Clear preview of first box and ability to swap
individual bottles

4. **Frictionless Checkout** - One-page checkout with guest option, Apple Pay/Google Pay, promotional code support, and transparent pricing breakdown (no hidden fees). Includes prominent "skip anytime" and
"cancel anytime" reassurance

5. **Post-Purchase Onboarding** - Immediate email confirmation with tracking, personalized "Your First Box" guide, and gamified "Wine Journey" dashboard showing upcoming deliveries and taste profile
evolution

**Key Integration Points**:
- Statsig for A/B testing quiz variants and recommendation algorithms
- Existing payment gateway (Stripe) with subscription management
- CRM integration for customer preference data
- Analytics tracking for funnel drop-off optimization

## How should it be built?

**Standard Stack**:
- Next.js 14 (App Router) for SSR and optimal performance
- React with TypeScript
- Redux Toolkit for global state (cart, user preferences)
- XState for multi-step quiz flow state management

**Specific Technologies**:
- **Statsig**: A/B test quiz questions, recommendation algorithms, and pricing displays
- **Framer Motion**: Smooth transitions between quiz steps and box reveals
- **React Query**: Server state for wine inventory and recommendations API
- **Zod**: Schema validation for quiz responses and checkout data
- **Tailwind CSS**: Design system implementation

**Deviations**: Using XState specifically for the quiz flow because we need complex state management with undo/redo, progress tracking, and conditional branching based on answers.

## Why does it matter?

**Success Metrics**:
- Primary: Reduce checkout drop-off from 65% to <40% within 3 months
- Secondary: Increase average subscription value from $60 to $80
- Tertiary: 70%+ completion rate on taste profile quiz
- Long-term: Improve 6-month retention from 32% to 50%

**Competitor Benchmarks**:
- Bright Cellars (quiz-driven, our main inspiration)
- Winc (personalization focus)
- FirstLeaf (flexible subscription model)

**Compliance Requirements**:
- Age verification (21+) before checkout
- State-specific alcohol shipping restrictions (block 12 states)
- Payment processing compliance (PCI-DSS via Stripe)
- GDPR/CCPA for customer preference data
- Clear subscription terms and cancellation policy (FTC guidelines)

**Business Context**: This is a strategic initiative to compete with venture-backed wine startups. Marketing has committed $500K ad spend for Q2 launch, targeting 10K new subscriptions in first 90 days.
Revenue team forecasts $2.4M ARR if we hit retention targets.