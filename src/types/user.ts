export interface UserRole {
  role_id: number;
  role_name: string;
}

export interface User {
  id: number;
  username: string;
  full_name: string;
  roles_perms: UserRole[];
} 

export interface Role {
  id: number;
  name: string;
  description: string;
  created_at: string;
}