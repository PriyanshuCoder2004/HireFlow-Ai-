import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  FileText, 
  Sparkles, 
  Copy, 
  Download, 
  Save,
  Loader2,
  Trash2,
  Clock,
  Building2,
  Briefcase,
  ChevronRight,
  FileCheck,
  Edit3,
  CheckCircle2
} from "lucide-react";
import { format, parseISO } from "date-fns";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function CoverLetterGeneratorPage() {
  const [resumes, setResumes] = useState([]);
  const [applications, setApplications] = useState([]);
  const [coverLetters, setCoverLetters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [selectedAppId, setSelectedAppId] = useState("");
  const [customNotes, setCustomNotes] = useState("");
  
  // Generated content state
  const [generatedContent, setGeneratedContent] = useState("");
  const [currentLetterId, setCurrentLetterId] = useState(null);
  const [isEdited, setIsEdited] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  
  // Delete confirmation
  const [deleteId, setDeleteId] = useState(null);
  
  // Ref for textarea
  const textareaRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Update counts when content changes
    const words = generatedContent.trim() ? generatedContent.trim().split(/\s+/).length : 0;
    const chars = generatedContent.length;
    setWordCount(words);
    setCharCount(chars);
  }, [generatedContent]);

  const fetchData = async () => {
    try {
      const [resumesRes, appsRes, lettersRes] = await Promise.all([
        axios.get(`${API}/resumes`),
        axios.get(`${API}/applications`),
        axios.get(`${API}/cover-letter`)
      ]);
      setResumes(resumesRes.data);
      setApplications(appsRes.data);
      setCoverLetters(lettersRes.data);
    } catch (error) {
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedResumeId) {
      toast.error("Please select a resume");
      return;
    }
    if (!selectedAppId) {
      toast.error("Please select a job application");
      return;
    }

    setGenerating(true);
    try {
      const response = await axios.post(`${API}/cover-letter/generate`, {
        resume_id: selectedResumeId,
        job_application_id: selectedAppId,
        customization_notes: customNotes || null
      });
      
      setGeneratedContent(response.data.content);
      setCurrentLetterId(response.data.id);
      setIsEdited(false);
      setCoverLetters([response.data, ...coverLetters]);
      toast.success("Cover letter generated!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to generate cover letter");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!currentLetterId || !isEdited) return;

    setSaving(true);
    try {
      const response = await axios.put(`${API}/cover-letter/${currentLetterId}`, {
        content: generatedContent
      });
      
      setCoverLetters(coverLetters.map(l => 
        l.id === currentLetterId ? response.data : l
      ));
      setIsEdited(false);
      toast.success("Cover letter saved!");
    } catch (error) {
      toast.error("Failed to save cover letter");
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedContent);
      toast.success("Copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy");
    }
  };

  const handleDownloadPDF = async () => {
    if (!currentLetterId) {
      toast.error("Please generate or select a cover letter first");
      return;
    }

    try {
      const response = await axios.get(`${API}/cover-letter/${currentLetterId}/pdf`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'Cover_Letter.pdf';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename=(.+)/);
        if (match) filename = match[1];
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success("PDF downloaded!");
    } catch (error) {
      toast.error("Failed to download PDF");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    try {
      await axios.delete(`${API}/cover-letter/${deleteId}`);
      setCoverLetters(coverLetters.filter(l => l.id !== deleteId));
      
      if (currentLetterId === deleteId) {
        setGeneratedContent("");
        setCurrentLetterId(null);
        setIsEdited(false);
      }
      
      toast.success("Cover letter deleted");
    } catch (error) {
      toast.error("Failed to delete");
    } finally {
      setDeleteId(null);
    }
  };

  const loadCoverLetter = (letter) => {
    setGeneratedContent(letter.content);
    setCurrentLetterId(letter.id);
    setIsEdited(false);
    
    // Try to set the dropdowns to match
    if (letter.resume_id) setSelectedResumeId(letter.resume_id);
    if (letter.job_application_id) setSelectedAppId(letter.job_application_id);
  };

  const handleContentChange = (value) => {
    setGeneratedContent(value);
    setIsEdited(true);
  };

  const getSelectedApp = () => applications.find(a => a.id === selectedAppId);

  if (loading) {
    return (
      <div className="space-y-6" data-testid="cover-letter-loading">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-[500px]" />
          <Skeleton className="h-[500px] lg:col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="cover-letter-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <FileText className="h-6 w-6" />
          Cover Letter Generator
        </h1>
        <p className="text-muted-foreground">
          Create ATS-friendly cover letters powered by AI
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Selection & History */}
        <div className="space-y-6">
          {/* Selection Panel */}
          <Card className="border-border/50" data-testid="selection-panel">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Generate New
              </CardTitle>
              <CardDescription>
                Select a resume and job application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Resume Selector */}
              <div className="space-y-2">
                <Label>Resume *</Label>
                <Select value={selectedResumeId} onValueChange={setSelectedResumeId}>
                  <SelectTrigger data-testid="resume-select">
                    <SelectValue placeholder="Select a resume" />
                  </SelectTrigger>
                  <SelectContent>
                    {resumes.length === 0 ? (
                      <SelectItem value="none" disabled>No resumes available</SelectItem>
                    ) : (
                      resumes.map(resume => (
                        <SelectItem key={resume.id} value={resume.id}>
                          <div className="flex items-center gap-2">
                            <FileCheck className="h-4 w-4" />
                            {resume.title}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Job Application Selector */}
              <div className="space-y-2">
                <Label>Job Application *</Label>
                <Select value={selectedAppId} onValueChange={setSelectedAppId}>
                  <SelectTrigger data-testid="application-select">
                    <SelectValue placeholder="Select a job application" />
                  </SelectTrigger>
                  <SelectContent>
                    {applications.length === 0 ? (
                      <SelectItem value="none" disabled>No applications available</SelectItem>
                    ) : (
                      applications.map(app => (
                        <SelectItem key={app.id} value={app.id}>
                          <div className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4" />
                            {app.position} @ {app.company}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Show selected job details */}
              {selectedAppId && getSelectedApp() && (
                <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                  <div className="flex items-center gap-2 font-medium">
                    <Building2 className="h-4 w-4" />
                    {getSelectedApp().company}
                  </div>
                  <div className="text-muted-foreground">
                    {getSelectedApp().position}
                  </div>
                </div>
              )}

              {/* Customization Notes */}
              <div className="space-y-2">
                <Label>Customization Notes (Optional)</Label>
                <Textarea
                  placeholder="Add any specific points you want to emphasize..."
                  rows={3}
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  data-testid="custom-notes-input"
                />
              </div>

              {/* Generate Button */}
              <Button 
                onClick={handleGenerate} 
                disabled={generating || !selectedResumeId || !selectedAppId}
                className="w-full"
                data-testid="generate-btn"
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Cover Letter
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* History Panel */}
          <Card className="border-border/50" data-testid="history-panel">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Saved Cover Letters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] pr-4">
                {coverLetters.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No saved cover letters</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {coverLetters.map(letter => (
                      <div 
                        key={letter.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          currentLetterId === letter.id 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border/50 hover:border-primary/30 hover:bg-muted/50'
                        }`}
                        onClick={() => loadCoverLetter(letter)}
                        data-testid={`history-item-${letter.id}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {letter.position}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {letter.company_name}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {letter.word_count} words
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {format(parseISO(letter.created_at), "MMM d")}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {currentLetterId === letter.id && (
                              <CheckCircle2 className="h-4 w-4 text-primary" />
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteId(letter.id);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Editor */}
        <Card className="lg:col-span-2 border-border/50" data-testid="editor-panel">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Edit3 className="h-5 w-5" />
                  Cover Letter Editor
                  {isEdited && (
                    <Badge variant="secondary" className="ml-2">Unsaved changes</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Edit and customize your cover letter
                </CardDescription>
              </div>
              
              {/* Stats */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{wordCount} words</span>
                <span>{charCount} characters</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Editor Area */}
            <div className="relative">
              <Textarea
                ref={textareaRef}
                placeholder={generating ? "Generating your cover letter..." : "Your cover letter will appear here..."}
                className="min-h-[400px] resize-none font-mono text-sm leading-relaxed"
                value={generatedContent}
                onChange={(e) => handleContentChange(e.target.value)}
                disabled={generating}
                data-testid="cover-letter-editor"
              />
              {generating && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-md">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Crafting your cover letter...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Word count indicator */}
            {generatedContent && (
              <div className="flex items-center gap-2">
                {wordCount >= 250 && wordCount <= 400 ? (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Optimal length
                  </Badge>
                ) : wordCount < 250 ? (
                  <Badge variant="secondary">
                    Consider adding more content ({250 - wordCount} more words recommended)
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    Consider shortening ({wordCount - 400} words over recommended)
                  </Badge>
                )}
              </div>
            )}

            <Separator />

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleSave}
                disabled={!isEdited || saving || !currentLetterId}
                data-testid="save-btn"
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Changes
              </Button>

              <Button
                variant="outline"
                onClick={handleCopy}
                disabled={!generatedContent}
                data-testid="copy-btn"
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy to Clipboard
              </Button>

              <Button
                variant="outline"
                onClick={handleDownloadPDF}
                disabled={!currentLetterId}
                data-testid="download-pdf-btn"
              >
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Cover Letter?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The cover letter will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-destructive hover:bg-destructive/90"
              data-testid="confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
