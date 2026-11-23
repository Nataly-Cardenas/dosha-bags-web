"use client";

import { useActionState, useState } from "react";
import { loginAction } from "../actions";
import { IconEye, IconEyeOff } from "@/components/icons";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, {});
  const [show, setShow] = useState(false);
  return (
    <form action={action} className="mt-8 space-y-4 border border-line bg-white p-6">
      <div>
        <label className="label" htmlFor="email">Correo</label>
        <input id="email" name="email" type="email" required autoComplete="username" className="field" defaultValue={state?.email ?? ""} key={state?.email} />
      </div>
      <div>
        <label className="label" htmlFor="password">Contraseña</label>
        <div className="relative">
          <input id="password" name="password" type={show ? "text" : "password"} required autoComplete="current-password" className="field pr-12" />
          <button type="button" onClick={() => setShow(!show)} className="absolute inset-y-0 right-0 px-3 text-muted" aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}>
            {show ? <IconEyeOff size={18} /> : <IconEye size={18} />}
          </button>
        </div>
      </div>
      {state?.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <button className="btn btn-primary w-full" disabled={pending}>{pending ? "Ingresando…" : "Ingresar"}</button>
    </form>
  );
}
