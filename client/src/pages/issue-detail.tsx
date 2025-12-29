import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { 
  ArrowLeft, CheckCircle2, Mail, MapPin, Calendar, User, 
  AlertTriangle, Building2, Tag, Loader2, Image
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { WasteTypeBadge } from "@/components/waste-type-badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface IssueDetail {
  id: string;
  hospitalId: string;
  hospitalName: string;
  tagCode: string | null;
  category: string;
  description: string;
  reportedByName: string;
  photoUrl: string | null;
  reportedAt: string;
  isResolved: boolean;
  resolvedAt: string | null;
  wasteTypeCode?: string;
  locationInfo: {
    code: string;
    customLabel: string | null;
    categoryName: string;
  } | null;
}

const categoryLabels: Record<string, string> = {
  segregation: "Ayristirma Hatasi",
  non_compliance: "Uygunsuzluk",
  technical: "Teknik Sorun",
  other: "Diger",
};

const categoryColors: Record<string, string> = {
  segregation: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  non_compliance: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  technical: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  other: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

export default function IssueDetailPage() {
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/issue/:id");
  const { toast } = useToast();
  const issueId = params?.id;

  const { data: issue, isLoading } = useQuery<IssueDetail>({
    queryKey: ["/api/issues", issueId],
    queryFn: async () => {
      const response = await fetch(`/api/issues/${issueId}`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch issue");
      return response.json();
    },
    enabled: !!issueId,
  });

  const resolveMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/issues/${issueId}/resolve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/issues"] });
      queryClient.invalidateQueries({ queryKey: ["/api/issues/summary"] });
      toast({ title: "Uygunsuzluk cozuldu olarak isaretlendi" });
      navigate("/issues");
    },
    onError: () => {
      toast({ title: "Hata olustu", variant: "destructive" });
    }
  });

  const handleSendEmail = () => {
    if (!issue) return;

    const locationText = issue.locationInfo 
      ? `${issue.locationInfo.categoryName} - ${issue.locationInfo.code}${issue.locationInfo.customLabel ? ` (${issue.locationInfo.customLabel})` : ''}`
      : 'Belirtilmemis';

    const subject = encodeURIComponent(`Uygunsuzluk Bildirimi - ${issue.tagCode || 'Etiket Yok'} - ${issue.hospitalName}`);
    
    const body = `
UYGUNSUZLUK BILDIRIMI
=====================

Hastane: ${issue.hospitalName}
Mahal: ${locationText}
Etiket Kodu: ${issue.tagCode || 'Belirtilmemis'}
Kategori: ${categoryLabels[issue.category] || issue.category}
Bildiren: ${issue.reportedByName}
Tarih: ${issue.reportedAt ? format(new Date(issue.reportedAt), "dd MMMM yyyy HH:mm", { locale: tr }) : 'Bilinmiyor'}
Durum: ${issue.isResolved ? 'Cozuldu' : 'Acik'}

ACIKLAMA
--------
${issue.description}

${issue.photoUrl ? '\n[NOT: Bu bildirime ait fotograf mevcuttur. Lutfen sistem uzerinden kontrol ediniz.]\n' : ''}
---
Bu mail WMS - Stratejik Atik Yonetim Merkezi tarafindan olusturulmustur.
    `.trim();

    const mailtoLink = `mailto:?subject=${subject}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Uygunsuzluk bulunamadi</p>
        <Button variant="outline" onClick={() => navigate("/issues")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Listeye Don
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate("/issues")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Uygunsuzluk Detayi</h1>
            <p className="text-sm text-muted-foreground">{issue.tagCode || 'Etiket Yok'}</p>
          </div>
        </div>
        <Badge 
          variant="outline" 
          className={issue.isResolved 
            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
            : "bg-amber-500/20 text-amber-400 border-amber-500/30"
          }
        >
          {issue.isResolved ? "Cozuldu" : "Acik"}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Bildirim Bilgileri
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <div className="flex items-start gap-3">
                <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Hastane</p>
                  <p className="text-sm font-medium">{issue.hospitalName}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Mahal</p>
                  <p className="text-sm font-medium">
                    {issue.locationInfo 
                      ? `${issue.locationInfo.categoryName} - ${issue.locationInfo.code}${issue.locationInfo.customLabel ? ` (${issue.locationInfo.customLabel})` : ''}`
                      : 'Belirtilmemis'
                    }
                  </p>
                </div>
              </div>

              {issue.tagCode && (
                <div className="flex items-start gap-3">
                  <Tag className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Etiket Kodu</p>
                    <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">{issue.tagCode}</code>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Kategori</p>
                  <Badge variant="outline" className={categoryColors[issue.category]}>
                    {categoryLabels[issue.category] || issue.category}
                  </Badge>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Bildiren</p>
                  <p className="text-sm">{issue.reportedByName}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Bildirim Tarihi</p>
                  <p className="text-sm">
                    {issue.reportedAt 
                      ? format(new Date(issue.reportedAt), "dd MMMM yyyy HH:mm", { locale: tr })
                      : 'Bilinmiyor'
                    }
                  </p>
                </div>
              </div>

              {issue.isResolved && issue.resolvedAt && (
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Cozum Tarihi</p>
                    <p className="text-sm">
                      {format(new Date(issue.resolvedAt), "dd MMMM yyyy HH:mm", { locale: tr })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Aciklama</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{issue.description}</p>
          </CardContent>
        </Card>
      </div>

      {issue.photoUrl && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Image className="h-4 w-4" />
              Fotograf
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative rounded-md overflow-hidden bg-muted">
              <img 
                src={issue.photoUrl} 
                alt="Uygunsuzluk fotografı"
                className="max-w-full max-h-96 object-contain mx-auto"
              />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-end gap-3">
        <Button
          variant="outline"
          onClick={handleSendEmail}
          data-testid="button-send-email"
        >
          <Mail className="h-4 w-4 mr-2" />
          Mail Gonder
        </Button>
        
        {!issue.isResolved && (
          <Button
            onClick={() => resolveMutation.mutate()}
            disabled={resolveMutation.isPending}
            data-testid="button-resolve"
          >
            {resolveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            Cozuldu Olarak Isaretle
          </Button>
        )}
      </div>
    </div>
  );
}
