import Stripe from "stripe";

import {
  GetUserSubsSchema,
  CreateCheckoutSchema,
  CreatePaymentLinkSchema,
  CancelSubscriptionSchema,
  UpdatePlanSchema,
  UpdateSubscriptionSeatsSchema,
  AddUserToSeatSchema,
  RemoveUserFromSeatSchema,
} from "@/schemaValidators/subscription.interface.js";

import {
  UserSubscription,
  UserSubscriptionRepository,
} from "@/repositories/subscription.interface.js";

import {
  noEmptySeatsToRemove,
  noAvailableSeats,
  cantRemoveSubOwner,
  notAuthorizedToModifySubscription,
} from "@/modules/stripeSubscriptions/utils/errors/subscriptions.js";

const CHECKOUT_SUCCESS_URL = process.env.CHECKOUT_SUCCESS_URL as string;
const CHECKOUT_CANCEL_URL = process.env.CHECKOUT_CANCEL_URL as string;

type SubscriptionPrices = {
  currency: string;
  amount: number | null;
};

export type Subscription = {
  plan: string;
  priceId: string;
  name: string;
  description: string | null;
  interval: "day" | "week" | "month" | "year";
  price: SubscriptionPrices;
  priceType: "per_unit" | "tiered";
  features?: string[];
};

type UserSubsOutput = {
  name: string;
  plan: string;
  subscriptionId: string;
  isOwner: boolean;
  seats?: number;
  createdAt: string;
};

interface SubscriptionController {
  getSubscriptions: () => Promise<Subscription[]>;

  getUserSubs: (
    props: GetUserSubsSchema
  ) => Promise<{ userSubscriptions: UserSubsOutput[] }>;

  createCheckout: (props: CreateCheckoutSchema) => Promise<{ url: string }>;

  createPaymentLink: (props: CreatePaymentLinkSchema) => Promise<{ url: string }>;

  addUserToSeat: (props: AddUserToSeatSchema) => void;

  updatePlan: (props: UpdatePlanSchema) => Promise<UserSubsOutput>;

  updateSeats: (props: UpdateSubscriptionSeatsSchema) => void;

  removeUserFromSeat: (props: RemoveUserFromSeatSchema) => void;

  cancelSubscription: (props: CancelSubscriptionSchema) => void;

  stopCancellation: (props: CancelSubscriptionSchema) => void;
}

export const createSubscriptionController = (
  stripe: Stripe,
  userSubRepository: UserSubscriptionRepository
): SubscriptionController => {
  const generatePlanKey = (priceKey: string | null, productName: string) => {
    return priceKey || productName.toLowerCase().replaceAll(" ", "_");
  };

  return {
    async getSubscriptions() {
      const stripePrices = await stripe.prices.list({
        active: true,
        type: "recurring",
        expand: ["data.product"],
      });

      const subscriptions: Subscription[] = stripePrices.data.map((price) => {
        const product = price.product as Stripe.Product; // We can assert the type as we expand the product object
        const { name, description, marketing_features } = product;

        const planKey = generatePlanKey(price.lookup_key, name);

        const productFeatures = marketing_features
          .filter((el) => el.name !== undefined)
          .map((el) => el.name!);

        return {
          plan: planKey,
          name,
          description,
          priceId: price.id,
          interval: price.recurring!.interval, // To create a subscription price needs to have `recurring` property. That is why we can assert with `!`
          priceType: price.billing_scheme,
          price: {
            currency: price.currency,
            amount: price.unit_amount,
          },
          features: productFeatures,
        };
      });

      return subscriptions;
    },

    async getUserSubs({ userId }) {
      const userSubs = await userSubRepository.getUserSubscriptions(userId);
      const subscriptionPromises = userSubs.map(async (sub) => {
        const subscription = await stripe.subscriptions.retrieve(
          sub.subscriptionId,
          { expand: ["items.data.price.product"] }
        );
        const subscriptionItem = subscription.items.data[0];
        const product = subscriptionItem.price.product as Stripe.Product;

        return {
          name: product.name,
          plan: sub.plan,
          subscriptionId: sub.subscriptionId,
          isOwner: sub.isOwner,
          seats: subscriptionItem.quantity,
          createdAt: sub.createdAt,
        };
      });

      const userSubscriptions: UserSubsOutput[] = await Promise.all(
        subscriptionPromises
      );

      return { userSubscriptions };
    },

    async createCheckout({ userId, userEmail, priceId, seats }) {
      const userSubscription = await userSubRepository
        .getUserSubscriptions(userId)
        .then((res) => res?.at(0));

      let customer, customerEmail;
      if (userSubscription && userSubscription.customerId) {
        // Returning paying user, reuse existing Stripe Customer
        customer = userSubscription.customerId;
      } else {
        // First time paying user, create Stripe Customer after Checkout with email
        customerEmail = userEmail;
      }

      const checkout = await stripe.checkout.sessions.create({
        customer,
        customer_email: customerEmail,
        line_items: [
          {
            adjustable_quantity: { enabled: seats !== undefined },
            quantity: seats || 1,
            price: priceId,
          },
        ],
        subscription_data: { metadata: { userId } },
        saved_payment_method_options: { payment_method_save: "enabled" },
        success_url: CHECKOUT_SUCCESS_URL,
        cancel_url: CHECKOUT_CANCEL_URL,
        tax_id_collection: { enabled: true },
        automatic_tax: { enabled: true },
        mode: "subscription",
      });

      return { url: checkout.url! };
    },

    async createPaymentLink({ userId, priceId, seats }) {
      const paymentLink = await stripe.paymentLinks.create({
        line_items: [
          {
            adjustable_quantity: { enabled: seats !== undefined },
            quantity: seats || 1,
            price: priceId,
          },
        ],
        subscription_data: { metadata: { userId } },
        tax_id_collection: { enabled: true },
        automatic_tax: { enabled: true },
        after_completion: {
          type: "redirect",
          redirect: { url: CHECKOUT_SUCCESS_URL },
        },
      });

      return { url: paymentLink.url };
    },

    async addUserToSeat({ userId, subscriptionId, addUserId }) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ["items.data.price.product"],
      });

      const subscriptionItem = subscription.items.data[0];

      if (subscriptionItem.quantity === 1) {
        throw noAvailableSeats();
      }

      if (parseInt(subscription.metadata.userId) === userId) {
        const subscriptionUsers = await userSubRepository.getSubscriptionUsers(
          subscriptionId
        );

        if (subscriptionItem.quantity! > subscriptionUsers.length) {
          // There are unallocated seats for this subscription, add user
          const price = subscriptionItem.price;
          const product = price.product as Stripe.Product; // We can assert the type as we expand the product object
          const planKey = generatePlanKey(price.lookup_key, product.name);

          await userSubRepository.createUserSubscription({
            userId: addUserId,
            subscriptionId,
            plan: planKey,
            isOwner: false,
          });
        } else {
          throw noAvailableSeats();
        }
      } else {
        throw notAuthorizedToModifySubscription();
      }
    },

    async updatePlan({ userId, subscriptionId, newPriceId }) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);

      if (parseInt(subscription.metadata.userId) === userId) {
        // User is owner of this subscription
        const subscriptionItem = subscription.items.data[0];

        const newSubscriptionItem = await stripe.subscriptionItems.update(
          subscriptionItem.id,
          { price: newPriceId, expand: ["price.product"] }
        );

        const product = newSubscriptionItem.price.product as Stripe.Product; // We can assert the type as we expand the product object
        const newPlanKey = generatePlanKey(
          newSubscriptionItem.price.lookup_key,
          product.name
        );

        const subscriptionUsers = await userSubRepository.getSubscriptionUsers(
          subscriptionId
        );

        const userSubscriptionPromises = subscriptionUsers.map(async (user) => {
          // Update the plan for all users with this subscription ID
          const userSub = await userSubRepository.createUserSubscription({
            userId: user.userId,
            subscriptionId: newSubscriptionItem.subscription,
            plan: newPlanKey,
            customerId: user.customerId,
          });

          return userSub;
        });

        const updatedSubscriptions: UserSubscription[] = await Promise.all(
          userSubscriptionPromises
        );

        return {
          name: product.name,
          plan: newPlanKey,
          isOwner: true,
          seats: newSubscriptionItem.quantity,
          subscriptionId: updatedSubscriptions[0].subscriptionId,
          createdAt: updatedSubscriptions[0].createdAt,
        };
      } else {
        throw notAuthorizedToModifySubscription();
      }
    },

    async updateSeats({ userId, subscriptionId, newSeats }) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);

      if (parseInt(subscription.metadata.userId) === userId) {
        // User is owner of this subscription
        const subscriptionItem = subscription.items.data[0];
        const subscriptionSeats = subscriptionItem.quantity!;

        if (newSeats === subscriptionSeats) return;
        else if (newSeats < subscriptionSeats) {
          // Removing seats, check if there are available empty seats
          const subscriptionUsers =
            await userSubRepository.getSubscriptionUsers(subscriptionId);

          if (newSeats < subscriptionUsers.length) {
            // No available seats to remove
            throw noEmptySeatsToRemove();
          }
        }

        // Update seats
        await stripe.subscriptionItems.update(subscriptionItem.id, {
          quantity: newSeats,
        });
      } else {
        throw notAuthorizedToModifySubscription();
      }
    },

    async removeUserFromSeat({ userId, subscriptionId, removeUserId }) {
      const userSub = await userSubRepository
        .getUserSubscriptions(userId)
        .then(
          (data) => data.filter((el) => el.subscriptionId === subscriptionId)[0]
        );

      if (userSub.isOwner) {
        if (userId !== removeUserId) {
          await userSubRepository.removeUserFromSubscription(
            removeUserId,
            subscriptionId
          );
        } else {
          throw cantRemoveSubOwner();
        }
      } else {
        throw notAuthorizedToModifySubscription();
      }
    },

    async cancelSubscription({ userId, subscriptionId }) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);

      if (parseInt(subscription.metadata.userId) === userId) {
        await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        });
      } else {
        throw notAuthorizedToModifySubscription();
      }
    },

    async stopCancellation({ userId, subscriptionId }) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);

      if (parseInt(subscription.metadata.userId) === userId) {
        await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: false,
        });
      } else {
        throw notAuthorizedToModifySubscription();
      }
    },
  };
};
