import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { 
  AlertTriangle, Search, Eye, CheckCircle2, 
  Clock, Camera, Building2, ChevronRight, ArrowLeft
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { WasteTypeBadge } from "@/components/waste-type-badge";
import { useAuth, useCurrentHospital, useIsHQ } from "@/lib/auth-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface Issue {
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
  locationCode?: string;
}

interface IssuesSummary {
  totalOpen: number;
  totalResolved: number;
  hospitals: {
    id: string;
    code: string;
    name: string;
    colorHex: string;
    openCount: number;
    resolvedCount: number;
    totalCount: number;
    lastIssueAt: string | null;
  }[];
}

const categoryLabels: Record<string, string> = {
  segregation: "Ayrıştırma Hatası",
  non_compliance: "Uygunsuzluk",
  technical: "Teknik Sorun",
  other: "Diğer",
};

const categoryColors: Record<string, string> = {
  segregation: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  non_compliance: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  technical: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  other: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

export default function IssuesPage() {
  const { user } = useAuth();
  const currentHospital = useCurrentHospital();
  const isHQ = useIsHQ();
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/issues/:hospitalId");
  const { toast } = useToast();
  
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const urlHospitalId = params?.hospitalId;
  const isViewingSpecificHospital = !!urlHospitalId;
  const hospitalId = urlHospitalId || (isHQ ? undefined : currentHospital?.id);

  const { data: summary, isLoading: summaryLoading } = useQuery<IssuesSummary>({
    queryKey: ["/api/issues/summary"],
    enabled: isHQ && !isViewingSpecificHospital,
  });

  const viewingHospital = summary?.hospitals?.find(h => h.id === urlHospitalId);

  const { data: issues, isLoading: issuesLoading } = useQuery<Issue[]>({
    queryKey: ["/api/issues", hospitalId],
    queryFn: async () => {
      const url = hospitalId ? `/api/issues?hospitalId=${hospitalId}` : "/api/issues";
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch issues");
      return response.json();
    },
    enabled: !isHQ || isViewingSpecificHospital || !isHQ,
  });

  const resolveMutation = useMutation({
    mutationFn: (issueId: string) => apiRequest("PATCH", `/api/issues/${issueId}/resolve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/issues"] });
      queryClient.invalidateQueries({ queryKey: ["/api/issues/summary"] });
      setSelectedIssue(null);
      toast({ title: "Uygunsuzluk çözüldü olarak işaretlendi" });
    },
    onError: () => {
      toast({ title: "Hata oluştu", variant: "destructive" });
    }
  });

  const filteredIssues = issues?.filter(issue => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!issue.tagCode?.toLowerCase().includes(query) &&
          !issue.description.toLowerCase().includes(query) &&
          !issue.reportedByName.toLowerCase().includes(query)) {
        return false;
      }
    }
    if (filterCategory !== "all" && issue.category !== filterCategory) {
      return false;
    }
    if (filterStatus === "open" && issue.isResolved) return false;
    if (filterStatus === "resolved" && !issue.isResolved) return false;
    return true;
  });

  const filteredHospitals = summary?.hospitals?.filter(h => 
    h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    h.code.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => b.openCount - a.openCount) || [];

  if (summaryLoading || issuesLoading) {
    return <IssuesSkeleton />;
  }

  if (isHQ && !isViewingSpecificHospital) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Uygunsuzluk Bildirimleri</h1>
            <p className="text-muted-foreground text-sm">Tüm hastaneler</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30">
              {summary?.totalOpen || 0} Açık
            </Badge>
            <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
              {summary?.totalResolved || 0} Çözüldü
            </Badge>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Hastaneler
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Hastane ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-48"
                  data-testid="input-hospital-search"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredHospitals.length > 0 ? (
              <div className="space-y-2">
                {filteredHospitals.map((hospital) => (
                  <div 
                    key={hospital.id}
                    className="flex items-center justify-between gap-4 p-3 rounded-md bg-muted/50 hover-elevate cursor-pointer"
                    onClick={() => navigate(`/issues/${hospital.id}`)}
                    data-testid={`hospital-issue-row-${hospital.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div 
                        className="w-2 h-2 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: hospital.colorHex }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">{hospital.name}</span>
                          <Badge variant="outline" className="text-xs font-mono">
                            {hospital.code}
                          </Badge>
                        </div>
                        {hospital.lastIssueAt && (
                          <p className="text-xs text-muted-foreground">
                            Son bildirim: {format(new Date(hospital.lastIssueAt), "d MMM HH:mm", { locale: tr })}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {hospital.openCount > 0 && (
                          <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                            {hospital.openCount} açık
                          </Badge>
                        )}
                        {hospital.resolvedCount > 0 && (
                          <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                            {hospital.resolvedCount} çözüldü
                          </Badge>
                        )}
                        {hospital.totalCount === 0 && (
                          <span className="text-xs text-muted-foreground">Bildirim yok</span>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            ) : searchQuery ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Search className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">"{searchQuery}" ile eşleşen hastane bulunamadı</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Building2 className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">Hastane verisi yok</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const openCount = issues?.filter(i => !i.isResolved).length || 0;
  const resolvedCount = issues?.filter(i => i.isResolved).length || 0;
  const displayName = isViewingSpecificHospital 
    ? (viewingHospital?.name || "Hastane") 
    : (isHQ ? "Tüm hastaneler" : currentHospital?.name);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          {isViewingSpecificHospital && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate("/issues")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold">Uygunsuzluk Bildirimleri</h1>
            <p className="text-muted-foreground text-sm">{displayName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30">
            {openCount} Açık
          </Badge>
          <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
            {resolvedCount} Çözüldü
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Etiket, açıklama veya bildiren..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-issues"
              />
            </div>
            <div className="flex gap-2">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-40" data-testid="select-filter-category">
                  <SelectValue placeholder="Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Kategoriler</SelectItem>
                  <SelectItem value="segregation">Ayrıştırma Hatası</SelectItem>
                  <SelectItem value="non_compliance">Uygunsuzluk</SelectItem>
                  <SelectItem value="technical">Teknik Sorun</SelectItem>
                  <SelectItem value="other">Diğer</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32" data-testid="select-filter-status">
                  <SelectValue placeholder="Durum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="open">Açık</SelectItem>
                  <SelectItem value="resolved">Çözüldü</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredIssues && filteredIssues.length > 0 ? (
            <div className="space-y-2">
              {filteredIssues.map((issue) => (
                <div 
                  key={issue.id}
                  className="flex items-start gap-4 p-4 rounded-md bg-muted/50 hover-elevate cursor-pointer"
                  onClick={() => setSelectedIssue(issue)}
                  data-testid={`issue-row-${issue.id}`}
                >
                  <div className={`p-2 rounded-md ${issue.isResolved ? 'bg-emerald-500/20' : 'bg-amber-500/20'}`}>
                    {issue.isResolved ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-amber-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <Badge variant="outline" className={categoryColors[issue.category]}>
                        {categoryLabels[issue.category] || issue.category}
                      </Badge>
                      {issue.tagCode && (
                        <code className="text-xs font-mono bg-background px-2 py-0.5 rounded">
                          {issue.tagCode}
                        </code>
                      )}
                      {!isViewingSpecificHospital && isHQ && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {issue.hospitalName}
                        </span>
                      )}
                    </div>
                    <p className="text-sm line-clamp-2">{issue.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>{issue.reportedByName}</span>
                      <span>{format(new Date(issue.reportedAt), "d MMM yyyy HH:mm", { locale: tr })}</span>
                      {issue.photoUrl && (
                        <span className="flex items-center gap-1">
                          <Camera className="h-3 w-3" />
                          Fotoğraf
                        </span>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-lg font-medium">Kayıt bulunamadı</p>
              <p className="text-sm">Filtrelerinizi değiştirmeyi deneyin</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedIssue} onOpenChange={() => setSelectedIssue(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Uygunsuzluk Detayı
            </DialogTitle>
            <DialogDescription>
              {selectedIssue && format(new Date(selectedIssue.reportedAt), "d MMMM yyyy HH:mm", { locale: tr })}
            </DialogDescription>
          </DialogHeader>
          {selectedIssue && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className={categoryColors[selectedIssue.category]}>
                  {categoryLabels[selectedIssue.category] || selectedIssue.category}
                </Badge>
                <Badge variant={selectedIssue.isResolved ? "default" : "secondary"}>
                  {selectedIssue.isResolved ? "Çözüldü" : "Açık"}
                </Badge>
              </div>

              {selectedIssue.tagCode && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Etiket:</span>
                  <code className="font-mono bg-muted px-2 py-1 rounded">{selectedIssue.tagCode}</code>
                </div>
              )}

              <div>
                <span className="text-sm text-muted-foreground block mb-1">Açıklama:</span>
                <p className="text-sm">{selectedIssue.description}</p>
              </div>

              <div className="flex items-center gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Bildiren:</span>
                  <span className="ml-2">{selectedIssue.reportedByName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Hastane:</span>
                  <span className="ml-2">{selectedIssue.hospitalName}</span>
                </div>
              </div>

              {selectedIssue.photoUrl && (
                <div className="rounded-md overflow-hidden border">
                  <img 
                    src={selectedIssue.photoUrl} 
                    alt="Uygunsuzluk fotoğrafı"
                    className="w-full h-auto"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                {!selectedIssue.isResolved && (
                  <Button 
                    onClick={() => resolveMutation.mutate(selectedIssue.id)}
                    disabled={resolveMutation.isPending}
                    data-testid="button-resolve-issue"
                  >
                    {resolveMutation.isPending ? (
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                    )}
                    Çözüldü İşaretle
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function IssuesSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <Card>
        <CardHeader>
          <div className="flex gap-4">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
