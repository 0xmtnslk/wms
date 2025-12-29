import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { 
  ArrowLeft, CheckCircle2, Mail, MapPin, Calendar, User, 
  AlertTriangle, Building2, Tag, Loader2, Image, Download
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

  const generateOutlookEmail = () => {
    if (!issue) return;

    const locationText = issue.locationInfo 
      ? `${issue.locationInfo.categoryName} - ${issue.locationInfo.code}${issue.locationInfo.customLabel ? ` (${issue.locationInfo.customLabel})` : ''}`
      : 'Belirtilmemis';

    const subject = `Uygunsuzluk Bildirimi - ${issue.tagCode || 'Etiket Yok'} - ${issue.hospitalName}`;
    const reportDate = issue.reportedAt 
      ? format(new Date(issue.reportedAt), "dd MMMM yyyy HH:mm", { locale: tr }) 
      : 'Bilinmiyor';

    const statusText = issue.isResolved ? 'Cozuldu' : 'Acik';
    const statusBgColor = issue.isResolved ? '#10b981' : '#f59e0b';
    
    const categoryBgColors: Record<string, string> = {
      segregation: '#fce7f3',
      non_compliance: '#fef3c7', 
      technical: '#dbeafe',
      other: '#f1f5f9'
    };
    const categoryTextColors: Record<string, string> = {
      segregation: '#be185d',
      non_compliance: '#d97706',
      technical: '#1d4ed8',
      other: '#475569'
    };

    const htmlBody = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width">
<title>${subject}</title>
<!--[if mso]>
<noscript>
<xml>
<o:OfficeDocumentSettings>
<o:PixelsPerInch>96</o:PixelsPerInch>
</o:OfficeDocumentSettings>
</xml>
</noscript>
<![endif]-->
</head>
<body style="margin:0; padding:0; background-color:#f1f5f9; font-family:'Segoe UI',Arial,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f1f5f9;">
<tr>
<td align="center" style="padding:20px 10px;">

<table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color:#ffffff; border:1px solid #e2e8f0; border-radius:8px;">

<!-- Header -->
<tr>
<td style="background-color:#1e293b; padding:24px 30px; border-radius:8px 8px 0 0;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
<tr>
<td>
<h1 style="margin:0 0 4px 0; color:#ffffff; font-size:20px; font-weight:600;">Uygunsuzluk Bildirimi</h1>
<p style="margin:0; color:#94a3b8; font-size:14px;">${issue.hospitalName}</p>
</td>
<td align="right" valign="top">
<table role="presentation" cellspacing="0" cellpadding="0" border="0">
<tr>
<td style="background-color:${statusBgColor}; color:#ffffff; padding:6px 14px; border-radius:12px; font-size:12px; font-weight:600;">
${statusText}
</td>
</tr>
</table>
</td>
</tr>
</table>
</td>
</tr>

<!-- Info Card -->
<tr>
<td style="padding:24px 30px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:6px;">
<tr>
<td style="padding:20px;">

<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
<tr>
<td style="padding:8px 0; border-bottom:1px solid #e2e8f0;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
<tr>
<td width="120" style="color:#64748b; font-size:13px; vertical-align:top;">Hastane</td>
<td style="color:#1e293b; font-size:14px; font-weight:600;">${issue.hospitalName}</td>
</tr>
</table>
</td>
</tr>
<tr>
<td style="padding:8px 0; border-bottom:1px solid #e2e8f0;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
<tr>
<td width="120" style="color:#64748b; font-size:13px; vertical-align:top;">Mahal</td>
<td style="color:#1e293b; font-size:14px; font-weight:600;">${locationText}</td>
</tr>
</table>
</td>
</tr>
<tr>
<td style="padding:8px 0; border-bottom:1px solid #e2e8f0;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
<tr>
<td width="120" style="color:#64748b; font-size:13px; vertical-align:top;">Kategori</td>
<td>
<span style="display:inline-block; background-color:${categoryBgColors[issue.category] || '#f1f5f9'}; color:${categoryTextColors[issue.category] || '#475569'}; padding:4px 10px; border-radius:4px; font-size:12px; font-weight:500;">
${categoryLabels[issue.category] || issue.category}
</span>
</td>
</tr>
</table>
</td>
</tr>
${issue.tagCode ? `
<tr>
<td style="padding:8px 0; border-bottom:1px solid #e2e8f0;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
<tr>
<td width="120" style="color:#64748b; font-size:13px; vertical-align:top;">Etiket Kodu</td>
<td><code style="background-color:#e2e8f0; padding:3px 8px; border-radius:4px; font-family:Consolas,monospace; font-size:13px;">${issue.tagCode}</code></td>
</tr>
</table>
</td>
</tr>
` : ''}
<tr>
<td style="padding:8px 0; border-bottom:1px solid #e2e8f0;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
<tr>
<td width="120" style="color:#64748b; font-size:13px; vertical-align:top;">Bildiren</td>
<td style="color:#1e293b; font-size:14px;">${issue.reportedByName}</td>
</tr>
</table>
</td>
</tr>
<tr>
<td style="padding:8px 0;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
<tr>
<td width="120" style="color:#64748b; font-size:13px; vertical-align:top;">Bildirim Tarihi</td>
<td style="color:#1e293b; font-size:14px;">${reportDate}</td>
</tr>
</table>
</td>
</tr>
</table>

</td>
</tr>
</table>
</td>
</tr>

<!-- Description -->
<tr>
<td style="padding:0 30px 24px 30px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
<tr>
<td style="padding-bottom:10px;">
<span style="color:#64748b; font-size:12px; text-transform:uppercase; letter-spacing:0.5px;">Aciklama</span>
</td>
</tr>
<tr>
<td style="background-color:#f8fafc; border-left:4px solid #3b82f6; padding:16px; border-radius:0 6px 6px 0;">
<p style="margin:0; color:#334155; font-size:14px; line-height:1.6; white-space:pre-wrap;">${issue.description}</p>
</td>
</tr>
</table>
</td>
</tr>

${issue.photoUrl ? `
<!-- Photo -->
<tr>
<td style="padding:0 30px 24px 30px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
<tr>
<td style="padding-bottom:10px;">
<span style="color:#64748b; font-size:12px; text-transform:uppercase; letter-spacing:0.5px;">Fotograf</span>
</td>
</tr>
<tr>
<td style="background-color:#f1f5f9; padding:16px; border-radius:6px; text-align:center;">
<img src="${issue.photoUrl}" alt="Uygunsuzluk Fotografı" style="max-width:100%; height:auto; border-radius:6px; border:1px solid #e2e8f0;" />
</td>
</tr>
</table>
</td>
</tr>
` : ''}

<!-- Footer -->
<tr>
<td style="background-color:#f1f5f9; padding:16px 30px; border-top:1px solid #e2e8f0; border-radius:0 0 8px 8px; text-align:center;">
<p style="margin:0; color:#64748b; font-size:12px;">Bu e-posta WMS - Stratejik Atik Yonetim Merkezi tarafindan olusturulmustur.</p>
</td>
</tr>

</table>

</td>
</tr>
</table>
</body>
</html>`;

    const boundary = '----=_Part_0_' + Date.now();
    const emlContent = `MIME-Version: 1.0
Content-Type: multipart/alternative; boundary="${boundary}"
Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=
X-Unsent: 1
X-Mailer: WMS Atik Yonetim Sistemi

--${boundary}
Content-Type: text/plain; charset=UTF-8
Content-Transfer-Encoding: base64

${btoa(unescape(encodeURIComponent(`UYGUNSUZLUK BILDIRIMI
=====================
Hastane: ${issue.hospitalName}
Mahal: ${locationText}
Etiket Kodu: ${issue.tagCode || 'Belirtilmemis'}
Kategori: ${categoryLabels[issue.category] || issue.category}
Bildiren: ${issue.reportedByName}
Tarih: ${reportDate}
Durum: ${statusText}

ACIKLAMA
--------
${issue.description}
${issue.photoUrl ? '\n[Fotograf ektedir]' : ''}
---
WMS - Stratejik Atik Yonetim Merkezi`)))}

--${boundary}
Content-Type: text/html; charset=UTF-8
Content-Transfer-Encoding: base64

${btoa(unescape(encodeURIComponent(htmlBody)))}

--${boundary}--
`;

    const blob = new Blob([emlContent], { type: 'message/rfc822' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Uygunsuzluk_${issue.tagCode || issue.id}_${format(new Date(), 'yyyyMMdd')}.eml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({ 
      title: "E-posta dosyası indirildi", 
      description: "Dosyayı çift tıklayarak Outlook'ta açabilirsiniz" 
    });
  };

  const handleSendEmail = () => {
    generateOutlookEmail();
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
          <Download className="h-4 w-4 mr-2" />
          Outlook icin Indir
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
