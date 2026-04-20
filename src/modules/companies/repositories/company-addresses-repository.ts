export type CompanyAddressRelation = {
	id: string;
	company_id: string;
	address_id: string;
	created_at: Date;
	updated_at: Date;
};

export interface CompanyAddressesRepository {
	findByCompanyId(companyId: string): Promise<CompanyAddressRelation | null>;
	create(data: {
		company_id: string;
		address_id: string;
	}): Promise<CompanyAddressRelation>;
}
