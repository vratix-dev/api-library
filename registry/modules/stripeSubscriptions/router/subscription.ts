import express from "express";
import Stripe from "stripe";

import { subscriptionValidator } from "@/schemaValidators/subscription.zod.js";

import { createSubscriptionController } from "@/modules/stripeSubscriptions/controllers/subscription.js";
import { createSubscriptionsWebHookController } from "@/modules/stripeSubscriptions/controllers/subscriptionWebhook.js";

import { createUserSubRepository } from "@/repositories/subscription.postgres.js";

import { validateStripeSignature } from "@/modules/stripeSubscriptions/middleware/subscriptions/stripeSignature.js";

import { protectedRoute } from "@/modules/authBasic/middleware/authBasic/jwt.js";
import { response } from "@/modules/shared/utils/response.js";

const STRIPE_API_KEY = process.env.STRIPE_API_KEY as string;

const stripe = new Stripe(STRIPE_API_KEY);
const router = express.Router();

const userSubRepository = createUserSubRepository();

const subscriptionController = createSubscriptionController(
  stripe,
  userSubRepository,
);
const subscriptionWHController = createSubscriptionsWebHookController(
  stripe,
  userSubRepository
);

router.get("/", async (_, res, next) => {
  await subscriptionController
    .getSubscriptions()
    .then((result) => res.json(response(result)))
    .catch(next);
});

router.get("/user", protectedRoute, async (req, res, next) => {
  const user = req.user!;

  await subscriptionValidator()
    .validateGetUserSubs({ userId: user.userId })
    .then(subscriptionController.getUserSubs)
    .then((result) => res.json(response(result)))
    .catch(next);
});

router
  .route("/:subscriptionId/seat")
  .patch(protectedRoute, async (req, res, next) => {
    const user = req.user!;
    const { subscriptionId } = req.params;
    const payload = req.body;

    await subscriptionValidator()
      .validateUpdateSeats({
        ...payload,
        userId: user.userId,
        subscriptionId,
      })
      .then(subscriptionController.updateSeats)
      .then(() => res.json(response()))
      .catch(next);
  })
  .post(protectedRoute, async (req, res, next) => {
    const user = req.user!;
    const { subscriptionId } = req.params;
    const payload = req.body;

    await subscriptionValidator()
      .validateAddUserToSeat({
        ...payload,
        userId: user.userId,
        subscriptionId,
      })
      .then(subscriptionController.addUserToSeat)
      .then(() => res.json(response()))
      .catch(next);
  })
  .delete(protectedRoute, async (req, res, next) => {
    const user = req.user!;
    const { subscriptionId } = req.params;
    const payload = req.body;

    await subscriptionValidator()
      .validateRemoveUserFromSeat({
        ...payload,
        userId: user.userId,
        subscriptionId,
      })
      .then(subscriptionController.removeUserFromSeat)
      .then(() => res.json(response()))
      .catch(next);
  });

router
  .route("/:subscriptionId/cancel")
  .delete(protectedRoute, async (req, res, next) => {
    const user = req.user!;
    const { subscriptionId } = req.params;

    await subscriptionValidator()
      .validateCancelSubscription({
        userId: user.userId,
        subscriptionId,
      })
      .then(subscriptionController.cancelSubscription)
      .then(() => res.json(response()))
      .catch(next);
  })
  .post(protectedRoute, async (req, res, next) => {
    const user = req.user!;
    const { subscriptionId } = req.params;

    await subscriptionValidator()
      .validateCancelSubscription({
        userId: user.userId,
        subscriptionId,
      })
      .then(subscriptionController.stopCancellation)
      .then(() => res.json(response()))
      .catch(next);
  });

router.post("/payment/checkout", protectedRoute, async (req, res, next) => {
  const user = req.user!;
  const payload = req.body;

  await subscriptionValidator()
    .validateCreateCheckout({
      ...payload,
      userId: user.userId,
      userEmail: user.email,
    })
    .then(subscriptionController.createCheckout)
    .then((result) => res.json(response(result)))
    .catch(next);
});

router.post("/payment/link", protectedRoute, async (req, res, next) => {
  const user = req.user!;
  const payload = req.body;

  await subscriptionValidator()
    .validateCreatePaymentLink({
      ...payload,
      userId: user.userId,
      userEmail: user.email,
    })
    .then(subscriptionController.createPaymentLink)
    .then((result) => res.json(response(result)))
    .catch(next);
});

router.post("/webhook", validateStripeSignature, async (req, res, next) => {
  try {
    const eventPayload = req.stripeEvent!;

    subscriptionWHController.handleWebhook(eventPayload);

    res.json({ received: true });
  } catch (err) {
    next(err);
  }
});

router.patch("/:subscriptionId", protectedRoute, async (req, res, next) => {
  const user = req.user!;
  const { subscriptionId } = req.params;
  const payload = req.body;

  await subscriptionValidator()
    .validateUpdatePlanSub({
      ...payload,
      subscriptionId,
      userId: user.userId,
    })
    .then(subscriptionController.updatePlan)
    .then((result) => res.json(response(result)))
    .catch(next);
});

export { router as subscriptionRouter };
