/********
 * UserSubscription | ServiceBooking
 * ****** */
export enum TTransactionFor {
    UserSubscription = 'UserSubscription',
    PurchasedJourney = 'PurchasedJourney', // -- E-learning
    PurchasedAdminCapsule = 'PurchasedAdminCapsule', // -- E-learning
    WithdrawalRequst = 'WithdrawalRequst' // -- suplify + may be Kaj BD for creating WalletTransactionHistory | admin end
}