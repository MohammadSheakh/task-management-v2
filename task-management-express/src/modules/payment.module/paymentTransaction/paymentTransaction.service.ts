//@ts-ignore
import { StatusCodes } from 'http-status-codes';
//@ts-ignore
import SSLCommerzPayment from 'sslcommerz-lts';
//@ts-ignore
import {
  startOfDay,
  startOfWeek,
  startOfMonth,
  startOfYear,
  startOfQuarter,
  endOfWeek,
  endOfMonth,
  subWeeks,
  subMonths,
  subDays,
} from 'date-fns';
import { GenericService } from '../../_generic-module/generic.services';
import { PaymentTransaction } from './paymentTransaction.model';
import { IPaymentTransaction } from './paymentTransaction.interface';
import { TPaymentStatus } from './paymentTransaction.constant';
import { sslConfig } from '../../../config/paymentGateways/sslcommerz.config';

// TODO : need to re check this service
export class PaymentTransactionService extends GenericService<
  typeof PaymentTransaction,
  IPaymentTransaction
> {
  constructor() {
    super(PaymentTransaction);
  }

  async validateSSLTransaction(val_id: string) {
    const data = {
        val_id, //that you go from sslcommerz response
    };
    const sslcz = new SSLCommerzPayment(
      sslConfig.store_id,
      sslConfig.store_passwd,
      sslConfig.is_live,
    )
    

    /*
    sslcz.validate(data).then(data => {
        //process the response that got from sslcommerz 
       // https://developer.sslcommerz.com/doc/v4/#order-validation-api
      const response = {
        status : data.status, // This parameter needs to be checked before update your database as a successful transaction.
        
        // if VALID  :  A successful transaction.
        // VALIDATED  : already validated
        // INVALID_TRANSACTION : Invalid validation id (val_id).


        tran_date, // Payment completion date 
        tran_id, // that was sent by me during initiation. 
        val_id, //A Validation ID against the Transaction which is provided by SSLCOMMERZ.
        amount , // This parameter needs to be validated with your system database for security
        store_amount, //  amount what you will get in your account after bank charge ( Example: 100 BDT will be your store amount of 96 BDT after 4% Bank Commission )
        card_type, // The Bank Gateway Name that customer selected
        card_no, //Customer’s Card number. However, for Mobile Banking and Internet Banking, it will return customer's reference id.
        currency,// Currency Type which will be settled with your merchant account after deducting the Gateway charges. This parameter is the currency type of the parameter amount
        bank_tran_id, // The transaction ID at Banks End
        card_issuer, // Issuer Bank Name 
        card_brand , //VISA, MASTER, AMEX, IB or MOBILE BANKING
        card_issuer_country, //Country of Card Issuer Bank
      
        
        card_issuer_country_code, //2 digits short code of Country of Card Issuer Bank
        currency_type, // The currency you have sent during initiation of this transaction. If the currency is different than BDT, then it will be converted to BDT by the current conversion rate. This parameter needs to be validated with your system database for security
        // THIS PARAMETER NEEDS TO BE VALIDATED WITH YOUR SYSTEM DATABASE FOR SECURITY
        
        currency_amount, 
        // The currency amount you have sent during initiation of this transaction. If the amount is not mentioned in BDT, then it will be converted to BDT by the current conversion rate and return by the above field amount. 
        // THIS PARAMETER NEEDS TO BE VALIDATED WITH YOUR SYSTEM DATABASE FOR SECURITY
        
        value_a, // Same Value will be returned as Passed during initiation
        value_b, // Same Value will be returned as Passed during initiation
        value_c, // Same Value will be returned as Passed during initiation
        value_d, // Same Value will be returned as Passed during initiation
      
        risk_level, // High (1) for most risky transactions and Low (0) for safe transactions.
      
      }
    });

    */

    try {
      const result = await sslcz.validate({ val_id });

      if (!result || (result.status !== 'VALID' && result.status !== 'VALIDATED')) {
        return false;
      }

      return { valid: true, data: result };
    } catch (error) {
      console.error('SSLCommerz validation failed:', error);
      return false;
    }

  }

  // Get comprehensive earnings overview
  async getEarningsOverview() {
    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = startOfWeek(now);
    const monthStart = startOfMonth(now);
    const lastWeekStart = startOfWeek(subWeeks(now, 1));
    const lastWeekEnd = endOfWeek(subWeeks(now, 1));
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));
    const yearStart = startOfYear(now);
    const quarterStart = startOfQuarter(now);

    const completedStatus = TPaymentStatus.completed;
    const baseQuery = { isDeleted: false, paymentStatus: completedStatus };

    const [
      totalEarnings,
      todayEarnings,
      thisWeekEarnings,
      thisMonthEarnings,
      lastWeekEarnings,
      lastMonthEarnings,
      thisQuarterEarnings,
      thisYearEarnings,
      totalTransactions,
      pendingAmount,
      processingAmount,
    ] = await Promise.all([
      // Total lifetime earnings
      this.model.aggregate([
        { $match: baseQuery },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),

      // Today's earnings
      this.model.aggregate([
        { $match: { ...baseQuery, createdAt: { $gte: todayStart } } },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]),

      // This week's earnings
      this.model.aggregate([
        { $match: { ...baseQuery, createdAt: { $gte: weekStart } } },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]),

      // This month's earnings
      this.model.aggregate([
        { $match: { ...baseQuery, createdAt: { $gte: monthStart } } },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]),

      // Last week's earnings
      this.model.aggregate([
        {
          $match: {
            ...baseQuery,
            createdAt: { $gte: lastWeekStart, $lte: lastWeekEnd },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]),

      // Last month's earnings
      this.model.aggregate([
        {
          $match: {
            ...baseQuery,
            createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]),

      // This quarter's earnings
      this.model.aggregate([
        { $match: { ...baseQuery, createdAt: { $gte: quarterStart } } },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]),

      // This year's earnings
      this.model.aggregate([
        { $match: { ...baseQuery, createdAt: { $gte: yearStart } } },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]),

      // Total transaction count
      this.model.countDocuments({ isDeleted: false }),

      // Pending payments
      this.model.aggregate([
        {
          $match: {
            isDeleted: false,
            paymentStatus: TPaymentStatus.pending,
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]),

      // Processing payments
      this.model.aggregate([
        {
          $match: {
            isDeleted: false,
            paymentStatus: TPaymentStatus.processing,
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    return {
      totalEarnings: totalEarnings[0]?.total || 0,
      todayEarnings: {
        amount: todayEarnings[0]?.total || 0,
        count: todayEarnings[0]?.count || 0,
      },
      thisWeekEarnings: {
        amount: thisWeekEarnings[0]?.total || 0,
        count: thisWeekEarnings[0]?.count || 0,
      },
      thisMonthEarnings: {
        amount: thisMonthEarnings[0]?.total || 0,
        count: thisMonthEarnings[0]?.count || 0,
      },
      lastWeekEarnings: {
        amount: lastWeekEarnings[0]?.total || 0,
        count: lastWeekEarnings[0]?.count || 0,
      },
      lastMonthEarnings: {
        amount: lastMonthEarnings[0]?.total || 0,
        count: lastMonthEarnings[0]?.count || 0,
      },
      thisQuarterEarnings: {
        amount: thisQuarterEarnings[0]?.total || 0,
        count: thisQuarterEarnings[0]?.count || 0,
      },
      thisYearEarnings: {
        amount: thisYearEarnings[0]?.total || 0,
        count: thisYearEarnings[0]?.count || 0,
      },
      totalTransactions: totalTransactions,
      pendingPayments: {
        amount: pendingAmount[0]?.total || 0,
        count: pendingAmount[0]?.count || 0,
      },
      processingPayments: {
        amount: processingAmount[0]?.total || 0,
        count: processingAmount[0]?.count || 0,
      },
    };
  }

  /**
   * Get all earning list with enhanced filters for admin dashboard
   * V3 ENHANCEMENT: Matches Figma earning-flow.png table columns
   * Figma: figma-asset/main-admin-dashboard/earning-flow.png (All Earning list)
   *
   * @param filters - Query filters
   * @param options - Pagination options
   * @returns Paginated earning list with user details
   */
  async getAllEarningListV3(
    filters: any,
    options: any,
  ): Promise<any> {
    const { page = 1, limit = 20, sortBy = '-createdAt' } = options;
    const skip = (page - 1) * limit;

    // Build match query
    const matchQuery: any = {
      isDeleted: false,
      paymentStatus: TPaymentStatus.completed, // Only show completed payments
      referenceFor: 'UserSubscription', // Only subscription payments
    };

    // Apply additional filters
    if (filters.userId) {
      matchQuery.userId = new Types.ObjectId(filters.userId);
    }
    if (filters.paymentGateway) {
      matchQuery.paymentGateway = filters.paymentGateway;
    }
    if (filters.paymentStatus) {
      matchQuery.paymentStatus = filters.paymentStatus;
    }
    if (filters.fromDate && filters.toDate) {
      matchQuery.createdAt = {
        $gte: new Date(filters.fromDate),
        $lte: new Date(filters.toDate),
      };
    }

    // Aggregation pipeline
    const pipeline = [
      { $match: matchQuery },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'usersubscriptions',
          localField: 'referenceId',
          foreignField: '_id',
          as: 'subscription',
        },
      },
      { $unwind: { path: '$subscription', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'subscriptionplans',
          localField: 'subscription.subscriptionPlanId',
          foreignField: '_id',
          as: 'plan',
        },
      },
      { $unwind: { path: '$plan', preserveNullAndEmptyArrays: true } },
      // Sort
      { $sort: { createdAt: sortBy.startsWith('-') ? -1 : 1 } },
      // Skip & Limit
      { $skip: skip },
      { $limit: limit },
      // Project fields matching Figma table
      {
        $project: {
          _id: 1,
          userSubscriptionId: {
            $ifNull: ['$referenceId', '$_id'],
          },
          user: {
            _id: '$user._id',
            name: '$user.name',
            email: '$user.email',
            profileImage: '$user.profileImage',
            role: '$user.role',
          },
          subscriptionType: {
            $ifNull: ['$plan.subscriptionType', '$subscription.subscriptionType'],
          },
          price: '$amount',
          currency: '$currency',
          buyingDate: '$createdAt',
          paymentGateway: '$paymentGateway',
          paymentStatus: '$paymentStatus',
          transactionId: '$transactionId',
        },
      },
    ];

    // Get total count
    const countPipeline = [
      { $match: matchQuery },
      { $count: 'total' },
    ];

    const [data, countResult] = await Promise.all([
      this.model.aggregate(pipeline),
      this.model.aggregate(countPipeline),
    ]);

    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
      },
    };
  }

  /**
   * Get user subscription details for admin dashboard
   * V3 ENHANCEMENT: Matches Figma subscription-details-of-a-person.png
   * Figma: figma-asset/main-admin-dashboard/subscription-details-of-a-person.png
   *
   * @param userId - User ID to get subscription details for
   * @returns User subscription details with personal information
   */
  async getUserSubscriptionDetailsV3(userId: string): Promise<any> {
    const { UserSubscription } = await import(
      '../../subscription.module/userSubscription/userSubscription.model'
    );
    const { SubscriptionPlan } = await import(
      '../../subscription.module/subscriptionPlan/subscriptionPlan.model'
    );

    // Get user's most recent active/trialing subscription
    const subscription = await UserSubscription.findOne({
      userId: new Types.ObjectId(userId),
      status: { $in: ['active', 'trialing', 'processing', 'cancelling'] },
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .lean();

    if (!subscription) {
      return null;
    }

    // Get subscription plan details
    const plan = await SubscriptionPlan.findById(subscription.subscriptionPlanId).lean();

    // Get payment transaction for this subscription
    const paymentTransaction = await this.model.findOne({
      referenceId: subscription._id,
      referenceFor: 'UserSubscription',
      paymentStatus: TPaymentStatus.completed,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .lean();

    // Get user details
    const { User } = await import('../../user.module/user/user.model');
    const user = await User.findById(userId)
      .select('name email phoneNumber profileImage profileId')
      .lean();

    // Get user profile if exists
    let userProfile = null;
    if (user?.profileId) {
      const { UserProfile } = await import(
        '../../user.module/userProfile/userProfile.model'
      );
      userProfile = await UserProfile.findById(user.profileId)
        .select('address gender dateOfBirth location')
        .lean();
    }

    // Calculate age from date of birth
    let age = null;
    if (userProfile?.dateOfBirth) {
      const birthDate = new Date(userProfile.dateOfBirth);
      const today = new Date();
      age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ) {
        age--;
      }
    }

    // Format response to match Figma layout
    return {
      user: {
        _id: user?._id,
        name: user?.name,
        email: user?.email,
        profileImage: user?.profileImage,
        phoneNumber: user?.phoneNumber,
        role: user?.role,
      },
      userProfile: {
        address: userProfile?.address || userProfile?.location || null,
        gender: userProfile?.gender || null,
        dateOfBirth: userProfile?.dateOfBirth || null,
        age: age,
      },
      subscriptionBuyingInformation: {
        _id: subscription._id,
        userSubscriptionId: subscription._id.toString().slice(-6).toUpperCase(),
        subscriptionType: plan?.subscriptionType || subscription.subscriptionType || 'unknown',
        subscriptionName: plan?.subscriptionName || 'Unknown Plan',
        buyingDate: subscription.subscriptionStartDate || subscription.createdAt,
        currentPeriodStartDate: subscription.currentPeriodStartDate,
        currentPeriodEndDate: subscription.expirationDate,
        transactionId: paymentTransaction?.transactionId || paymentTransaction?.paymentIntent || subscription.stripe_transaction_id || 'N/A',
        withdrawAmount: paymentTransaction?.amount || subscription.amount || plan?.amount || 0,
        currency: paymentTransaction?.currency || 'usd',
        subscriptionExpired: subscription.expirationDate,
        cancelledAtPeriodEnd: subscription.cancelledAtPeriodEnd || false,
        cancelDate: subscription.cancelledAt || null,
        status: subscription.status,
        billingCycle: subscription.billingCycle,
        isAutoRenewed: subscription.isAutoRenewed,
        stripe_subscription_id: subscription.stripe_subscription_id,
        paymentGateway: paymentTransaction?.paymentGateway || 'stripe',
      },
    };
  }
}
