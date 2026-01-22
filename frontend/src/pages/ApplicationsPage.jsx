import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Plus, 
  Briefcase,
  Trash2, 
  Edit2,
  MoreHorizontal,
  Loader2,
  ExternalLink,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Filter,
  Search,
  LayoutGrid,
  TableIcon,
  Eye
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const statuses = [
  { value: "applied", label: "Applied", icon: Clock, color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  { value: "interviewing", label: "Interviewing", icon: AlertCircle, color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
  { value: "offer", label: "Offer", icon: CheckCircle2, color: "bg-green-500/10 text-green-500 border-green-500/20" },
  { value: "rejected", label: "Rejected", icon: XCircle, color: "bg-red-500/10 text-red-500 border-red-500/20" },
  { value: "withdrawn", label: "Withdrawn", icon: XCircle, color: "bg-gray-500/10 text-gray-500 border-gray-500/20" },
];

const getStatusInfo = (status) => statuses.find(s => s.value === status) || statuses[0];

export default function ApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("table"); // "table" or "cards"
  const [formData, setFormData] = useState({
    company: "",
    position: "",
    job_url: "",
    job_description: "",
    status: "applied",
    notes: "",
    applied_date: new Date().toISOString().split('T')[0]
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, [filter]);

  const fetchApplications = async () => {
    try {
      const url = filter === "all" ? `${API}/applications` : `${API}/applications?status=${filter}`;
      const response = await axios.get(url);
      setApplications(response.data);
    } catch (error) {
      toast.error("Failed to fetch applications");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.company.trim() || !formData.position.trim()) {
      toast.error("Company and position are required");
      return;
    }

    setSubmitting(true);
    try {
      const response = await axios.post(`${API}/applications`, formData);
      setApplications([response.data, ...applications]);
      setCreateOpen(false);
      resetForm();
      toast.success("Application added successfully");
    } catch (error) {
      toast.error("Failed to add application");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedApp) return;

    setSubmitting(true);
    try {
      const response = await axios.put(`${API}/applications/${selectedApp.id}`, formData);
      setApplications(applications.map(a => a.id === selectedApp.id ? response.data : a));
      setEditOpen(false);
      setSelectedApp(null);
      resetForm();
      toast.success("Application updated");
    } catch (error) {
      toast.error("Failed to update application");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (appId, newStatus) => {
    try {
      const response = await axios.put(`${API}/applications/${appId}`, { status: newStatus });
      setApplications(applications.map(a => a.id === appId ? response.data : a));
      toast.success("Status updated");
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    try {
      await axios.delete(`${API}/applications/${deleteId}`);
      setApplications(applications.filter(a => a.id !== deleteId));
      toast.success("Application deleted");
    } catch (error) {
      toast.error("Failed to delete application");
    } finally {
      setDeleteId(null);
    }
  };

  const resetForm = () => {
    setFormData({
      company: "",
      position: "",
      job_url: "",
      job_description: "",
      status: "applied",
      notes: "",
      applied_date: new Date().toISOString().split('T')[0]
    });
  };

  const openEdit = (app) => {
    setSelectedApp(app);
    setFormData({
      company: app.company,
      position: app.position,
      job_url: app.job_url || "",
      job_description: app.job_description || "",
      status: app.status,
      notes: app.notes || "",
      applied_date: app.applied_date ? app.applied_date.split('T')[0] : ""
    });
    setEditOpen(true);
  };

  const openView = (app) => {
    setSelectedApp(app);
    setViewOpen(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  // Filter applications by search query
  const filteredApplications = applications.filter(app => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      app.company?.toLowerCase().includes(query) ||
      app.position?.toLowerCase().includes(query) ||
      app.notes?.toLowerCase().includes(query)
    );
  });

  // Stats
  const stats = {
    total: applications.length,
    applied: applications.filter(a => a.status === "applied").length,
    interviewing: applications.filter(a => a.status === "interviewing").length,
    offers: applications.filter(a => a.status === "offer").length,
  };

  if (loading) {
    return (
      <div className="space-y-6" data-testid="applications-loading">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="applications-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Job Applications</h1>
          <p className="text-muted-foreground">Track and manage your job search</p>
        </div>
        
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-application-btn">
              <Plus className="mr-2 h-4 w-4" />
              Add Application
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Job Application</DialogTitle>
              <DialogDescription>
                Track a new job application
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company">Company Name *</Label>
                  <Input
                    id="company"
                    placeholder="e.g., Google"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    data-testid="app-company-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Role/Position *</Label>
                  <Input
                    id="position"
                    placeholder="e.g., Software Engineer"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    data-testid="app-position-input"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="applied_date">Application Date</Label>
                  <Input
                    id="applied_date"
                    type="date"
                    value={formData.applied_date}
                    onChange={(e) => setFormData({ ...formData, applied_date: e.target.value })}
                    data-testid="app-date-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(v) => setFormData({ ...formData, status: v })}
                  >
                    <SelectTrigger data-testid="app-status-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="job_url">Job URL</Label>
                <Input
                  id="job_url"
                  placeholder="https://..."
                  value={formData.job_url}
                  onChange={(e) => setFormData({ ...formData, job_url: e.target.value })}
                  data-testid="app-url-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="job_description">Job Description</Label>
                <Textarea
                  id="job_description"
                  placeholder="Paste the job description here for AI matching..."
                  rows={4}
                  value={formData.job_description}
                  onChange={(e) => setFormData({ ...formData, job_description: e.target.value })}
                  data-testid="app-description-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any notes about this application..."
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  data-testid="app-notes-input"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setCreateOpen(false); resetForm(); }}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={submitting} data-testid="create-application-submit">
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Application"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/50" data-testid="stat-total">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Briefcase className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50" data-testid="stat-applied">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Applied</p>
                <p className="text-2xl font-bold text-blue-500">{stats.applied}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50" data-testid="stat-interviewing">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Interviewing</p>
                <p className="text-2xl font-bold text-yellow-500">{stats.interviewing}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50" data-testid="stat-offers">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Offers</p>
                <p className="text-2xl font-bold text-green-500">{stats.offers}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search applications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
              data-testid="search-input"
            />
          </div>
          
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40" data-testid="status-filter">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {statuses.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 border rounded-lg p-1">
          <Button
            variant={viewMode === "table" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("table")}
            data-testid="view-table-btn"
          >
            <TableIcon className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "cards" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("cards")}
            data-testid="view-cards-btn"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Applications Table View */}
      {filteredApplications.length > 0 ? (
        viewMode === "table" ? (
          <Card className="border-border/50" data-testid="applications-table-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Applied Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApplications.map((app) => {
                    const statusInfo = getStatusInfo(app.status);
                    const StatusIcon = statusInfo.icon;
                    
                    return (
                      <TableRow key={app.id} data-testid={`table-row-${app.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-semibold">
                              {app.company?.[0]?.toUpperCase() || "?"}
                            </div>
                            <div>
                              <p className="font-medium">{app.company}</p>
                              {app.job_url && (
                                <a 
                                  href={app.job_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                                >
                                  View Job <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{app.position}</p>
                          {app.notes && (
                            <p className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">{app.notes}</p>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(app.applied_date)}
                        </TableCell>
                        <TableCell>
                          <Select value={app.status} onValueChange={(v) => handleStatusChange(app.id, v)}>
                            <SelectTrigger className={`w-32 h-8 text-xs ${statusInfo.color}`} data-testid={`status-select-${app.id}`}>
                              <StatusIcon className="mr-1 h-3 w-3" />
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {statuses.map(s => (
                                <SelectItem key={s.value} value={s.value}>
                                  <div className="flex items-center gap-2">
                                    <s.icon className="h-3 w-3" />
                                    {s.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`app-menu-${app.id}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openView(app)} data-testid={`view-app-${app.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEdit(app)} data-testid={`edit-app-${app.id}`}>
                                <Edit2 className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => setDeleteId(app.id)} 
                                className="text-destructive"
                                data-testid={`delete-app-${app.id}`}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          /* Cards View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="applications-cards">
            {filteredApplications.map((app) => {
              const statusInfo = getStatusInfo(app.status);
              const StatusIcon = statusInfo.icon;
              
              return (
                <Card key={app.id} className="border-border/50 hover:border-primary/30 transition-colors" data-testid={`application-card-${app.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {app.company?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div>
                          <CardTitle className="text-base">{app.company}</CardTitle>
                          <CardDescription>{app.position}</CardDescription>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openView(app)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(app)}>
                            <Edit2 className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeleteId(app.id)} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className={statusInfo.color}>
                        <StatusIcon className="mr-1 h-3 w-3" />
                        {statusInfo.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{formatDate(app.applied_date)}</span>
                    </div>
                    {app.notes && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{app.notes}</p>
                    )}
                    {app.job_url && (
                      <a 
                        href={app.job_url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        View Job Posting <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )
      ) : (
        <Card className="border-border/50 border-dashed" data-testid="no-applications">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Briefcase className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {searchQuery || filter !== "all" ? "No matching applications" : "No applications yet"}
            </h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchQuery || filter !== "all" 
                ? "Try adjusting your search or filter" 
                : "Start tracking your job applications"}
            </p>
            {!searchQuery && filter === "all" && (
              <Button onClick={() => setCreateOpen(true)} data-testid="add-first-application-btn">
                <Plus className="mr-2 h-4 w-4" />
                Add Application
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* View Details Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                {selectedApp?.company?.[0]?.toUpperCase() || "?"}
              </div>
              <div>
                <span>{selectedApp?.position}</span>
                <p className="text-sm font-normal text-muted-foreground">{selectedApp?.company}</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground text-xs">Status</Label>
                <Badge variant="outline" className={`mt-1 ${getStatusInfo(selectedApp?.status).color}`}>
                  {getStatusInfo(selectedApp?.status).label}
                </Badge>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Applied Date</Label>
                <p className="text-sm font-medium mt-1">{formatDate(selectedApp?.applied_date)}</p>
              </div>
            </div>
            
            {selectedApp?.job_url && (
              <div>
                <Label className="text-muted-foreground text-xs">Job URL</Label>
                <a 
                  href={selectedApp.job_url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-sm text-primary hover:underline flex items-center gap-1 mt-1"
                >
                  {selectedApp.job_url} <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
            
            {selectedApp?.job_description && (
              <div>
                <Label className="text-muted-foreground text-xs">Job Description</Label>
                <div className="mt-1 p-3 rounded-lg bg-muted/50 text-sm max-h-40 overflow-y-auto">
                  {selectedApp.job_description}
                </div>
              </div>
            )}
            
            {selectedApp?.notes && (
              <div>
                <Label className="text-muted-foreground text-xs">Notes</Label>
                <p className="text-sm mt-1">{selectedApp.notes}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewOpen(false)}>Close</Button>
            <Button onClick={() => { setViewOpen(false); openEdit(selectedApp); }}>
              <Edit2 className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Application</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-company">Company Name</Label>
                <Input
                  id="edit-company"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  data-testid="edit-company-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-position">Role/Position</Label>
                <Input
                  id="edit-position"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  data-testid="edit-position-input"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-date">Application Date</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={formData.applied_date}
                  onChange={(e) => setFormData({ ...formData, applied_date: e.target.value })}
                  data-testid="edit-date-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(v) => setFormData({ ...formData, status: v })}
                >
                  <SelectTrigger data-testid="edit-status-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-url">Job URL</Label>
              <Input
                id="edit-url"
                value={formData.job_url}
                onChange={(e) => setFormData({ ...formData, job_url: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Job Description</Label>
              <Textarea
                id="edit-description"
                rows={4}
                value={formData.job_description}
                onChange={(e) => setFormData({ ...formData, job_description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditOpen(false); setSelectedApp(null); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={submitting} data-testid="update-application-submit">
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Application?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this job application.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90" data-testid="confirm-delete-application">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
