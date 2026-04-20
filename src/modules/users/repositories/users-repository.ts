import type { CreateUser, User } from "@/modules/users/dtos/users-dto.js";

export interface UsersRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(data: CreateUser): Promise<User>;
  findAll(): Promise<User[]>;
}
