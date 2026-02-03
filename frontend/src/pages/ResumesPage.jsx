import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Plus, 
  FileText, 
  Sparkles, 
  Trash2, 
  Eye,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Upload,
  FileUp,
  File,
  X,
  Scan,
  AlertTriangle,
  ImageIcon
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ResumesPage() {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [selectedResume, setSelectedResume] = useState(null);
  const [analyzing, setAnalyzing] = useState(null);
  const [activeTab, setActiveTab] = useState("upload");
  const [formData, setFormData] = useState({ title: "", content: "" });
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchResumes();
  }, []);

  const fetchResumes = async () => {
    try {
      const response = await axios.get(`${API}/resumes`);
      setResumes(response.data);
    } catch (error) {
      toast.error("Failed to fetch resumes");
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type - now supports images for OCR
      const validTypes = [
        'application/pdf', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/png',
        'image/jpeg',
        'image/jpg'
      ];
      const validExtensions = ['pdf', 'docx', 'png', 'jpg', 'jpeg'];
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      
      if (!validTypes.includes(file.type) && !validExtensions.includes(fileExt)) {
        toast.error("Please upload a PDF, DOCX, or image file (PNG/JPG)");
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      
      setSelectedFile(file);
      // Auto-fill title from filename (without extension)
      if (!formData.title) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
        setFormData({ ...formData, title: nameWithoutExt });
      }
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a file to upload");
      return;
    }
    if (!formData.title.trim()) {
      toast.error("Please enter a title for your resume");
      return;
    }

    setUploading(true);
    try {
      const formDataObj = new FormData();
      formDataObj.append("file", selectedFile);
      formDataObj.append("title", formData.title);

      const response = await axios.post(`${API}/resumes/upload`, formDataObj, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      
      setResumes([response.data, ...resumes]);
      setCreateOpen(false);
      resetForm();
      
      // Show appropriate message based on extraction method
      if (response.data.ocr_used) {
        toast.success("Resume uploaded! We used advanced OCR to read your document.", {
          description: response.data.extraction_status === "partial" 
            ? "Some text may be imperfect. Consider uploading an ATS-friendly format."
            : "Text extracted successfully using OCR.",
          duration: 5000
        });
      } else {
        toast.success("Resume uploaded successfully! Text has been extracted.");
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.detail || "Failed to upload resume");
    } finally {
      setUploading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setSubmitting(true);
    try {
      const response = await axios.post(`${API}/resumes`, formData);
      setResumes([response.data, ...resumes]);
      setCreateOpen(false);
      resetForm();
      toast.success("Resume created successfully");
    } catch (error) {
      toast.error("Failed to create resume");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAnalyze = async (resumeId) => {
    setAnalyzing(resumeId);
    try {
      const response = await axios.post(`${API}/resumes/${resumeId}/analyze`);
      setResumes(resumes.map(r => r.id === resumeId ? response.data : r));
      toast.success("Resume analyzed successfully");
    } catch (error) {
      toast.error("Failed to analyze resume");
    } finally {
      setAnalyzing(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    try {
      await axios.delete(`${API}/resumes/${deleteId}`);
      setResumes(resumes.filter(r => r.id !== deleteId));
      toast.success("Resume deleted");
    } catch (error) {
      toast.error("Failed to delete resume");
    } finally {
      setDeleteId(null);
    }
  };

  const resetForm = () => {
    setFormData({ title: "", content: "" });
    setSelectedFile(null);
    setActiveTab("upload");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  const getFileTypeIcon = (fileType) => {
    if (fileType === "pdf") return "📄";
    if (fileType === "docx" || fileType === "doc") return "📝";
    return "📃";
  };

  if (loading) {
    return (
      <div className="space-y-6" data-testid="resumes-loading">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
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
    <div className="space-y-6" data-testid="resumes-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Resumes</h1>
          <p className="text-muted-foreground">Upload and analyze your resumes with AI</p>
        </div>
        
        <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="add-resume-btn">
              <Plus className="mr-2 h-4 w-4" />
              Add Resume
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Resume</DialogTitle>
              <DialogDescription>
                Upload a PDF/DOCX file or paste your resume content
              </DialogDescription>
            </DialogHeader>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload" data-testid="upload-tab">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload File
                </TabsTrigger>
                <TabsTrigger value="paste" data-testid="paste-tab">
                  <FileText className="mr-2 h-4 w-4" />
                  Paste Text
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="upload" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="upload-title">Resume Title</Label>
                  <Input
                    id="upload-title"
                    placeholder="e.g., Software Engineer Resume"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    data-testid="upload-resume-title-input"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Resume File (PDF, DOCX, or Image)</Label>
                  <div 
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      selectedFile ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                    }`}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const file = e.dataTransfer.files?.[0];
                      if (file) {
                        const input = fileInputRef.current;
                        if (input) {
                          const dt = new DataTransfer();
                          dt.items.add(file);
                          input.files = dt.files;
                          handleFileSelect({ target: { files: dt.files } });
                        }
                      }
                    }}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,.png,.jpg,.jpeg,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="resume-file-input"
                      data-testid="resume-file-input"
                    />
                    
                    {selectedFile ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-14 w-14 rounded-lg bg-primary/10 flex items-center justify-center">
                          <File className="h-7 w-7 text-primary" />
                        </div>
                        <div className="text-center">
                          <p className="font-medium">{selectedFile.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(selectedFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedFile(null);
                            if (fileInputRef.current) fileInputRef.current.value = "";
                          }}
                          data-testid="remove-file-btn"
                        >
                          <X className="mr-2 h-4 w-4" />
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <label htmlFor="resume-file-input" className="cursor-pointer">
                        <div className="flex flex-col items-center gap-3">
                          <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center">
                            <FileUp className="h-7 w-7 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium">Drop your resume here or click to browse</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Supports PDF, DOCX, PNG, JPG (max 10MB)
                            </p>
                            <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
                              <Scan className="h-3 w-3" />
                              Scanned documents supported via OCR
                            </p>
                          </div>
                        </div>
                      </label>
                    )}
                  </div>
                </div>
                
                <Button 
                  onClick={handleFileUpload} 
                  disabled={uploading || !selectedFile} 
                  className="w-full"
                  data-testid="upload-resume-submit"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing (OCR if needed)...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Resume
                    </>
                  )}
                </Button>
              </TabsContent>
              
              <TabsContent value="paste" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="paste-title">Resume Title</Label>
                  <Input
                    id="paste-title"
                    placeholder="e.g., Software Engineer Resume"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    data-testid="resume-title-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">Resume Content</Label>
                  <Textarea
                    id="content"
                    placeholder="Paste your resume text here..."
                    rows={12}
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    data-testid="resume-content-input"
                  />
                </div>
                <Button 
                  onClick={handleCreate} 
                  disabled={submitting} 
                  className="w-full"
                  data-testid="create-resume-submit"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Resume"
                  )}
                </Button>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {/* Resumes Grid */}
      {resumes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resumes.map((resume) => (
            <Card key={resume.id} className="border-border/50 hover:border-primary/30 transition-colors" data-testid={`resume-card-${resume.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      {resume.file_type ? (
                        <span className="text-lg">{getFileTypeIcon(resume.file_type)}</span>
                      ) : (
                        <FileText className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-base">{resume.title}</CardTitle>
                      <CardDescription className="text-xs">
                        {resume.file_name ? (
                          <span className="flex items-center gap-1">
                            <File className="h-3 w-3" />
                            {resume.file_name}
                          </span>
                        ) : (
                          formatDate(resume.created_at)
                        )}
                      </CardDescription>
                    </div>
                  </div>
                  {resume.score && (
                    <Badge variant="outline" className={getScoreColor(resume.score)}>
                      {resume.score}/100
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {resume.analysis ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Score</span>
                      <span className={`font-medium ${getScoreColor(resume.score)}`}>
                        {resume.score}/100
                      </span>
                    </div>
                    <Progress value={resume.score} className="h-2" />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Not analyzed yet. Click analyze to get AI feedback.
                  </p>
                )}
                
                {/* Extraction method indicator */}
                {resume.file_type && (
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      {resume.ocr_used ? (
                        <>
                          <Scan className="h-3 w-3 text-blue-500" />
                          <span>OCR extracted from {resume.file_type.toUpperCase()}</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                          <span>Parsed from {resume.file_type.toUpperCase()}</span>
                        </>
                      )}
                    </div>
                    {resume.extraction_status === "partial" && (
                      <div className="text-xs text-yellow-600 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Partial extraction - some text may be missing</span>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSelectedResume(resume);
                      setViewOpen(true);
                    }}
                    data-testid={`view-resume-${resume.id}`}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    View
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => handleAnalyze(resume.id)}
                    disabled={analyzing === resume.id}
                    data-testid={`analyze-resume-${resume.id}`}
                  >
                    {analyzing === resume.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    {resume.analysis ? "Re-analyze" : "Analyze"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteId(resume.id)}
                    className="text-destructive hover:text-destructive"
                    data-testid={`delete-resume-${resume.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-border/50 border-dashed" data-testid="no-resumes">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileUp className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No resumes yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Upload a PDF/DOCX file or paste your resume to get AI-powered analysis
            </p>
            <Button onClick={() => setCreateOpen(true)} data-testid="add-first-resume-btn">
              <Plus className="mr-2 h-4 w-4" />
              Add Resume
            </Button>
          </CardContent>
        </Card>
      )}

      {/* View Resume Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedResume?.title}
            </DialogTitle>
            {selectedResume?.file_name && (
              <DialogDescription className="flex items-center gap-2">
                <File className="h-3 w-3" />
                Uploaded from: {selectedResume.file_name}
                {selectedResume.ocr_used && (
                  <Badge variant="secondary" className="text-xs ml-2">
                    <Scan className="h-3 w-3 mr-1" />
                    OCR Processed
                  </Badge>
                )}
              </DialogDescription>
            )}
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            <div className="space-y-6 pr-4">
              {/* Extraction Info Banner */}
              {selectedResume?.ocr_used && (
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <div className="flex items-start gap-2">
                    <Scan className="h-4 w-4 text-blue-500 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-600">Advanced OCR Used</p>
                      <p className="text-muted-foreground text-xs">
                        {selectedResume.extraction_status === "partial" 
                          ? "Some text may be imperfect due to image quality. For best results, use an ATS-friendly PDF or DOCX."
                          : "We used advanced OCR to read your scanned document."}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {selectedResume?.analysis && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Overall Score</p>
                      <p className={`text-3xl font-bold ${getScoreColor(selectedResume.score)}`}>
                        {selectedResume.score}/100
                      </p>
                    </div>
                    <Progress value={selectedResume.score} className="w-32 h-3" />
                  </div>
                  
                  {selectedResume.analysis.strengths?.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Strengths
                      </h4>
                      <ul className="space-y-1">
                        {selectedResume.analysis.strengths.map((s, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-green-500 mt-1">•</span>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {selectedResume.analysis.improvements?.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                        Areas for Improvement
                      </h4>
                      <ul className="space-y-1">
                        {selectedResume.analysis.improvements.map((s, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-yellow-500 mt-1">•</span>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {selectedResume.analysis.formatting_tips?.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-blue-500" />
                        Formatting Tips
                      </h4>
                      <ul className="space-y-1">
                        {selectedResume.analysis.formatting_tips.map((s, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-blue-500 mt-1">•</span>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              
              <div className="space-y-2">
                <h4 className="font-semibold">Extracted Resume Content</h4>
                <div className="p-4 rounded-lg bg-muted/50 text-sm whitespace-pre-wrap font-mono">
                  {selectedResume?.content}
                </div>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Resume?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the resume and its analysis.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90" data-testid="confirm-delete-resume">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
