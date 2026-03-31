//@ts-ignore
import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { settingsType } from './settings.constant';
import { ISettings, IContactUsDetails } from './settings.interface';
import { Settings } from './settings.model';
import { GenericService } from '../../_generic-module/generic.services';

const allowedTypes = [
  settingsType.aboutUs,
  settingsType.contactUs,
  settingsType.privacyPolicy,
  settingsType.termsAndConditions,
  settingsType.introductionVideo,
];

//TODO: Must Fix korte hobe
export class SettingsService extends GenericService<
  typeof Settings,
  ISettings
> {
  constructor() {
    super(Settings);
  }

  /**
   * Validate details based on settings type
   * - contactUs: must be object with email and phoneNumber
   * - others: must be string
   */
  private validateDetails(type: settingsType, details: any): void {
    if (type === settingsType.contactUs) {
      // For contactUs, details must be an object with email and phoneNumber
      if (!details || typeof details !== 'object') {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'For contactUs type, details must be an object with email and phoneNumber'
        );
      }

      const contactDetails = details as IContactUsDetails;

      if (!contactDetails.email || typeof contactDetails.email !== 'string') {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'contactUs details must contain a valid email (string)'
        );
      }

      if (!contactDetails.phoneNumber || typeof contactDetails.phoneNumber !== 'string') {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'contactUs details must contain a valid phoneNumber (string)'
        );
      }

      // Optional: Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(contactDetails.email)) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Invalid email format'
        );
      }

      // Optional: Validate phone number (basic validation - at least 10 digits)
      const phoneRegex = /^[\d\s\-\+\(\)]{10,}$/;
      if (!phoneRegex.test(contactDetails.phoneNumber)) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Invalid phone number format (minimum 10 digits required)'
        );
      }

    } else {
      // For all other types, details must be a string
      if (typeof details !== 'string') {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          `For ${type} type, details must be a string`
        );
      }

      // Optional: Validate string is not empty
      if (details.trim().length === 0) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Details cannot be empty'
        );
      }
    }
  }

  //----------------------------------
  // Admin | Sub Admin
  //----------------------------------
  async createOrUpdateSettings(type: any, payload: any) {

    if (!allowedTypes.includes(type)) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        `Unsupported settings type: ${type} ... Possible values are ${allowedTypes.join(', ')}`
      );
    }

    // Validate details based on type
    this.validateDetails(type, payload.details);

    // Find existing setting by type
    const existingSetting = await Settings.findOne({ type });
    if (existingSetting) {
      // existingSetting.set(payload.details); // ISSUE : not working ..
      existingSetting.details = payload.details;
      return await existingSetting.save();
    } else {
      // Ensure payload contains the correct type
      payload.type = type;
      return await Settings.create(payload);
    }
  }

  async getDetailsByType(type: any) {

    if (!allowedTypes.includes(type)) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        `Unsupported settings type: ${type} ... Possible values are ${allowedTypes.join(', ')}`
      );
    }

    const setting = await Settings.find({ type }); // .sort({ createdAt: -1 })


    if (setting.length === 0) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        `Details not found for type: ${type}..`
      );
    }

    return setting;
  }
}
