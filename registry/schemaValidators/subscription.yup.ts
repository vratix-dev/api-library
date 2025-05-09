import yup from "yup";
import { SubscriptionValidator } from "./subscription.interface.js";

const getUserSubsSchema = yup.object({
  userId: yup.number().required(),
});

const createCheckoutSchema = getUserSubsSchema.shape({
  userEmail: yup.string().email().required(),
  priceId: yup.string().required(),
  seats: yup.number().min(1).default(1),
});

const createPaymentLinkSchema = createCheckoutSchema.omit(["userEmail"])

const updatePlanSchema = getUserSubsSchema.shape({
  subscriptionId: yup.string().required(),
  newPriceId: yup.string().required(),
});

const updateSeatsSchema = getUserSubsSchema.shape({
  subscriptionId: yup.string().required(),
  newSeats: yup.number().min(0).required(),
});

const addUserToSeatSchema = getUserSubsSchema.shape({
  subscriptionId: yup.string().required(),
  addUserId: yup.number().required()
});

const removeUserFromSeatSchema = getUserSubsSchema.shape({
  subscriptionId: yup.string().required(),
  removeUserId: yup.number().required()
});

const cancelSubscriptionSchema = getUserSubsSchema.shape({
  subscriptionId: yup.string().required(),
});

export const subscriptionValidator = (): SubscriptionValidator => {
  return {
    async validateGetUserSubs(payload) {
      return await getUserSubsSchema.noUnknown().strict(true).validate(payload);
    },

    async validateCreateCheckout(payload) {
      return await createCheckoutSchema
        .noUnknown()
        .strict(true)
        .validate(payload);
    },

    async validateCreatePaymentLink(payload) {
      return await createPaymentLinkSchema
        .noUnknown()
        .strict(true)
        .validate(payload);
    },

    async validateUpdatePlanSub(payload) {
      return await updatePlanSchema.noUnknown().strict(true).validate(payload);
    },

    async validateUpdateSeats(payload) {
      return await updateSeatsSchema.noUnknown().strict(true).validate(payload);
    },

    async validateAddUserToSeat(payload) {
      return await addUserToSeatSchema
        .noUnknown()
        .strict(true)
        .validate(payload);
    },

    async validateRemoveUserFromSeat(payload) {
      return await removeUserFromSeatSchema
        .noUnknown()
        .strict(true)
        .validate(payload);
    },

    async validateCancelSubscription(payload) {
      return await cancelSubscriptionSchema
        .noUnknown()
        .strict(true)
        .validate(payload);
    },
  };
};
