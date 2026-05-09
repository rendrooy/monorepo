import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

interface DownloadDialogProps {
  open: boolean;
}

export default function DownloadDialog({ open }: DownloadDialogProps) {
  return (
    <Dialog open={open}>
      <DialogContent hideCloseButton className="sm:max-w-sm text-center">
        <DialogHeader>
          <DialogTitle>Proses Download File</DialogTitle>
          <DialogDescription>
            Mohon menunggu proses download hingga selesai
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center py-6">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
