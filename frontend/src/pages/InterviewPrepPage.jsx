import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  GraduationCap,
  FileText,
  Briefcase,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  MessageSquare,
  Code,
  Users,
  Target,
  Clock,
  Trash2,
  RefreshCw,
  BookOpen,
  HelpCircle,
  Building2,
  ChevronRight,
  Star
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const difficultyColors = {
  easy: "bg-green-500/10 text-green-600 border-green-500/30",
  medium: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
  hard: "bg-red-500/10 text-red-600 border-red-500/30"
};

const categoryIcons = {
  hr_behavioral: Users,
  technical: Code,
  scenario: Target
};

const categoryLabels = {
  hr_behavioral: "HR & Behavioral",
  technical: "Technical",
  scenario: "Scenario-Based"
};

export default function InterviewPrepPage() {
  const [applications, setApplications] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [prepHistory, setPrepHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedPrep, setSelectedPrep] = useState(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [regeneratingId, setRegeneratingId] = useState(null);
  const [formData, setFormData] = useState({
    application_id: "",
    resume_id: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [appsRes, resumesRes, prepsRes] = await Promise.all([
        axios.get(`${API}/applications`),
        axios.get(`${API}/resumes`),
        axios.get(`${API}/interview-prep`)
      ]);
      setApplications(appsRes.data);
      setResumes(resumesRes.data);
      setPrepHistory(prepsRes.data);
    } catch (error) {
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!formData.application_id || !formData.resume_id) {
      toast.error("Please select both a job application and resume");
      return;
    }

    setGenerating(true);
    try {
      const response = await axios.post(`${API}/interview-prep/generate`, {
        ...formData,
        include_match_analysis: true
      });
      setPrepHistory([response.data, ...prepHistory]);
      setSelectedPrep(response.data);
      setViewOpen(true);
      toast.success("Interview preparation generated!");
      setFormData({ application_id: "", resume_id: "" });
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.detail || "Failed to generate preparation");
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerate = async (prepId) => {
    setRegeneratingId(prepId);
    try {
      const response = await axios.post(`${API}/interview-prep/${prepId}/regenerate`);
      setPrepHistory(prepHistory.map(p => p.id === prepId ? response.data : p));
      setSelectedPrep(response.data);
      toast.success("Interview preparation regenerated!");
    } catch (error) {
      toast.error("Failed to regenerate preparation");
    } finally {
      setRegeneratingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await axios.delete(`${API}/interview-prep/${deleteId}`);
      setPrepHistory(prepHistory.filter(p => p.id !== deleteId));
      toast.success("Preparation deleted");
    } catch (error) {
      toast.error("Failed to delete preparation");
    } finally {
      setDeleteId(null);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  const getTotalQuestions = (prep) => {
    const analysis = prep.analysis;
    return (
      (analysis.hr_behavioral_questions?.length || 0) +
      (analysis.technical_questions?.length || 0) +
      (analysis.scenario_questions?.length || 0)
    );
  };

  if (loading) {
    return (
      <div className="space-y-6" data-testid="interview-prep-loading">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="interview-prep-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-primary" />
          Interview Preparation
        </h1>
        <p className="text-muted-foreground">
          AI-powered interview preparation tailored to your job applications
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Generate New Prep */}
        <Card className="lg:col-span-2 border-border/50" data-testid="generate-prep-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Generate New Preparation
            </CardTitle>
            <CardDescription>
              Select a job application and resume to generate personalized interview questions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Job Application *</label>
                <Select 
                  value={formData.application_id} 
                  onValueChange={(v) => setFormData({ ...formData, application_id: v })}
                >
                  <SelectTrigger data-testid="select-application">
                    <SelectValue placeholder="Select a job application" />
                  </SelectTrigger>
                  <SelectContent>
                    {applications.length === 0 ? (
                      <SelectItem value="no-apps" disabled>No applications available</SelectItem>
                    ) : (
                      applications.map(app => (
                        <SelectItem key={app.id} value={app.id}>
                          <div className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4" />
                            <span>{app.position}</span>
                            <span className="text-muted-foreground">@ {app.company}</span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Resume *</label>
                <Select 
                  value={formData.resume_id} 
                  onValueChange={(v) => setFormData({ ...formData, resume_id: v })}
                >
                  <SelectTrigger data-testid="select-resume">
                    <SelectValue placeholder="Select a resume" />
                  </SelectTrigger>
                  <SelectContent>
                    {resumes.length === 0 ? (
                      <SelectItem value="no-resumes" disabled>No resumes available</SelectItem>
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
            </div>

            {/* Selected Application Preview */}
            {formData.application_id && (
              <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                {(() => {
                  const app = applications.find(a => a.id === formData.application_id);
                  return app ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary" />
                        <span className="font-medium">{app.company}</span>
                        <span className="text-muted-foreground">•</span>
                        <span>{app.position}</span>
                      </div>
                      {app.job_description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {app.job_description}
                        </p>
                      )}
                    </div>
                  ) : null;
                })()}
              </div>
            )}

            <Button 
              onClick={handleGenerate} 
              disabled={generating || !formData.application_id || !formData.resume_id}
              className="w-full"
              size="lg"
              data-testid="generate-prep-btn"
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating Interview Prep...
                </>
              ) : (
                <>
                  <GraduationCap className="mr-2 h-5 w-5" />
                  Generate Interview Preparation
                </>
              )}
            </Button>

            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <Lightbulb className="h-4 w-4 mt-0.5 text-yellow-500" />
              <p>
                The AI will analyze your resume against the job requirements and generate 
                role-specific interview questions, answer guidance, and preparation tips.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* History */}
        <Card className="border-border/50" data-testid="prep-history-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Saved Preparations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {prepHistory.length > 0 ? (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {prepHistory.map((prep) => (
                    <div 
                      key={prep.id} 
                      className="p-4 rounded-lg border border-border/50 hover:border-primary/30 transition-colors cursor-pointer"
                      onClick={() => {
                        if (!prep) return;
                        setSelectedPrep(prep);
                        setViewOpen(true);
                      }}
                      data-testid={`prep-history-${prep.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{prep.job_title || "Interview Prep"}</h4>
                          <p className="text-sm text-muted-foreground">{prep.company_name}</p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <MessageSquare className="h-3 w-3" />
                            {getTotalQuestions(prep)} questions
                            {prep.match_score && (
                              <>
                                <span>•</span>
                                <span className="text-primary">{prep.match_score}% match</span>
                              </>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(prep.created_at)}
                          </p>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => { e.stopPropagation(); handleRegenerate(prep.id); }}
                            disabled={regeneratingId === prep.id}
                            data-testid={`regenerate-${prep.id}`}
                          >
                            {regeneratingId === prep.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => { e.stopPropagation(); setDeleteId(prep.id); }}
                            data-testid={`delete-prep-${prep.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No preparations yet</p>
                <p className="text-sm">Generate your first interview prep</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* View Preparation Dialog */}
      {selectedPrep && (
        <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <GraduationCap className="h-5 w-5 text-primary" />
              Interview Preparation
            </DialogTitle>
            {selectedPrep && (
              <DialogDescription className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {selectedPrep.job_title} at {selectedPrep.company_name}
                {selectedPrep.match_score && (
                  <Badge variant="outline" className="ml-2">
                    {selectedPrep.match_score}% Match
                  </Badge>
                )}
              </DialogDescription>
            )}
          </DialogHeader>
          
          <ScrollArea className="max-h-[70vh] pr-4">
            {selectedPrep && (
              <Tabs defaultValue="questions" className="w-full">
                <TabsList className="grid w-full grid-cols-4 mb-6">
                  <TabsTrigger value="questions" data-testid="tab-questions">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Questions
                  </TabsTrigger>
                  <TabsTrigger value="weak-areas" data-testid="tab-weak-areas">
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Weak Areas
                  </TabsTrigger>
                  <TabsTrigger value="tips" data-testid="tab-tips">
                    <Lightbulb className="mr-2 h-4 w-4" />
                    Tips
                  </TabsTrigger>
                  <TabsTrigger value="ask" data-testid="tab-ask">
                    <HelpCircle className="mr-2 h-4 w-4" />
                    Questions to Ask
                  </TabsTrigger>
                </TabsList>

                {/* Questions Tab */}
                <TabsContent value="questions" className="space-y-6">
                  {/* HR/Behavioral Questions */}
                  {selectedPrep.analysis.hr_behavioral_questions?.length > 0 && (
                    <Card className="border-border/50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Users className="h-5 w-5 text-blue-500" />
                          HR & Behavioral Questions
                          <Badge variant="secondary" className="ml-2">
                            {selectedPrep.analysis.hr_behavioral_questions.length}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Accordion type="multiple" className="space-y-2">
                          {selectedPrep.analysis.hr_behavioral_questions.map((q, i) => (
                            <AccordionItem key={i} value={`hr-${i}`} className="border rounded-lg px-4">
                              <AccordionTrigger className="hover:no-underline">
                                <div className="flex items-start gap-3 text-left">
                                  <span className="font-medium">{q.question}</span>
                                  <Badge variant="outline" className={`shrink-0 ${difficultyColors[q.difficulty]}`}>
                                    {q.difficulty}
                                  </Badge>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="space-y-4 pt-2">
                                <div>
                                  <h5 className="text-sm font-medium flex items-center gap-2 mb-2">
                                    <Star className="h-4 w-4 text-yellow-500" />
                                    STAR Method Guidance
                                  </h5>
                                  <ul className="space-y-1">
                                    {q.guidance.map((g, j) => (
                                      <li key={j} className="text-sm text-muted-foreground flex items-start gap-2">
                                        <ChevronRight className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                                        {g}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                                {q.sample_points?.length > 0 && (
                                  <div>
                                    <h5 className="text-sm font-medium flex items-center gap-2 mb-2">
                                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                                      Key Points to Cover
                                    </h5>
                                    <ul className="space-y-1">
                                      {q.sample_points.map((p, j) => (
                                        <li key={j} className="text-sm text-muted-foreground flex items-start gap-2">
                                          <span className="text-green-500">•</span>
                                          {p}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </CardContent>
                    </Card>
                  )}

                  {/* Technical Questions */}
                  {selectedPrep.analysis.technical_questions?.length > 0 && (
                    <Card className="border-border/50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Code className="h-5 w-5 text-purple-500" />
                          Technical Questions
                          <Badge variant="secondary" className="ml-2">
                            {selectedPrep.analysis.technical_questions.length}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Accordion type="multiple" className="space-y-2">
                          {selectedPrep.analysis.technical_questions.map((q, i) => (
                            <AccordionItem key={i} value={`tech-${i}`} className="border rounded-lg px-4">
                              <AccordionTrigger className="hover:no-underline">
                                <div className="flex items-start gap-3 text-left">
                                  <span className="font-medium">{q.question}</span>
                                  <Badge variant="outline" className={`shrink-0 ${difficultyColors[q.difficulty]}`}>
                                    {q.difficulty}
                                  </Badge>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="space-y-4 pt-2">
                                <div>
                                  <h5 className="text-sm font-medium flex items-center gap-2 mb-2">
                                    <Lightbulb className="h-4 w-4 text-yellow-500" />
                                    Answer Guidance
                                  </h5>
                                  <ul className="space-y-1">
                                    {q.guidance.map((g, j) => (
                                      <li key={j} className="text-sm text-muted-foreground flex items-start gap-2">
                                        <ChevronRight className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                                        {g}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                                {q.sample_points?.length > 0 && (
                                  <div>
                                    <h5 className="text-sm font-medium flex items-center gap-2 mb-2">
                                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                                      Key Points
                                    </h5>
                                    <ul className="space-y-1">
                                      {q.sample_points.map((p, j) => (
                                        <li key={j} className="text-sm text-muted-foreground flex items-start gap-2">
                                          <span className="text-green-500">•</span>
                                          {p}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </CardContent>
                    </Card>
                  )}

                  {/* Scenario Questions */}
                  {selectedPrep.analysis.scenario_questions?.length > 0 && (
                    <Card className="border-border/50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Target className="h-5 w-5 text-orange-500" />
                          Scenario-Based Questions
                          <Badge variant="secondary" className="ml-2">
                            {selectedPrep.analysis.scenario_questions.length}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Accordion type="multiple" className="space-y-2">
                          {selectedPrep.analysis.scenario_questions.map((q, i) => (
                            <AccordionItem key={i} value={`scenario-${i}`} className="border rounded-lg px-4">
                              <AccordionTrigger className="hover:no-underline">
                                <div className="flex items-start gap-3 text-left">
                                  <span className="font-medium">{q.question}</span>
                                  <Badge variant="outline" className={`shrink-0 ${difficultyColors[q.difficulty]}`}>
                                    {q.difficulty}
                                  </Badge>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="space-y-4 pt-2">
                                <div>
                                  <h5 className="text-sm font-medium flex items-center gap-2 mb-2">
                                    <Lightbulb className="h-4 w-4 text-yellow-500" />
                                    Approach Guidance
                                  </h5>
                                  <ul className="space-y-1">
                                    {q.guidance.map((g, j) => (
                                      <li key={j} className="text-sm text-muted-foreground flex items-start gap-2">
                                        <ChevronRight className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                                        {g}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                                {q.sample_points?.length > 0 && (
                                  <div>
                                    <h5 className="text-sm font-medium flex items-center gap-2 mb-2">
                                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                                      Key Points
                                    </h5>
                                    <ul className="space-y-1">
                                      {q.sample_points.map((p, j) => (
                                        <li key={j} className="text-sm text-muted-foreground flex items-start gap-2">
                                          <span className="text-green-500">•</span>
                                          {p}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* Weak Areas Tab */}
                <TabsContent value="weak-areas" className="space-y-4">
                  {selectedPrep.analysis.weak_areas?.length > 0 ? (
                    selectedPrep.analysis.weak_areas.map((area, i) => (
                      <Card key={i} className="border-border/50 border-l-4 border-l-yellow-500">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-yellow-500" />
                            {area.topic}
                          </CardTitle>
                          <CardDescription>{area.reason}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <h5 className="text-sm font-medium mb-2">Preparation Tips</h5>
                            <ul className="space-y-1">
                              {area.preparation_tips.map((tip, j) => (
                                <li key={j} className="text-sm text-muted-foreground flex items-start gap-2">
                                  <ChevronRight className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                                  {tip}
                                </li>
                              ))}
                            </ul>
                          </div>
                          {area.resources?.length > 0 && (
                            <div>
                              <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                                <BookOpen className="h-4 w-4" />
                                Resources
                              </h5>
                              <ul className="space-y-1">
                                {area.resources.map((res, j) => (
                                  <li key={j} className="text-sm text-muted-foreground flex items-start gap-2">
                                    <span className="text-blue-500">•</span>
                                    {res}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
                      <p className="font-medium">No major weak areas identified</p>
                      <p className="text-sm">Your profile seems well-aligned with this role</p>
                    </div>
                  )}
                </TabsContent>

                {/* Tips Tab */}
                <TabsContent value="tips" className="space-y-4">
                  {selectedPrep.analysis.general_tips?.length > 0 && (
                    <Card className="border-border/50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Lightbulb className="h-5 w-5 text-yellow-500" />
                          General Interview Tips
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {selectedPrep.analysis.general_tips.map((tip, i) => (
                            <li key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                              <span className="text-sm">{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {selectedPrep.analysis.company_research_points?.length > 0 && (
                    <Card className="border-border/50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Building2 className="h-5 w-5 text-blue-500" />
                          Company Research Points
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {selectedPrep.analysis.company_research_points.map((point, i) => (
                            <li key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                              <Target className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                              <span className="text-sm">{point}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* Questions to Ask Tab */}
                <TabsContent value="ask" className="space-y-4">
                  <Card className="border-border/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <HelpCircle className="h-5 w-5 text-purple-500" />
                        Smart Questions to Ask the Interviewer
                      </CardTitle>
                      <CardDescription>
                        Asking thoughtful questions shows your interest and helps you evaluate the opportunity
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {selectedPrep.analysis.questions_to_ask?.length > 0 ? (
                        <ul className="space-y-3">
                          {selectedPrep.analysis.questions_to_ask.map((q, i) => (
                            <li key={i} className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border border-border/50">
                              <MessageSquare className="h-5 w-5 text-purple-500 mt-0.5 shrink-0" />
                              <span className="text-sm font-medium">{q}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-muted-foreground text-center py-8">
                          No specific questions generated
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Interview Preparation?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90" data-testid="confirm-delete-prep">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
