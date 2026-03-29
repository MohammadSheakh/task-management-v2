
import { StripeGateway } from "./gateways/stripe/stripe.gateway";
import { PaymentService } from "./payment.service";

/*-─────────────────────────────────
|  We need to import this module at app.ts
|
| // INFO : 
| When you add new puchasing feature in this system .. you must register that purchase strategy here
└──────────────────────────────────*/

const paymentService = new PaymentService();

// paymentService.registerStrategy('Capsule', new PurchasedAdminCapsule());
// paymentService.registerStrategy('Journey', new PurchasedJourney());

paymentService.registerGateway('stripe', new StripeGateway());

export { paymentService }
