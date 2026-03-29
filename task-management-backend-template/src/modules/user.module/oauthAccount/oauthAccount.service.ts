//@ts-ignore
import { StatusCodes } from 'http-status-codes';
import { OAuthAccount } from './oauthAccount.model';
import { IOAuthAccount, OAuthPayload } from './oauthAccount.interface';
import { GenericService } from '../../_generic-module/generic.services';
//@ts-ignore
import { OAuth2Client } from 'google-auth-library';
//@ts-ignore
import appleSignin from 'apple-signin-auth';
import { TAuthProvider } from '../../auth/auth.constants';
import { encrypt, decrypt, isEncrypted } from '../../../utils/encryption';

export class OAuthAccountService extends GenericService<
  typeof OAuthAccount,
  IOAuthAccount
> {
  constructor() {
    super(OAuthAccount);
  }

  //@ts-ignore
  private static googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

  /**
   * Encrypt OAuth token before storing
   */
  private encryptToken(token: string): string {
    if (!token) return '';
    return encrypt(token);
  }

  /**
   * Decrypt OAuth token for use
   */
  private decryptToken(encryptedToken: string): string {
    if (!encryptedToken) return '';
    return decrypt(encryptedToken);
  }

  /**
   * Create OAuth account with encrypted tokens
   */
  async createOAuthAccount(
    userId: string,
    authProvider: TAuthProvider,
    providerId: string,
    email: string,
    accessToken: string,
    isVerified: boolean = true,
  ): Promise<IOAuthAccount> {
    const encryptedAccessToken = this.encryptToken(accessToken);

    const oAuthAccount = await OAuthAccount.create({
      userId,
      authProvider,
      providerId,
      email,
      accessToken: encryptedAccessToken,
      isVerified,
      lastUsedAt: new Date(),
    });

    return oAuthAccount;
  }

  /**
   * Update OAuth account tokens (encrypted)
   */
  async updateOAuthTokens(
    oAuthAccountId: string,
    accessToken: string,
  ): Promise<IOAuthAccount> {
    const encryptedAccessToken = this.encryptToken(accessToken);

    const updated = await OAuthAccount.findByIdAndUpdate(
      oAuthAccountId,
      {
        accessToken: encryptedAccessToken,
        lastUsedAt: new Date(),
      },
      { new: true },
    );

    return updated;
  }

  /**
   * Get decrypted access token for OAuth account
   */
  async getDecryptedAccessToken(oAuthAccountId: string): Promise<string> {
    const account = await OAuthAccount.findById(oAuthAccountId).select(
      '+accessToken',
    );

    if (!account) {
      throw new Error('OAuth account not found');
    }

    return this.decryptToken(account.accessToken || '');
  }

  async verifyGoogleToken(idToken: string): Promise<OAuthPayload> {
    const ticket = await OAuthAccountService.googleClient.verifyIdToken({
      idToken,
      //@ts-ignore
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const p = ticket.getPayload()!;

    console.log('p ======> 🆕🆕', p);
    // { sub: providerId, email, email_verified: isEmailVerified }

    return {
      provider: TAuthProvider.google,
      providerId: p.sub,
      email: p.email!,
      name: p.name,
      picture: p.picture,
    };
  }

  async verifyAppleToken(identityToken: string): Promise<OAuthPayload> {
    const p = await appleSignin.verifyIdToken(identityToken, {
      //@ts-ignore
      audience: process.env.APPLE_CLIENT_ID,
      ignoreExpiration: false,
    });
    return {
      provider: TAuthProvider.apple,
      providerId: p.sub,
      email: p.email!,
      name: p.name,
    };
  }
}
