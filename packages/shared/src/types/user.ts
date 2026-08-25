export enum UserRole {
  ADMIN = 'admin',
  STAFF = 'staff',
  AUDITOR = 'auditor',
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  orgId: string | null;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  address: string | null;
  category: string | null;
  createdAt: string;
  locations?: Location[];
}

export interface Location {
  id: string;
  orgId: string;
  name: string;
  address: string | null;
  createdAt: string;
}
