import {
	Body,
	Button,
	Container,
	Head,
	Heading,
	Html,
	Preview,
	Section,
	Text,
} from "@react-email/components";

export interface ResetPasswordEmailProps {
	userName?: string;
	resetUrl: string;
	expiresInMinutes: number;
}

export default function ResetPasswordEmail({
	userName,
	resetUrl,
	expiresInMinutes,
}: ResetPasswordEmailProps) {
	const greeting = userName ? `Olá, ${userName}` : "Olá";

	return (
		<Html lang="pt-BR">
			<Head />
			<Preview>Redefinição de senha - Oikos</Preview>
			<Body style={body}>
				<Container style={container}>
					<Heading as="h1" style={heading}>
						Redefinir senha
					</Heading>
					<Text style={text}>
						{greeting}. Recebemos uma solicitação para redefinir sua senha.
						Clique no botão abaixo para criar uma nova senha.
					</Text>
					<Section style={buttonSection}>
						<Button href={resetUrl} style={button}>
							Redefinir senha
						</Button>
					</Section>
					<Text style={text}>
						Se o botão não funcionar, copie e cole este link no navegador:{" "}
						<a href={resetUrl} style={link}>
							{resetUrl}
						</a>
					</Text>
					<Text style={footer}>
						Este link expira em {expiresInMinutes} minutos. Se você não
						solicitou a redefinição, ignore este e-mail.
					</Text>
				</Container>
			</Body>
		</Html>
	);
}

ResetPasswordEmail.PreviewProps = {
	userName: "Maria Souza",
	resetUrl: "https://app.oikos.company/reset-password?token=abc123",
	expiresInMinutes: 60,
} satisfies ResetPasswordEmailProps;

const body = {
	backgroundColor: "#f4f4f5",
	fontFamily:
		'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
	margin: "0",
	padding: "16px",
};

const container = {
	backgroundColor: "#ffffff",
	borderRadius: "8px",
	margin: "0 auto",
	maxWidth: "600px",
	padding: "32px",
};

const heading = {
	color: "#18181b",
	fontSize: "24px",
	fontWeight: "600",
	lineHeight: "1.25",
	margin: "0 0 24px",
};

const text = {
	color: "#3f3f46",
	fontSize: "16px",
	lineHeight: "1.5",
	margin: "0 0 16px",
};

const buttonSection = {
	margin: "32px 0",
};

const button = {
	backgroundColor: "#18181b",
	borderRadius: "6px",
	color: "#ffffff",
	display: "inline-block",
	fontSize: "16px",
	fontWeight: "500",
	padding: "12px 24px",
	textDecoration: "none",
};

const link = {
	color: "#18181b",
	textDecoration: "underline",
	wordBreak: "break-all" as const,
};

const footer = {
	color: "#71717a",
	fontSize: "14px",
	lineHeight: "1.5",
	margin: "24px 0 0",
};
