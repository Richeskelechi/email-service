export type PermissionDefinition = {
  key: string;
  name: string;
  description: string;
};

export const PERMISSIONS_CATALOG: PermissionDefinition[] = [
  {
    key: "organization:read",
    name: "Read organization",
    description: "View organization details",
  },
  {
    key: "organization:update",
    name: "Update organization",
    description: "Edit organization details",
  },
  {
    key: "users:read",
    name: "Read users",
    description: "List and view users in the organization",
  },
  {
    key: "users:create",
    name: "Create users",
    description: "Invite or create users",
  },
  {
    key: "users:update",
    name: "Update users",
    description: "Edit users in the organization",
  },
  {
    key: "users:delete",
    name: "Delete users",
    description: "Remove users from the organization",
  },
  {
    key: "roles:read",
    name: "Read roles",
    description: "List and view roles",
  },
  {
    key: "roles:create",
    name: "Create roles",
    description: "Create custom roles",
  },
  {
    key: "roles:update",
    name: "Update roles",
    description: "Edit roles and their permissions",
  },
  {
    key: "roles:delete",
    name: "Delete roles",
    description: "Delete custom roles",
  },
  {
    key: "api_keys:read",
    name: "Read API keys",
    description: "List API keys",
  },
  {
    key: "api_keys:create",
    name: "Create API keys",
    description: "Create API keys",
  },
  {
    key: "api_keys:revoke",
    name: "Revoke API keys",
    description: "Revoke API keys",
  },
  {
    key: "api_keys:regenerate",
    name: "Regenerate API keys",
    description: "Regenerate API keys",
  },
  {
    key: "email:send",
    name: "Send email",
    description: "Send single emails",
  },
  {
    key: "email:bulk",
    name: "Send bulk email",
    description: "Send bulk email batches",
  },
  {
    key: "email:read",
    name: "Read emails",
    description: "View message and batch status",
  },
  {
    key: "templates:read",
    name: "Read templates",
    description: "List and view email templates",
  },
  {
    key: "templates:create",
    name: "Create templates",
    description: "Create email templates",
  },
  {
    key: "templates:update",
    name: "Update templates",
    description: "Edit email templates",
  },
  {
    key: "templates:delete",
    name: "Delete templates",
    description: "Delete email templates",
  },
];

export const SUPER_ADMIN_ROLE_NAME = "Super Admin";
