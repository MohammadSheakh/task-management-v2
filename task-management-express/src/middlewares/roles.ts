export type Role = 'individual' | 'child' | 'business' | 'admin' ;	

export enum TRole {
  individual = 'individual',
  child = 'child',
  business = 'business',
  admin = 'admin',
  common = 'common', // its not a role but a common access level
  commonUser = 'commonUser', // its not a role but a common access level
}

const allRoles: Record<Role, string[]> = {
  business: ['business', 'common', 'commonUser' ], 
  child: ['child', 'common' , 'commonUser'],
  individual: ['individual', 'common' , 'commonUser'],
  admin: ['admin', 'common'],
};

// const Roles = Object.keys(allRoles) as Array<keyof typeof allRoles>;

const Roles = ["individual", "child", "business", "admin"] as const;

// Map the roles to their corresponding rights
const roleRights = new Map<Role, string[]>(
  Object.entries(allRoles) as [Role, string[]][],
);

export { Roles, roleRights };
