import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

export const ChatMessage = ({ role, content, isStreaming }: ChatMessageProps) => {
  const isUser = role === "user";

  return (
    <div
      className={cn(
        "flex gap-4 p-6 rounded-xl animate-in fade-in slide-in-from-bottom-2 duration-500",
        isUser ? "bg-message-user/10 ml-8" : "bg-message-ai mr-8"
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
          isUser
            ? "bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/20"
            : "bg-secondary"
        )}
      >
        {isUser ? (
          <User className="h-5 w-5 text-primary-foreground" />
        ) : (
          <Bot className="h-5 w-5 text-foreground" />
        )}
      </div>
      <div className="flex-1 space-y-2">
        <p className="text-sm font-medium text-foreground/80">
          {isUser ? "You" : "AI Agent"}
        </p>
        <div className="prose prose-invert max-w-none text-foreground prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-code:text-accent prose-code:bg-secondary prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-secondary prose-pre:border prose-pre:border-border prose-a:text-accent hover:prose-a:text-accent/80 prose-li:text-foreground prose-ul:text-foreground prose-ol:text-foreground">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content}
          </ReactMarkdown>
          {isStreaming && (
            <span className="inline-block w-2 h-4 ml-1 bg-primary animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
};
