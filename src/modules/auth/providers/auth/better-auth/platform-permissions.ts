import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access";

export const ac = createAccessControl(defaultStatements);

export const moderator = ac.newRole({
	...adminAc.statements,
});

export const user = ac.newRole({
	user: [],
	session: [],
});
