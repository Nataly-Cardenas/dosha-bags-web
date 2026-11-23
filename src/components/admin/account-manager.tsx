"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { changePasswordAction, createAdminAction, deleteAdminAction, resetAdminPasswordAction } from "@/app/admin/actions";
import { Field, Notice, Section } from "./ui";

type U = { id: string; email: string; name: string };

export function AccountManager({ meId, users }: { meId: string; users: U[] }) {
  const router = useRouter();
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwMsg, setPwMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [nu, setNu] = useState({ email: "", name: "", password: "" });
  const [uMsg, setUMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  return (
    <div className="grid gap-8 xl:grid-cols-2">
      <Section title="Cambiar mi contraseña" description="Usa al menos 10 caracteres. Una frase fácil de recordar funciona bien.">
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (pw.next !== pw.confirm) return setPwMsg({ kind: "error", text: "Las contraseñas nuevas no coinciden." });
            const r = await changePasswordAction({ current: pw.current, next: pw.next });
            setPwMsg(r.ok ? { kind: "ok", text: "Contraseña actualizada." } : { kind: "error", text: r.error });
            if (r.ok) setPw({ current: "", next: "", confirm: "" });
          }}
        >
          <Field label="Contraseña actual"><input type="password" autoComplete="current-password" className="field" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></Field>
          <Field label="Nueva contraseña"><input type="password" autoComplete="new-password" className="field" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></Field>
          <Field label="Repite la nueva contraseña"><input type="password" autoComplete="new-password" className="field" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} /></Field>
          {pwMsg && <Notice kind={pwMsg.kind}>{pwMsg.text}</Notice>}
          <button className="btn btn-primary">Cambiar contraseña</button>
        </form>
      </Section>

      <Section title="Personas con acceso al panel" description="Puedes dar acceso a otra persona (por ejemplo, a quien te ayuda con la tienda) y quitárselo cuando quieras.">
        <ul className="divide-y divide-line border border-line">
          {users.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center gap-3 px-3 py-3 text-sm">
              <span className="min-w-0 flex-1 truncate">{u.name ? `${u.name} · ` : ""}{u.email}{u.id === meId && " (tú)"}</span>
              {u.id !== meId && (
                <>
                  <button
                    type="button"
                    className="underline"
                    onClick={async () => {
                      const p = prompt(`Nueva contraseña temporal para ${u.email} (mínimo 10 caracteres):`);
                      if (!p) return;
                      const r = await resetAdminPasswordAction({ id: u.id, password: p });
                      setUMsg(r.ok ? { kind: "ok", text: "Contraseña restablecida. Compártela de forma privada." } : { kind: "error", text: r.error });
                    }}
                  >
                    Restablecer contraseña
                  </button>
                  <button
                    type="button"
                    className="text-danger underline"
                    onClick={async () => {
                      if (!confirm(`¿Quitar el acceso a ${u.email}?`)) return;
                      const r = await deleteAdminAction(u.id);
                      if (r.ok) router.refresh();
                      else setUMsg({ kind: "error", text: r.error });
                    }}
                  >
                    Quitar acceso
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
        <form
          className="space-y-4 border-t border-line pt-5"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await createAdminAction(nu);
            setUMsg(r.ok ? { kind: "ok", text: "Acceso creado. Comparte la contraseña temporal de forma privada y pide que la cambie." } : { kind: "error", text: r.error });
            if (r.ok) { setNu({ email: "", name: "", password: "" }); router.refresh(); }
          }}
        >
          <p className="font-medium">Dar acceso a otra persona</p>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Correo"><input type="email" className="field" value={nu.email} onChange={(e) => setNu({ ...nu, email: e.target.value })} /></Field>
            <Field label="Nombre"><input className="field" value={nu.name} onChange={(e) => setNu({ ...nu, name: e.target.value })} /></Field>
          </div>
          <Field label="Contraseña temporal" hint="Mínimo 10 caracteres."><input type="text" autoComplete="off" className="field" value={nu.password} onChange={(e) => setNu({ ...nu, password: e.target.value })} /></Field>
          {uMsg && <Notice kind={uMsg.kind}>{uMsg.text}</Notice>}
          <button className="btn btn-outline">Crear acceso</button>
        </form>
      </Section>
    </div>
  );
}
