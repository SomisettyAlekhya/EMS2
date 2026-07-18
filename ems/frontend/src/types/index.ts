export type Role = 'Super Admin' | 'HR Manager' | 'Employee';
export type Status = 'Active' | 'Inactive';

export interface Employee {
  id: number;
  employeeCode: string;
  name: string;
  email: string;
  phone?: string | null;
  department?: string | null;
  designation?: string | null;
  salary?: number;
  joiningDate?: string | null;
  status: Status;
  role: Role;
  managerId?: number | null;
  profileImage?: string | null;
  createdAt?: string;
}

export interface TreeNode extends Employee {
  children: TreeNode[];
}
