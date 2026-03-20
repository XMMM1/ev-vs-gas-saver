import { useState } from "react";
import { MessageSquarePlus, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

const proposalSchema = z.object({
  name: z.string().trim().max(100).optional(),
  email: z.string().trim().email("Invalid email").max(255).optional().or(z.literal("")),
  message: z.string().trim().min(1, "Message is required").max(2000, "Max 2000 characters"),
});

const ProposalFab = () => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const parsed = proposalSchema.safeParse({ name: name || undefined, email: email || "", message });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Invalid input");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from("proposals").insert({
        name: name.trim() || null,
        email: email.trim() || null,
        message: message.trim(),
      });
      if (error) throw error;
      toast.success("Thank you for your feedback!");
      setName("");
      setEmail("");
      setMessage("");
      setOpen(false);
    } catch (e: any) {
      toast.error("Failed to submit. Please try again.");
      console.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="icon"
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg"
      >
        <MessageSquarePlus className="w-6 h-6" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send a Proposal</DialogTitle>
            <DialogDescription>Share your ideas, suggestions, or feedback with us.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="proposal-name">Name (optional)</Label>
              <Input id="proposal-name" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
            </div>
            <div>
              <Label htmlFor="proposal-email">Email (optional)</Label>
              <Input id="proposal-email" type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} />
            </div>
            <div>
              <Label htmlFor="proposal-message">Message *</Label>
              <Textarea id="proposal-message" placeholder="Your idea or suggestion..." value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} rows={4} />
              <p className="text-[10px] text-muted-foreground text-right mt-1">{message.length}/2000</p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSubmit} disabled={!message.trim() || loading} className="gap-1.5 w-full sm:w-auto">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : <><Send className="w-4 h-4" /> Submit</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProposalFab;
