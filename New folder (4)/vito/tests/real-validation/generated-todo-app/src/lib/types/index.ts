export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  category: Category;
  createdAt: Date;
}

export interface Category {
  id: string;
  name: string;
}

export interface CreateTaskInput {
  title: string;
  categoryId: string;
}

export interface UpdateTaskInput {
  id: string;
  title?: string;
  completed?: boolean;
  categoryId?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface SignupInput {
  email: string;
  name: string;
  password: string;
}