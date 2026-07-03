import { createFileRoute, useParams } from "@tanstack/react-router";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings2, Shield, Bell, Database } from "lucide-react";

export const Route = createFileRoute("/app/$companyId/loja/config")({
  head: () => ({ meta: [{ title: "Configurações · Loja" }] }),
  component: ConfigPage,
});

function ConfigPage() {
  return (
    <div className="animate-fade-in p-4 sm:p-6 lg:p-8 space-y-4">
      <PageHeader title="Configurações" description="Configurações do módulo Loja." />
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Bell className="h-4 w-4 text-amber-500" /> Alertas</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1">
            <p>• Documentos vencidos: alerta imediato</p>
            <p>• Documentos vencendo em 30d: alerta</p>
            <p>• Documentos vencendo em 60d: aviso</p>
            <p>• Documentos vencendo em 90d: informativo</p>
            <p>• Estoque mínimo atingido: alerta no dashboard</p>
            <p>• Sem estoque: alerta crítico</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Shield className="h-4 w-4 text-emerald-500" /> Segurança</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1">
            <p>• RLS ativo: dados isolados por empresa</p>
            <p>• Auditoria: todos os acessos registrados</p>
            <p>• Histórico imutável: nenhum log pode ser excluído</p>
            <p>• Backup automático: gerenciado pelo Supabase</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Database className="h-4 w-4 text-blue-500" /> Integrações</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1">
            <p>• Clientes da Loja independentes dos atiradores do Clube</p>
            <p>• Financeiro da Loja separado do financeiro do Clube</p>
            <p>• KPIs da Loja integrados ao Dashboard principal</p>
            <p>• Auditoria centralizada por empresa</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Settings2 className="h-4 w-4 text-violet-500" /> Aviso legal</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1">
            <p>Este sistema <strong>não toma decisões jurídicas</strong>.</p>
            <p>Sua função é organizar informações, registrar operações, validar campos obrigatórios, emitir alertas e gerar auditoria.</p>
            <p>O operador é responsável pelas decisões administrativas.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
