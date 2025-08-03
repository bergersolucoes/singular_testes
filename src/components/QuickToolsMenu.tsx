import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader as DialogHeaderRoot,
  DialogTitle,
} from "@/components/ui/dialog";
// Import tool components (placeholders)
import PdfImpositionTool from "@/components/tools/PdfImpositionTool";
import CalculoLombadaTool from "@/components/tools/CalculoLombadaTool";
import TimerPomodoroTool from "@/components/tools/TimerPomodoroTool";
import PlannerDiarioTool from "@/components/tools/PlannerDiarioTool";
import RespiracaoGuiadaTool from "@/components/tools/RespiracaoGuiadaTool";
import ReceitasAleatoriasTool from "@/components/tools/ReceitasAleatoriasTool";
import CalculadoraGastosSemanaisTool from "@/components/tools/CalculadoraGastosSemanaisTool";

/**
 * QuickToolsMenu
 *
 * This component renders a vertical card containing a list of quick‑access tools.
 * Each tool is represented by a button with an emoji and a label. When a button
 * is clicked, a modal dialog opens showing a placeholder for the corresponding
 * tool component. The menu uses its own scroll area to remain usable even with
 * many tools, and it is designed to sit below the conversation list on larger
 * layouts.
 */
const QuickToolsMenu = () => {
  // Track which tool is currently open; null means no modal is open.
  const [openTool, setOpenTool] = useState<string | null>(null);

  // Define the list of tools along with their display names and components.
  const tools = [
    {
      id: "PdfImposition",
      label: "📄 Imposição de PDF",
      component: PdfImpositionTool,
    },
    {
      id: "CalculoLombada",
      label: "📚 Cálculo de Lombada",
      component: CalculoLombadaTool,
    },
    {
      id: "TimerPomodoro",
      label: "⏳ Timer Pomodoro",
      component: TimerPomodoroTool,
    },
    {
      id: "PlannerDiario",
      label: "📅 Planner Diário",
      component: PlannerDiarioTool,
    },
    {
      id: "RespiracaoGuiada",
      label: "🧘 Respiração Guiada",
      component: RespiracaoGuiadaTool,
    },
    {
      id: "ReceitasAleatorias",
      label: "🍳 Receitas Aleatórias",
      component: ReceitasAleatoriasTool,
    },
    {
      id: "CalculadoraGastosSemanais",
      label: "💰 Calculadora de Gastos Semanais",
      component: CalculadoraGastosSemanaisTool,
    },
  ];

  return (
    <>
      <Card className="h-[400px]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            ⚡ Ferramentas Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Scrollable container for tool buttons */}
          <ScrollArea className="h-[330px]">
            <div className="p-2 space-y-2">
              {tools.map((tool) => (
                <Button
                  key={tool.id}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setOpenTool(tool.id)}
                >
                  {tool.label}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Render a Dialog for each tool.
          Only the dialog corresponding to openTool will be visible. */}
      {tools.map((tool) => {
        const ToolComponent = tool.component;
        return (
          <Dialog
            key={tool.id}
            open={openTool === tool.id}
            onOpenChange={(open) => {
              if (!open) setOpenTool(null);
            }}
          >
            <DialogContent>
              <DialogHeaderRoot>
                <DialogTitle>{tool.label}</DialogTitle>
              </DialogHeaderRoot>
              {/* Render the placeholder tool component */}
              <ToolComponent />
            </DialogContent>
          </Dialog>
        );
      })}
    </>
  );
};

export default QuickToolsMenu;