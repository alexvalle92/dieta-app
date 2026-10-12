"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RENEWAL_SECTIONS, type NumberQuestion } from "@/lib/renewal/questions";
import type { RenewalAnswers } from "@/lib/validation/renewal";

interface RenewalFormProps {
  /** Respostas com que a tela abre (o envio mais recente do paciente). */
  initial: Partial<RenewalAnswers>;
  submitting: boolean;
  onSubmit: (answers: RenewalAnswers) => void;
}

// Escolha única guarda um texto; múltipla, uma lista; número, o texto digitado no campo.
type Values = Record<string, string | string[]>;

/** Mesma regra do servidor (lib/validation/renewal.ts): dentro de [min, max] e múltiplo de `step`. */
function isValidNumber(q: NumberQuestion, n: number): boolean {
  if (!Number.isFinite(n) || n < q.min || n > q.max) return false;
  const steps = n / q.step;
  return Math.abs(steps - Math.round(steps)) < 1e-6;
}

function initialValues(initial: Partial<RenewalAnswers>): Values {
  const source = initial as Record<string, unknown>;
  const values: Values = {};
  for (const section of RENEWAL_SECTIONS) {
    for (const q of section.questions) {
      const value = source[q.key];
      if (q.type === "multi") {
        values[q.key] = Array.isArray(value) ? (value as string[]) : [];
      } else if (q.type === "number") {
        values[q.key] = typeof value === "number" ? String(value) : "";
      } else {
        values[q.key] = typeof value === "string" ? value : "";
      }
    }
  }
  return values;
}

export function RenewalForm({ initial, submitting, onSubmit }: RenewalFormProps) {
  const [values, setValues] = useState<Values>(() => initialValues(initial));

  const setValue = (key: string, value: string | string[]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const toggle = (key: string, option: string) => {
    const current = (values[key] as string[]) ?? [];
    setValue(
      key,
      current.includes(option)
        ? current.filter((item) => item !== option)
        : [...current, option],
    );
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const answers: Record<string, string | string[] | number> = {};
    let complete = true;

    for (const section of RENEWAL_SECTIONS) {
      for (const q of section.questions) {
        const value = values[q.key];
        if (q.type === "number") {
          const text = typeof value === "string" ? value.trim() : "";
          const n = text === "" ? NaN : Number(text);
          if (!isValidNumber(q, n)) {
            complete = false;
          } else {
            answers[q.key] = n;
          }
        } else if (q.type === "multi") {
          if (!Array.isArray(value) || value.length === 0) {
            complete = false;
          } else {
            answers[q.key] = value;
          }
        } else if (typeof value !== "string" || value === "") {
          complete = false;
        } else {
          answers[q.key] = value;
        }
      }
    }

    if (!complete) {
      toast.error("Responda todas as perguntas para continuar.");
      return;
    }

    onSubmit(answers as unknown as RenewalAnswers);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {RENEWAL_SECTIONS.map((section) => (
        <Card key={section.title}>
          <CardHeader>
            <CardTitle>{section.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {section.questions.map((q) => {
              if (q.type === "number") {
                return (
                  <div key={q.key} className="space-y-2">
                    <Label htmlFor={`renewal-${q.key}`}>{q.label}</Label>
                    <Input
                      id={`renewal-${q.key}`}
                      type="number"
                      inputMode="decimal"
                      min={q.min}
                      max={q.max}
                      step={q.step}
                      value={(values[q.key] as string) ?? ""}
                      onChange={(event) => setValue(q.key, event.target.value)}
                      className="max-w-xs"
                    />
                  </div>
                );
              }

              const labelId = `renewal-${q.key}-label`;
              return (
                <div
                  key={q.key}
                  role="group"
                  aria-labelledby={labelId}
                  className="space-y-2"
                >
                  <p id={labelId} className="text-sm font-medium">
                    {q.label}
                  </p>
                  <div className="flex flex-col gap-2">
                    {q.options.map((option) => {
                      const selected =
                        q.type === "multi"
                          ? ((values[q.key] as string[]) ?? []).includes(option.value)
                          : values[q.key] === option.value;
                      return (
                        <Button
                          key={option.value}
                          type="button"
                          variant={selected ? "default" : "outline"}
                          aria-pressed={selected}
                          onClick={() =>
                            q.type === "multi"
                              ? toggle(q.key, option.value)
                              : setValue(q.key, option.value)
                          }
                          className="h-auto justify-start whitespace-normal py-2 text-left"
                        >
                          {option.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      <Button type="submit" className="w-full gap-2" disabled={submitting}>
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        Enviar dados
      </Button>
    </form>
  );
}
