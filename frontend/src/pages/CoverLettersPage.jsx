import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Plus, 
  Mail,
  Sparkles,
  Trash2, 
  Eye,
  Copy,
  Loader2,
  Building2
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function CoverLettersPage() {
  const [letters, setLetters] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [selectedLetter, setSelectedLetter] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [formData, setFormData] = useState({
    company_name: "",
    position: "",
    job_description: "",
    resume_id: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [lettersRes, resumesRes] = await Promise.all([
        axios.get(`${API}/cover-letters`),
        axios.get(`${API}/resumes`)
      ]);
      setLetters(lettersRes.data);
      setResumes(resumesRes.data);
    } catch (error) {
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!formData.company_name.trim() || !formData.position.trim() || !formData.job_description.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setGenerating(true);
    try {
      const response = await axios.post(`${API}/cover-letters/generate`, formData);
      setLetters([response.data, ...letters]);
      setGenerateOpen(false);
      setFormData({ company_name: "", position: "", job_description: "", resume_id: "" });
      toast.success("Cover letter generated!");
    } catch (error) {
      toast.error("Failed to generate cover letter");
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    try {
      await axios.delete(`${API}/cover-letters/${deleteId}`);
      setLetters(letters.filter(l => l.id !== deleteId));
      toast.success("Cover letter deleted");
    } catch (error) {
      toast.error("Failed to delete cover letter");
    } finally {
      setDeleteId(null);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  if (loading) {
    return (
      <div className="space-y-6" data-testid="cover-letters-loading">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="cover-letters-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cover Letters</h1>
          <p className="text-muted-foreground">Generate AI-powered cover letters</p>
        </div>
        
        <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="generate-cover-letter-btn">
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Cover Letter
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Generate Cover Letter
              </DialogTitle>
              <DialogDescription>
                Let AI create a tailored cover letter for you
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company">Company Name *</Label>
                  <Input
                    id="company"
                    placeholder="e.g., Google"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    data-testid="cl-company-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Position *</Label>
                  <Input
                    id="position"
                    placeholder="e.g., Software Engineer"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    data-testid="cl-position-input"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="resume">Use Resume (Optional)</Label>
                <Select 
                  value={formData.resume_id} 
                  onValueChange={(v) => setFormData({ ...formData, resume_id: v })}
                >
                  <SelectTrigger data-testid="cl-resume-select">
                    <SelectValue placeholder="Select a resume" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No resume</SelectItem>
                    {resumes.map(r => (
                      <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="jd">Job Description *</Label>
                <Textarea
                  id="jd"
                  placeholder="Paste the job description here..."
                  rows={6}
                  value={formData.job_description}
                  onChange={(e) => setFormData({ ...formData, job_description: e.target.value })}
                  data-testid="cl-jd-input"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setGenerateOpen(false)}>Cancel</Button>
              <Button onClick={handleGenerate} disabled={generating} data-testid="generate-cl-submit">
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cover Letters Grid */}
      {letters.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {letters.map((letter) => (
            <Card key={letter.id} className="border-border/50 hover:border-primary/30 transition-colors" data-testid={`cover-letter-card-${letter.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{letter.company_name}</CardTitle>
                      <CardDescription className="text-xs">
                        {letter.position}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {letter.content}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(letter.created_at)}
                </p>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSelectedLetter(letter);
                      setViewOpen(true);
                    }}
                    data-testid={`view-cl-${letter.id}`}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => copyToClipboard(letter.content)}
                    data-testid={`copy-cl-${letter.id}`}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteId(letter.id)}
                    className="text-destructive hover:text-destructive"
                    data-testid={`delete-cl-${letter.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-border/50 border-dashed" data-testid="no-cover-letters">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Mail className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No cover letters yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Generate your first AI-powered cover letter
            </p>
            <Button onClick={() => setGenerateOpen(true)} data-testid="generate-first-cl-btn">
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Cover Letter
            </Button>
          </CardContent>
        </Card>
      )}

      {/* View Cover Letter Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Cover Letter for {selectedLetter?.company_name}
            </DialogTitle>
            <DialogDescription>
              {selectedLetter?.position}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="p-4 rounded-lg bg-muted/50 whitespace-pre-wrap text-sm leading-relaxed">
              {selectedLetter?.content}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewOpen(false)}>Close</Button>
            <Button onClick={() => selectedLetter && copyToClipboard(selectedLetter.content)}>
              <Copy className="mr-2 h-4 w-4" />
              Copy to Clipboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Cover Letter?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90" data-testid="confirm-delete-cl">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
