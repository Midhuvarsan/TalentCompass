import { userRepository, UserRepository } from "../repositories/user.repository";
import { toPublicUser } from "../utils/mappers";
import { BadRequestError, NotFoundError } from "../utils/errors";

export class UserService {
  constructor(private userRepo: UserRepository = userRepository) {}

  async getProfile(userId: string) {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }
    return toPublicUser(user);
  }

  async updateProfile(
    userId: string,
    data: {
      name?: string;
      phone?: string | null;
      location?: string | null;
      bio?: string | null;
      avatarColor?: string;
      skills?: string[];
      headline?: string | null;
      yearsExperience?: number | null;
      companyName?: string | null;
      companyWebsite?: string | null;
    }
  ) {
    if (data.name !== undefined && !data.name.trim()) {
      throw new BadRequestError("Name cannot be empty");
    }
    if (data.skills !== undefined && !Array.isArray(data.skills)) {
      throw new BadRequestError("skills must be an array of strings");
    }

    const updated = await this.userRepo.update(userId, {
      ...data,
      name: data.name !== undefined ? data.name.trim() : undefined,
    });

    if (!updated) {
      throw new NotFoundError("User not found");
    }

    return toPublicUser(updated);
  }
}

export const userService = new UserService();
