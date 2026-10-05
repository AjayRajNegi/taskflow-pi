import type { Tenant } from "../../../generated/prisma/client";
import { ValidationError } from "../../shared/errors";
import { TenantRepository } from "./tenant.repository";

export interface TenantOutput {
	id: string;
	name: string;
	createdAt: Date;
	updatedAt: Date;
}

export class TenantService {
	private tenantRepository: TenantRepository;

	constructor(tenantRepository?: TenantRepository) {
		this.tenantRepository = tenantRepository || new TenantRepository();
	}

	async createTenant(name: string): Promise<TenantOutput> {
		if (!name || name.trim().length === 0) {
			throw new ValidationError("name is required");
		}
		if (name.length > 255) {
			throw new ValidationError("name must be 255 characters or less");
		}

		const tenant = await this.tenantRepository.create({ name: name.trim() });
		return this.toTenantOutput(tenant);
	}

	async getTenantById(id: string): Promise<TenantOutput | null> {
		const tenant = await this.tenantRepository.findById(id);
		if (!tenant) {
			return null;
		}
		return this.toTenantOutput(tenant);
	}

	async getUserTenant(userId: string): Promise<TenantOutput | null> {
		throw new Error(
			"getUserTenant requires user repository - use TenantServiceWithUserRepo instead",
		);
	}

	private toTenantOutput(tenant: Tenant): TenantOutput {
		return {
			id: tenant.id,
			name: tenant.name,
			createdAt: tenant.createdAt,
			updatedAt: tenant.updatedAt,
		};
	}
}

import { UserRepository } from "../users/user.repository";

export class TenantServiceWithUserRepo extends TenantService {
	private userRepository: UserRepository;

	constructor(
		tenantRepository?: TenantRepository,
		userRepository?: UserRepository,
	) {
		super(tenantRepository);
		this.userRepository = userRepository || new UserRepository();
	}

	override async getUserTenant(userId: string): Promise<TenantOutput | null> {
		const user = await this.userRepository.findById(userId);
		if (!user || !user.tenantId) {
			return null;
		}
		return this.getTenantById(user.tenantId);
	}
}
