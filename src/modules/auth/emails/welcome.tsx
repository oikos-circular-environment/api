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

export interface WelcomeEmailProps {
	userName?: string;
	loginUrl: string;
}

export default function WelcomeEmail({
	userName,
	loginUrl,
}: WelcomeEmailProps) {
	const greeting = userName ? `Olá, ${userName}` : "Olá";

	return (
		<Html lang="pt-BR">
			<Head />
			<Preview>Bem-vindo à Oikos</Preview>
			<Body style={body}>
				<Container style={container}>
					<Heading as="h1" style={heading}>
						Bem-vindo à Oikos
					</Heading>
					<Text style={text}>
						{greeting}. É um prazer ter você conosco. A Oikos ajuda você a
						gerenciar resíduos e conectar-se com empresas de forma simples e
						segura.
					</Text>
					<Text style={text}>
						Clique no botão abaixo para acessar sua conta e começar.
					</Text>
					<Section style={buttonSection}>
						<Button href={loginUrl} style={button}>
							Acessar minha conta
						</Button>
					</Section>
					<Text style={text}>
						Se precisar de ajuda, entre em contato respondendo a este e-mail.
					</Text>
					<Text style={footer}>
						Atenciosamente,
						<br />
						Equipe Oikos
					</Text>
				</Container>
			</Body>
		</Html>
	);
}

WelcomeEmail.PreviewProps = {
	userName: "Ana Pereira",
	loginUrl: "https://app.oikos.company/login",
} satisfies WelcomeEmailProps;

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

const footer = {
	color: "#71717a",
	fontSize: "14px",
	lineHeight: "1.5",
	margin: "24px 0 0",
};
