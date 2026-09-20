import Link from "next/link";
export default function NotFound() {
  return (
    <main className="empty standalone">
      <h1>Página não encontrada</h1>
      <p>Este endereço não faz parte do Oferta Certa.</p>
      <Link className="button primary" href="/">
        Voltar ao início
      </Link>
    </main>
  );
}
