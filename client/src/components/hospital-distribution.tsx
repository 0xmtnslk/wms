import { useState } from "react";
import { Building2, MapPin, TrendingUp, ChevronRight, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";

interface HospitalData {
  code: string;
  name: string;
  weight: number;
  hex: string;
}

interface HospitalDistributionProps {
  data: HospitalData[];
  onHospitalClick?: (code: string) => void;
}

const cityMap: Record<string, string> = {
  "İSÜ Liv Bahçeşehir": "İstanbul",
  "İSÜ Liv Topkapı": "İstanbul",
  "İSÜ MP Gaziosmanpaşa": "İstanbul",
  "Liv Ankara": "Ankara",
  "Liv Gaziantep": "Gaziantep",
  "Liv Samsun": "Samsun",
  "Liv Ulus": "İstanbul",
  "Liv Vadi": "İstanbul",
  "MP Adana": "Adana",
  "MP Ankara": "Ankara",
  "MP İncek": "Ankara",
  "MP Antalya": "Antalya",
  "MP Ataşehir": "İstanbul",
  "MP Bahçelievler": "İstanbul",
  "MP Gebze": "Kocaeli",
  "MP Göztepe": "İstanbul",
  "MP İzmir": "İzmir",
  "MP Ordu": "Ordu",
  "MP Seyhan": "Adana",
  "MP Tem": "İstanbul",
  "MP Tokat": "Tokat",
  "MP Karadeniz": "Trabzon",
  "MP Yıldızlı": "Trabzon",
  "VM MP Ankara": "Ankara",
  "VM MP Bursa": "Bursa",
  "VM MP Fatih": "Kocaeli",
  "VM MP Florya": "İstanbul",
  "VM MP Kocaeli": "Kocaeli",
  "VM MP Maltepe": "İstanbul",
  "VM MP Mersin": "Mersin",
  "VM MP Pendik": "İstanbul",
  "VM MP Samsun": "Samsun",
  "İstinye Dent": "İstanbul",
};

function getCity(hospitalName: string): string {
  for (const [key, city] of Object.entries(cityMap)) {
    if (hospitalName.includes(key) || key.includes(hospitalName.replace(/^H\d+\s*-?\s*/, ''))) {
      return city;
    }
  }
  const codePart = hospitalName.split(' ').slice(1).join(' ');
  for (const [key, city] of Object.entries(cityMap)) {
    if (codePart.includes(key) || key.includes(codePart)) {
      return city;
    }
  }
  return "Diğer";
}

export function HospitalDistribution({ data, onHospitalClick }: HospitalDistributionProps) {
  const [, navigate] = useLocation();
  
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        <Building2 className="h-5 w-5 mr-2 opacity-50" />
        Veri yok
      </div>
    );
  }

  const sortedData = [...data].sort((a, b) => b.weight - a.weight);
  const maxWeight = Math.max(...data.map(d => d.weight), 1);
  const totalWeight = data.reduce((sum, d) => sum + d.weight, 0);

  const cityData = data.reduce((acc, h) => {
    const city = getCity(h.name);
    if (!acc[city]) {
      acc[city] = { weight: 0, count: 0, hospitals: [] as string[] };
    }
    acc[city].weight += h.weight;
    acc[city].count += 1;
    acc[city].hospitals.push(h.code);
    return acc;
  }, {} as Record<string, { weight: number; count: number; hospitals: string[] }>);

  const sortedCities = Object.entries(cityData)
    .map(([city, stats]) => ({ city, ...stats }))
    .sort((a, b) => b.weight - a.weight);

  const maxCityWeight = Math.max(...sortedCities.map(c => c.weight), 1);

  const cityColors: Record<string, string> = {
    "İstanbul": "#3b82f6",
    "Ankara": "#f59e0b",
    "İzmir": "#10b981",
    "Antalya": "#f97316",
    "Bursa": "#8b5cf6",
    "Adana": "#ec4899",
    "Kocaeli": "#06b6d4",
    "Trabzon": "#84cc16",
    "Samsun": "#6366f1",
    "Gaziantep": "#e11d48",
    "Mersin": "#14b8a6",
    "Ordu": "#a855f7",
    "Tokat": "#eab308",
    "Diğer": "#64748b"
  };

  return (
    <Tabs defaultValue="cities" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-3">
        <TabsTrigger value="cities" className="text-xs" data-testid="tab-cities">
          <MapPin className="h-3 w-3 mr-1" />
          Şehirler
        </TabsTrigger>
        <TabsTrigger value="ranking" className="text-xs" data-testid="tab-ranking">
          <TrendingUp className="h-3 w-3 mr-1" />
          Sıralama
        </TabsTrigger>
      </TabsList>

      <TabsContent value="cities" className="mt-0">
        <ScrollArea className="h-[220px]">
          <div className="space-y-2 pr-3">
            {sortedCities.map((item, idx) => {
              const widthPercent = (item.weight / maxCityWeight) * 100;
              const color = cityColors[item.city] || "#64748b";
              
              return (
                <div 
                  key={item.city}
                  className="relative group"
                >
                  <div className="flex items-center gap-2 p-2 rounded-md bg-muted/30 relative overflow-hidden">
                    <div 
                      className="absolute inset-y-0 left-0 opacity-20 rounded-md transition-all"
                      style={{ 
                        width: `${widthPercent}%`,
                        backgroundColor: color
                      }}
                    />
                    <div 
                      className="w-2 h-2 rounded-full flex-shrink-0 relative z-10"
                      style={{ backgroundColor: color }}
                    />
                    <div className="flex-1 min-w-0 relative z-10">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{item.city}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {item.count} hastane
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right relative z-10">
                      <span className="text-sm font-mono font-bold">{item.weight.toFixed(1)}</span>
                      <span className="text-xs text-muted-foreground ml-1">kg</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="ranking" className="mt-0">
        <ScrollArea className="h-[220px]">
          <div className="space-y-1.5 pr-3">
            {sortedData.map((item, idx) => {
              const widthPercent = (item.weight / maxWeight) * 100;
              const isTop3 = idx < 3;
              
              return (
                <div 
                  key={item.code}
                  className="flex items-center gap-2 p-1.5 rounded-md hover-elevate cursor-pointer group"
                  onClick={() => onHospitalClick?.(item.code)}
                  data-testid={`ranking-hospital-${item.code}`}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                    isTop3 
                      ? idx === 0 
                        ? 'bg-amber-500 text-white' 
                        : idx === 1 
                          ? 'bg-slate-400 text-white' 
                          : 'bg-amber-700 text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono text-muted-foreground">{item.code}</span>
                      <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500"
                          style={{ 
                            width: `${widthPercent}%`,
                            backgroundColor: item.hex
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-medium w-14 text-right">
                    {item.weight.toFixed(1)} kg
                  </span>
                  <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              );
            })}
          </div>
        </ScrollArea>
        <div className="mt-2 pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
          <span>Toplam {data.length} hastane</span>
          <span className="font-mono font-medium">{totalWeight.toFixed(1)} kg</span>
        </div>
      </TabsContent>
    </Tabs>
  );
}
