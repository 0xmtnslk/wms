import { Building2, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth, useCurrentHospital } from "@/lib/auth-context";

export function HospitalSelector() {
  const { user, setCurrentHospital } = useAuth();
  const currentHospital = useCurrentHospital();

  if (!user || user.hospitals.length <= 1) {
    return currentHospital ? (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted">
        <div 
          className="w-2 h-2 rounded-full" 
          style={{ backgroundColor: currentHospital.colorHex }}
        />
        <span className="text-sm font-medium">{currentHospital.name}</span>
      </div>
    ) : null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2" data-testid="button-hospital-selector">
          <Building2 className="h-4 w-4" />
          {currentHospital ? (
            <>
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: currentHospital.colorHex }}
              />
              <span className="truncate max-w-[120px]">{currentHospital.name}</span>
            </>
          ) : (
            <span>Hastane Seç</span>
          )}
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {user.hospitals.map((hospital) => (
          <DropdownMenuItem
            key={hospital.id}
            onClick={() => setCurrentHospital(hospital.id)}
            className="gap-2"
            data-testid={`hospital-option-${hospital.code}`}
          >
            <div 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: hospital.colorHex }}
            />
            <span className="flex-1">{hospital.name}</span>
            {currentHospital?.id === hospital.id && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
