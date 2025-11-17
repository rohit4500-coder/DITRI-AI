import { Upload } from "lucide-react";
import { Button } from "./ui/button";
import { useRef } from "react";

interface FileUploadProps {
  onFileSelect: (files: File[]) => void;
  selectedFiles: File[];
  onRemoveFile: (index: number) => void;
}

export const FileUpload = ({ onFileSelect }: FileUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      onFileSelect(files);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileInput}
        accept=".pdf,.jpg,.jpeg,.png,.mp3,.wav,.m4a,.doc,.docx,.txt"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => fileInputRef.current?.click()}
        className="h-[60px] w-[60px] border-border/50"
      >
        <Upload className="h-5 w-5" />
      </Button>
    </div>
  );
};
