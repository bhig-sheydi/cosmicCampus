import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const FactCheckModal = ({ open, onClose, result, onApplyCorrection, onBringUpToSpeed   }) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl rounded-2xl border border-purple-200 shadow-lg bg-white dark:bg-zinc-900">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-purple-700 flex items-center gap-2">
            🧠 Fact-Check Result
            <Badge variant="outline" className="text-purple-800 border-purple-300 bg-purple-50">
              AI Verified
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[300px] mt-2">
          <div className="text-gray-800 dark:text-gray-100 whitespace-pre-wrap leading-relaxed font-medium">
            {result}
          </div>
        </ScrollArea>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            ❌ Close
          </Button>
<Button
  className="bg-purple-700 text-white hover:bg-purple-800"
  onClick={onBringUpToSpeed}
>
  🪄 Bring Up to Speed
</Button>


        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FactCheckModal;
