export interface TodoDto {
  title: string;
  completed: boolean;
  createdAt: string; // ISO string
  updatedAt?: string; // ISO string
}

