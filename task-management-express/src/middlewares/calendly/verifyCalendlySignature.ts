import crypto from 'crypto';
import Buffer from 'buffer'
import dotenv from 'dotenv';
dotenv.config();

// MUST use raw body parser before this middleware!
export const verifyCalendlySignature = (req, res, next) => {
  const signature = req.headers['x-calendly-signature'];
  const payload = req.rawBody; // Set by raw body parser
  

  // If no signature, allow it (this is validation request)
  if (!signature) {
    console.log('Calendly validation request (no signature)');
    return next();
  }

  if (!signature || !payload) {
    return res.status(401).json({ error: 'Missing signature or payload' });
  }
  
  // Compute expected signature
  const expectedSig = crypto
    .createHmac('sha256', process.env.CALENDLY_WEBHOOK_SIGNING_KEY)
    .update(payload)
    .digest('hex');
  
  // Constant-time comparison to prevent timing attacks
  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSig)
  );
  
  if (!isValid) {
    console.error('⚠️ Calendly webhook signature verification FAILED');
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Parse JSON payload after verification
  try {
    req.body = JSON.parse(payload);
    next();
  } catch (err) {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }
};
