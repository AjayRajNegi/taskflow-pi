import bcrypt from "bcrypt";
import { ConflictError, ValidationError } from "../../shared/errors";
import { UserRepository } from "./user.repository";

const BCRYPT_COST = 12;

export interface UserOutput {
	id: string;
	email: string;
	firstName: string | null;
	lastName: string | null;
	tenantId: string;
	createdAt: Date;
}

export interface AuthUserOutput extends UserOutput {
	passwordHash: string;
}

export class UserService {
	private userRepository: UserRepository;

	constructor(userRepository?: UserRepository) {
		this.userRepository = userRepository || new UserRepository();
	}

	async hashPassword(password: string): Promise<string> {
		return bcrypt.hash(password, BCRYPT_COST);
	}

	async verifyPassword(password: string, hash: string): Promise<boolean> {
		return bcrypt.compare(password, hash);
	}

	async register(input: {
		email: string;
		password: string;
		firstName?: string;
		lastName?: string;
		tenantId: string;
	}): Promise<UserOutput> {
		const existingUser = await this.userRepository.existsByEmail(input.email);
		if (existingUser) {
			throw new ConflictError("A user with this email already exists");
		}

		const passwordHash = await this.hashPassword(input.password);

		const user = await this.userRepository.create({
			email: input.email,
			passwordHash,
			firstName: input.firstName,
			lastName: input.lastName,
			tenantId: input.tenantId,
		});

		return this.toUserOutput(user);
	}

	async authenticate(email: string, password: string): Promise<UserOutput> {
		const user = await this.userRepository.findByEmail(email);
		if (!user) {
			throw new ValidationError("Invalid email or password");
		}

		const isValid = await this.verifyPassword(password, user.passwordHash);
		if (!isValid) {
			throw new ValidationError("Invalid email or password");
		}

		return this.toUserOutput(user);
	}

	async getById(id: string): Promise<UserOutput | null> {
		const user = await this.userRepository.findById(id);
		if (!user) {
			return null;
		}
		return this.toUserOutput(user);
	}

	async updateProfile(
		userId: string,
		data: { firstName?: string; lastName?: string },
	): Promise<UserOutput> {
		const user = await this.userRepository.update(userId, data);
		return this.toUserOutput(user);
	}

	private toUserOutput(user: AuthUserOutput): UserOutput {
		const { passwordHash, ...output } = user;
		return output;
	}
}
