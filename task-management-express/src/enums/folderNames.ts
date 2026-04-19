const parentFolder = "e-learning"; // e-learning // testing // TODO : MUST : should come from .env file

export enum TFolderName {
    journeyModule = `${parentFolder}/journeyModule`,
    journeyCapsule = `${parentFolder}/journeyCapsule`,
    adminCapsuleCategory = `${parentFolder}/adminCapsuleCategory`,
    adminCapsule = `${parentFolder}/adminCapsule`,
    adminModules = `${parentFolder}/adminModules`,
    adminLesson = `${parentFolder}/adminLesson`,
    
    journey = `${parentFolder}/journey`,
    user = `${parentFolder}/user`,
    wallet = `${parentFolder}/wallet`,
    common = `${parentFolder}/common`,
};
