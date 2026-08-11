import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins/admin";

const auth = betterAuth({ database: { type: "sqlite" }, plugins: [admin()] });

type GetUser = typeof auth.api.getUser;
type ListUsers = typeof auth.api.listUsers;
type CreateUser = typeof auth.api.createUser;
type AdminUpdateUser = typeof auth.api.adminUpdateUser;
type SetRole = typeof auth.api.setRole;
type BanUser = typeof auth.api.banUser;
type UnbanUser = typeof auth.api.unbanUser;
type ListUserSessions = typeof auth.api.listUserSessions;
type RevokeUserSessions = typeof auth.api.revokeUserSessions;
type SetUserPassword = typeof auth.api.setUserPassword;
type RemoveUser = typeof auth.api.removeUser;

export type {
	AdminUpdateUser,
	BanUser,
	CreateUser,
	GetUser,
	ListUserSessions,
	ListUsers,
	RemoveUser,
	RevokeUserSessions,
	SetRole,
	SetUserPassword,
	UnbanUser,
};
