import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Ingresar al panel", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getAdmin()) redirect("/admin");
  return (
    <main className="flex min-h-svh items-center justify-center bg-ivory px-5 py-12">
      <div className="w-full max-w-sm">
        <Image src="/brand/logo-dosha.png" alt="Dosha Bags" width={96} height={96} className="mx-auto h-24 w-24 rounded-full" priority />
        <h1 className="mt-6 text-center text-4xl text-cranberry">Panel de la tienda</h1>
        <p className="mt-2 text-center text-sm text-muted">Ingresa con tu correo y contraseña.</p>
        <LoginForm />
      </div>
    </main>
  );
}
