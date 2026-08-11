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

export interface VerifyEmailProps {
	userName?: string;
	verificationUrl: string;
	expiresInMinutes: number;
}

export default function VerifyEmail({
	userName,
	verificationUrl,
	expiresInMinutes,
}: VerifyEmailProps) {
	const greeting = userName ? `Olá, ${userName}` : "Olá";

	return (
		<Html lang="pt-BR">
			<Head />
			<Preview>Confirme seu e-mail - Oikos</Preview>
			<Body style={body}>
				<Container style={container}>
					<Heading as="h1" style={heading}>
						Confirme seu e-mail
					</Heading>
					<Text style={text}>
						{greeting}. Para completar seu cadastro e acessar a Oikos, confirme
						seu endereço de e-mail clicando no botão abaixo.
					</Text>
					<Section style={buttonSection}>
						<Button href={verificationUrl} style={button}>
							Confirmar e-mail
						</Button>
					</Section>
					<Text style={text}>
						Se o botão não funcionar, copie e cole este link no navegador:{" "}
						<a href={verificationUrl} style={link}>
							{verificationUrl}
						</a>
					</Text>
					<Text style={footer}>
						Este link expira em {expiresInMinutes} minutos. Se você não criou
						uma conta, ignore este e-mail.
					</Text>
				</Container>
			</Body>
		</Html>
	);
}

VerifyEmail.PreviewProps = {
	userName: "João Silva",
	verificationUrl: "https://app.oikos.company/verify-email?token=abc123",
	expiresInMinutes: 60,
} satisfies VerifyEmailProps;

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
