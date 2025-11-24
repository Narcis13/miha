import { createFileRoute } from "@tanstack/react-router";
import { PaymentApp } from "@/components/PaymentApp";

export const Route = createFileRoute("/")({
	component: Index,
});

function Index() {
	return <PaymentApp />;
}
