import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { userRepository, UserRepository } from "../repositories/user.repository";
import { signToken } from "../middleware/auth";
import { Role } from "../types";
import { toPublicUser } from "../utils/mappers";
import { BadRequestError, ConflictError, UnauthorizedError } from "../utils/errors";
import { emailService, EmailService } from "./email.service";

export class AuthService {
  constructor(
    private userRepo: UserRepository = userRepository,
    private mailService: EmailService = emailService
  ) {}

  async register(input: {
    name?: string;
    email?: string;
    password?: string;
    role?: Role;
  }) {
    const { name, email, password, role } = input;
    if (!name || !email || !password || !role) {
      throw new BadRequestError("name, email, password, and role are required");
    }
    if (role !== "recruiter" && role !== "seeker") {
      throw new BadRequestError("role must be 'recruiter' or 'seeker'");
    }

    const existing = await this.userRepo.findByEmail(email);
    if (existing) {
      throw new ConflictError("Email already registered");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const id = uuidv4();

    const user = await this.userRepo.create({
      id,
      name,
      email,
      passwordHash,
      role,
    });

    const token = signToken({
      id: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
    });

    // Send welcome email asynchronously so user registration response is instant
    void this.mailService.sendWelcomeEmail(user.email, user.name, user.role);

    return {
      token,
      user: toPublicUser(user),
    };
  }

  async login(input: { email?: string; password?: string }) {
    const { email, password } = input;
    if (!email || !password) {
      throw new BadRequestError("email and password are required");
    }

    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const token = signToken({
      id: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
    });

    return {
      token,
      user: toPublicUser(user),
    };
  }
}

export const authService = new AuthService();
