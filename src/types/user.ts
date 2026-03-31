export interface User {
  id: string;
  auth0Sub: string;
  email?: string;
  name?: string;
  picture?: string;
  subscriptionPlan: 'free' | 'plus';
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date;
  createdAt: Date;
}

export interface AuthUser {
  id: string;
  auth0Sub: string;
  email?: string;
  name?: string;
  picture?: string;
  subscriptionPlan: 'free' | 'plus';
}