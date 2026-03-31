import { settingsType } from './settings.constant';

/**
 * Contact Us Settings Details
 * Used when type is contactUs
 */
export interface IContactUsDetails {
  email: string;
  phoneNumber: string;
}

/**
 * Settings Details Type
 * - For contactUs: object with email and phoneNumber
 * - For others: string content
 */
export type TSettingsDetails = string | IContactUsDetails;

export interface ISettings {
  _id: string;
  type:
    | settingsType.aboutUs
    | settingsType.contactUs
    | settingsType.privacyPolicy
    | settingsType.termsAndConditions
    | settingsType.introductionVideo;
  details: TSettingsDetails;
  createdAt: Date;
  updatedAt: Date;
}
