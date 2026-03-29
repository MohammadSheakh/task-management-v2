import catchAsync from "../../../shared/catchAsync";
import omit from "../../../shared/omit";
import pick from "../../../shared/pick";
import sendResponse from "../../../shared/sendResponse";
import { GenericController } from "../../_generic-module/generic.controller";
import { IUser } from "../../token/token.interface";
import { SubscriptionPlan } from "../subscriptionPlan/subscriptionPlan.model";
import { IUserSubscription } from "./userSubscription.interface";
import { UserSubscription } from "./userSubscription.model";
import {  UserSubscriptionService } from "./userSubscription.service";
//@ts-ignore
import { Request, Response } from 'express';
//@ts-ignore
import { StatusCodes } from 'http-status-codes';

export class UserSubscriptionController extends GenericController<typeof UserSubscription, IUserSubscription> {
    constructor(){
        super(new UserSubscriptionService(), "Subscription")
    }

    startFreeTrial = catchAsync(async (req: Request, res: Response) => {
        const stripeCheckoutUrl = await new UserSubscriptionService().startFreeTrial((req.user as IUser)?.userId);

    
        sendResponse(res, {
            code: StatusCodes.OK,
            data: stripeCheckoutUrl,
            message: `Stripe Checkout Url for Start Free Trial`,
            success: true,
        });
    })


    getAllWithPaginationV2 = catchAsync(async (req: Request, res: Response) => {
        //const filters = pick(req.query, ['_id', 'title']); // now this comes from middleware in router
        const filters =  omit(req.query, ['sortBy', 'limit', 'page', 'populate']); ;
        const options = pick(req.query, ['sortBy', 'limit', 'page', 'populate']);

        // ✅ Default values
        let populateOptions: (string | { path: string; select: string }[]) = [];
        let select = '-isDeleted -createdAt -updatedAt -__v';

        // ✅ If middleware provided overrides → use them
        if (req.queryOptions) {
        if (req.queryOptions.populate) {
            populateOptions = req.queryOptions.populate;
        }
        if (req.queryOptions.select) {
            select = req.queryOptions.select;
        }
        }

        const result = await this.service.getAllWithPagination(filters, options, populateOptions , select );

        const subscription = await SubscriptionPlan.find({
            isActive: true,
            isDeleted: false
        });

        sendResponse(res, {
        code: StatusCodes.OK,
        data: {result, subscription},
        message: `All ${this.modelName} with pagination`,
        success: true,
    });
  });

    // add more methods here if needed or override the existing ones
}