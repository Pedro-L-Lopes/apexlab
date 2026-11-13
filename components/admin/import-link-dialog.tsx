"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ExternalLink, Link2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

interface ImportLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportLinkDialog({
  open,
  onOpenChange,
}: ImportLinkDialogProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [sourceUrl, setSourceUrl] = React.useState("");
  const [stlUrl, setStlUrl] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const runExtract = async (skipExtract = false) => {
    const trimmed = sourceUrl.trim();
    if (!trimmed) {
      setErrorMsg("Cole a URL da página do modelo.");
      return;
    }

    setErrorMsg(null);
    setLoading(true);

    try {
      const response = await fetch("/api/admin/import/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceUrl: trimmed,
          stlUrl: stlUrl.trim() || null,
          skipExtract,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        jobId?: string;
        status?: "done" | "error";
        errorMessage?: string | null;
        duplicateProduct?: { id: string; name: string; slug: string } | null;
      };

      if (!response.ok || !payload.jobId) {
        setErrorMsg(
          payload.error ?? "Não foi possível iniciar a importação deste link."
        );
        setLoading(false);
        return;
      }

      if (payload.duplicateProduct) {
        toast({
          variant: "default",
          title: "Link de origem já cadastrado",
          description: `Já vinculado a "${payload.duplicateProduct.name}". Você ainda pode revisar e salvar um novo rascunho.`,
        });
      } else if (payload.status === "error") {
        toast({
          variant: "default",
          title: "Extração automática parcial",
          description:
            payload.errorMessage ??
            "Abrindo formulário pré-preenchido para completar manualmente.",
        });
      } else {
        toast({
          variant: "success",
          title: "Dados extraídos em português",
          description: "Revise os campos e salve como rascunho ou publique.",
        });
      }

      setLoading(false);
      onOpenChange(false);
      setSourceUrl("");
      setStlUrl("");
      router.push(`/admin/produtos/novo?importJobId=${payload.jobId}`);
      router.refresh();
    } catch {
      setLoading(false);
      setErrorMsg("Falha de rede ao consultar o servidor de importação.");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!loading) {
          setErrorMsg(null);
          onOpenChange(next);
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-accent" />
            Importar por link
          </DialogTitle>
          <DialogDescription>
            Cole a URL de um modelo 3D (MakerWorld, Printables ou outro site).
            Vamos extrair título, descrição e imagens no servidor e abrir o
            formulário como rascunho com a origem salva em{" "}
            <strong className="text-ink">Dados internos</strong>.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void runExtract(false);
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <label
              htmlFor="import-source-url"
              className="block text-[11px] font-bold uppercase tracking-wider text-muted"
            >
              Link do modelo (público) *
            </label>
            <Input
              id="import-source-url"
              type="url"
              required
              placeholder="https://makerworld.com/en/models/..."
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="import-stl-url"
              className="block text-[11px] font-bold uppercase tracking-wider text-muted"
            >
              Link do STL / 3MF (opcional · fica apenas interno)
            </label>
            <Input
              id="import-stl-url"
              type="url"
              placeholder="https://drive.google.com/... ou link privado"
              value={stlUrl}
              onChange={(e) => setStlUrl(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="flex items-start gap-2.5 rounded-2xl border border-[#F59E0B]/30 bg-[#FEF3C7]/60 px-3.5 py-2.5 text-xs text-[#92400E]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Publique apenas modelos de criação própria ou com licença que
              autorize uso comercial. Se o site bloquear leitura automática, você
              poderá completar tudo manualmente sem travar.
            </span>
          </div>

          {errorMsg && (
            <div className="rounded-2xl border border-[#B42318]/25 bg-[#FEE4E2] px-3.5 py-2.5 text-xs font-medium text-[#B42318]">
              {errorMsg}
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              disabled={loading || !sourceUrl.trim()}
              onClick={() => void runExtract(true)}
            >
              <ExternalLink className="h-4 w-4" />
              Completar manualmente
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={loading}
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Extraindo...
                  </>
                ) : (
                  <>
                    <Link2 className="h-4 w-4" />
                    Extrair e abrir rascunho
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
