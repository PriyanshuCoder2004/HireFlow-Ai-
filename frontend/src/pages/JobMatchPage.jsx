import { useState, useEffect } from "react";
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
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  Target, 
  FileText,
  Sparkles,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Lightbulb,
  TrendingUp,
  Search,
  Trash2,
  Eye,
  Clock,
  Building2,
  Briefcase,
  ChevronRight
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function JobMatchPage() {
  const [resumes, setResumes] = useState([]);
  const [matchHistory, setMatchHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [formData, setFormData] = useState({
    resume_id: "",
    job_title: "",
    company_name: "",
    job_description: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [resumesRes, historyRes] = await Promise.all([
        axios.get(`${API}/resumes`),
        axios.get(`${API}/match/history`)
      ]);
      setResumes(resumesRes.data);
      setMatchHistory(historyRes.data);
    } catch (error) {
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!formData.resume_id) {
      toast.error("Please select a resume");
      return;
    }
    if (!formData.job_description.trim()) {
      toast.error("Please enter a job description");
      return;
    }

    setAnalyzing(true);
    try {
      const response = await axios.post(`${API}/match/analyze`, formData);
      setMatchHistory([response.data, ...matchHistory]);
      setSelectedMatch(response.data);
      setViewOpen(true);
      toast.success("Analysis complete!");
      // Reset form
      setFormData({ ...formData, job_title: "", company_name: "", job_description: "" });
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.detail || "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await axios.delete(`${API}/match/${deleteId}`);
      setMatchHistory(matchHistory.filter(m => m.id !== deleteId));
      toast.success("Analysis deleted");
    } catch (error) {
      toast.error("Failed to delete analysis");
    } finally {
      setDeleteId(null);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    if (score >= 40) return "text-orange-500";
    return "text-red-500";
  };

  const getScoreBg = (score) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    if (score >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return "Excellent Match";
    if (score >= 60) return "Good Match";
    if (score >= 40) return "Fair Match";
    return "Needs Improvement";
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (loading) {
    return (
      <div className="space-y-6" data-testid="job-match-loading">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="job-match-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Job Match Analysis</h1>
        <p className="text-muted-foreground">
          Compare your resume against job descriptions for targeted improvements
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Analysis Form */}
        <Card className="border-border/50" data-testid="analysis-form-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              New Analysis
            </CardTitle>
            <CardDescription>
              Select a resume and paste a job description to analyze compatibility
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="resume">Select Resume *</Label>
              <Select 
                value={formData.resume_id} 
                onValueChange={(v) => setFormData({ ...formData, resume_id: v })}
              >
                <SelectTrigger data-testid="select-resume">
                  <SelectValue placeholder="Choose a resume" />
                </SelectTrigger>
                <SelectContent>
                  {resumes.length === 0 ? (
                    <SelectItem value="" disabled>No resumes available</SelectItem>
                  ) : (
                    resumes.map(r => (
                      <SelectItem key={r.id} value={r.id}>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          {r.title}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="job_title">Job Title</Label>
                <Input
                  id="job_title"
                  placeholder="e.g., Senior Software Engineer"
                  value={formData.job_title}
                  onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                  data-testid="job-title-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  placeholder="e.g., Google"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  data-testid="company-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="jd">Job Description *</Label>
              <Textarea
                id="jd"
                placeholder="Paste the complete job description here for comprehensive analysis..."
                rows={10}
                value={formData.job_description}
                onChange={(e) => setFormData({ ...formData, job_description: e.target.value })}
                data-testid="job-description-input"
              />
            </div>

            <Button 
              onClick={handleAnalyze} 
              disabled={analyzing || !formData.resume_id || !formData.job_description}
              className="w-full"
              data-testid="analyze-btn"
            >
              {analyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing Match...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Analyze Job Match
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Analysis History */}
        <Card className="border-border/50" data-testid="history-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Analysis History
            </CardTitle>
            <CardDescription>
              Your previous job match analyses
            </CardDescription>
          </CardHeader>
          <CardContent>
            {matchHistory.length > 0 ? (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {matchHistory.map((match) => {
                    const resume = resumes.find(r => r.id === match.resume_id);
                    return (
                      <div 
                        key={match.id} 
                        className="p-4 rounded-lg border border-border/50 hover:border-primary/30 transition-colors cursor-pointer"
                        onClick={() => { setSelectedMatch(match); setViewOpen(true); }}
                        data-testid={`history-item-${match.id}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium truncate">
                                {match.job_title || "Job Analysis"}
                              </h4>
                              {match.company_name && (
                                <Badge variant="outline" className="text-xs">
                                  {match.company_name}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {resume?.title || "Resume"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDate(match.created_at)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={`text-2xl font-bold ${getScoreColor(match.analysis.match_score)}`}>
                              {match.analysis.match_score}%
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => { e.stopPropagation(); setDeleteId(match.id); }}
                              data-testid={`delete-history-${match.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No analyses yet</p>
                <p className="text-sm">Run your first job match analysis</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* View Analysis Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Target className="h-5 w-5 text-primary" />
              Job Match Analysis
              {selectedMatch?.job_title && (
                <span className="text-muted-foreground font-normal">
                  — {selectedMatch.job_title}
                </span>
              )}
            </DialogTitle>
            {selectedMatch?.company_name && (
              <DialogDescription className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {selectedMatch.company_name}
              </DialogDescription>
            )}
          </DialogHeader>
          
          <ScrollArea className="max-h-[70vh] pr-4">
            {selectedMatch && (
              <div className="space-y-6">
                {/* Score Overview */}
                <div className="flex items-center gap-6 p-6 rounded-xl bg-muted/50">
                  <div className="relative">
                    <div className={`h-24 w-24 rounded-full flex items-center justify-center ${getScoreBg(selectedMatch.analysis.match_score)}/20 border-4 ${getScoreBg(selectedMatch.analysis.match_score)}/50`}>
                      <span className={`text-3xl font-bold ${getScoreColor(selectedMatch.analysis.match_score)}`}>
                        {selectedMatch.analysis.match_score}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className={`text-xl font-semibold ${getScoreColor(selectedMatch.analysis.match_score)}`}>
                      {getScoreLabel(selectedMatch.analysis.match_score)}
                    </h3>
                    <p className="text-muted-foreground mt-1">
                      {selectedMatch.analysis.summary}
                    </p>
                  </div>
                </div>

                {/* Skill Match */}
                {selectedMatch.analysis.skill_match && (
                  <Card className="border-border/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        Skill Match Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {selectedMatch.analysis.skill_match.matched_skills?.length > 0 && (
                        <div>
                          <Label className="text-green-500 flex items-center gap-1 mb-2">
                            <CheckCircle2 className="h-4 w-4" />
                            Matched Skills
                          </Label>
                          <div className="flex flex-wrap gap-2">
                            {selectedMatch.analysis.skill_match.matched_skills.map((skill, i) => (
                              <Badge key={i} variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {selectedMatch.analysis.skill_match.partial_match?.length > 0 && (
                        <div>
                          <Label className="text-yellow-500 flex items-center gap-1 mb-2">
                            <AlertCircle className="h-4 w-4" />
                            Partial Match
                          </Label>
                          <div className="flex flex-wrap gap-2">
                            {selectedMatch.analysis.skill_match.partial_match.map((skill, i) => (
                              <Badge key={i} variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {selectedMatch.analysis.skill_match.missing_skills?.length > 0 && (
                        <div>
                          <Label className="text-red-500 flex items-center gap-1 mb-2">
                            <XCircle className="h-4 w-4" />
                            Missing Skills
                          </Label>
                          <div className="flex flex-wrap gap-2">
                            {selectedMatch.analysis.skill_match.missing_skills.map((skill, i) => (
                              <Badge key={i} variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Experience Match */}
                {selectedMatch.analysis.experience_match && (
                  <Card className="border-border/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-primary" />
                        Experience Match
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 mb-3">
                        <div className="flex-1">
                          <Progress value={selectedMatch.analysis.experience_match.score} className="h-2" />
                        </div>
                        <span className={`font-bold ${getScoreColor(selectedMatch.analysis.experience_match.score)}`}>
                          {selectedMatch.analysis.experience_match.score}%
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {selectedMatch.analysis.experience_match.analysis}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Accordion Sections */}
                <Accordion type="multiple" defaultValue={["strengths", "suggestions"]} className="space-y-2">
                  {/* Strengths */}
                  {selectedMatch.analysis.strengths?.length > 0 && (
                    <AccordionItem value="strengths" className="border rounded-lg px-4">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span>Your Strengths ({selectedMatch.analysis.strengths.length})</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <ul className="space-y-2">
                          {selectedMatch.analysis.strengths.map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {/* Missing Skills */}
                  {selectedMatch.analysis.missing_skills?.length > 0 && (
                    <AccordionItem value="missing" className="border rounded-lg px-4">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-red-500" />
                          <span>Missing Skills ({selectedMatch.analysis.missing_skills.length})</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <ul className="space-y-2">
                          {selectedMatch.analysis.missing_skills.map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {/* Weak Areas */}
                  {selectedMatch.analysis.weak_areas?.length > 0 && (
                    <AccordionItem value="weak" className="border rounded-lg px-4">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-yellow-500" />
                          <span>Areas to Strengthen ({selectedMatch.analysis.weak_areas.length})</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <ul className="space-y-2">
                          {selectedMatch.analysis.weak_areas.map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {/* Suggestions */}
                  {selectedMatch.analysis.suggestions?.length > 0 && (
                    <AccordionItem value="suggestions" className="border rounded-lg px-4">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2">
                          <Lightbulb className="h-4 w-4 text-blue-500" />
                          <span>Actionable Suggestions ({selectedMatch.analysis.suggestions.length})</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <ul className="space-y-2">
                          {selectedMatch.analysis.suggestions.map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <ChevronRight className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {/* Keyword Analysis */}
                  {selectedMatch.analysis.keyword_analysis && (
                    <AccordionItem value="keywords" className="border rounded-lg px-4">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2">
                          <Search className="h-4 w-4 text-purple-500" />
                          <span>Keyword Analysis</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4">
                        {selectedMatch.analysis.keyword_analysis.found?.length > 0 && (
                          <div>
                            <Label className="text-sm text-green-500 mb-2 block">Keywords Found</Label>
                            <div className="flex flex-wrap gap-1">
                              {selectedMatch.analysis.keyword_analysis.found.map((kw, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {kw}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {selectedMatch.analysis.keyword_analysis.missing?.length > 0 && (
                          <div>
                            <Label className="text-sm text-red-500 mb-2 block">Keywords to Add</Label>
                            <div className="flex flex-wrap gap-1">
                              {selectedMatch.analysis.keyword_analysis.missing.map((kw, i) => (
                                <Badge key={i} variant="outline" className="text-xs border-red-500/30 text-red-500">
                                  {kw}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {selectedMatch.analysis.keyword_analysis.recommendation && (
                          <p className="text-sm text-muted-foreground italic">
                            {selectedMatch.analysis.keyword_analysis.recommendation}
                          </p>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  )}
                </Accordion>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Analysis?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90" data-testid="confirm-delete-match">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
