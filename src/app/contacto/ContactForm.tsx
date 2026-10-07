"use client";

import { useState, FormEvent } from "react";
import { enviarContactoAction } from "./actions";
import { Check, CircleAlert, Send } from "lucide-react";

export default function ContactForm() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error: actionError } = await enviarContactoAction(
      new FormData(e.currentTarget)
    ).catch(() => ({
      error: "Hubo un error al enviar tu mensaje. Por favor intenta de nuevo.",
    }));

    if (actionError) {
      setError(actionError);
    } else {
      setSuccess(true);
    }
    setLoading(false);
  }

  if (success) {
    return (
      <div className="form-success" role="status">
        <Check size={24} strokeWidth={2.5} aria-hidden="true" />
        ¡Mensaje enviado correctamente! Te responderemos pronto.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-grid">
        <div className="form-field">
          <label htmlFor="nombre">Nombre</label>
          <input
            className="form-input"
            id="nombre"
            name="nombre"
            maxLength={80}
            type="text"
            placeholder="Tu nombre"
            required
          />
        </div>

        <div className="form-field">
          <label htmlFor="apellido">Apellido</label>
          <input
            className="form-input"
            id="apellido"
            name="apellido"
            maxLength={80}
            type="text"
            placeholder="Tu apellido"
            required
          />
        </div>

        <div className="form-field">
          <label htmlFor="email">Correo Electrónico</label>
          <input
            className="form-input"
            id="email"
            name="email"
            maxLength={254}
            type="email"
            placeholder="tucorreo@ejemplo.com"
            required
          />
        </div>

        <div className="form-field">
          <label htmlFor="telefono">Teléfono (Opcional)</label>
          <input
            className="form-input"
            id="telefono"
            name="telefono"
            maxLength={30}
            type="tel"
            placeholder="+504 9999-9999"
          />
        </div>

        <div className="form-field form-field-full">
          <label htmlFor="asunto">Asunto</label>
          <input
            className="form-input"
            id="asunto"
            name="asunto"
            maxLength={150}
            type="text"
            placeholder="¿En qué podemos ayudarte?"
            required
          />
        </div>

        <div className="form-field form-field-full">
          <label htmlFor="mensaje">Mensaje</label>
          <textarea
            className="form-input"
            id="mensaje"
            name="mensaje"
            maxLength={5000}
            placeholder="Escribe tu mensaje aquí..."
            rows={6}
            required
          />
        </div>
      </div>

      {error && (
        <p className="form-error" role="alert">
          <CircleAlert size={16} aria-hidden="true" />
          {error}
        </p>
      )}

      <div className="form-actions">
        <button
          className="btn-primary"
          type="submit"
          id="btnContacto"
          disabled={loading}
        >
          {loading ? (
            "Enviando..."
          ) : (
            <>
              Enviar Mensaje
              <Send aria-hidden="true" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
