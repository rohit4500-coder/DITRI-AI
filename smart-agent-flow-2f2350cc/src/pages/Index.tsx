import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChatMessage } from "@/components/ChatMessage";
import { FileUpload } from "@/components/FileUpload";
import { ConversationSidebar } from "@/components/ConversationSidebar";
import { supabase } from "@/integrations/supabase/client";
import { Send, Upload } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { VoiceChat } from "@/components/VoiceChat";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";

interface Message {
  role: "user" | "assistant";
  content: string;
  file_names?: string[];
}

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Check authentication
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load conversation messages
  useEffect(() => {
    if (currentConversationId) {
      loadMessages(currentConversationId);
    }
  }, [currentConversationId]);

  const loadMessages = async (conversationId: string) => {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading messages:", error);
      return;
    }

    const formattedMessages: Message[] = (data || []).map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
      file_names: msg.file_names || undefined,
    }));

    setMessages(formattedMessages);
  };

  const createNewConversation = async (firstMessage: string) => {
    if (!user) return null;

    const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? "..." : "");
    
    const { data, error } = await supabase
      .from("conversations")
      .insert({ user_id: user.id, title })
      .select()
      .single();

    if (error) {
      console.error("Error creating conversation:", error);
      return null;
    }

    return data.id;
  };

  const saveMessage = async (conversationId: string, role: "user" | "assistant", content: string, fileNames?: string[]) => {
    const { error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        role,
        content,
        file_names: fileNames || null,
      });

    if (error) {
      console.error("Error saving message:", error);
    }
  };

  const handleNewConversation = () => {
    setCurrentConversationId(null);
    setMessages([]);
    setInput("");
    setSelectedFiles([]);
  };

  const handleSelectConversation = (id: string) => {
    setCurrentConversationId(id);
  };

  const handleSend = async () => {
    if ((!input.trim() && selectedFiles.length === 0) || isLoading || !user) return;

    // Create conversation if this is the first message
    let conversationId = currentConversationId;
    if (!conversationId) {
      conversationId = await createNewConversation(input || "File upload");
      if (!conversationId) {
        toast({
          title: "Error",
          description: "Failed to create conversation",
          variant: "destructive",
        });
        return;
      }
      setCurrentConversationId(conversationId);
    }

    const fileNames = selectedFiles.map(f => f.name);
    const userMessage: Message = {
      role: "user",
      content: input || "Uploaded files",
      file_names: fileNames.length > 0 ? fileNames : undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    await saveMessage(conversationId, "user", userMessage.content, fileNames.length > 0 ? fileNames : undefined);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-agent", {
        body: {
          messages: [...messages, userMessage],
          files: selectedFiles.map((f) => f.name),
        },
      });

      if (error) throw error;

      const aiResponse = data?.response || "I apologize, but I couldn't generate a response.";
      const aiMessage: Message = {
        role: "assistant",
        content: aiResponse,
      };
      setMessages((prev) => [...prev, aiMessage]);
      await saveMessage(conversationId!, "assistant", aiResponse);
      setSelectedFiles([]);
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to get AI response",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 flex flex-col">
      <ConversationSidebar
        currentConversationId={currentConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
      />
      
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 justify-center">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6918252e75d83c1e1e1ee6bf/d901aa909_logo.png" 
                alt="DITRI Logo" 
                className="w-10 h-10 rounded-xl object-contain"
              />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-ai-gradient-start to-ai-gradient-end bg-clip-text text-transparent">
                DITRI AI ASSISTANT
              </h1>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto pb-4">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6918252e75d83c1e1e1ee6bf/d901aa909_logo.png" 
                alt="DITRI Logo" 
                className="w-20 h-20 rounded-2xl object-contain shadow-2xl shadow-glow/40 animate-pulse"
              />
              <div className="space-y-3">
                <h2 className="text-4xl font-bold bg-gradient-to-r from-ai-gradient-start to-ai-gradient-end bg-clip-text text-transparent">
                  Welcome to DITRI AI ASSISTANT
                </h2>
                <p className="text-muted-foreground text-lg max-w-md mx-auto">
                  Your intelligent assistant powered by Gemini 2.5 Flash
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                <button className="p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors text-left border border-border/50">
                  <p className="font-medium">📄 Analyze documents</p>
                  <p className="text-sm text-muted-foreground">Upload PDFs and get insights</p>
                </button>
                <button className="p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors text-left border border-border/50">
                  <p className="font-medium">💡 Answer questions</p>
                  <p className="text-sm text-muted-foreground">Get help with any topic</p>
                </button>
                <button className="p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors text-left border border-border/50">
                  <p className="font-medium">✍️ Generate content</p>
                  <p className="text-sm text-muted-foreground">Create text, summaries, and more</p>
                </button>
                <button className="p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors text-left border border-border/50">
                  <p className="font-medium">🔍 Search & research</p>
                  <p className="text-sm text-muted-foreground">Find information quickly</p>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message, index) => (
                <ChatMessage
                  key={index}
                  role={message.role}
                  content={message.content}
                  isStreaming={isLoading && index === messages.length - 1}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </main>

      {/* Input Area */}
      <div className="border-t border-border/50 backdrop-blur-sm bg-background/80 p-4">
        <div className="container mx-auto max-w-4xl">
          {selectedFiles.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {selectedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-3 py-1 bg-secondary rounded-full text-sm"
                >
                  <Upload className="h-3 w-3" />
                  <span>{file.name}</span>
                  <button
                    onClick={() =>
                      setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
                    }
                    className="hover:text-destructive"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2 items-end">
            <VoiceChat 
              onTranscript={(text) => setInput(prev => prev ? `${prev} ${text}` : text)}
            />
            <FileUpload
              onFileSelect={(files) =>
                setSelectedFiles((prev) => [...prev, ...files])
              }
              selectedFiles={selectedFiles}
              onRemoveFile={(index) =>
                setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
              }
            />
            <div className="flex-1">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask anything or upload files..."
                className="min-h-[60px] max-h-[200px] resize-none bg-secondary/50 border-border/50 focus:border-primary"
                disabled={isLoading}
              />
            </div>
            <Button
              onClick={handleSend}
              disabled={isLoading || (!input.trim() && selectedFiles.length === 0)}
              className="h-[60px] bg-gradient-to-r from-ai-gradient-start to-ai-gradient-end hover:opacity-90 transition-opacity"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
