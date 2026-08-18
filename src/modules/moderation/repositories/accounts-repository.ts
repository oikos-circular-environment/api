export type AccountSummary = {
	id: string;
	provider_id: string;
	account_id: string;
	scope: string | null;
	created_at: Date;
	updated_at: Date;
};

export interface AccountsRepository {
	listByUserId(userId: string): Promise<AccountSummary[]>;
}
